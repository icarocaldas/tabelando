// Regras do bolão (separadas para teste).
import { ESPN, getJSON, evInfo } from "./espn.mjs";
export const cleanCode = c => String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
export const cleanName = n => String(n || "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 24);
export function points(pick, res){
  if (!pick || !res || res.state !== "final" || res.hs == null) return null;
  const [a, b] = pick.split("-").map(Number); if (isNaN(a) || isNaN(b)) return 0;
  if (a === res.hs && b === res.as) return 3;
  return Math.sign(a - b) === Math.sign(res.hs - res.as) ? 1 : 0;
}
export async function fillMissing(matches, results, now = Date.now(), max = 6){
  // matches that ended but the watcher did not record (old or not watched): look them up
  let n = 0;
  for (const [id, m] of Object.entries(matches)){
    if (results[id]?.state === "final" || Date.parse(m.kickoff) > now - 2 * 3600000 || n >= max) continue;
    n++;
    const d = new Date(m.kickoff); const ds = new Intl.DateTimeFormat("en-CA", {timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit"}).format(d).replace(/-/g, "");
    const j = await getJSON(`${ESPN}${m.slug}/scoreboard?dates=${ds}&limit=300`);
    const e = (j?.events || []).find(e => String(e.id) === String(id));
    if (e){ const i = evInfo(e, m.slug); results[id] = {home: i.home, away: i.away, hs: i.hs, as: i.as, state: i.state, kickoff: i.kickoff, slug: m.slug}; }
  }
  return results;
}
export function view(group, results, name, now = Date.now()){
  const members = group.members || [];
  const table = members.map(p => ({name: p, pts: 0, exact: 0, hits: 0, played: 0}));
  const matches = Object.entries(group.matches || {}).map(([id, m]) => {
    const started = Date.parse(m.kickoff) <= now, r = results[id] || null;
    const picks = group.picks?.[id] || {};
    const shown = {};
    for (const [who, pk] of Object.entries(picks)){
      if (started || who === name) shown[who] = pk;
      const pts = points(pk, r), row = table.find(t => t.name === who);
      if (row && pts != null){ row.pts += pts; row.played++; if (pts === 3) row.exact++; if (pts >= 1) row.hits++; }
    }
    return {id, ...m, started, result: r && r.hs != null ? {hs: r.hs, as: r.as, state: r.state} : null, picks: shown, count: Object.keys(picks).length};
  }).sort((a, b) => Date.parse(a.kickoff) - Date.parse(b.kickoff));
  table.sort((a, b) => b.pts - a.pts || b.exact - a.exact || b.hits - a.hits || a.name.localeCompare(b.name));
  return {code: group.code, title: group.title, created: group.created, members, table, matches};
}
