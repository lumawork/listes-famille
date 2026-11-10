// Tablet-only display rules (V1.4.4). Pure functions, tested in tests/tablet.test.cjs.
type Any = any;

// Calendar day in Europe/Paris, YYYY-MM-DD.
export const parisDay = (v: Any) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(v));

// A finished task stays on the board for the Paris day of its validation only.
export function doneToday(o: Any, now: Any) {
  return (
    o.status === "done" &&
    !!o.completed &&
    !o.spec?.paused &&
    parisDay(o.completed) === parisDay(now)
  );
}

// Board rows of one person: late first (oldest first), then now, upcoming, and the tasks done today.
export function boardRows(all: Any[], person: string, now: Any) {
  const t = +new Date(now);
  const open = all.filter(
    (o: Any) =>
      o.person === person &&
      o.status === "open" &&
      !o.spec?.paused &&
      (+new Date(o.visible) <= t || +new Date(o.ends) <= t),
  );
  return {
    overdue: open
      .filter((o: Any) => +new Date(o.ends) <= t)
      .sort((a: Any, b: Any) => +new Date(a.ends) - +new Date(b.ends)),
    now: open.filter(
      (o: Any) => +new Date(o.ends) > t && +new Date(o.due) <= t,
    ),
    upcoming: open.filter(
      (o: Any) => +new Date(o.due) > t && +new Date(o.ends) > t,
    ),
    done: all
      .filter((o: Any) => o.person === person && doneToday(o, now))
      .sort((a: Any, b: Any) => +new Date(b.completed) - +new Date(a.completed)),
    open,
  };
}

// Today's figures for one person: done, postponed, skipped ("passées"), cancelled.
export function personStats(all: Any[], person: string, now: Any) {
  const today = parisDay(now);
  const c = { done: 0, postponed: 0, skipped: 0, cancelled: 0 };
  for (const o of all) {
    if (o.person !== person || o.spec?.paused) continue;
    if (o.status === "done" && o.completed && parisDay(o.completed) === today)
      c.done++;
    if (parisDay(o.original_due) !== today) continue;
    if (o.status === "skipped") c.skipped++;
    else if (o.status === "cancelled") c.cancelled++;
    if (o.due && o.original_due && o.due !== o.original_due) c.postponed++;
  }
  return c;
}

// Header gauge "x/y": done today over today's tasks still on the board (cancelled and skipped excluded).
export function gauge(all: Any[], person: string, now: Any) {
  const b = boardRows(all, person, now);
  const done = b.done.length;
  const total = done + b.open.length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

// Local, per-tablet memory of the "Nos réflexes à la maison" banner. Closed by default.
export const RULES_KEY = "nm-tablet-rules-open";
export function readRulesOpen(storage: Any) {
  try {
    return storage?.getItem(RULES_KEY) === "1";
  } catch {
    return false;
  }
}
export function writeRulesOpen(storage: Any, open: boolean) {
  try {
    storage?.setItem(RULES_KEY, open ? "1" : "0");
  } catch {}
}

// Tools reachable from the menu panel (the old right-hand rail, without the settings entry).
export const TOOLS = ["agenda", "courses", "localisation", "volets", "camera"];
