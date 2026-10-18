// Estatísticas de um jogador (ESPN), em formato simples para o app.
import { getJSON } from "../lib/espn.mjs";
import { json } from "../lib/store.mjs";
const pick = (o, ...ks) => { for (const k of ks){ const v = k.split(".").reduce((a, b) => a?.[b], o); if (v != null && v !== "") return v; } return null; };
export default async (req) => {
  const u = new URL(req.url), id = (u.searchParams.get("id") || "").replace(/\D/g, ""), slug = (u.searchParams.get("slug") || "").replace(/[^a-z0-9._]/gi, "");
  if (!id) return json({ok: false, error: "id"}, 400);
  const base = "https://site.web.api.espn.com/apis/common/v3/sports/soccer";
  const [bio, ov] = await Promise.all([
    getJSON(`${base}/${slug ? slug + "/" : ""}athletes/${id}?lang=pt&region=br`).then(j => j || getJSON(`${base}/athletes/${id}`)),
    slug ? getJSON(`${base}/${slug}/athletes/${id}/overview?lang=pt&region=br`) : null]);
  const a = bio?.athlete || bio || {};
  const out = {ok: !!(a.displayName || ov), id, name: pick(a, "displayName", "fullName"), position: pick(a, "position.displayName", "position.name"), jersey: pick(a, "jersey"),
    age: pick(a, "age"), birthplace: [pick(a, "birthPlace.city"), pick(a, "birthPlace.country")].filter(Boolean).join(", ") || null, nationality: pick(a, "citizenship", "flag.alt"),
    height: pick(a, "displayHeight"), weight: pick(a, "displayWeight"), team: pick(a, "team.displayName"), headshot: pick(a, "headshot.href"), stats: [], season: null, games: []};
  const st = ov?.statistics;
  if (st?.labels && st?.splits?.length){
    const sp = st.splits[0]; out.season = sp.displayName || null;
    out.stats = st.labels.map((l, i) => ({label: (st.displayNames || st.names || [])[i] || l, short: l, value: sp.stats?.[i]})).filter(x => x.value != null && x.value !== "");
  }
  const gl = ov?.gameLog;
  if (gl?.events){
    const evs = Object.values(gl.events).slice(0, 5);
    out.games = evs.map(e => ({date: e.gameDate, opp: e.opponent?.displayName || e.opponent?.abbreviation, res: e.gameResult, score: e.score, home: e.atVs !== "@"}));
  }
  return json(out, 200, {"cache-control": "public, max-age=21600"});
};
export const config = { path: "/api/jogador" };
