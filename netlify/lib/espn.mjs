export const LEAGUES = [
  ["bra.1","bra","Brasileirão Série A"],["bra.2","brb","Brasileirão Série B"],["bra.copa_do_brazil","cdb","Copa do Brasil"],
  ["conmebol.libertadores","lib","Libertadores"],["conmebol.sudamericana","sula","Sul-Americana"],["uefa.champions","ucl","Champions League"],
  ["eng.1","epl","Premier League"],["esp.1","laliga","La Liga"],["ita.1","seriea","Serie A (Itália)"],["ger.1","bundesliga","Bundesliga"],
  ["fra.1","ligue1","Ligue 1"],["ksa.1","saudi","Saudi Pro League"],["usa.1","mls","MLS"]];
export const ESPN = "https://site.api.espn.com/apis/site/v2/sports/soccer/";
export const nrm = s => String(s||"").normalize("NFKD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/&/g," ").replace(/[^a-z0-9]+/g," ").trim();
const STRIP = new Set("fc afc cf sc ac ec cr se club clube de do da esporte sport club recife".split(" "));
export const core = n => { const t = nrm(n).split(" ").filter(w => !STRIP.has(w)); return t.join(" ") || nrm(n); };
export function sameTeam(a, b){
  const x = nrm(a), y = nrm(b); if (!x || !y) return false;
  if (x === y) return true;
  if (x.startsWith(y + " ") || y.startsWith(x + " ")) return Math.min(x.length, y.length) >= 4;
  const cx = core(a), cy = core(b); return cx && cy && cx === cy && cx.length >= 4;
}
export const dayBR = (d = new Date()) => new Intl.DateTimeFormat("en-CA", {timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit"}).format(d).replace(/-/g, "");
export async function getJSON(url, ms = 8000){
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), ms);
  try { const r = await fetch(url, {signal: ac.signal, headers: {"user-agent": "Mozilla/5.0 Tabelando"}}); return r.ok ? await r.json() : null; }
  catch(e){ return null; } finally { clearTimeout(t); }
}
export const scoreOf = s => s && typeof s === "object" ? (+s.value || +s.displayValue || 0) : (+s || 0);
// flatten a scoreboard event
export function evInfo(e, slug, key, comp){
  const c = e.competitions?.[0]; if (!c) return null;
  const H = c.competitors?.find(x => x.homeAway === "home"), A = c.competitors?.find(x => x.homeAway === "away"); if (!H || !A) return null;
  const st = c.status || e.status || {}, ty = st.type || {};
  const state = ty.state === "in" ? "live" : ty.state === "post" ? "final" : "scheduled";
  const goals = (c.details || []).filter(d => d.scoringPlay).map(d => ({min: d.clock?.displayValue || "", player: d.athletesInvolved?.[0]?.displayName || "", side: d.team?.id === H.team?.id ? "home" : "away", og: !!d.ownGoal, pen: !!d.penaltyKick}));
  return {id: String(e.id), slug, key, comp, kickoff: e.date, state, clock: st.displayClock || "", detail: ty.shortDetail || "",
    home: H.team?.displayName || H.team?.name, away: A.team?.displayName || A.team?.name,
    hs: state === "scheduled" ? null : scoreOf(H.score), as: state === "scheduled" ? null : scoreOf(A.score), goals,
    venue: c.venue?.fullName || "", tv: [...new Set([...(c.broadcasts||[]).flatMap(b => b.names||[]), ...(c.geoBroadcasts||[]).map(g => g.media?.shortName).filter(Boolean)])]};
}
export async function scoreboards(dates, leagues = LEAGUES){
  const res = await Promise.all(leagues.map(([slug, key, comp]) => getJSON(`${ESPN}${slug}/scoreboard?dates=${dates}&limit=500&lang=pt&region=br`).then(j => (j?.events || []).map(e => evInfo(e, slug, key, comp)).filter(Boolean))));
  return res.flat();
}
