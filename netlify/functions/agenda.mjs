// Calendário (.ics) dos jogos de um time, para assinar no Google Agenda / iPhone.
import { LEAGUES, ESPN, getJSON, nrm, sameTeam, evInfo } from "../lib/espn.mjs";
import { store } from "../lib/store.mjs";
const ORDER = ["bra.1","bra.2","bra.copa_do_brazil","conmebol.libertadores","conmebol.sudamericana","eng.1","esp.1","ita.1","ger.1","fra.1","uefa.champions","ksa.1","usa.1"];
async function findTeam(name){
  const s = store(), key = "teams/" + nrm(name).replace(/ /g, "-");
  const hit = await s.get(key, {type: "json"}).catch(() => null);
  if (hit) return hit;
  for (const slug of ORDER){
    const j = await getJSON(`${ESPN}${slug}/teams`);
    const teams = (j?.sports?.[0]?.leagues?.[0]?.teams || []).map(t => t.team);
    const t = teams.find(t => [t.displayName, t.shortDisplayName, t.name, t.location, t.nickname].some(n => n && (nrm(n) === nrm(name) || sameTeam(n, name))));
    if (t){ const out = {id: t.id, slug, name: t.displayName}; await s.setJSON(key, out).catch(() => {}); return out; }
  }
  return null;
}
const esc = s => String(s || "").replace(/[\;,]/g, m => "\\" + m).replace(/\n/g, "\\n");
const dt = iso => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const fold = l => { const out = []; let s = l; while (s.length > 74){ out.push(s.slice(0, 74)); s = " " + s.slice(74); } out.push(s); return out.join("\r\n"); };
export default async (req) => {
  const u = new URL(req.url);
  const name = (u.searchParams.get("team") || "Sport").slice(0, 60);
  let t = u.searchParams.get("id") && u.searchParams.get("slug") ? {id: u.searchParams.get("id"), slug: u.searchParams.get("slug"), name} : await findTeam(name);
  if (!t) return new Response("Time não encontrado", {status: 404});
  const leaguesTried = [t.slug, ...ORDER.filter(x => x !== t.slug).slice(0, 4)];
  const [past, fix] = await Promise.all([getJSON(`${ESPN}${t.slug}/teams/${t.id}/schedule?lang=pt&region=br`), getJSON(`${ESPN}${t.slug}/teams/${t.id}/schedule?fixture=true&lang=pt&region=br`)]);
  const seen = new Set(), evs = [];
  for (const e of [...(past?.events || []), ...(fix?.events || [])]){
    if (seen.has(e.id)) continue; seen.add(e.id);
    const L = LEAGUES.find(l => l[0] === t.slug) || [t.slug, "", e.league?.name || ""];
    const i = evInfo(e, t.slug, L[1], e.league?.name || e.season?.name || L[2]); if (i) evs.push(i);
  }
  const now = Date.now();
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Tabelando//Agenda//PT-BR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc("⚽ " + (t.name || name) + " · Tabelando")}`, "X-WR-TIMEZONE:America/Sao_Paulo", "REFRESH-INTERVAL;VALUE=DURATION:PT6H", "X-PUBLISHED-TTL:PT6H"];
  for (const e of evs){
    if (Date.parse(e.kickoff) < now - 60 * 86400000) continue;
    const start = new Date(e.kickoff), end = new Date(start.getTime() + 2 * 3600000);
    const score = e.state === "final" ? ` (${e.hs}–${e.as})` : "";
    const desc = [e.comp, e.tv?.length ? "Onde assistir: " + e.tv.join(", ") : "", "Ao vivo: https://tabelando.netlify.app/"].filter(Boolean).join("\n");
    lines.push("BEGIN:VEVENT", `UID:espn-${e.id}@tabelando`, `DTSTAMP:${dt(new Date())}`, `DTSTART:${dt(start)}`, `DTEND:${dt(end)}`,
      fold(`SUMMARY:${esc("⚽ " + e.home + " x " + e.away + score)}`), fold(`DESCRIPTION:${esc(desc)}`), e.venue ? fold(`LOCATION:${esc(e.venue)}`) : null,
      "BEGIN:VALARM", "TRIGGER:-PT30M", "ACTION:DISPLAY", `DESCRIPTION:${esc("Daqui a 30 min: " + e.home + " x " + e.away)}`, "END:VALARM", "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return new Response(lines.filter(Boolean).join("\r\n") + "\r\n", {headers: {"content-type": "text/calendar; charset=utf-8", "cache-control": "public, max-age=10800", "content-disposition": `inline; filename="${nrm(name).replace(/ /g, "-") || "time"}.ics"`, "access-control-allow-origin": "*"}});
};
export const config = { path: ["/api/agenda.ics", "/api/agenda"] };
