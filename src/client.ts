// Static hosting adapter: no server routes, credentials, or ChatGPT dependency.
type WindowConfig = {
  url: string;
  publishableKey: string;
  missionsUrl: string;
};
declare global {
  interface Window {
    MAISON_CONFIG: WindowConfig;
    supabase: any;
    MissionsDynamicCore: any;
  }
}
const config = window.MAISON_CONFIG;
if (
  !/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(config?.url || "") ||
  !config?.publishableKey?.startsWith("sb_publishable_")
)
  throw Error("INVALID_PUBLIC_CONFIG");
export const base = new URL("../", import.meta.url);
export const local = (path: string) => new URL(path, base).href;
export const missionsUrl = new URL(config.missionsUrl, base).href;
if (
  !/^https:/.test(missionsUrl) &&
  !["localhost", "127.0.0.1", "terminal.local"].includes(location.hostname)
)
  throw Error("INVALID_MISSIONS_URL");
export const client = window.supabase.createClient(
  config.url,
  config.publishableKey,
  {
    global: {
      fetch: (url: any, init: any = {}) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        const abort = () => controller.abort();
        if (init.signal?.aborted) abort();
        else init.signal?.addEventListener("abort", abort, { once: true });
        return fetch(url, { ...init, signal: controller.signal }).finally(
          () => {
            clearTimeout(timeout);
            init.signal?.removeEventListener("abort", abort);
          },
        );
      },
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "mm-auth-" + new URL(config.url).hostname,
    },
  },
);
let parentClient: any = null;
let parentGeneration = 0;
export const parentUnlocked = () => parentClient !== null;
export function lockParent() {
  parentGeneration++;
  const old = parentClient;
  parentClient = null;
  if (old) {
    old.auth.signOut({ scope: "local" }).catch(() => {});
    invalidate();
  }
}
export async function unlockParent(email: string, password: string) {
  if (!navigator.onLine) throw Error("OFFLINE");
  const generation = ++parentGeneration;
  const candidate = window.supabase.createClient(config.url, config.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false,
      storageKey: "nm-parent-temporary-" + base.pathname },
  });
  try {
    const signed = await candidate.auth.signInWithPassword({ email: email.trim(), password });
    if (signed.error) throw Error("Adresse ou mot de passe incorrect.");
    const checked = await candidate.rpc("nm_rpc", { p_action: "snapshot", p_data: {}, p_token: null });
    if (checked.error || checked.data?.error || checked.data?.admin !== true)
      throw Error("Ce compte n’est pas un parent autorisé.");
    // Account data is authorized by the existing server, never by a local role flag.
    // Compare server-issued family identifiers when the paired home has tasks.
    const paired = await client.rpc("nm_rpc", { p_action: "snapshot", p_data: {},
      p_token: localStorage.getItem(TOKEN) || null });
    if (paired.error || paired.data?.error) throw Error("Association indisponible. Réessaie en ligne.");
    const familyIds = (data: any) => [...(data.definitions || []), ...(data.occurrences || [])]
      .map((row: any) => row.family_id).filter(Boolean);
    const expected = familyIds(paired.data), actual = familyIds(checked.data);
    if (expected.length && !expected.some((id: string) => actual.includes(id)))
      throw Error("Ce compte parent appartient à un autre foyer.");
    if (generation !== parentGeneration) throw Error("Déverrouillage annulé.");
    parentClient = candidate;
    invalidate();
    return checked.data;
  } catch (error) {
    await candidate.auth.signOut({ scope: "local" }).catch(() => {});
    throw error;
  }
}
const TOKEN = "mm-v11-device-token:" + base.pathname;
const PREFIX = "nm-cache:" + base.pathname + ":";
const MAX_AGE = 24 * 60 * 60 * 1000;
let identityEpoch = 0;
const invalidate = () => {
  identityEpoch++;
  window.dispatchEvent(new Event("maison-auth-change"));
};
export const epoch = () => identityEpoch;
export function clearCache() {
  for (const key of Object.keys(localStorage))
    if (key.startsWith(PREFIX)) localStorage.removeItem(key);
}
async function cacheKey() {
  const token = localStorage.getItem(TOKEN);
  if (token) {
    const hash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(token),
    );
    return (
      PREFIX +
      "device:" +
      Array.from(new Uint8Array(hash), (n) =>
        n.toString(16).padStart(2, "0"),
      ).join("")
    );
  }
  // Only a cache selector; never used as server authorization.
  try {
    const session = JSON.parse(
      localStorage.getItem("mm-auth-" + new URL(config.url).hostname) || "null",
    );
    return session?.user?.id ? PREFIX + "user:" + session.user.id : null;
  } catch {
    return null;
  }
}
export async function saveCache(data: any) {
  if (parentClient) return;
  const generation = identityEpoch;
  const key = await cacheKey();
  if (generation !== identityEpoch) return;
  if (key)
    try {
      localStorage.setItem(key, JSON.stringify({ at: Date.now(), data }));
    } catch {
      /* quota: online operation remains usable */
    }
}
export async function readCache() {
  const key = await cacheKey();
  if (!key) return null;
  try {
    const cached = JSON.parse(localStorage.getItem(key) || "null");
    if (
      cached &&
      Date.now() - cached.at >= 0 &&
      Date.now() - cached.at < MAX_AGE
    )
      return cached;
  } catch {
    /* discard invalid cache */
  }
  localStorage.removeItem(key);
  return null;
}
export async function forgetDevice() {
  localStorage.removeItem(TOKEN);
  clearCache();
  invalidate();
}
async function result(name: string, args: any) {
  if (!navigator.onLine) throw Error("OFFLINE");
  const { data, error } = await (parentClient || client).rpc(name, args);
  if (error) throw Error(error.message || "SERVICE_UNAVAILABLE");
  if (data?.error) throw Error(data.error);
  return data;
}
export async function rpc(action: string, data: any = {}) {
  if (action.startsWith("legacy:"))
    return result("nm_legacy", { p_action: action.slice(7), p_data: data });
  return result("nm_rpc", {
    p_action: action,
    p_data: data,
    p_token: parentClient ? null : localStorage.getItem(TOKEN) || null,
  });
}
export async function post(path: string, data: any) {
  if (path === "/api/login") {
    const r = await client.auth.signInWithPassword({
      email: String(data.email).trim(),
      password: data.password,
    });
    if (r.error) throw Error("Adresse ou mot de passe incorrect.");
    localStorage.removeItem(TOKEN);
    clearCache();
    invalidate();
    return { ok: true };
  }
  if (path === "/api/pair") {
    const pair = await result("nm_rpc", {
      p_action: "pair",
      p_data: data,
      p_token: null,
    });
    // Do not replace a working session on a rejected pairing attempt.
    await client.auth.signOut({ scope: "local" });
    clearCache();
    localStorage.setItem(TOKEN, pair.token);
    invalidate();
    return { ok: true };
  }
  if (path === "/api/logout") {
    lockParent();
    const reg = await navigator.serviceWorker?.getRegistration(base.href);
    reg?.active?.postMessage({ type: "SET_USER", userId: "" });
    const sub = await reg?.pushManager?.getSubscription();
    if (sub) {
      try {
        await result("mm_push_unsubscribe", { p_endpoint: sub.endpoint });
      } catch {
        /* local unsubscribe still protects this device */
      }
      await sub.unsubscribe().catch(() => false);
    }
    localStorage.removeItem(TOKEN);
    clearCache();
    await client.auth.signOut({ scope: "local" });
    localStorage.setItem("nm-auth-logout", String(Date.now()));
    invalidate();
    return { ok: true };
  }
  throw Error("UNKNOWN_LOCAL_ACTION");
}
export async function loadSnapshot(data: any = {}) {
  return rpc("snapshot", data);
}
client.auth.onAuthStateChange((event: string) => {
  // Avoid RPC calls from inside the SDK's auth lock.
  if (event === "SIGNED_OUT") {
    clearCache();
    setTimeout(invalidate, 0);
  }
  if (event === "SIGNED_IN" || event === "USER_UPDATED")
    setTimeout(invalidate, 0);
});
window.addEventListener("storage", (e) => {
  if (e.key === TOKEN || e.key === "nm-auth-logout") {
    clearCache();
    invalidate();
  }
});

window.addEventListener("pagehide", lockParent);
document.addEventListener("visibilitychange", () => { if (document.hidden) lockParent(); });
