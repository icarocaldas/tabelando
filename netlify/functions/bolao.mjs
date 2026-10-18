// Bolão entre amigos: palpites guardados no Netlify Blobs, pontos calculados com os resultados da ESPN.
import { store, json, preflight } from "../lib/store.mjs";
import { cleanCode, cleanName, fillMissing, view } from "../lib/bolao.mjs";
export default async (req) => {
  if (req.method === "OPTIONS") return preflight();
  const s = store(), u = new URL(req.url);
  if (req.method === "GET"){
    const code = cleanCode(u.searchParams.get("g")), name = cleanName(u.searchParams.get("n"));
    if (!code) return json({ok: false, error: "código"}, 400);
    const g = await s.get("bolao/" + code, {type: "json"});
    if (!g) return json({ok: false, error: "Bolão não encontrado"}, 404);
    let results = (await s.get("state/results", {type: "json"})) || {};
    const before = JSON.stringify(results);
    results = await fillMissing(g.matches || {}, results);
    if (JSON.stringify(results) !== before) await s.setJSON("state/results", results).catch(() => {});
    return json({ok: true, ...view(g, results, name)});
  }
  if (req.method === "POST"){
    const b = await req.json().catch(() => ({}));
    const action = b.action || "pick";
    if (action === "create"){
      let code; for (let i = 0; i < 5; i++){ code = Math.random().toString(36).slice(2, 8).toUpperCase(); if (!(await s.get("bolao/" + code))) break; }
      const name = cleanName(b.name); if (!name) return json({ok: false, error: "Digite seu nome"}, 400);
      const g = {code, title: cleanName(b.title) || "Bolão da galera", created: new Date().toISOString(), members: [name], matches: {}, picks: {}};
      await s.setJSON("bolao/" + code, g);
      return json({ok: true, code});
    }
    const code = cleanCode(b.g), name = cleanName(b.name);
    if (!code || !name) return json({ok: false, error: "Falta código ou nome"}, 400);
    const g = await s.get("bolao/" + code, {type: "json"});
    if (!g) return json({ok: false, error: "Bolão não encontrado"}, 404);
    if (!g.members.includes(name)){ if (g.members.length >= 60) return json({ok: false, error: "Bolão cheio"}, 400); g.members.push(name); }
    if (action === "join"){ await s.setJSON("bolao/" + code, g); return json({ok: true}); }
    const m = b.match || {}, id = String(m.id || "").replace(/\D/g, "");
    const pick = /^\d{1,2}-\d{1,2}$/.test(String(b.pick || "")) ? b.pick : null;
    if (!id || !m.kickoff || !m.slug) return json({ok: false, error: "Jogo inválido"}, 400);
    const kick = Date.parse((g.matches[id] || m).kickoff);
    if (!(kick > Date.now())) return json({ok: false, error: "O jogo já começou — palpites fechados"}, 400);
    g.matches[id] ||= {home: String(m.home).slice(0, 40), away: String(m.away).slice(0, 40), kickoff: m.kickoff, slug: String(m.slug).slice(0, 40), comp: String(m.comp || "").slice(0, 40)};
    g.picks[id] ||= {};
    if (pick) g.picks[id][name] = pick; else delete g.picks[id][name];
    await s.setJSON("bolao/" + code, g);
    return json({ok: true});
  }
  return json({ok: false}, 405);
};
export const config = { path: "/api/bolao" };
