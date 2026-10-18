// Inscrição para avisos de gol com o app fechado (Web Push).
import { store, json, preflight, hashKey } from "../lib/store.mjs";
export default async (req) => {
  if (req.method === "OPTIONS") return preflight();
  const s = store();
  if (req.method === "POST"){
    const b = await req.json().catch(() => null);
    const sub = b?.subscription;
    if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) return json({ok: false, error: "inscrição inválida"}, 400);
    const mode = b.mode === "all" ? "all" : "fav";
    const teams = Array.isArray(b.teams) ? b.teams.filter(t => typeof t === "string" && t.length < 60).slice(0, 30) : [];
    const id = await hashKey(sub.endpoint);
    await s.setJSON("subs/" + id, {sub, mode, teams, silent: !!b.silent, end: b.end !== false, updated: new Date().toISOString()});
    return json({ok: true, id, mode, teams});
  }
  if (req.method === "DELETE"){
    const b = await req.json().catch(() => null);
    if (!b?.endpoint) return json({ok: false}, 400);
    await s.delete("subs/" + await hashKey(b.endpoint));
    return json({ok: true});
  }
  return json({ok: true, service: "push"});
};
export const config = { path: "/api/push" };
