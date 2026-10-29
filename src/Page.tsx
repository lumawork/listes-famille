import MissionForm from "./MissionForm";
import ScreenSettings from "./ScreenSettings";
import {
  post,
  rpc,
  loadSnapshot,
  readCache,
  saveCache,
  clearCache,
  epoch,
  base,
  local,
  missionsUrl,
  forgetDevice,
  unlockParent,
  lockParent,
  parentUnlocked,
} from "./client";
const C = window.MissionsDynamicCore;
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Home,
  CalendarDays,
  ShoppingCart,
  MapPin,
  Camera,
  Settings,
  ChartNoAxesCombined,
  ChevronLeft,
  ChevronRight,
  Plus,
  Check,
  Clock,
  TriangleAlert,
  Hourglass,
  Sparkles,
  Sun,
  Moon,
  LockKeyhole,
  UnlockKeyhole,
  X,
  LogOut,
  Link2,
  Volume2,
  Download,
  Upload,
  RefreshCw,
  MoreHorizontal,
  BookOpen,
  ShowerHead,
  Backpack,
  Bird,
  Utensils,
  Heart,
  Leaf,
  Shirt,
  Handshake,
  Blinds,
  Wifi,
  WifiOff,
  Trash2,
  Save,
  UserRound,
  ClipboardList,
} from "lucide-react";
type Any = any;
let serverOffset = 0;
const NOW = () => new Date(Date.now() + serverOffset);
const day = (v: Any = NOW()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(v));
const hm = (v: Any) =>
  new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(v));
const dueText = (o: Any) =>
  day(o.due) === day()
    ? "Aujourd’hui · " + hm(o.due)
    : new Intl.DateTimeFormat("fr-FR", {
        timeZone: "Europe/Paris",
        day: "numeric",
        month: "short",
      }).format(new Date(o.due)) +
      " · " +
      hm(o.due);
const peopleDefault = [
  { id: "annabelle", name: "Annabelle", avatar: 0 },
  { id: "papa", name: "Papa", avatar: 1 },
  { id: "maman", name: "Maman", avatar: 2 },
];
const icons: Record<string, Any> = {
  agenda: CalendarDays,
  courses: ShoppingCart,
  localisation: MapPin,
  camera: Camera,
  volets: Blinds,
  autres: Settings,
};
const labels: Record<string, string> = {
  agenda: "Agenda familial",
  courses: "Courses",
  localisation: "Localisation consentie",
  camera: "Caméra Jonathan",
  volets: "Volets",
  autres: "Configuration",
};
const errorText = (e: Any) => {
  const m = e?.message || String(e);
  const map: Record<string, string> = {
    OFFLINE: "Hors connexion : reconnecte cet appareil pour valider.",
    INVALID_PUBLIC_CONFIG: "La connexion du site reste à configurer.",
    AUTH_REQUIRED: "Connecte-toi pour retrouver tes missions.",
    ACCESS_REVOKED: "Cet accès a été révoqué. Associe de nouveau cet appareil.",
    PROFILE_REQUIRED:
      "Ce compte n’est pas encore rattaché à la famille dans Mes Missions.",
    SETUP_REQUIRED: "Un parent doit d’abord configurer le portail.",
    VERSION_CONFLICT:
      "Cette donnée a changé sur un autre appareil. Actualise puis réessaie.",
    SCOPE_DENIED: "Ton accès ne permet pas cette action.",
    RATE_LIMITED: "Trop de tentatives. Réessaie dans quelques minutes.",
    PAIR_DENIED:
      "L’identifiant ou le code est invalide, expiré ou déjà utilisé.",
    NEXT_DUE_REQUIRED:
      "Indique la prochaine échéance pour cette mission relative.",
    MIGRATION_ACK_REQUIRED:
      "Confirme la désactivation des anciens rappels avant l’import.",
    INVALID_CONFIG: "Vérifie les paramètres et la durée de retour automatique.",
    RELATIVE_CONFLICT:
      "La mission suivante a déjà évolué. Cette correction demande une réconciliation.",
  };
  return Object.keys(map).find((k) => m.includes(k))
    ? map[Object.keys(map).find((k) => m.includes(k))!]
    : "Enregistrement non confirmé. Réessaie avec le même contenu. " +
        m.slice(0, 70);
};
function avatarStyle(p: Any) {
  return p.image
    ? {
        backgroundImage: `url(${p.image})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : {
        backgroundImage: `url(${local("assets/avatar-presets.png")})`,
        backgroundSize: "300% 200%",
        backgroundPosition: `${[0, 50, 100][(p.avatar || 0) % 3]}% ${(p.avatar || 0) < 3 ? 0 : 100}%`,
      };
}
function Avatar({ p, size = 56 }: { p: Any; size?: number }) {
  return (
    <span
      className="avatar"
      style={{ ...avatarStyle(p), width: size, height: size }}
      role="img"
      aria-label={"Avatar de " + p.name}
    />
  );
}
function Ring({
  done,
  total,
  color = "var(--green)",
  small = false,
}: {
  done: number;
  total: number;
  color?: string;
  small?: boolean;
}) {
  return (
    <span
      className={"ring " + (small ? "small" : "")}
      style={{
        background: `conic-gradient(${color} ${total ? (done / total) * 100 : 0}%, #ffffff99 0)`,
      }}
    >
      <span>
        {done}/{total}
      </span>
    </span>
  );
}
function Modal({
  title,
  children,
  close,
  wide = false,
}: {
  title: string;
  children: Any;
  close: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={wide ? "wide" : ""}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button className="icon-button" aria-label="Fermer" onClick={close}>
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function demoSnapshot() {
  const now = NOW(),
    hour = Number(hm(now).split(":")[0]),
    t = (h: number, d = 0) => {
      const n = new Date(day(now) + "T12:00Z");
      n.setUTCDate(n.getUTCDate() + d + Math.floor(h / 24));
      return C.paris(
        n.toISOString().slice(0, 10) +
          "T" +
          String(((h % 24) + 24) % 24).padStart(2, "0") +
          ":00",
      ).toISOString();
    },
    mk = (
      id: string,
      person: string,
      title: string,
      due: string,
      done = false,
      relative = false,
    ) => ({
      id,
      def_id: id,
      family_id: "demo",
      person,
      title,
      version: 1,
      due,
      anchor: due,
      original_due: due,
      ends: new Date(new Date(due).getTime() + 3600000).toISOString(),
      original_end: new Date(new Date(due).getTime() + 3600000).toISOString(),
      visible: t(0, -1),
      status: done ? "done" : "open",
      completed: done ? t(8) : null,
      spec: {
        mode: relative ? "relative" : "fixed",
        every: relative ? 7 : 1,
        unit: "days",
        reminder: false,
      },
    });
  return {
    admin: true,
    preview: true,
    revision: 1,
    config: {
      people: peopleDefault,
      rules: [
        "Je range mes affaires",
        "Je nettoie derrière moi",
        "Je respecte les espaces communs",
        "Je demande avant d’emprunter",
        "Je prends soin des animaux",
      ],
      rituals: [
        {
          id: "evening",
          title: "Le rituel du soir",
          text: "On range ses affaires et on prépare demain.",
          minutes: 10,
          time: "19:00",
          enabled: false,
        },
      ],
      shortcuts: [],
      idleSeconds: 120,
      cameraUrl: "",
      tone: "fun",
    },
    definitions: [],
    occurrences: [
      mk("a1", "annabelle", "Ranger sa chambre", t(20, -1)),
      mk("a2", "annabelle", "Réviser SVT", t(hour)),
      mk("a3", "annabelle", "Préparer le sac", t(hour + 1)),
      mk("p1", "papa", "Nettoyer les toilettes", t(10, -1)),
      mk("p2", "papa", "Vider le lave-vaisselle", t(hour)),
      mk("p3", "papa", "Aller aux poules", t(10, 3), false, true),
      ...["annabelle", "papa", "maman"].flatMap((person, i) =>
        Array.from({ length: i === 0 ? 3 : i === 1 ? 2 : 4 }, (_, j) =>
          mk(person + j, person, "Petite victoire du jour", t(8), true),
        ),
      ),
    ],
  };
}
function taskIcon(title: string) {
  if (/poule/i.test(title)) return Bird;
  if (/douche/i.test(title)) return ShowerHead;
  if (/SVT|lire|lecture|devoir/i.test(title)) return BookOpen;
  if (/sac|affaire/i.test(title)) return Backpack;
  if (/repas|vaisselle/i.test(title)) return Utensils;
  return ClipboardList;
}
function counters(rows: Any[]) {
  let c = { T: 0, L: 0, S: 0, N: 0, A: 0, D: 0, C: 0 };
  for (const o of rows) {
    if (o.spec?.paused) continue;
    if (o.status === "cancelled") {
      c.C++;
      continue;
    }
    c.D++;
    if (o.status === "done") {
      if (new Date(o.completed) < new Date(o.original_end)) c.T++;
      else c.L++;
    } else if (o.status === "skipped") c.S++;
    else if (new Date(o.original_end) <= NOW()) c.N++;
    else c.A++;
  }
  return c;
}
function feedback(p: Any, c: Any, tone: string) {
  if (tone === "discreet") return "";
  if (!c.D) return "Une journée à ton rythme";
  const n = c.T + c.L;
  if (tone === "soft")
    return n === c.D
      ? "Merci pour toutes ces petites attentions"
      : n
        ? "Chaque petit geste compte"
        : "Un petit pas quand tu es prêt";
  const texts =
    n === c.D
      ? [
          "Mission accomplie, sourire compris !",
          "La maison te dit merci",
          "Gardien des petites victoires",
        ]
      : n / c.D >= 0.5
        ? [
            "Ninja des petits pas",
            "L’équipage avance",
            "Super pouvoir : persévérer",
          ]
        : [
            "L’aventure commence",
            "Un premier pas, ça compte",
            "Le capitaine prend son élan",
          ];
  let hash = [...(day() + p.id)].reduce((a, c) => a + c.charCodeAt(0), 0);
  return texts[hash % texts.length];
}
export default function Page() {
  const [s, setS] = useState<Any>(null),
    [demo, setDemo] = useState(true),
    [online, setOnline] = useState(true),
    [sync, setSync] = useState("loading"),
    [clock, setClock] = useState(NOW()),
    [modal, setModal] = useState(""),
    [selected, setSelected] = useState<Any>(null),
    [toast, setToast] = useState(""),
    [busy, setBusy] = useState(false),
    [from, setFrom] = useState(day()),
    [to, setTo] = useState(day()),
    [filter, setFilter] = useState("all"),
    [cameraLock, setCameraLock] = useState(false),
    [cameraGood, setCameraGood] = useState(false),
    [audio, setAudio] = useState(false),
    [pos, setPos] = useState(0),
    [editor, setEditor] = useState(false),
    [guidedSteps, setGuidedSteps] = useState(false),
    [history, setHistory] = useState<Any[]>([]),
    [draft, setDraft] = useState<Any>(null),
    [importData, setImportData] = useState<Any>(null),
    [grant, setGrant] = useState<Any>(null);
  const rail = useRef<HTMLDivElement>(null),
    lastTouch = useRef(Date.now()),
    audioContext = useRef<AudioContext | null>(null),
    soundJobs = useRef(new Set<string>()),
    idleRef = useRef<Any>(null),
    reqRef = useRef(new Map<string, string>());
  const notify = useCallback((m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 6500);
  }, []);
  const refreshLock = useRef(false),
    lastRefresh = useRef(0),
    offlineAt = useRef(0),
    configVersion = useRef(0);
  const refresh = useCallback(async () => {
    if (refreshLock.current) return;
    refreshLock.current = true;
    const generation = epoch();
    try {
      if (from > to)
        throw Error("La date de début doit précéder la date de fin.");
      const data = await loadSnapshot({
        from: from < day() ? from : day(),
        to: to > day() ? to : day(),
      });
      if (generation !== epoch()) return;
      serverOffset = Date.parse(data.serverNow) - Date.now() || 0;
      setS(data);
      setDemo(false);
      setSync("live");
      setOnline(true);
      offlineAt.current = 0;
      lastRefresh.current = Date.now();
      await saveCache(data);
    } catch (e: Any) {
      if (generation !== epoch()) return;
      if (/AUTH_REQUIRED|ACCESS_REVOKED|PROFILE_REQUIRED/.test(e.message)) {
        clearCache();
        if (e.message.includes("ACCESS_REVOKED")) await forgetDevice();
        setS(demoSnapshot());
        setDemo(true);
        setSync("preview");
      } else {
        const cached = await readCache();
        if (generation !== epoch()) return;
        if (cached) {
          serverOffset = 0;
          setS(cached.data);
          setDemo(false);
          setSync("offline");
          setOnline(false);
          offlineAt.current = cached.at;
        } else {
          setS(demoSnapshot());
          setDemo(true);
          setSync("error");
        }
        notify(errorText(e));
      }
    } finally {
      refreshLock.current = false;
    }
  }, [from, to, notify]);
  useEffect(() => {
    let alive = true;
    refresh();
    const t = setInterval(() => setClock(NOW()), 1000);
    const on = () => {
        setOnline(true);
        refresh();
      },
      off = () => {
        setOnline(false);
        setSync("offline");
        offlineAt.current = lastRefresh.current || Date.now();
      };
    const identity = () => {
      setS(demoSnapshot());
      setDemo(true);
      setSync("loading");
      refreshLock.current = false;
      setTimeout(() => {
        if (alive) refresh();
      }, 0);
    };
    const visible = () => {
      if (!document.hidden) refresh();
    };
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    window.addEventListener("maison-auth-change", identity);
    document.addEventListener("visibilitychange", visible);
    const touch = () => (lastTouch.current = Date.now());
    for (const e of ["pointerdown", "keydown", "wheel", "touchstart"])
      window.addEventListener(e, touch, { passive: true });
    if ("serviceWorker" in navigator)
      navigator.serviceWorker
        .register(local("sw.js"), { scope: base.href })
        .catch(() => {});
    return () => {
      alive = false;
      clearInterval(t);
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      window.removeEventListener("maison-auth-change", identity);
      document.removeEventListener("visibilitychange", visible);
      for (const e of ["pointerdown", "keydown", "wheel", "touchstart"])
        window.removeEventListener(e, touch);
    };
  }, [refresh]);
  useEffect(() => {
    if (demo || !s) return;
    let running = false;
    const poll = setInterval(async () => {
      if (document.hidden || running || !navigator.onLine) return;
      running = true;
      try {
        const version = await rpc("revision");
        if (
          !online ||
          version.revision !== s.revision ||
          Date.now() - lastRefresh.current > 60000
        )
          await refresh();
        setSync("live");
      } catch (e: Any) {
        if (/AUTH_REQUIRED|ACCESS_REVOKED/.test(e.message)) refresh();
        else setSync("degraded");
      } finally {
        running = false;
      }
    }, 1000);
    return () => clearInterval(poll);
  }, [demo, s?.revision, online, refresh]);
  useEffect(() => {
    if (
      !online &&
      offlineAt.current &&
      Date.now() - offlineAt.current >= 86400000
    ) {
      clearCache();
      setS(demoSnapshot());
      setDemo(true);
      setSync("preview");
      notify("L’affichage hors connexion a expiré. Reconnecte cet appareil.");
    }
  }, [clock, online, notify]);
  useEffect(() => {
    if (demo) return;
    navigator.serviceWorker?.ready.then((reg) =>
      reg.active?.postMessage({
        type: "SET_USER",
        userId: s?.deviceId || parentUnlocked() ? "" : s?.userId || "",
      }),
    );
  }, [demo, s?.userId, s?.deviceId]);
  useEffect(() => {
    if (!s) return;
    clearInterval(idleRef.current);
    idleRef.current = setInterval(() => {
      if (
        (modal || editor) &&
        (!cameraLock || parentUnlocked()) &&
        Date.now() - lastTouch.current > (s.config.idleSeconds || 120) * 1000 &&
        (innerWidth >= 900 || parentUnlocked())
      ) {
        setModal("");
        setEditor(false);
      }
    }, 1000);
    return () => clearInterval(idleRef.current);
  }, [modal, editor, cameraLock, s?.config?.idleSeconds]);
  useEffect(() => {
    if (!modal && !editor) {
      const active = parentUnlocked();
      lockParent();
      if (active) { setS(demoSnapshot()); setDemo(true); setSync("loading"); }
    }
  }, [modal, editor]);
  function beep() {
    const a = audioContext.current;
    if (!a) return;
    const o = a.createOscillator(),
      g = a.createGain();
    o.connect(g);
    g.connect(a.destination);
    o.type = "sine";
    o.frequency.setValueAtTime(660, a.currentTime);
    o.frequency.setValueAtTime(880, a.currentTime + 0.18);
    g.gain.setValueAtTime(0.12, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.8);
    o.start();
    o.stop(a.currentTime + 0.85);
  }
  useEffect(() => {
    if (!s || demo || !audio || !online) return;
    navigator.serviceWorker
      ?.getRegistration(base.href)
      .then((r) =>
        r?.active?.postMessage({ type: "NM_SOUND_ACTIVE", at: Date.now() }),
      )
      .catch(() => {});
    const time = hm(clock);
    if (C.quiet(time, s.config.quietStart, s.config.quietEnd)) return;
    for (const o of s.occurrences) {
      let due = new Date(o.due).getTime();
      if (o.spec.reminderTime) {
        let date = day(o.due);
        due = C.paris(date + "T" + o.spec.reminderTime).getTime();
      }
      let gap = (o.spec.reminderDelay || 15) * 60000,
        stage = Math.floor((clock.getTime() - due) / gap),
        key = o.id + ":" + stage;
      if (
        o.status === "open" &&
        !o.spec.paused &&
        o.spec.reminder &&
        stage >= 0 &&
        stage <= (o.spec.reminderCount ?? 2) &&
        clock.getTime() - due - stage * gap < 5000 &&
        !soundJobs.current.has(key)
      ) {
        soundJobs.current.add(key);
        beep();
        notify("Une petite mission t’attend : " + o.title);
      }
    }
    for (const r of s.config.rituals || []) {
      let k = "ritual:" + r.id + ":" + day();
      if (r.enabled && time === r.time && !soundJobs.current.has(k)) {
        soundJobs.current.add(k);
        beep();
        notify(r.title);
      }
    }
  }, [clock, audio, s, demo, online]);
  async function mutate(action: string, data: Any) {
    if (busy) return;
    setBusy(true);
    try {
      if (demo) {
        if (action === "complete")
          setS((v: Any) => ({
            ...v,
            occurrences: v.occurrences.map((o: Any) =>
              o.id === data.id
                ? { ...o, status: "done", completed: NOW().toISOString() }
                : o,
            ),
          }));
        else if (action === "avatar")
          setS((v: Any) => ({
            ...v,
            config: {
              ...v.config,
              people: v.config.people.map((p: Any) =>
                p.id === data.person
                  ? { ...p, avatar: data.avatar, image: data.image }
                  : p,
              ),
            },
          }));
        else if (action === "config")
          setS((v: Any) => ({ ...v, config: data.config }));
        else notify("Connecte Mes Missions pour enregistrer cette action.");
        return;
      }
      if (!online || !navigator.onLine)
        throw Error("Hors connexion : aucune modification envoyée.");
      let key = action + JSON.stringify(data);
      let requestId = reqRef.current.get(key) || crypto.randomUUID();
      reqRef.current.set(key, requestId);
      let out = await rpc(action, { ...data, requestId });
      reqRef.current.delete(key);
      await refresh();
      return out;
    } catch (e) {
      notify(errorText(e));
      throw e;
    } finally {
      setBusy(false);
    }
  }
  function open(name: string, p: Any = null) {
    if (name === "settings") configVersion.current = s.revision;
    if (name === "camera") setCameraGood(false);
    if (name === "steps") setGuidedSteps(false);
    setSelected(p);
    setDraft(null);
    setGrant(null);
    setImportData(null);
    lastTouch.current = Date.now();
    setModal(name);
  }
  async function doAction(action: string, o: Any) {
    if(action === "complete" && o.spec.steps?.length){open("steps",o);return;}
    try {
      let data: Any = { id: o.id, version: o.version };
      if (action === "reschedule") {
        const due = prompt(
          "Nouvelle échéance (heure de Paris), AAAA-MM-JJTHH:MM",
          day() + "T18:00",
        );
        if (!due) return;
        data.due = due;
        data.reason = prompt("Motif facultatif") || "";
      }
      if (action === "skip" && o.spec.mode === "relative") {
        let nextDue = prompt(
          "Prochaine échéance, sans déclarer la mission réalisée (AAAA-MM-JJTHH:MM)",
        );
        if (!nextDue) return;
        data.nextDue = nextDue;
      }
      if (action === "skip" || action === "cancel")
        data.reason = prompt("Motif facultatif") || "";
      await mutate(action, data);
      setModal("");
    } catch {}
  }
  function move(index: number) {
    if (!rail.current) return;
    let card = rail.current.querySelector(".person-card") as HTMLElement;
    rail.current.scrollTo({
      left: index * (card?.offsetWidth + 16),
      behavior: "smooth",
    });
    setPos(index);
  }
  async function saveAvatar(avatar: number, image = "") {
    try {
      await mutate("avatar", { person: selected.id, avatar, image });
      setModal("");
      notify("Avatar mis à jour.");
    } catch {}
  }
  async function photo(file: File) {
    if (
      file.size > 5 * 1024 * 1024 ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    ) {
      notify("Choisis une photo JPEG, PNG ou WebP de moins de 5 Mo.");
      return;
    }
    try {
      const image = await createImageBitmap(file);
      const c = document.createElement("canvas");
      c.width = c.height = 512;
      let ctx = c.getContext("2d")!,
        side = Math.min(image.width, image.height);
      ctx.drawImage(
        image,
        (image.width - side) / 2,
        (image.height - side) / 2,
        side,
        side,
        0,
        0,
        512,
        512,
      );
      let out = c.toDataURL("image/webp", 0.8);
      if (out.length > 270000) out = c.toDataURL("image/jpeg", 0.65);
      await saveAvatar(selected.avatar, out);
    } catch {
      notify("Cette image ne peut pas être lue.");
    }
  }
  async function downloadExport() {
    try {
      let x = demo ? s : await rpc("export");
      let u = URL.createObjectURL(
        new Blob([JSON.stringify(x, null, 2)], { type: "application/json" }),
      );
      let a = document.createElement("a");
      a.href = u;
      a.download = "notre-maison-" + day() + ".json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(u), 1000);
    } catch (e) {
      notify(errorText(e));
    }
  }
  async function shortcut(key: string) {
    if (key === "camera") {
      open("camera");
      return;
    }
    if (key === "autres") {
      setDraft(structuredClone(s.config));
      open("settings");
      setDraft(structuredClone(s.config));
      return;
    }
    let item = s.config.shortcuts.find((x: Any) => x.icon === key);
    if (!item) {
      notify("Ce raccourci se configure dans les paramètres.");
      return;
    }
    if (item.type === "android") {
      if (!/^intent:/i.test(item.target)) {
        notify("Raccourci Android invalide.");
        return;
      }
      if (!/Android/i.test(navigator.userAgent)) {
        notify("Ce raccourci ouvre une application Android sur la tablette.");
        return;
      }
      window.location.href = item.target;
    } else {
      if (!/^https:\/\//i.test(item.target)) {
        notify("URL HTTPS attendue.");
        return;
      }
      window.open(item.target, "_blank", "noopener,noreferrer");
      notify("À ton retour, les tâches restent l’écran principal.");
    }
  }
  if (!s)
    return (
      <main className="loading">
        <Home size={42} />
        <h1>Notre Maison</h1>
        <p>On prépare les petites missions…</p>
      </main>
    );
  const people = s.config.people || peopleDefault,
    all = s.occurrences || [],
    todayRows = all.filter((o: Any) => day(o.original_due) === day(clock));
  const daily = (p: Any) =>
    counters(todayRows.filter((o: Any) => o.person === p.id));
  const allowed = sync !== "loading" && (demo || s.admin);
  const ritual = s.config.rituals?.[0];
  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-icon">
            <Home size={30} strokeWidth={2.5} />
          </span>
          <div>
            <h1>{editor ? "Mes Missions" : "Notre Maison"}</h1>
            <p>Chacun sa part, tous ensemble</p>
          </div>
        </div>
        <div className="date">
          {clock.toLocaleDateString("fr-FR", {
            timeZone: "Europe/Paris",
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </div>
        <div className="header-end">
          <strong className="clock">{hm(clock)}</strong>
          <span
            className={
              "connection " + (demo ? "preview" : !online ? "offline" : "")
            }
          >
            {demo ? (
              <Sparkles size={18} />
            ) : online ? (
              <Wifi size={19} />
            ) : (
              <WifiOff size={19} />
            )}
            <span>
              {demo
                ? "Aperçu"
                : !online
                  ? "Hors ligne"
                  : sync === "degraded" || sync === "error"
                    ? "À resynchroniser"
                    : "En ligne"}
            </span>
          </span>
          <button
            className="icon-button"
            aria-label="Paramètres"
            onClick={() => shortcut("autres")}
          >
            <Settings />
          </button>
        </div>
      </header>
      {demo && (
        <div className="preview-banner">
          <span>
            <Sparkles size={16} /> Aperçu interactif · données fictives
          </span>
          <button onClick={() => open("login")}>
            Connecter Mes Missions <ChevronRight size={16} />
          </button>
        </div>
      )}
      {!online && (
        <div className="offline-banner">
          Dernier affichage conservé. Reconnecte-toi pour valider une mission.
        </div>
      )}
      <div className="workspace">
        <section className="missions-zone" aria-label="Missions du foyer">
          <div className="mission-toolbar">
            <span>
              <ClipboardList size={17} />
              {editor ? "L’atelier de vos missions" : "Les missions du moment"}
            </span>
            <div>
              {editor && <button className="text-button" onClick={()=>{setEditor(false);setModal("");}}>Terminer la gestion</button>}
              <button
                className="text-button"
                onClick={() => location.assign(missionsUrl)}
              >
                {editor ? "Retour maison" : "Mes Missions"}
              </button>
              {allowed && (
                <button className="text-button" onClick={() => open("new")}>
                  <Plus size={17} /> Ajouter
                </button>
              )}
            </div>
          </div>
          <div
            className="lists-viewport"
            ref={rail}
            onScroll={() => {
              if (rail.current) {
                let w =
                  rail.current.querySelector(".person-card")?.clientWidth || 1;
                setPos(Math.round(rail.current.scrollLeft / (w + 16)));
              }
            }}
          >
            {people.map((p: Any) => {
              let rows = all.filter(
                (o: Any) =>
                  o.person === p.id &&
                  o.status === "open" &&
                  !o.spec.paused &&
                  (new Date(o.visible) <= clock || new Date(o.ends) <= clock),
              );
              let overdue = rows
                  .filter((o: Any) => new Date(o.ends) <= clock)
                  .sort(
                    (a: Any, b: Any) => +new Date(a.ends) - +new Date(b.ends),
                  ),
                now = rows.filter(
                  (o: Any) =>
                    new Date(o.ends) > clock && new Date(o.due) <= clock,
                ),
                upcoming = rows.filter(
                  (o: Any) =>
                    new Date(o.due) > clock && new Date(o.ends) > clock,
                );
              let count = daily(p),
                n = count.T + count.L;
              return (
                <article className={"person-card " + p.id} key={p.id}>
                  <div className="person-header">
                    <button
                      className="avatar-button"
                      disabled={!!s.deviceId}
                      aria-label={"Modifier l’avatar de " + p.name}
                      onClick={() => open("avatar", p)}
                    >
                      <Avatar p={p} size={64} />
                    </button>
                    <div>
                      <h2>{p.name}</h2>
                      <p>Ses petits pas du jour</p>
                    </div>
                    <Ring
                      done={n}
                      total={count.D}
                      color={
                        p.id === "annabelle"
                          ? "#ef5487"
                          : p.id === "papa"
                            ? "#1386ce"
                            : "#39a780"
                      }
                    />
                  </div>
                  <div className="task-scroll">
                    {[
                      [overdue, "En retard", TriangleAlert, "late"],
                      [now, "À faire maintenant", Clock, "now"],
                      [upcoming, "À venir", Hourglass, "upcoming"],
                    ].map(
                      ([items, title, Icon, kind]: Any) =>
                        items.length > 0 && (
                          <div key={kind} className={"task-group " + kind}>
                            <h3>
                              <Icon size={18} />
                              {title}
                            </h3>
                            {items.sort((a: Any, b: Any) =>
                              (a.spec.ui?.listId || "general").localeCompare(b.spec.ui?.listId || "general") || Date.parse(a.due) - Date.parse(b.due)
                            ).map((o: Any) => {
                              const I = taskIcon(o.title);
                              const previous = items[items.indexOf(o) - 1];
                              const listId = o.spec.ui?.listId || "general";
                              const listStart = !previous || (previous.spec.ui?.listId || "general") !== listId;
                              return (
                                <div className="task" key={o.id}>
                                  <button
                                    className="check-task"
                                    disabled={busy || !online}
                                    aria-label={"Valider " + o.title}
                                    onClick={() => doAction("complete", o)}
                                  >
                                    <Check size={18} />
                                  </button>
                                  <div className="task-copy">
                                    {listStart && <small className="mission-list-label">{o.spec.ui?.icon || "🌿"} {o.spec.ui?.title || "Mes missions"}</small>}
                                    <strong>{o.title}</strong>
                                    {o.spec.steps?.length > 0 && <small>{o.spec.steps.filter((st:Any)=>o.spec.stepDone?.[st.id]).length} / {o.spec.steps.length} étapes · toucher pour ouvrir</small>}
                                    <span>
                                      {dueText(o)}
                                      {o.spec.mode === "relative"
                                        ? " · après validation"
                                        : ""}
                                    </span>
                                  </div>
                                  <I className="task-art" size={27} />
                                  <button
                                    className="task-menu"
                                    aria-label={"Actions pour " + o.title}
                                    onClick={() => open("task", o)}
                                  >
                                    <MoreHorizontal size={19} />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        ),
                    )}
                    {!rows.length && (
                      <div className="empty">
                        <Sun size={38} />
                        <h3>
                          {count.D && n === count.D
                            ? "Tout est fait pour aujourd’hui !"
                            : "De la place pour souffler"}
                        </h3>
                        <p>
                          {count.D
                            ? "Merci pour ces petites attentions."
                            : "Tes missions apparaîtront au bon moment."}
                        </p>
                        {allowed && (
                          <button onClick={() => open("new", p)}>
                            Ajouter une mission
                          </button>
                        )}
                      </div>
                    )}
                    {editor && (
                      <div className="definitions">
                        <h3>Vos routines</h3>
                        {s.definitions
                          .filter((d: Any) => d.person === p.id && !d.archived)
                          .map((d: Any) => (
                            <div className="definition" key={d.id}>
                              <span>
                                {d.title}
                                <small>
                                  {d.spec.mode === "none" ? "Sans date · dans la gestion" :
                                    (d.spec.mode === "relative" ? "Après validation" : d.spec.mode === "once" ? "Une fois" : "Calendrier fixe") + " · " + d.spec.every + " " + (d.spec.unit === "weeks" ? "sem." : d.spec.unit === "hours" ? "h" : d.spec.unit === "minutes" ? "min" : "j")}
                                </small>
                              </span>
                              {allowed && (
                                <button onClick={() => open("edit", d)}>
                                  Modifier
                                </button>
                              )}
                              <button
                                disabled={!allowed}
                                hidden={d.spec.mode === "none"}
                                aria-label={"Mettre en pause " + d.title}
                                onClick={() =>
                                  mutate("edit", {
                                    id: d.id,
                                    version: d.version,
                                    spec: { paused: !d.spec.paused },
                                  }).catch(() => {})
                                }
                              >
                                {d.spec.paused ? "Reprendre" : "Pause"}
                              </button>
                              <button
                                disabled={!allowed}
                                aria-label={"Archiver " + d.title}
                                onClick={() => {
                                  if (
                                    confirm(
                                      "Archiver cette routine ? Les occurrences et l’historique restent conservés.",
                                    )
                                  )
                                    mutate("archive", {
                                      id: d.id,
                                      version: d.version,
                                    }).catch(() => {});
                                }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          <nav className="person-tabs" aria-label="Afficher les listes">
            <button
              className="arrow"
              aria-label="Liste précédente"
              onClick={() => move(Math.max(0, pos - 1))}
            >
              <ChevronLeft />
            </button>
            {people.map((p: Any, i: number) => (
              <button
                key={p.id}
                className={p.id + (pos === i ? " active" : "")}
                onClick={() =>
                  move(
                    innerWidth <= 900
                      ? i
                      : Math.min(i, Math.max(0, people.length - 2)),
                  )
                }
              >
                <Avatar p={p} size={31} />
                <span>{p.name}</span>
                {i === 2 && <ChevronRight size={17} />}
              </button>
            ))}
            <button
              className="arrow"
              aria-label="Liste suivante"
              onClick={() => move(Math.min(people.length - 1, pos + 1))}
            >
              <ChevronRight />
            </button>
          </nav>
        </section>
        <aside className="rules-panel">
          <div className="rules-heading">
            <span>
              <Home size={30} />
            </span>
            <div>
              <h2>Nos réflexes</h2>
              <p>Les règles de vie</p>
            </div>
          </div>
          <div className="rules-scroll">
            {s.config.rules.map((r: string, i: number) => {
              const I = [Shirt, Sparkles, Handshake, Heart, Leaf][i % 5];
              return (
                <div className="rule" key={i}>
                  <I size={27} />
                  <span>{r}</span>
                </div>
              );
            })}
          </div>
          {ritual && (
            <div className="ritual">
              <div>
                <Moon size={24} />
                <strong>{ritual.title}</strong>
                <span>{ritual.minutes} min</span>
              </div>
              <p>{ritual.text}</p>
              {ritual.enabled && (
                <small>
                  <Clock size={12} /> Rappel à {ritual.time}
                </small>
              )}
            </div>
          )}
        </aside>
        <aside className="shortcut-rail" aria-label="Accès rapides">
          <span>
            Accès
            <br />
            rapides
          </span>
          {Object.entries(icons).map(([key, I]) => (
            <button
              title={labels[key]}
              aria-label={labels[key]}
              className={"shortcut " + key}
              key={key}
              onClick={() => shortcut(key)}
            >
              <I size={28} />
            </button>
          ))}
        </aside>
      </div>
      <footer className="daily-panel">
        <button className="daily-heading" onClick={() => open("stats")}>
          <Sun size={30} />
          <span>
            <strong>Les petites victoires du jour</strong>
            <small>Chaque petit geste compte.</small>
            <em>
              Voir les statistiques <ChevronRight size={13} />
            </em>
          </span>
        </button>
        <div className="daily-cards">
          {people.map((p: Any) => {
            let c = daily(p);
            return (
              <button
                className={"daily-card " + p.id}
                key={p.id}
                onClick={() => {
                  setFilter(p.id);
                  open("stats");
                }}
              >
                <Avatar p={p} size={43} />
                <div>
                  <strong>{p.name}</strong>
                  <small>{feedback(p, c, s.config.tone)}</small>
                </div>
                <Ring
                  done={c.T + c.L}
                  total={c.D}
                  small
                  color={
                    p.id === "annabelle"
                      ? "#ef5487"
                      : p.id === "papa"
                        ? "#1386ce"
                        : "#39a780"
                  }
                />
              </button>
            );
          })}
        </div>
      </footer>
      <div className="app-foot">
        <span>Notre Maison · V1.4</span>
        <button onClick={() => open("diagnostic")}>
          {demo
            ? "Explorer l’aperçu"
            : sync === "live"
              ? "Synchronisé"
              : "État de connexion"}
        </button>
        {!demo && (
          <button
            onClick={async () => {
              await post("/api/logout", {});
              localStorage.setItem("nm-auth-logout", String(Date.now()));
              clearCache();
              setS(demoSnapshot());
              setDemo(true);
              setSync("preview");
            }}
          >
            <LogOut size={12} /> Déconnexion
          </button>
        )}
      </div>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
      {modal === "login" && (
        <Modal title="Retrouver le foyer" close={() => setModal("")}>
          <p>
            Utilise ton compte personnel Mes Missions. Tes listes existantes
            restent préservées.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              setBusy(true);
              try {
                await post("/api/login", {
                  email: fd.get("email"),
                  password: fd.get("password"),
                });
                await refresh();
                setModal("");
              } catch (e) {
                notify(errorText(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Adresse e-mail
              <input
                name="email"
                type="email"
                autoComplete="username"
                required
              />
            </label>
            <label>
              Mot de passe
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                minLength={1}
              />
            </label>
            <button className="primary" disabled={busy}>
              Se connecter
            </button>
          </form>
          <hr />
          <h3>Associer une liste à cet appareil</h3>
          <p>
            Un parent peut créer un identifiant et un code temporaire depuis les
            paramètres.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              let fd = new FormData(e.currentTarget);
              try {
                await post("/api/pair", Object.fromEntries(fd));
                await refresh();
                setModal("");
              } catch (e) {
                notify(errorText(e));
              }
            }}
          >
            <label>
              Identifiant
              <input name="identifier" required />
            </label>
            <label>
              Code
              <input name="code" required autoComplete="off" />
            </label>
            <label>
              Nom de cet appareil
              <input name="label" defaultValue="Tablette familiale" required />
            </label>
            <button className="secondary">Associer cette liste</button>
          </form>
        </Modal>
      )}
      {modal === "avatar" && (
        <Modal
          title={"L’avatar de " + selected.name}
          close={() => setModal("")}
        >
          <p>Choisis un portrait qui lui ressemble, ou importe une photo.</p>
          <div className="avatar-grid">
            {Array.from({ length: 6 }, (_, i) => (
              <button
                key={i}
                className={
                  selected.avatar === i && !selected.image ? "chosen" : ""
                }
                aria-label={"Choisir le portrait " + (i + 1)}
                onClick={() => saveAvatar(i)}
              >
                <Avatar p={{ ...selected, avatar: i, image: "" }} size={95} />
              </button>
            ))}
          </div>
          <label className="photo-label">
            <Upload size={18} /> Importer une photo
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => e.target.files?.[0] && photo(e.target.files[0])}
            />
          </label>
          <small className="help">
            JPEG, PNG ou WebP · 5 Mo maximum. L’image est recadrée et allégée ;
            ses métadonnées originales ne sont pas conservées.
          </small>
          <button
            className="text-button"
            onClick={() =>
              saveAvatar(
                peopleDefault.find((p) => p.id === selected.id)?.avatar || 0,
              )
            }
          >
            Revenir à l’avatar par défaut
          </button>
        </Modal>
      )}
      {(modal === "new" || modal === "edit") && (
        <Modal title={modal === "edit" ? "Modifier la mission" : "Ajouter une mission"} close={() => setModal("")}>
          {!demo && (s.apiVersion || 0) < 12 ? <p>Installer le complément Supabase V12 avant de créer les nouvelles missions.</p> :
          <MissionForm people={s.config.people} person={selected?.person} definition={modal === "edit" ? selected : undefined} definitions={s.definitions} onSave={async data => {
            await mutate(modal === "edit" ? "edit" : "create", {...data,...(modal === "edit" ? {id:selected.id,version:selected.version,replaceSchedule:data.replaceSchedule}:{})});setModal("");
          }}/>}
        </Modal>
      )}
      {modal === "steps" && (() => {
        const occurrence=s.occurrences.find((o:Any)=>o.id===selected.id)||selected;
        const steps=occurrence.spec.steps||[],done=occurrence.spec.stepDone||{};
        return <Modal title={occurrence.title} close={()=>setModal("")}>
          <p>{steps.filter((st:Any)=>done[st.id]).length} / {steps.length} étapes terminées</p>
          <button type="button" onClick={()=>setGuidedSteps(!guidedSteps)}>{guidedSteps?"Voir toute la checklist":"Une étape à la fois"}</button>
          {steps.every((st:Any)=>done[st.id])&&occurrence.status==="open"&&<button disabled={busy||!online} onClick={async()=>{try{await mutate("complete",{id:occurrence.id,version:occurrence.version});setModal("");}catch{}}}>Confirmer la fin de la mission</button>}
          {steps.filter((st:Any)=>!guidedSteps||st===steps.find((x:Any)=>!done[x.id])).map((st:Any)=><label className="step-check" key={st.id}>
            <input type="checkbox" checked={!!done[st.id]} disabled={busy||!online||occurrence.status!=="open"} onChange={async e=>{
              try{const out=await mutate("step",{id:occurrence.id,version:occurrence.version,stepId:st.id,done:e.target.checked});if(out?.completed){setModal("");notify("Mission terminée, bravo !");}}catch{}
            }}/><span>{st.time?st.time.replace(":"," h ")+" · ":""}{st.title}</span>
          </label>)}
        </Modal>;
      })()}
      {modal === "task" && (
        <Modal title={selected.title} close={() => setModal("")}>
          <p>
            {dueText(selected)} ·{" "}
            {selected.spec.mode === "relative"
              ? "Date relative à la dernière validation"
              : "Occurrence à date fixe"}
          </p>
          <div className="action-list">
            <button
              className="primary"
              onClick={() => doAction("complete", selected)}
            >
              <Check /> C’est fait
            </button>
            {allowed && (
              <>
                <button onClick={() => doAction("reschedule", selected)}>
                  <Clock /> Reporter cette occurrence
                </button>
                <button onClick={() => doAction("skip", selected)}>
                  <ChevronRight /> Je passe mon tour
                </button>
                <button onClick={() => doAction("cancel", selected)}>
                  <X /> Cette occurrence est devenue inutile
                </button>
              </>
            )}
          </div>
          <small className="help">
            Un report ou un saut reste dans l’historique. Il ne devient jamais
            une tâche réalisée.
          </small>
        </Modal>
      )}
      {modal === "stats" && (
        <Modal title="Les petites victoires" close={() => setModal("")} wide>
          <div className="stats-filters">
            <label>
              Du
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label>
              Au
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
            <label>
              Personne
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">Tout le foyer</option>
                {people.map((p: Any) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={() => {
                if (!demo) refresh();
              }}
            >
              <RefreshCw size={18} /> Actualiser
            </button>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Personne</th>
                  <th>À temps</th>
                  <th>En retard</th>
                  <th>Sautées</th>
                  <th>Non faites</th>
                  <th>À venir</th>
                  <th>Réalisation</th>
                  <th>Ponctualité</th>
                </tr>
              </thead>
              <tbody>
                {people
                  .filter((p: Any) => filter === "all" || p.id === filter)
                  .map((p: Any) => {
                    let c = counters(
                      all.filter(
                        (o: Any) =>
                          o.person === p.id &&
                          day(o.original_due) >= from &&
                          day(o.original_due) <= to,
                      ),
                    );
                    return (
                      <tr key={p.id}>
                        <th>
                          <Avatar p={p} size={32} />
                          {p.name}
                        </th>
                        <td>{c.T}</td>
                        <td>{c.L}</td>
                        <td>{c.S}</td>
                        <td>{c.N}</td>
                        <td>{c.A}</td>
                        <td>
                          {c.D
                            ? Math.round(((c.T + c.L) / c.D) * 100) + " %"
                            : "—"}
                          {c.A > 0 ? " · provisoire" : ""}
                        </td>
                        <td>
                          {c.T + c.L
                            ? Math.round((c.T / (c.T + c.L)) * 100) + " %"
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          <p className="help">
            Une occurrence compte une seule fois, à sa date d’échéance initiale.
            Les annulations sont exclues du dénominateur. Une réalisation après
            cette échéance reste en retard même si elle a été reportée.
          </p>
          <button
            className="secondary"
            onClick={async () => {
              try {
                let x = demo
                  ? { events: [] }
                  : await rpc("history", { from, to });
                setHistory(x.events || []);
                open("history");
                setHistory(x.events || []);
              } catch (e) {
                notify(errorText(e));
              }
            }}
          >
            Voir les occurrences et la traçabilité
          </button>
        </Modal>
      )}
      {modal === "history" && (
        <Modal title="Historique des missions" close={() => setModal("")} wide>
          <div className="history-list">
            {all
              .filter(
                (o: Any) =>
                  (filter === "all" || o.person === filter) &&
                  o.status !== "open" &&
                  day(o.original_due) >= from &&
                  day(o.original_due) <= to,
              )
              .slice(-150)
              .reverse()
              .map((o: Any) => (
                <div className="history-row" key={o.id}>
                  <span>
                    <strong>{o.title}</strong>
                    <small>
                      {people.find((p: Any) => p.id === o.person)?.name} ·{" "}
                      {dueText(o)}
                    </small>
                  </span>
                  <span>
                    {o.status === "done"
                      ? "Réalisée"
                      : o.status === "skipped"
                        ? "Tour passé"
                        : "Annulée"}
                  </span>
                  {allowed && (
                    <button onClick={() => doAction("reopen", o)}>
                      Corriger
                    </button>
                  )}
                </div>
              ))}
            {!all.some((o: Any) => o.status !== "open") && (
              <p>Aucune réalisation à afficher pour cette période.</p>
            )}
            <h3>Événements</h3>
            {history
              .filter((e: Any) => day(e.at) >= from && day(e.at) <= to)
              .slice(-150)
              .reverse()
              .map((e: Any) => (
                <div className="event" key={e.id}>
                  <span>{dueText({ due: e.at })}</span>
                  <strong>
                    {(
                      {
                        complete: "Réalisation",
                        reschedule: "Report",
                        skip: "Tour passé",
                        cancel: "Annulation",
                        reopen: "Correction",
                      } as Any
                    )[e.kind] || e.kind}
                  </strong>
                  <span>{e.after_data?.title}</span>
                  <small>
                    {e.reason || ""}
                    {e.device ? " · depuis un appareil associé" : ""}
                  </small>
                </div>
              ))}
          </div>
        </Modal>
      )}
      {modal === "camera" && (
        <Modal
          title="Caméra Jonathan"
          close={() => {
            setCameraLock(false);
            setModal("");
          }}
          wide
        >
          <div className="camera-stage">
            {s.config.cameraUrl ? (
              <video
                src={s.config.cameraUrl}
                autoPlay
                playsInline
                controls
                onPlaying={() => setCameraGood(true)}
                onStalled={() => setCameraGood(false)}
                onError={() => setCameraGood(false)}
              />
            ) : (
              <div>
                <Camera size={60} />
                <h3>Le flux caméra reste à configurer</h3>
                <p>
                  Ajoute une URL vidéo HTTPS compatible dans les paramètres.
                </p>
              </div>
            )}
          </div>
          {s.config.cameraUrl && (
            <p className={cameraGood ? "help" : "warning"}>
              {cameraGood
                ? "Lecture du flux en cours"
                : "Aucune vidéo fraîche confirmée · vérifier le flux"}
            </p>
          )}
          <div className="camera-actions">
            <p>
              {cameraLock
                ? "Maintien verrouillé sur cet appareil"
                : "Retour automatique après inactivité"}
            </p>
            <button
              className="primary"
              onClick={() => {
                if (cameraLock) {
                  setCameraLock(false);
                  setModal("");
                } else setCameraLock(true);
              }}
            >
              {cameraLock ? <UnlockKeyhole /> : <LockKeyhole />}
              {cameraLock
                ? "Déverrouiller et revenir"
                : "Maintenir la surveillance"}
            </button>
          </div>
        </Modal>
      )}
      {modal === "settings" && (
        <Modal title="La maison, à votre façon" close={() => setModal("")} wide>
          {!allowed ? (
            <form onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              e.currentTarget.reset();
              setBusy(true);
              try {
                const data = await unlockParent(String(fd.get("email") || ""), String(fd.get("password") || ""));
                configVersion.current = data.revision;
                setS(data); setDemo(false); setSync("live");
                setDraft(JSON.parse(JSON.stringify(data.config)));
                lastTouch.current = Date.now();
                notify("Paramètres déverrouillés. Ferme-les pour revenir à l’accès familial.");
              } catch (error) { notify(errorText(error)); }
              finally { setBusy(false); }
            }}>
              <p>Déverrouille les paramètres avec ton compte parent du foyer. L’association de la tablette est conservée.</p>
              <label>Adresse e-mail du parent<input name="email" type="email" autoComplete="username" required /></label>
              <label>Mot de passe<input name="password" type="password" autoComplete="off" required /></label>
              <button className="primary" disabled={busy || !online}>Déverrouiller les paramètres</button>
              <p>Le compte parent n’est pas enregistré. Fermeture des paramètres, inactivité ou passage en arrière-plan : retour à l’accès familial.</p>
            </form>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await mutate("config", {
                    config: draft,
                    version: configVersion.current,
                  });
                  setModal("");
                  notify("Les réglages sont enregistrés.");
                } catch {}
              }}
            >
              <div className="settings-actions">
                <button type="button" onClick={()=>{setEditor(true);setModal("");}}>Gérer les missions sur cette tablette</button>
                <button type="button" onClick={()=>open("new")}>Ajouter une mission</button>
              </div>
              <div className="settings-grid">
                <section>
                  <h3>
                    <UserRound size={19} /> Les trois personnes
                  </h3>
                  {(draft?.people || []).map((p: Any, i: number) => (
                    <div className="person-setting" key={p.id}>
                      <button type="button" onClick={() => open("avatar", p)}>
                        <Avatar p={p} size={45} />
                      </button>
                      <input
                        aria-label={"Nom de " + p.id}
                        value={p.name}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            people: draft.people.map((x: Any, j: number) =>
                              j === i ? { ...x, name: e.target.value } : x,
                            ),
                          })
                        }
                      />
                      <select
                        aria-label={
                          "Compte destinataire des rappels pour " + p.name
                        }
                        value={p.userId || ""}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            people: draft.people.map((x: Any, j: number) =>
                              j === i ? { ...x, userId: e.target.value } : x,
                            ),
                          })
                        }
                      >
                        <option value="">Rappels : compte à associer</option>
                        {s.profiles?.map((u: Any) => (
                          <option value={u.id} key={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                  <label>
                    Règles de vie · une par ligne
                    <textarea
                      rows={6}
                      value={draft?.rules.join("\n") || ""}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          rules: e.target.value.split("\n").filter(Boolean),
                        })
                      }
                    />
                  </label>
                  <label>
                    Messages d’encouragement
                    <select
                      value={draft?.tone || "fun"}
                      onChange={(e) =>
                        setDraft({ ...draft, tone: e.target.value })
                      }
                    >
                      <option value="fun">Ludiques</option>
                      <option value="soft">Tout doux</option>
                      <option value="discreet">Discrets</option>
                    </select>
                  </label>
                </section>
                <section>
                  <h3>
                    <Moon size={19} /> Rituel familial
                  </h3>
                  {draft?.rituals?.map((r: Any, i: number) => (
                    <div key={r.id}>
                      <label>
                        Titre
                        <input
                          value={r.title}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              rituals: draft.rituals.map((x: Any, j: number) =>
                                i === j ? { ...x, title: e.target.value } : x,
                              ),
                            })
                          }
                        />
                      </label>
                      <label>
                        Description
                        <textarea
                          rows={2}
                          value={r.text}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              rituals: draft.rituals.map((x: Any, j: number) =>
                                i === j ? { ...x, text: e.target.value } : x,
                              ),
                            })
                          }
                        />
                      </label>
                      <div className="form-row">
                        <label>
                          Heure
                          <input
                            type="time"
                            value={r.time}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                rituals: draft.rituals.map(
                                  (x: Any, j: number) =>
                                    i === j
                                      ? { ...x, time: e.target.value }
                                      : x,
                                ),
                              })
                            }
                          />
                        </label>
                        <label>
                          Durée
                          <input
                            type="number"
                            min={1}
                            max={120}
                            value={r.minutes}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                rituals: draft.rituals.map(
                                  (x: Any, j: number) =>
                                    i === j
                                      ? {
                                          ...x,
                                          minutes: Number(e.target.value),
                                        }
                                      : x,
                                ),
                              })
                            }
                          />
                        </label>
                      </div>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={r.enabled}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              rituals: draft.rituals.map((x: Any, j: number) =>
                                i === j
                                  ? { ...x, enabled: e.target.checked }
                                  : x,
                              ),
                            })
                          }
                        />{" "}
                        Rappel sonore sur cette tablette
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            rituals: draft.rituals.filter(
                              (x: Any) => x.id !== r.id,
                            ),
                          })
                        }
                      >
                        Retirer ce rituel
                      </button>
                      <hr />
                    </div>
                  ))}
                  <button
                    type="button"
                    disabled={draft?.rituals?.length >= 10}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        rituals: [
                          ...(draft.rituals || []),
                          {
                            id: "ritual-" + Date.now(),
                            title: "Un moment ensemble",
                            text: "",
                            time: "19:00",
                            minutes: 10,
                            enabled: false,
                          },
                        ],
                      })
                    }
                  >
                    <Plus size={16} /> Ajouter un rituel
                  </button>
                  <h3>
                    <Clock size={19} /> Tablette et son
                  </h3>
                  <label>
                    Retour après inactivité · secondes
                    <input
                      type="number"
                      min={30}
                      max={600}
                      value={draft?.idleSeconds || 120}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          idleSeconds: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                  <div className="form-row">
                    <label>
                      Silence à partir de
                      <input
                        type="time"
                        value={draft?.quietStart || "22:00"}
                        onChange={(e) =>
                          setDraft({ ...draft, quietStart: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Fin du silence
                      <input
                        type="time"
                        value={draft?.quietEnd || "07:00"}
                        onChange={(e) =>
                          setDraft({ ...draft, quietEnd: e.target.value })
                        }
                      />
                    </label>
                  </div>
                  <label>
                    URL vidéo caméra · HTTPS
                    <input
                      type="url"
                      value={draft?.cameraUrl || ""}
                      placeholder="https://…"
                      onChange={(e) =>
                        setDraft({ ...draft, cameraUrl: e.target.value })
                      }
                    />
                  </label>
                </section>
              </div>
              <h3>
                <Link2 size={19} /> Accès rapides
              </h3>
              {Object.keys(icons)
                .filter((k) => !["autres", "camera"].includes(k))
                .map((key) => {
                  let item = draft?.shortcuts.find(
                    (x: Any) => x.icon === key,
                  ) || { icon: key, type: "url", target: "" };
                  const change = (patch: Any) =>
                    setDraft({
                      ...draft,
                      shortcuts: [
                        ...draft.shortcuts.filter((x: Any) => x.icon !== key),
                        { ...item, ...patch },
                      ],
                    });
                  return (
                    <div className="shortcut-setting" key={key}>
                      <strong>{labels[key]}</strong>
                      <select
                        value={item.type}
                        onChange={(e) => change({ type: e.target.value })}
                      >
                        <option value="url">URL HTTPS</option>
                        <option value="android">
                          Application Android (intent)
                        </option>
                      </select>
                      <input
                        value={item.target}
                        placeholder={
                          item.type === "url" ? "https://…" : "intent:…"
                        }
                        onChange={(e) => change({ target: e.target.value })}
                      />
                    </div>
                  );
                })}
              <div className="settings-actions">
                <button className="primary" disabled={busy}>
                  <Save size={17} /> Enregistrer les réglages
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      let A = window.AudioContext;
                      audioContext.current = new A();
                      await audioContext.current.resume();
                      setAudio(true);
                      beep();
                      notify(
                        "Son prêt pour cette session. Vérifie aussi le volume Android.",
                      );
                    } catch {
                      notify("Le navigateur n’a pas autorisé le son.");
                    }
                  }}
                >
                  <Volume2 size={17} />
                  {audio ? "Tester le son" : "Activer et tester le son"}
                </button>
                <button
                  type="button"
                  disabled={demo || !!s.deviceId}
                  onClick={async () => {
                    try {
                      if (!("PushManager" in window))
                        throw Error("Notifications non disponibles");
                      const permission = await Notification.requestPermission();
                      if (permission !== "granted") {
                        notify(
                          "Notifications non autorisées sur cet appareil.",
                        );
                        return;
                      }
                      const key = await rpc("public_key");
                      if (!key) throw Error("Clé de notification indisponible");
                      const bytes = Uint8Array.from(
                        atob(key.replace(/-/g, "+").replace(/_/g, "/")),
                        (c) => c.charCodeAt(0),
                      );
                      const reg = await navigator.serviceWorker.ready;
                      const sub =
                        (await reg.pushManager.getSubscription()) ||
                        (await reg.pushManager.subscribe({
                          userVisibleOnly: true,
                          applicationServerKey: bytes,
                        }));
                      await rpc("subscribe", { subscription: sub.toJSON() });
                      notify(
                        "Notifications activées. Associe le compte destinataire à chaque personne dans les paramètres.",
                      );
                    } catch (e) {
                      notify(errorText(e));
                    }
                  }}
                >
                  <Volume2 size={17} /> Notifications en arrière-plan
                </button>

              </div>
              <hr />
              <ScreenSettings />
              <hr />
              <div className="settings-actions">
                <button type="button" onClick={() => open("access")}>
                  <LockKeyhole size={16} /> Accès des appareils
                </button>
                <button type="button" onClick={downloadExport}>
                  <Download size={17} /> Sauvegarder
                </button>

              </div>
            </form>
          )}
        </Modal>
      )}
      {modal === "access" && (
        <Modal title="Accès des appareils" close={() => setModal("")}>
          <p>
            Un code associe un appareil à une liste ou aux trois listes de la
            tablette, avec lecture et validation. Il expire après 24 h et ne
            sert qu’une fois.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              let fd = new FormData(e.currentTarget);
              try {
                const g = await mutate("grant", {
                  person: fd.get("person"),
                  permissions: {
                    camera: fd.get("camera") === "on",
                    shortcuts: fd.get("shortcuts") === "on",
                  },
                });
                if (g) setGrant(g);
              } catch {}
            }}
          >
            <label>
              Liste
              <select name="person">
                <option value="home">Tablette familiale · trois listes</option>
                {people.map((p: Any) => (
                  <option value={p.id} key={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="checkbox-label">
              <input type="checkbox" name="camera" /> Tablette familiale :
              autoriser aussi la caméra
            </label>
            <label className="checkbox-label">
              <input type="checkbox" name="shortcuts" /> Tablette familiale :
              autoriser aussi les raccourcis
            </label>
            <small className="help">
              Ces options ne s’appliquent qu’à l’accès aux trois listes. Un
              accès à une seule liste reste limité à ses missions.
            </small>
            <button className="primary">Créer un accès</button>
          </form>
          {grant && (
            <div className="grant">
              <p>À saisir sur l’autre appareil :</p>
              <label>
                Identifiant
                <input readOnly value={grant.identifier} />
              </label>
              <label>
                Code
                <input readOnly value={grant.code} />
              </label>
            </div>
          )}
          <h3>Associations créées</h3>
          {s.grants
            ?.filter((g: Any) => !g.revoked)
            .map((g: Any) => (
              <div className="history-row" key={g.id}>
                <span>
                  {people.find((p: Any) => p.id === g.person)?.name ||
                    "Tablette familiale"}
                  <small>
                    {g.used ? "Appareil associé" : "Code en attente"}
                  </small>
                </span>
                <button
                  onClick={() => mutate("revoke", { id: g.id }).catch(() => {})}
                >
                  Révoquer
                </button>
              </div>
            ))}
        </Modal>
      )}
      {modal === "import" && (
        <Modal title="Reprendre les listes V10" close={() => setModal("")}>
          <p>
            Dans Mes Missions, ouvre « Mon atelier », puis « Administration · reprise des listes V10 ». Choisis une seule liste et vérifie son aperçu, sa
            sauvegarde et la visibilité dans le foyer avant de confirmer.
          </p>
          <p>
            Cette reprise utilise les clés de source existantes, protège
            l’ancienne liste et bloque ses anciens rappels. Les coches anciennes
            restent des observations.
          </p>
          <button
            className="primary"
            onClick={() => location.assign(missionsUrl)}
          >
            Ouvrir la reprise dans Mes Missions
          </button>
        </Modal>
      )}
      {modal === "diagnostic" && (
        <Modal title="État de la maison" close={() => setModal("")}>
          <dl>
            <dt>Version</dt>
            <dd>1.2.0 · GitHub Pages</dd>
            <dt>Mode</dt>
            <dd>
              {demo
                ? "Présentation interactive, sans écriture serveur"
                : "Connecté à Mes Missions"}
            </dd>
            <dt>Synchronisation</dt>
            <dd>
              {sync === "live"
                ? "Révision vérifiée chaque seconde (écran visible)"
                : sync}
            </dd>
            <dt>Son</dt>
            <dd>
              {audio
                ? "Activé dans cette session"
                : "À activer depuis les paramètres"}
            </dd>
            <dt>Caméra</dt>
            <dd>
              {s.config.cameraUrl
                ? "URL renseignée, compatibilité à vérifier"
                : "Non configurée"}
            </dd>
            <dt>Appareils Android externes</dt>
            <dd>
              Le lancement dépend de l’application. Le retour forcé depuis une
              autre app nécessite un mode kiosque Android.
            </dd>
          </dl>
          <button className="secondary" onClick={() => refresh()}>
            <RefreshCw /> Resynchroniser
          </button>
          {demo && (
            <button className="primary" onClick={() => open("login")}>
              Connecter Mes Missions
            </button>
          )}
        </Modal>
      )}
    </div>
  );
}
