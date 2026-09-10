import { createClient } from "@supabase/supabase-js";

// Conexión fija del proyecto (la anon key es pública por diseño; los datos
// están protegidos por Row Level Security en Supabase).
const DEFAULT_URL = "https://cxgwkhnpnkccjmxaouua.supabase.co";
const DEFAULT_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4Z3draG5wbmtjY2pteGFvdXVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4OTE2NTgsImV4cCI6MjEwNDQ2NzY1OH0.2VkeKTruqH_H3ZaH3fWjozDdlKZaHc6kW2T1wVCtiTQ";

const CFG_KEY = "gp_supabase_cfg";

export function getConfig() {
  try {
    const stored = JSON.parse(localStorage.getItem(CFG_KEY) || "null");
    if (stored && stored.url && stored.anon) return stored;
  } catch (_) {}
  if (DEFAULT_URL && DEFAULT_ANON) return { url: DEFAULT_URL, anon: DEFAULT_ANON };
  return null;
}
export function setConfig(url, anon) {
  localStorage.setItem(CFG_KEY, JSON.stringify({ url: url.trim().replace(/\/+$/, ""), anon: anon.trim() }));
  _client = null;
}
export function clearConfig() {
  localStorage.removeItem(CFG_KEY);
  _client = null;
}

let _client = null;
export function getClient() {
  if (_client) return _client;
  const cfg = getConfig();
  if (!cfg || !cfg.url || !cfg.anon) return null;
  _client = createClient(cfg.url, cfg.anon, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return _client;
}

/* local offline cache, keyed per user */
const cacheKey = (uid) => "pf_cloud_" + uid;
export function loadCache(uid) {
  try { const r = localStorage.getItem(cacheKey(uid)); return r ? JSON.parse(r) : null; }
  catch (_) { return null; }
}
export function saveCache(uid, data) {
  try { localStorage.setItem(cacheKey(uid), JSON.stringify(data)); } catch (_) {}
}

export async function loadState(uid) {
  const c = getClient();
  const { data, error } = await c
    .from("user_state").select("data, updated_at").eq("user_id", uid).maybeSingle();
  if (error) throw error;
  return data ? { data: data.data, updatedAt: data.updated_at } : null;
}
export async function saveState(uid, stateData) {
  const c = getClient();
  const updatedAt = new Date().toISOString();
  const { error } = await c
    .from("user_state")
    .upsert({ user_id: uid, data: stateData, updated_at: updatedAt });
  if (error) throw error;
  return updatedAt; // marca de tiempo escrita, para control de concurrencia
}

/* suscripción en tiempo real a los cambios de la fila del usuario (otro dispositivo) */
export function subscribeState(uid, onData) {
  const c = getClient();
  if (!c) return () => {};
  const channel = c
    .channel("user_state_" + uid)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "user_state", filter: "user_id=eq." + uid },
      (payload) => {
        const row = payload && payload.new;
        if (row && row.data) onData(row.data, row.updated_at);
      }
    )
    .subscribe();
  return () => { try { c.removeChannel(channel); } catch (_) {} };
}
