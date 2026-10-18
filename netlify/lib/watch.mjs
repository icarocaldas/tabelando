// Lógica do vigia de gols (separada para poder testar sem o Netlify).
import { scoreboards, dayBR, sameTeam } from "./espn.mjs";
export async function runWatch({ s, send, now = new Date() }){
  const today = dayBR(now), yest = dayBR(new Date(now.getTime() - 86400000));
  const hour = +new Intl.DateTimeFormat("en-GB", {timeZone: "America/Sao_Paulo", hour: "2-digit", hour12: false}).format(now);
  const evs = await scoreboards(hour < 4 ? `${yest}-${today}` : today);
  if (!evs.length) return {events: 0, notes: 0};
  const prev = (await s.get("state/scores", {type: "json"})) || {};
  const next = {}, notes = [];
  for (const e of evs){
    const cur = {hs: e.hs, as: e.as, state: e.state};
    next[e.id] = cur;
    const p = prev[e.id];
    if (!p) continue;                                   // first time we see it: no alert
    const tot = (cur.hs || 0) + (cur.as || 0), ptot = (p.hs || 0) + (p.as || 0);
    if (e.state !== "scheduled" && tot > ptot){
      const g = e.goals[e.goals.length - 1];
      const who = g ? `${g.player || "Gol"}${g.pen ? " (pênalti)" : ""}${g.og ? " (contra)" : ""} ${g.min}` : "";
      const scorer = g ? (g.side === "home" ? e.home : e.away) : null;
      notes.push({kind: "goal", e, title: `⚽ GOL${scorer ? " do " + scorer : ""}!`, body: `${e.home} ${e.hs} × ${e.as} ${e.away}${who ? " · " + who.trim() : ""}\n${e.comp}`});
    } else if (e.state !== "scheduled" && tot < ptot){
      notes.push({kind: "var", e, title: "📺 Gol anulado", body: `${e.home} ${e.hs} × ${e.as} ${e.away}\n${e.comp}`});
    }
    if (p.state === "scheduled" && e.state === "live") notes.push({kind: "start", e, title: "🟢 Começou!", body: `${e.home} × ${e.away} · ${e.comp}${e.tv?.length ? " · " + e.tv.slice(0, 2).join(", ") : ""}`});
    if (p.state === "live" && e.state === "final") notes.push({kind: "end", e, title: "🏁 Fim de jogo", body: `${e.home} ${e.hs} × ${e.as} ${e.away}\n${e.comp}`});
  }
  await s.setJSON("state/scores", next);
  // results archive for the bolão (keep 21 days)
  const res = (await s.get("state/results", {type: "json"})) || {};
  const cutoff = now.getTime() - 21 * 86400000;
  for (const e of evs) res[e.id] = {home: e.home, away: e.away, hs: e.hs, as: e.as, state: e.state, kickoff: e.kickoff, slug: e.slug, comp: e.comp};
  for (const k in res) if (Date.parse(res[k].kickoff) < cutoff) delete res[k];
  await s.setJSON("state/results", res);
  if (!notes.length) return {events: evs.length, notes: 0};
  const { blobs } = await s.list({prefix: "subs/"});
  let sent = 0, gone = 0;
  for (const b of blobs){
    const sub = await s.get(b.key, {type: "json"}); if (!sub) continue;
    const mine = n => (sub.teams || []).some(t => sameTeam(t, n.e.home) || sameTeam(t, n.e.away));
    for (const n of notes){
      const fav = mine(n);
      const want = n.kind === "goal" || n.kind === "var" ? (sub.mode === "all" || fav) : (fav && sub.end !== false);
      if (!want) continue;
      const payload = JSON.stringify({title: n.title, body: n.body, tag: `${n.e.id}-${n.kind}-${n.e.hs}-${n.e.as}`, url: `/?jogo=${n.e.id}&d=${n.e.kickoff.slice(0, 10)}`, silent: !!sub.silent});
      const r = await send(sub.sub, payload);
      if (r === "gone"){ await s.delete(b.key); gone++; break; }
      if (r) sent++;
    }
  }
  return {events: evs.length, notes: notes.length, sent, gone};
}
