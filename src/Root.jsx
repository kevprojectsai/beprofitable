import React, { useState, useEffect } from "react";
import {
  PiggyBank, LogIn, UserPlus, Loader2, Settings2,
  Eye, EyeOff, KeyRound, Mail,
} from "lucide-react";
import App from "./App.jsx";
import {
  getConfig, setConfig, getClient,
  loadState, saveState, loadCache, saveCache,
} from "./cloud.js";

const inputCls =
  "w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500";
const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed w-full";
const labelCls = "block text-sm font-medium text-slate-700 mb-1.5";

/* input de contraseña con ojito para mostrar/ocultar */
function PasswordInput({ value, onChange, placeholder, onKeyDown, autoFocus }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        onKeyDown={onKeyDown}
        autoFocus={autoFocus}
        className={inputCls + " pr-11"}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 focus:outline-none"
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

function Shell({ children, sub }) {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="h-14 w-14 rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center mb-3 shadow-sm">
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
  const [mode, setMode] = useState("login"); // login | signup | forgot
  const [name, setName] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  const go = (m) => { setMode(m); setErr(""); setInfo(""); };

  const submit = async () => {
    setErr(""); setInfo(""); setBusy(true);
    const c = getClient();
    try {
      if (mode === "forgot") {
        const { error } = await c.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setInfo("Te enviamos un enlace para restablecer tu contraseña. Revisa tu correo (y la carpeta de spam).");
        return;
      }
      if (mode === "signup") {
        const { data, error } = await c.auth.signUp({
          email: email.trim(), password: pass,
          options: {
            data: { name: name.trim(), apellido: apellido.trim() },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        if (data.session) { onSignedIn(data.session); return; }
        setInfo("Cuenta creada. Te enviamos un correo para confirmar tu cuenta; ábrelo y luego inicia sesión.");
        setMode("login");
        return;
      }
      // login
      const { data, error } = await c.auth.signInWithPassword({ email: email.trim(), password: pass });
      if (error) throw error;
      onSignedIn(data.session);
    } catch (e) {
      const m = (e && e.message) || "Error";
      if (/invalid login/i.test(m)) setErr("Correo o contraseña incorrectos.");
      else if (/already registered/i.test(m)) setErr("Ese correo ya tiene cuenta. Inicia sesión.");
      else if (/not confirmed/i.test(m)) setErr("Tu correo aún no está confirmado. Revisa tu bandeja de entrada.");
      else if (/password/i.test(m)) setErr("La contraseña debe tener al menos 6 caracteres.");
      else setErr(m);
    } finally { setBusy(false); }
  };

  const ok =
    mode === "forgot"
      ? email.includes("@")
      : email.includes("@") && pass.length >= 6 && (mode !== "signup" || name.trim().length > 0);

  const sub =
    mode === "login" ? "Inicia sesión"
      : mode === "signup" ? "Crea tu cuenta"
      : "Recupera tu contraseña";

  return (
    <Shell sub={sub}>
      {mode !== "forgot" && (
        <div className="flex gap-1 mb-4 rounded-xl bg-slate-100 p-1">
          <button onClick={() => go("login")}
            className={`flex-1 rounded-lg py-2 text-sm font-medium ${mode === "login" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>Entrar</button>
          <button onClick={() => go("signup")}
            className={`flex-1 rounded-lg py-2 text-sm font-medium ${mode === "signup" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>Registrarme</button>
        </div>
      )}
      <div className="space-y-3">
        {mode === "signup" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Nombre</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Apellido</label>
              <input value={apellido} onChange={(e) => setApellido(e.target.value)} placeholder="Tu apellido" className={inputCls} />
            </div>
          </div>
        )}
        <div>
          <label className={labelCls}>Correo</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" className={inputCls}
            onKeyDown={(e) => e.key === "Enter" && ok && submit()} />
        </div>
        {mode !== "forgot" && (
          <div>
            <label className={labelCls}>Contraseña</label>
            <PasswordInput value={pass} onChange={(e) => setPass(e.target.value)} placeholder="mínimo 6 caracteres"
              onKeyDown={(e) => e.key === "Enter" && ok && submit()} />
          </div>
        )}
        {mode === "login" && (
          <button type="button" onClick={() => go("forgot")}
            className="text-xs font-medium text-emerald-700 hover:underline">
            ¿Olvidaste tu contraseña?
          </button>
        )}
        {err && <p className="text-xs text-rose-600">{err}</p>}
        {info && <p className="text-xs text-emerald-700">{info}</p>}
        <button disabled={!ok || busy} className={btnPrimary} onClick={submit}>
          {busy ? <Loader2 size={16} className="animate-spin" />
            : mode === "login" ? <LogIn size={16} />
            : mode === "signup" ? <UserPlus size={16} />
            : <Mail size={16} />}
          {mode === "login" ? "Entrar" : mode === "signup" ? "Crear cuenta" : "Enviar enlace"}
        </button>
        {mode === "forgot" && (
          <button type="button" onClick={() => go("login")}
            className="w-full text-center text-xs text-slate-500 hover:underline">
            Volver a iniciar sesión
          </button>
        )}
      </div>
    </Shell>
  );
}

/* pantalla para definir nueva contraseña (tras enlace de recuperación) */
function UpdatePasswordScreen({ onDone }) {
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  const submit = async () => {
    setErr(""); setInfo("");
    if (pw1.length < 6) { setErr("La contraseña debe tener al menos 6 caracteres."); return; }
    if (pw1 !== pw2) { setErr("Las contraseñas no coinciden."); return; }
    setBusy(true);
    try {
      const c = getClient();
      const { error } = await c.auth.updateUser({ password: pw1 });
      if (error) throw error;
      setInfo("Contraseña actualizada. Entrando…");
      setTimeout(() => onDone(), 900);
    } catch (e) {
      setErr((e && e.message) || "No se pudo actualizar la contraseña.");
      setBusy(false);
    }
  };

  return (
    <Shell sub="Define tu nueva contraseña">
      <div className="space-y-3">
        <div>
          <label className={labelCls}>Nueva contraseña</label>
          <PasswordInput value={pw1} onChange={(e) => setPw1(e.target.value)} placeholder="mínimo 6 caracteres" autoFocus />
        </div>
        <div>
          <label className={labelCls}>Repetir contraseña</label>
          <PasswordInput value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="repite la contraseña"
            onKeyDown={(e) => e.key === "Enter" && submit()} />
        </div>
        {err && <p className="text-xs text-rose-600">{err}</p>}
        {info && <p className="text-xs text-emerald-700">{info}</p>}
        <button disabled={busy || !pw1 || !pw2} className={btnPrimary} onClick={submit}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />} Guardar contraseña
        </button>
      </div>
    </Shell>
  );
}

export default function Root() {
  const [cfg, setCfg] = useState(() => getConfig());
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);
  const [recovery, setRecovery] = useState(false);

  useEffect(() => {
    const c = getClient();
    if (!c) { setChecking(false); return; }
    let sub;
    c.auth.getSession().then(({ data }) => {
      setSession(data.session || null);
      setChecking(false);
    });
    sub = c.auth.onAuthStateChange((event, s) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      setSession(s || null);
    }).data.subscription;
    return () => { if (sub) sub.unsubscribe(); };
  }, [cfg]);

  if (!cfg) return <SetupScreen onSaved={() => setCfg(getConfig())} />;

  if (checking)
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <Loader2 size={22} className="animate-spin text-slate-400" />
      </div>
    );

  if (recovery) return <UpdatePasswordScreen onDone={() => setRecovery(false)} />;

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
