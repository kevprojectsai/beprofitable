import React, { useState, useEffect } from "react";
import { PiggyBank, LogIn, UserPlus, Loader2, Settings2 } from "lucide-react";
import App from "./App.jsx";
import {
  getConfig, setConfig, getClient,
  loadState, saveState, loadCache, saveCache,
} from "./cloud.js";

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500";
const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed w-full";

function Shell({ children, sub }) {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="h-14 w-14 rounded-2xl bg-teal-700 flex items-center justify-center mb-3">
            <PiggyBank size={28} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">La Ganancia es Primero</h1>
          <p className="text-sm text-slate-500 mt-0.5">{sub}</p>
        </div>
        <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-5">{children}</div>
      </div>
    </div>
  );
}

function SetupScreen({ onSaved }) {
  const [url, setUrl] = useState("");
  const [anon, setAnon] = useState("");
  const ok = url.trim().startsWith("http") && anon.trim().length > 20;
  return (
    <Shell sub="Conexión con tu base de datos">
      <p className="text-sm text-slate-600 mb-4">
        Pega los dos datos de tu proyecto de Supabase (los encuentras en Settings → API). Solo se hace una vez.
      </p>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Project URL</label>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://xxxx.supabase.co" className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Anon public key</label>
          <input value={anon} onChange={(e) => setAnon(e.target.value)} placeholder="eyJhbGciOi..." className={inputCls} />
        </div>
        <button disabled={!ok} className={btnPrimary}
          onClick={() => { setConfig(url, anon); onSaved(); }}>
          <Settings2 size={16} /> Conectar
        </button>
      </div>
    </Shell>
  );
}

function AuthScreen({ onSignedIn }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  const submit = async () => {
    setErr(""); setInfo(""); setBusy(true);
    const c = getClient();
    try {
      if (mode === "signup") {
        const { data, error } = await c.auth.signUp({
          email: email.trim(), password: pass,
          options: { data: { name: name.trim() } },
        });
        if (error) throw error;
        if (data.session) { onSignedIn(data.session); return; }
        const si = await c.auth.signInWithPassword({ email: email.trim(), password: pass });
        if (si.data.session) { onSignedIn(si.data.session); return; }
        setInfo("Cuenta creada. Si te pide confirmar el correo, revisa tu bandeja o desactiva la confirmación en Supabase.");
      } else {
        const { data, error } = await c.auth.signInWithPassword({ email: email.trim(), password: pass });
        if (error) throw error;
        onSignedIn(data.session);
      }
    } catch (e) {
      const m = (e && e.message) || "Error";
      if (/invalid login/i.test(m)) setErr("Correo o contraseña incorrectos.");
      else if (/already registered/i.test(m)) setErr("Ese correo ya tiene cuenta. Inicia sesión.");
      else if (/password/i.test(m)) setErr("La contraseña debe tener al menos 6 caracteres.");
      else setErr(m);
    } finally { setBusy(false); }
  };

  const ok = email.includes("@") && pass.length >= 6 && (mode === "login" || name.trim().length > 0);
  return (
    <Shell sub={mode === "login" ? "Inicia sesión" : "Crea tu cuenta"}>
      <div className="flex gap-1 mb-4 rounded-xl bg-slate-100 p-1">
        <button onClick={() => setMode("login")}
          className={`flex-1 rounded-lg py-2 text-sm font-medium ${mode === "login" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>Entrar</button>
        <button onClick={() => setMode("signup")}
          className={`flex-1 rounded-lg py-2 text-sm font-medium ${mode === "signup" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>Registrarme</button>
      </div>
      <div className="space-y-3">
        {mode === "signup" && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" className={inputCls} />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Correo</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Contraseña</label>
          <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="mínimo 6 caracteres" className={inputCls}
            onKeyDown={(e) => e.key === "Enter" && ok && submit()} />
        </div>
        {err && <p className="text-xs text-rose-600">{err}</p>}
        {info && <p className="text-xs text-teal-700">{info}</p>}
        <button disabled={!ok || busy} className={btnPrimary} onClick={submit}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : mode === "login" ? <LogIn size={16} /> : <UserPlus size={16} />}
          {mode === "login" ? "Entrar" : "Crear cuenta"}
        </button>
      </div>
    </Shell>
  );
}

export default function Root() {
  const [cfg, setCfg] = useState(() => getConfig());
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const c = getClient();
    if (!c) { setChecking(false); return; }
    let sub;
    c.auth.getSession().then(({ data }) => {
      setSession(data.session || null);
      setChecking(false);
    });
    sub = c.auth.onAuthStateChange((_e, s) => setSession(s || null)).data.subscription;
    return () => { if (sub) sub.unsubscribe(); };
  }, [cfg]);

  if (!cfg) return <SetupScreen onSaved={() => setCfg(getConfig())} />;

  if (checking)
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <Loader2 size={22} className="animate-spin text-slate-400" />
      </div>
    );

  if (!session) return <AuthScreen onSignedIn={(s) => setSession(s)} />;

  const uid = session.user.id;
  const meta = session.user.user_metadata || {};
  const firstName = (meta.name || "").trim();
  const apellido = (meta.apellido || "").trim();
  const emailName = (session.user.email || "").split("@")[0].replace(/[._-]+/g, " ");
  const fullName = [firstName, apellido].filter(Boolean).join(" ").trim();
  const displayName = fullName
    ? fullName
    : (emailName ? emailName.charAt(0).toUpperCase() + emailName.slice(1) : "");
  const cloud = {
    uid,
    email: session.user.email,
    name: displayName,
    firstName,
    apellido,
    load: () => loadState(uid),
    save: (data) => saveState(uid, data),
    loadCache: () => loadCache(uid),
    saveCache: (data) => saveCache(uid, data),
    setName: async (name) => {
      const c = getClient();
      const { data, error } = await c.auth.updateUser({ data: { name } });
      if (error) throw error;
      if (data && data.user) setSession((s) => (s ? { ...s, user: data.user } : s));
    },
    updateProfile: async ({ name, apellido }) => {
      const c = getClient();
      const { data, error } = await c.auth.updateUser({ data: { name, apellido } });
      if (error) throw error;
      if (data && data.user) setSession((s) => (s ? { ...s, user: data.user } : s));
    },
    changeEmail: async (newEmail) => {
      const c = getClient();
      const { data, error } = await c.auth.updateUser({ email: newEmail.trim() });
      if (error) throw error;
      return data;
    },
    changePassword: async (newPassword) => {
      const c = getClient();
      const { error } = await c.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },
  };
  const onLogout = async () => {
    const c = getClient();
    try { await c.auth.signOut(); } catch (_) {}
    setSession(null);
  };

  return <App key={uid} cloud={cloud} onLogout={onLogout} />;
}
