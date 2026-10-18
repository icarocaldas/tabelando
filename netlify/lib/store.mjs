import { getStore } from "@netlify/blobs";
let mem = null;                                   // tests: globalThis.__MEMSTORE = new Map()
export function store(name = "tabelando"){
  if (globalThis.__MEMSTORE){
    mem = globalThis.__MEMSTORE;
    return {
      get: async (k, o) => { const v = mem.get(name + "/" + k); return v == null ? null : (o?.type === "json" ? JSON.parse(v) : v); },
      setJSON: async (k, v) => { mem.set(name + "/" + k, JSON.stringify(v)); },
      delete: async (k) => { mem.delete(name + "/" + k); },
      list: async (o) => ({blobs: [...mem.keys()].filter(k => k.startsWith(name + "/" + (o?.prefix || ""))).map(k => ({key: k.slice(name.length + 1)}))}),
    };
  }
  return getStore({name, consistency: "strong"});
}
export const json = (obj, status = 200, extra = {}) => new Response(JSON.stringify(obj), {status, headers: {"content-type": "application/json; charset=utf-8", "cache-control": "no-store", "access-control-allow-origin": "*", ...extra}});
export const preflight = () => new Response(null, {status: 204, headers: {"access-control-allow-origin": "*", "access-control-allow-methods": "GET,POST,DELETE,OPTIONS", "access-control-allow-headers": "content-type"}});
export async function hashKey(s){ const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)); return [...new Uint8Array(b)].slice(0, 12).map(x => x.toString(16).padStart(2, "0")).join(""); }
