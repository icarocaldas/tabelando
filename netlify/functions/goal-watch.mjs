// Roda a cada minuto: confere placares na ESPN e manda aviso de gol para os celulares inscritos.
import webpush from "web-push";
import { store } from "../lib/store.mjs";
import { runWatch } from "../lib/watch.mjs";
export default async () => {
  const pub = process.env.VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (pub && priv) webpush.setVapidDetails("mailto:avisos@tabelando.app", pub, priv);
  const send = async (sub, payload) => {
    if (!pub || !priv) return false;
    try { await webpush.sendNotification(sub, payload, {TTL: 600, urgency: "high"}); return true; }
    catch(e){ return (e.statusCode === 404 || e.statusCode === 410) ? "gone" : false; }
  };
  const out = await runWatch({ s: store(), send });
  console.log("goal-watch", JSON.stringify(out));
};
export const config = { schedule: "* * * * *" };
