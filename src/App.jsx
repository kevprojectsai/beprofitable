import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Plus, Minus, ArrowLeftRight, SlidersHorizontal, MoreVertical, X,
  TrendingUp, PiggyBank, Trash2, Check, ChevronRight, Sparkles, Wallet,
  GripVertical, ChevronUp, ChevronDown, ArrowUpDown,
  Download, Upload, Copy, DatabaseBackup, AlertTriangle, LogOut, BookOpen, UserCog,
  Mail, Lock, Eye, EyeOff,
} from "lucide-react";
import AdviceLibrary from "./AdviceLibrary.jsx";

/* ---------- helpers ---------- */

const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const toCents = (v) => Math.round((Number(v) || 0) * 100);
const parseAmount = (str) => {
  if (str == null) return null;
  const clean = String(str).replace(/[^0-9.]/g, "");
  if (clean === "" || clean === ".") return null;
  const n = Number(clean);
  if (!isFinite(n) || n <= 0) return null;
  return toCents(n);
};
const fmt = (cents, cur = "USD") =>
  new Intl.NumberFormat("es-SV", { style: "currency", currency: cur }).format(
    (cents || 0) / 100
  );
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtDate = (iso) =>
  new Date(iso + "T00:00:00").toLocaleDateString("es-SV", {
    day: "2-digit",
    month: "short",
  });

/* distribute a total across buckets by percent, cents-accurate */
const allocate = (totalCents, buckets) => {
  if (!buckets.length) return [];
  const allocs = buckets.map((b) => ({
    bucketId: b.id,
    amount: Math.floor((totalCents * b.percent) / 100),
  }));
  const used = allocs.reduce((s, a) => s + a.amount, 0);
  let rem = totalCents - used;
  if (rem !== 0) {
    // give the rounding remainder to the largest-percent bucket
    let mi = 0;
    buckets.forEach((b, i) => {
      if (b.percent > buckets[mi].percent) mi = i;
    });
    allocs[mi].amount += rem;
  }
  return allocs;
};

const computeBalances = (space) => {
  const bal = {};
  space.buckets.forEach((b) => (bal[b.id] = 0));
  space.txns.forEach((t) => {
    if (t.type === "income")
      t.allocations.forEach((a) => {
        if (bal[a.bucketId] != null) bal[a.bucketId] += a.amount;
      });
    else if (t.type === "expense") {
      if (bal[t.bucketId] != null) bal[t.bucketId] -= t.amount;
    } else if (t.type === "transfer") {
      if (bal[t.fromId] != null) bal[t.fromId] -= t.amount;
      if (bal[t.toId] != null) bal[t.toId] += t.amount;
    } else if (t.type === "adjust") {
      if (bal[t.bucketId] != null) bal[t.bucketId] += t.amount;
    }
  });
  return bal;
};

/* ---------- color system ---------- */

const COLORS = {
  teal:   { bar: "bg-teal-500",   dot: "bg-teal-500",   soft: "bg-teal-50",   text: "text-teal-700",   ring: "ring-teal-200" },
  amber:  { bar: "bg-amber-500",  dot: "bg-amber-500",  soft: "bg-amber-50",  text: "text-amber-700",  ring: "ring-amber-200" },
  sky:    { bar: "bg-sky-500",    dot: "bg-sky-500",    soft: "bg-sky-50",    text: "text-sky-700",    ring: "ring-sky-200" },
  violet: { bar: "bg-violet-500", dot: "bg-violet-500", soft: "bg-violet-50", text: "text-violet-700", ring: "ring-violet-200" },
  rose:   { bar: "bg-rose-500",   dot: "bg-rose-500",   soft: "bg-rose-50",   text: "text-rose-700",   ring: "ring-rose-200" },
  lime:   { bar: "bg-lime-500",   dot: "bg-lime-500",   soft: "bg-lime-50",   text: "text-lime-700",   ring: "ring-lime-200" },
  orange: { bar: "bg-orange-500", dot: "bg-orange-500", soft: "bg-orange-50", text: "text-orange-700", ring: "ring-orange-200" },
  cyan:   { bar: "bg-cyan-500",   dot: "bg-cyan-500",   soft: "bg-cyan-50",   text: "text-cyan-700",   ring: "ring-cyan-200" },
};
const PALETTE = ["teal", "amber", "sky", "violet", "rose", "lime", "orange", "cyan"];
const colorOf = (c) => COLORS[c] || COLORS.teal;

/* gradientes para las tarjetas de espacios (estilo banca en línea) */
const CARD_GRAD = {
  teal:   "from-teal-500 to-emerald-700",
  amber:  "from-amber-500 to-orange-600",
  sky:    "from-sky-500 to-blue-700",
  violet: "from-violet-500 to-purple-700",
  rose:   "from-rose-500 to-pink-700",
  lime:   "from-lime-500 to-green-700",
  orange: "from-orange-500 to-red-600",
  cyan:   "from-cyan-500 to-teal-700",
};
const gradOf = (c) => CARD_GRAD[c] || CARD_GRAD.teal;
const spaceColor = (sp, i) => (sp && sp.color) || PALETTE[i % PALETTE.length];
const spaceTotalCents = (sp) =>
  Object.values(computeBalances(sp)).reduce((a, b) => a + b, 0);

/* selector de color reutilizable */
function ColorPicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PALETTE.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          aria-label={`Color ${c}`}
          className={`h-8 w-8 rounded-full bg-gradient-to-br ${gradOf(c)} transition-transform ${
            value === c ? "ring-2 ring-offset-2 ring-slate-900 scale-110" : "hover:scale-105"
          }`}
        />
      ))}
    </div>
  );
}

/* ---------- templates ---------- */

const TEMPLATES = {
  negocio: {
    label: "Negocio (Profit First)",
    hint: "Ganancia, salario, impuestos y operación. Ajusta los % con el tiempo.",
    buckets: [
      { name: "Ganancia", percent: 5, color: "amber", profit: true },
      { name: "Salario del dueño", percent: 50, color: "teal" },
      { name: "Impuestos", percent: 15, color: "sky" },
      { name: "Gastos operativos", percent: 30, color: "violet" },
    ],
  },
  personal: {
    label: "Personal",
    hint: "Reparte tu dinero antes de gastarlo. Tu ahorro va primero.",
    buckets: [
      { name: "Gastos fijos", percent: 50, color: "teal" },
      { name: "Gastos variables", percent: 20, color: "sky" },
      { name: "Ahorro / Emergencia", percent: 15, color: "amber", profit: true },
      { name: "Inversión", percent: 10, color: "violet" },
      { name: "Gustos", percent: 5, color: "rose" },
    ],
  },
  blanco: {
    label: "En blanco",
    hint: "Empieza con una sola cuenta y arma tu propio esquema.",
    buckets: [{ name: "Ganancia", percent: 100, color: "amber", profit: true }],
  },
};

const makeBuckets = (defs) =>
  defs.map((d) => ({ id: uid(), archived: false, profit: false, ...d }));

/* ---------- generic UI ---------- */

function Modal({ title, subtitle, onClose, children, footer, maxW = "max-w-md" }) {
  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 p-0 sm:p-4"
      onMouseDown={onClose}
    >
      <div
        className={`w-full ${maxW} bg-white rounded-t-3xl sm:rounded-2xl shadow-xl max-h-[92vh] flex flex-col`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-5 pt-5 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="p-1.5 -mr-1 rounded-lg text-slate-400 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            <X size={20} />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
        {footer && (
          <div className="px-5 py-4 border-t border-slate-100 flex gap-2">{footer}</div>
        )}
      </div>
    </div>
  );
}

const Label = ({ children }) => (
  <label className="block text-sm font-medium text-slate-700 mb-1.5">{children}</label>
);

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500";

const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed";
const btnGhost =
  "inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-300";

function PasswordField({ value, onChange, placeholder, onKeyDown }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        onKeyDown={onKeyDown}
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

function MoneyInput({ value, onChange, autoFocus }) {
  return (
    <div className="relative">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">$</span>
      <input
        inputMode="decimal"
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))}
        placeholder="0.00"
        className={inputCls + " pl-7 text-lg tabular-nums"}
      />
    </div>
  );
}

/* ---------- action modals ---------- */

function IncomeModal({ space, onClose, onSubmit }) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const active = space.buckets.filter((b) => !b.archived);
  const cents = parseAmount(amount);
  const preview = cents ? allocate(cents, active) : [];
  return (
    <Modal
      title="Registrar ingreso"
      subtitle="Se reparte automáticamente entre tus cuentas."
      onClose={onClose}
      footer={
        <>
          <button className={btnGhost + " flex-1"} onClick={onClose}>Cancelar</button>
          <button
            className={btnPrimary + " flex-1"}
            disabled={!cents}
            onClick={() =>
              onSubmit({ amount: cents, date, note, allocations: allocate(cents, active) })
            }
          >
            Repartir ingreso
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label>Monto recibido</Label>
          <MoneyInput value={amount} onChange={setAmount} autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Fecha</Label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <Label>Nota (opcional)</Label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Cliente, venta…" className={inputCls} />
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-500 mb-2">Cómo se reparte</p>
          <div className="space-y-2">
            {active.map((b) => {
              const a = preview.find((x) => x.bucketId === b.id);
              const c = colorOf(b.color);
              return (
                <div key={b.id} className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${c.dot}`} />
                  <span className="text-sm text-slate-700 flex-1 truncate">{b.name}</span>
                  <span className="text-xs text-slate-400 tabular-nums w-9 text-right">{b.percent}%</span>
                  <span className="text-sm font-semibold text-slate-900 tabular-nums w-24 text-right">
                    {a ? fmt(a.amount, space.currency) : fmt(0, space.currency)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <p className="text-xs text-slate-400 flex items-start gap-1.5">
          <Sparkles size={13} className="mt-0.5 shrink-0" />
          Consejo del método: reparte tus ingresos en fechas fijas (por ejemplo el 10 y el 25) en vez de cada vez que entra dinero.
        </p>
      </div>
    </Modal>
  );
}

function ExpenseModal({ space, balances, onClose, onSubmit }) {
  const active = space.buckets.filter((b) => !b.archived);
  const [bucketId, setBucketId] = useState(active[0]?.id || "");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const cents = parseAmount(amount);
  const over = cents && bucketId && cents > (balances[bucketId] || 0);
  return (
    <Modal
      title="Registrar gasto"
      subtitle="Sale de la cuenta que elijas."
      onClose={onClose}
      footer={
        <>
          <button className={btnGhost + " flex-1"} onClick={onClose}>Cancelar</button>
          <button
            className={btnPrimary + " flex-1"}
            disabled={!cents || !bucketId}
            onClick={() => onSubmit({ amount: cents, bucketId, date, note })}
          >
            Guardar gasto
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label>Cuenta de origen</Label>
          <div className="grid gap-2">
            {active.map((b) => {
              const c = colorOf(b.color);
              const sel = b.id === bucketId;
              return (
                <button
                  key={b.id}
                  onClick={() => setBucketId(b.id)}
                  className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left ${
                    sel ? "border-teal-500 ring-1 ring-teal-500 bg-teal-50/50" : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${c.dot}`} />
                  <span className="text-sm font-medium text-slate-800 flex-1">{b.name}</span>
                  <span className="text-sm tabular-nums text-slate-500">{fmt(balances[b.id], space.currency)}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <Label>Monto</Label>
          <MoneyInput value={amount} onChange={setAmount} />
          {over && (
            <p className="text-xs text-amber-600 mt-1.5">
              Este gasto deja la cuenta en negativo. Puedes transferir desde otra cuenta antes.
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Fecha</Label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <Label>Nota (opcional)</Label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="¿En qué fue?" className={inputCls} />
          </div>
        </div>
      </div>
    </Modal>
  );
}

function TransferModal({ space, balances, onClose, onSubmit }) {
  const active = space.buckets.filter((b) => !b.archived);
  const [fromId, setFromId] = useState(active[0]?.id || "");
  const [toId, setToId] = useState(active[1]?.id || active[0]?.id || "");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const cents = parseAmount(amount);
  const valid = cents && fromId && toId && fromId !== toId;
  const Select = ({ value, onChange }) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
      {active.map((b) => (
        <option key={b.id} value={b.id}>{b.name} · {fmt(balances[b.id], space.currency)}</option>
      ))}
    </select>
  );
  return (
    <Modal
      title="Transferir entre cuentas"
      onClose={onClose}
      footer={
        <>
          <button className={btnGhost + " flex-1"} onClick={onClose}>Cancelar</button>
          <button className={btnPrimary + " flex-1"} disabled={!valid}
            onClick={() => onSubmit({ amount: cents, fromId, toId, date: todayISO(), note })}>
            Transferir
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div><Label>Desde</Label><Select value={fromId} onChange={setFromId} /></div>
        <div className="flex justify-center"><ArrowLeftRight size={18} className="text-slate-300 rotate-90" /></div>
        <div><Label>Hacia</Label><Select value={toId} onChange={setToId} /></div>
        {fromId === toId && <p className="text-xs text-amber-600">Elige dos cuentas distintas.</p>}
        <div><Label>Monto</Label><MoneyInput value={amount} onChange={setAmount} /></div>
        <div><Label>Nota (opcional)</Label>
          <input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} /></div>
      </div>
    </Modal>
  );
}

function AdjustModal({ space, onClose, onSubmit }) {
  const active = space.buckets.filter((b) => !b.archived);
  const [bucketId, setBucketId] = useState(active[0]?.id || "");
  const [amount, setAmount] = useState("");
  const [sign, setSign] = useState(1);
  const [note, setNote] = useState("Saldo inicial");
  const cents = parseAmount(amount);
  return (
    <Modal
      title="Ajustar saldo"
      subtitle="Para poner saldos iniciales o corregir una cuenta."
      onClose={onClose}
      footer={
        <>
          <button className={btnGhost + " flex-1"} onClick={onClose}>Cancelar</button>
          <button className={btnPrimary + " flex-1"} disabled={!cents || !bucketId}
            onClick={() => onSubmit({ amount: sign * cents, bucketId, date: todayISO(), note })}>
            Aplicar ajuste
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div><Label>Cuenta</Label>
          <select value={bucketId} onChange={(e) => setBucketId(e.target.value)} className={inputCls}>
            {active.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <Label>Tipo de ajuste</Label>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setSign(1)} className={`rounded-xl border px-3 py-2.5 text-sm font-medium ${sign === 1 ? "border-teal-500 ring-1 ring-teal-500 bg-teal-50 text-teal-700" : "border-slate-200 text-slate-600"}`}>Sumar</button>
            <button onClick={() => setSign(-1)} className={`rounded-xl border px-3 py-2.5 text-sm font-medium ${sign === -1 ? "border-rose-400 ring-1 ring-rose-400 bg-rose-50 text-rose-700" : "border-slate-200 text-slate-600"}`}>Restar</button>
          </div>
        </div>
        <div><Label>Monto</Label><MoneyInput value={amount} onChange={setAmount} /></div>
        <div><Label>Nota</Label>
          <input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} /></div>
      </div>
    </Modal>
  );
}

/* ---------- edit buckets ---------- */

function EditBucketsModal({ space, balances, onClose, onSave }) {
  const [rows, setRows] = useState(
    space.buckets.filter((b) => !b.archived).map((b) => ({ ...b }))
  );
  const archived = space.buckets.filter((b) => b.archived);
  const [archList, setArchList] = useState(archived.map((b) => ({ ...b })));

  const sum = rows.reduce((s, r) => s + (Number(r.percent) || 0), 0);
  const rounded = Math.round(sum * 100) / 100;
  const ok = Math.abs(rounded - 100) < 0.01 && rows.length > 0;

  const setRow = (id, patch) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const addRow = () => {
    const used = rows.map((r) => r.color);
    const color = PALETTE.find((c) => !used.includes(c)) || "teal";
    setRows((rs) => [...rs, { id: uid(), name: "Nueva cuenta", percent: 0, color, archived: false, profit: false }]);
  };

  const removeRow = (r) => {
    const bal = balances[r.id] || 0;
    if (bal !== 0) return; // guarded in UI
    const hasHistory = space.txns.some(
      (t) =>
        (t.type === "income" && t.allocations.some((a) => a.bucketId === r.id)) ||
        t.bucketId === r.id || t.fromId === r.id || t.toId === r.id
    );
    if (hasHistory) {
      setRows((rs) => rs.filter((x) => x.id !== r.id));
      setArchList((al) => [...al, { ...r, archived: true }]);
    } else {
      setRows((rs) => rs.filter((x) => x.id !== r.id));
    }
  };

  const restore = (r) => {
    setArchList((al) => al.filter((x) => x.id !== r.id));
    setRows((rs) => [...rs, { ...r, archived: false, percent: 0 }]);
  };

  const cycleColor = (r) => {
    const i = PALETTE.indexOf(r.color);
    setRow(r.id, { color: PALETTE[(i + 1) % PALETTE.length] });
  };

  return (
    <Modal
      title="Editar cuentas"
      subtitle="Nombres y porcentajes. Deben sumar 100%."
      onClose={onClose}
      maxW="max-w-lg"
      footer={
        <>
          <button className={btnGhost + " flex-1"} onClick={onClose}>Cancelar</button>
          <button className={btnPrimary + " flex-1"} disabled={!ok}
            onClick={() => onSave([...rows.map((r) => ({ ...r, percent: Number(r.percent) || 0, archived: false })), ...archList.map((a) => ({ ...a, archived: true }))])}>
            Guardar
          </button>
        </>
      }
    >
      <div className="space-y-2.5">
        {rows.map((r) => {
          const c = colorOf(r.color);
          const bal = balances[r.id] || 0;
          const canRemove = bal === 0;
          return (
            <div key={r.id} className="flex items-center gap-2">
              <button onClick={() => cycleColor(r)} aria-label="Cambiar color"
                className={`h-6 w-6 rounded-full ${c.dot} shrink-0 focus:outline-none focus:ring-2 focus:ring-slate-300`} />
              <input value={r.name} onChange={(e) => setRow(r.id, { name: e.target.value })}
                className={inputCls + " flex-1 py-2"} />
              <div className="relative w-20 shrink-0">
                <input inputMode="decimal" value={r.percent}
                  onChange={(e) => setRow(r.id, { percent: e.target.value.replace(/[^0-9.]/g, "") })}
                  className={inputCls + " py-2 pr-6 text-right tabular-nums"} />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
              </div>
              <button onClick={() => removeRow(r)} disabled={!canRemove}
                aria-label="Quitar cuenta"
                title={canRemove ? "Quitar" : "Vacía el saldo antes de quitarla"}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-rose-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400">
                <Trash2 size={16} />
              </button>
            </div>
          );
        })}

        <button onClick={addRow} className="flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:text-teal-800 pt-1">
          <Plus size={16} /> Agregar cuenta
        </button>

        <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-3 mt-2">
          <span className="text-sm text-slate-600">Total asignado</span>
          <span className={`text-sm font-semibold tabular-nums ${ok ? "text-teal-700" : "text-amber-600"}`}>
            {rounded}% {ok ? "" : `· faltan ${Math.round((100 - rounded) * 100) / 100}%`}
          </span>
        </div>

        {archList.length > 0 && (
          <div className="pt-2">
            <p className="text-xs font-medium text-slate-400 mb-1.5">Cuentas archivadas</p>
            {archList.map((r) => (
              <div key={r.id} className="flex items-center gap-2 py-1">
                <span className={`h-2.5 w-2.5 rounded-full ${colorOf(r.color).dot} opacity-50`} />
                <span className="text-sm text-slate-500 flex-1">{r.name}</span>
                <button onClick={() => restore(r)} className="text-xs font-medium text-teal-700 hover:text-teal-800">Restaurar</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ---------- new space ---------- */

function NewSpaceModal({ onClose, onCreate, suggestedColor = "teal" }) {
  const [name, setName] = useState("");
  const [tpl, setTpl] = useState("negocio");
  const [currency, setCurrency] = useState("USD");
  const [color, setColor] = useState(suggestedColor);
  return (
    <Modal
      title="Nuevo espacio"
      subtitle="Un espacio por cada negocio y uno para lo personal."
      onClose={onClose}
      footer={
        <>
          <button className={btnGhost + " flex-1"} onClick={onClose}>Cancelar</button>
          <button className={btnPrimary + " flex-1"} disabled={!name.trim()}
            onClick={() => onCreate({ name: name.trim(), tpl, currency: currency.trim().toUpperCase() || "USD", color })}>
            Crear espacio
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* vista previa de la tarjeta */}
        <div className={`relative rounded-2xl p-4 text-white bg-gradient-to-br ${gradOf(color)} shadow-md overflow-hidden`}>
          <div className="absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/10" />
          <span className="relative inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-medium capitalize">
            {tpl === "personal" ? <PiggyBank size={12} /> : <Wallet size={12} />} {tpl === "personal" ? "personal" : "negocio"}
          </span>
          <p className="relative text-2xl font-bold tabular-nums mt-6 leading-none">{fmt(0, (currency || "USD").toUpperCase())}</p>
          <p className="relative text-sm font-medium mt-3 truncate">{name.trim() || "Nombre del espacio"}</p>
        </div>
        <div>
          <Label>Nombre</Label>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Akiles, Apollo Dev AI, Personal…" className={inputCls} />
        </div>
        <div>
          <Label>Color</Label>
          <ColorPicker value={color} onChange={setColor} />
        </div>
        <div>
          <Label>Punto de partida</Label>
          <div className="grid gap-2">
            {Object.entries(TEMPLATES).map(([k, t]) => (
              <button key={k} onClick={() => setTpl(k)}
                className={`rounded-xl border px-3.5 py-3 text-left ${tpl === k ? "border-teal-500 ring-1 ring-teal-500 bg-teal-50/50" : "border-slate-200 hover:bg-slate-50"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-800">{t.label}</span>
                  {tpl === k && <Check size={16} className="text-teal-600" />}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{t.hint}</p>
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label>Moneda</Label>
          <input value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputCls + " w-28"} />
        </div>
      </div>
    </Modal>
  );
}

function SpaceSettingsModal({ space, onClose, onSave, onDelete }) {
  const [name, setName] = useState(space.name);
  const [color, setColor] = useState(space.color || "teal");
  const [confirm, setConfirm] = useState(false);
  const changed = (name.trim() && name !== space.name) || color !== (space.color || "teal");
  return (
    <Modal title="Ajustes del espacio" onClose={onClose}
      footer={
        <>
          <button className={btnGhost + " flex-1"} onClick={onClose}>Cerrar</button>
          <button className={btnPrimary + " flex-1"} disabled={!name.trim() || !changed}
            onClick={() => onSave({ name: name.trim(), color })}>Guardar cambios</button>
        </>
      }
    >
      <div className="space-y-4">
        {/* vista previa */}
        <div className={`relative rounded-2xl p-4 text-white bg-gradient-to-br ${gradOf(color)} shadow-md overflow-hidden`}>
          <div className="absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/10" />
          <span className="relative inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-medium capitalize">
            {space.type === "personal" ? <PiggyBank size={12} /> : <Wallet size={12} />} {space.type}
          </span>
          <p className="relative text-sm font-medium mt-6 truncate">{name.trim() || space.name}</p>
        </div>
        <div><Label>Nombre del espacio</Label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></div>
        <div><Label>Color</Label>
          <ColorPicker value={color} onChange={setColor} /></div>
        <div className="pt-2 border-t border-slate-100">
          {!confirm ? (
            <button onClick={() => setConfirm(true)} className="flex items-center gap-1.5 text-sm font-medium text-rose-600 hover:text-rose-700">
              <Trash2 size={15} /> Eliminar este espacio
            </button>
          ) : (
            <div className="rounded-xl bg-rose-50 p-3">
              <p className="text-sm text-rose-800 mb-2.5">Se borran las cuentas y movimientos de <b>{space.name}</b>. No se puede deshacer.</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirm(false)} className={btnGhost + " flex-1 py-2"}>Cancelar</button>
                <button onClick={onDelete} className="flex-1 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700">Sí, eliminar</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

/* ---------- reorder spaces ---------- */

function ReorderModal({ spaces, onClose, onSave }) {
  const [list, setList] = useState(spaces.map((s) => ({ id: s.id, name: s.name, type: s.type })));
  const [dragI, setDragI] = useState(null);

  const move = (from, to) => {
    if (to < 0 || to >= list.length || from === to) return;
    setList((l) => {
      const a = [...l];
      const [m] = a.splice(from, 1);
      a.splice(to, 0, m);
      return a;
    });
  };

  return (
    <Modal
      title="Reordenar espacios"
      subtitle="Arrastra o usa las flechas para cambiar el orden."
      onClose={onClose}
      footer={
        <>
          <button className={btnGhost + " flex-1"} onClick={onClose}>Cancelar</button>
          <button className={btnPrimary + " flex-1"} onClick={() => onSave(list.map((x) => x.id))}>
            Guardar orden
          </button>
        </>
      }
    >
      <div className="space-y-2">
        {list.map((s, i) => (
          <div
            key={s.id}
            draggable
            onDragStart={() => setDragI(i)}
            onDragEnd={() => setDragI(null)}
            onDragOver={(e) => { e.preventDefault(); if (dragI !== null && dragI !== i) { move(dragI, i); setDragI(i); } }}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 bg-white ${
              dragI === i ? "border-teal-400 ring-1 ring-teal-400 opacity-70" : "border-slate-200"
            }`}
          >
            <GripVertical size={18} className="text-slate-300 cursor-grab shrink-0" />
            <span className="text-sm font-medium text-slate-800 flex-1 truncate">{s.name}</span>
            <span className="text-xs text-slate-400 capitalize mr-1">{s.type}</span>
            <button onClick={() => move(i, i - 1)} disabled={i === 0}
              aria-label="Subir"
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-25 disabled:hover:bg-transparent">
              <ChevronUp size={16} />
            </button>
            <button onClick={() => move(i, i + 1)} disabled={i === list.length - 1}
              aria-label="Bajar"
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-25 disabled:hover:bg-transparent">
              <ChevronDown size={16} />
            </button>
          </div>
        ))}
      </div>
    </Modal>
  );
}

/* ---------- backup / restore ---------- */

function BackupModal({ state, onClose, onImport, startTab = "export" }) {
  const [tab, setTab] = useState(startTab);
  const text = useMemo(() => JSON.stringify(state), [state]);
  const [copied, setCopied] = useState(false);
  const [raw, setRaw] = useState("");
  const [err, setErr] = useState("");
  const spacesCount = state.spaces.length;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (_) {
      setErr("No se pudo copiar. Selecciona el texto y cópialo manualmente.");
    }
  };

  const download = () => {
    try {
      const blob = new Blob([text], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ganancia-primero-respaldo.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (_) {
      setErr("La descarga no está disponible aquí. Usa Copiar.");
    }
  };

  const doImport = () => {
    setErr("");
    let data;
    try {
      data = JSON.parse(raw);
    } catch (_) {
      setErr("El texto no es un respaldo válido.");
      return;
    }
    if (!data || !Array.isArray(data.spaces)) {
      setErr("El respaldo no contiene espacios.");
      return;
    }
    onImport(data);
  };

  return (
    <Modal
      title="Datos y respaldo"
      subtitle="Guarda una copia de tus finanzas y restáurala cuando quieras."
      onClose={onClose}
      maxW="max-w-lg"
    >
      <div className="flex gap-1 mb-4 rounded-xl bg-slate-100 p-1">
        <button onClick={() => setTab("export")}
          className={`flex-1 rounded-lg py-2 text-sm font-medium ${tab === "export" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>
          Exportar
        </button>
        <button onClick={() => setTab("import")}
          className={`flex-1 rounded-lg py-2 text-sm font-medium ${tab === "import" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>
          Importar
        </button>
      </div>

      {tab === "export" ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Copia o descarga este texto. Contiene tus {spacesCount} espacio{spacesCount === 1 ? "" : "s"} con sus cuentas y movimientos.
            Guárdalo antes de pedir cambios a la app.
          </p>
          <textarea readOnly value={text} onFocus={(e) => e.target.select()}
            className="w-full h-32 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 font-mono resize-none focus:outline-none focus:ring-2 focus:ring-teal-500" />
          <div className="flex gap-2">
            <button onClick={copy} className={btnPrimary + " flex-1"}>
              {copied ? <><Check size={16} /> Copiado</> : <><Copy size={16} /> Copiar</>}
            </button>
            <button onClick={download} className={btnGhost + " flex-1"}>
              <Download size={16} /> Descargar
            </button>
          </div>
          {err && <p className="text-xs text-amber-600">{err}</p>}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3">
            <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800">
              Al importar se reemplazan los datos actuales por los del respaldo. Si tienes espacios sin guardar, expórtalos primero.
            </p>
          </div>
          <textarea value={raw} onChange={(e) => setRaw(e.target.value)}
            placeholder="Pega aquí el texto de tu respaldo…"
            className="w-full h-32 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700 font-mono resize-none focus:outline-none focus:ring-2 focus:ring-teal-500" />
          {err && <p className="text-xs text-rose-600">{err}</p>}
          <button onClick={doImport} disabled={!raw.trim()} className={btnPrimary + " w-full"}>
            <Upload size={16} /> Restaurar datos
          </button>
        </div>
      )}
    </Modal>
  );
}

/* ---------- account (perfil, correo, contraseña, preferencias) ---------- */

function AccountSection({ title, desc, children }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      {desc && <p className="text-xs text-slate-500 mt-0.5 mb-3">{desc}</p>}
      {children}
    </div>
  );
}

function Feedback({ err, ok }) {
  if (err) return <p className="text-xs text-rose-600 mt-2">{err}</p>;
  if (ok) return <p className="text-xs text-teal-700 mt-2">{ok}</p>;
  return null;
}

function AccountModal({ cloud, onClose }) {
  // perfil
  const [name, setName] = useState(cloud?.firstName || "");
  const [apellido, setApellido] = useState(cloud?.apellido || "");
  const [pBusy, setPBusy] = useState(false);
  const [pErr, setPErr] = useState(""); const [pOk, setPOk] = useState("");
  // correo
  const [email, setEmail] = useState(cloud?.email || "");
  const [eBusy, setEBusy] = useState(false);
  const [eErr, setEErr] = useState(""); const [eOk, setEOk] = useState("");
  // contraseña
  const [pw1, setPw1] = useState(""); const [pw2, setPw2] = useState("");
  const [wBusy, setWBusy] = useState(false);
  const [wErr, setWErr] = useState(""); const [wOk, setWOk] = useState("");

  const profileChanged =
    name.trim() !== (cloud?.firstName || "") || apellido.trim() !== (cloud?.apellido || "");

  const saveProfile = async () => {
    setPErr(""); setPOk(""); setPBusy(true);
    try {
      await cloud.updateProfile({ name: name.trim(), apellido: apellido.trim() });
      setPOk("Perfil actualizado.");
    } catch (e) { setPErr((e && e.message) || "No se pudo guardar."); }
    finally { setPBusy(false); }
  };

  const saveEmail = async () => {
    setEErr(""); setEOk("");
    const v = email.trim();
    if (!v.includes("@")) { setEErr("Escribe un correo válido."); return; }
    if (v === (cloud?.email || "")) { setEErr("Ese ya es tu correo actual."); return; }
    setEBusy(true);
    try {
      await cloud.changeEmail(v);
      setEOk("Te enviamos un correo de confirmación a la nueva dirección. El cambio se aplica al confirmarlo.");
    } catch (e) { setEErr((e && e.message) || "No se pudo actualizar el correo."); }
    finally { setEBusy(false); }
  };

  const savePassword = async () => {
    setWErr(""); setWOk("");
    if (pw1.length < 6) { setWErr("La contraseña debe tener al menos 6 caracteres."); return; }
    if (pw1 !== pw2) { setWErr("Las contraseñas no coinciden."); return; }
    setWBusy(true);
    try {
      await cloud.changePassword(pw1);
      setPw1(""); setPw2("");
      setWOk("Contraseña actualizada.");
    } catch (e) { setWErr((e && e.message) || "No se pudo cambiar la contraseña."); }
    finally { setWBusy(false); }
  };

  return (
    <Modal title="Mi cuenta" subtitle="Perfil, correo, contraseña y preferencias." onClose={onClose}
      footer={<button className={btnGhost + " w-full"} onClick={onClose}>Cerrar</button>}>
      <div className="space-y-4">
        {/* Perfil */}
        <AccountSection title="Perfil" desc="Tu nombre y apellido.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Nombre</Label>
              <input value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre" className={inputCls} />
            </div>
            <div>
              <Label>Apellido</Label>
              <input value={apellido} onChange={(e) => setApellido(e.target.value)}
                placeholder="Tu apellido" className={inputCls} />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button className={btnPrimary} disabled={!name.trim() || !profileChanged || pBusy}
              onClick={saveProfile}>
              <UserCog size={15} /> {pBusy ? "Guardando…" : "Guardar perfil"}
            </button>
          </div>
          <Feedback err={pErr} ok={pOk} />
        </AccountSection>

        {/* Correo */}
        <AccountSection title="Correo electrónico" desc="Es el correo con el que inicias sesión.">
          <Label>Correo</Label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com" className={inputCls} />
          <div className="mt-3 flex justify-end">
            <button className={btnPrimary} disabled={eBusy || !email.trim()} onClick={saveEmail}>
              <Mail size={15} /> {eBusy ? "Enviando…" : "Actualizar correo"}
            </button>
          </div>
          <Feedback err={eErr} ok={eOk} />
        </AccountSection>

        {/* Contraseña */}
        <AccountSection title="Contraseña" desc="Cambia tu contraseña de acceso.">
          <div className="space-y-3">
            <div>
              <Label>Nueva contraseña</Label>
              <PasswordField value={pw1} onChange={(e) => setPw1(e.target.value)}
                placeholder="mínimo 6 caracteres" />
            </div>
            <div>
              <Label>Repetir contraseña</Label>
              <PasswordField value={pw2} onChange={(e) => setPw2(e.target.value)}
                placeholder="repite la contraseña"
                onKeyDown={(e) => e.key === "Enter" && savePassword()} />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button className={btnPrimary} disabled={wBusy || !pw1 || !pw2} onClick={savePassword}>
              <Lock size={15} /> {wBusy ? "Guardando…" : "Cambiar contraseña"}
            </button>
          </div>
          <Feedback err={wErr} ok={wOk} />
        </AccountSection>

        {/* Preferencias (base para el futuro) */}
        <AccountSection title="Preferencias del sistema" desc="Moneda, idioma, notificaciones y más.">
          <p className="text-xs text-slate-400">
            Próximamente. Aquí irás agregando las configuraciones del sistema y tus preferencias.
          </p>
        </AccountSection>
      </div>
    </Modal>
  );
}

/* ---------- main app ---------- */

const DEFAULT_SPACES = () => {
  const mk = (name, type, tpl, color) => ({
    id: uid(), name, currency: "USD", type, color,
    buckets: makeBuckets(TEMPLATES[tpl].buckets), txns: [], createdAt: todayISO(),
  });
  return [
    mk("Finanzas Kevin", "personal", "personal", "teal"),
    mk("Akiles Store", "negocio", "negocio", "sky"),
    mk("Akiles Ride", "negocio", "negocio", "violet"),
    mk("Akiles Travel", "negocio", "negocio", "orange"),
    mk("Apollo Dev AI", "negocio", "negocio", "rose"),
    mk("Finanzas Kelly", "personal", "personal", "amber"),
  ];
};

const EMPTY = { version: 1, activeSpaceId: null, spaces: [] };
const KEY = "pf_state_v1";

/* ---------- resilient storage (IndexedDB + localStorage) ---------- */
const IDB_DB = "ganancia_primero";
const IDB_STORE = "kv";

function idbOpen() {
  return new Promise((res, rej) => {
    try {
      if (typeof indexedDB === "undefined") return rej(new Error("no idb"));
      const r = indexedDB.open(IDB_DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(IDB_STORE);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error || new Error("idb open"));
    } catch (e) { rej(e); }
  });
}
function idbGet(key) {
  return idbOpen().then((db) => new Promise((res, rej) => {
    const t = db.transaction(IDB_STORE, "readonly").objectStore(IDB_STORE).get(key);
    t.onsuccess = () => res(t.result == null ? null : t.result);
    t.onerror = () => rej(t.error);
  }));
}
function idbSet(key, val) {
  return idbOpen().then((db) => new Promise((res, rej) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(val, key);
    tx.oncomplete = () => res(true);
    tx.onerror = () => rej(tx.error);
  }));
}
const lsGet = (k) => { try { return localStorage.getItem(k); } catch (_) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (_) { return false; } };

async function storageLoad() {
  try { const v = await idbGet(KEY); if (v != null) return v; } catch (_) {}
  return lsGet(KEY);
}
async function storageSave(val) {
  let ok = false;
  try { await idbSet(KEY, val); ok = true; } catch (_) {}
  if (lsSet(KEY, val)) ok = true;
  return ok;
}
/* write a probe and confirm it can be read back — proves data actually persists */
async function storageVerify() {
  const probe = "p" + Date.now();
  let wrote = false;
  try { await idbSet("__gp_probe", probe); wrote = true; } catch (_) {}
  if (lsSet("__gp_probe", probe)) wrote = true;
  if (!wrote) return false;
  try { if ((await idbGet("__gp_probe")) === probe) return true; } catch (_) {}
  return lsGet("__gp_probe") === probe;
}

export default function App({ cloud, onLogout }) {
  const [state, setState] = useState(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [modal, setModal] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const firstSave = useRef(true);
  const [storageOk, setStorageOk] = useState(true);
  const saveTimer = useRef(null);

  useEffect(() => {
    (async () => {
      const cached = cloud.loadCache();
      if (cached) setState(cached);
      try {
        const remote = await cloud.load();
        if (remote && Array.isArray(remote.spaces)) setState(remote);
        else if (!cached) setState(EMPTY);
        setStorageOk(true);
      } catch (_) {
        setStorageOk(false);
      }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (firstSave.current) { firstSave.current = false; return; }
    cloud.saveCache(state);
    setSaveStatus("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try { await cloud.save(state); setSaveStatus("saved"); setStorageOk(true); }
      catch (_) { setSaveStatus("error"); setStorageOk(false); }
    }, 700);
  }, [state, loaded]);

  const importData = (data) => {
    setState({
      version: 1,
      spaces: data.spaces,
      activeSpaceId: data.activeSpaceId && data.spaces.some((s) => s.id === data.activeSpaceId)
        ? data.activeSpaceId
        : data.spaces[0]?.id || null,
    });
    setModal(null);
  };

  const space = state.spaces.find((s) => s.id === state.activeSpaceId) || null;
  const balances = useMemo(() => (space ? computeBalances(space) : {}), [space]);

  const reorderSpaces = (ids) =>
    setState((st) => ({ ...st, spaces: ids.map((id) => st.spaces.find((s) => s.id === id)).filter(Boolean) }));

  const onChipDragOver = (e, i) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === i) return;
    setState((st) => {
      const spaces = [...st.spaces];
      const [m] = spaces.splice(dragIndex, 1);
      spaces.splice(i, 0, m);
      return { ...st, spaces };
    });
    setDragIndex(i);
  };

  const updateSpace = (id, fn) =>
    setState((st) => ({ ...st, spaces: st.spaces.map((s) => (s.id === id ? fn(s) : s)) }));
  const pushTxn = (t) =>
    updateSpace(space.id, (s) => ({ ...s, txns: [{ id: uid(), ...t }, ...s.txns] }));

  const createSpace = ({ name, tpl, currency, color }) => {
    const ns = {
      id: uid(), name, currency, color,
      type: tpl === "personal" ? "personal" : "negocio",
      buckets: makeBuckets(TEMPLATES[tpl].buckets),
      txns: [], createdAt: todayISO(),
    };
    setState((st) => ({ ...st, spaces: [...st.spaces, ns], activeSpaceId: ns.id }));
    setModal(null);
  };

  const deleteSpace = () => {
    setState((st) => {
      const spaces = st.spaces.filter((s) => s.id !== space.id);
      return { ...st, spaces, activeSpaceId: spaces[0]?.id || null };
    });
    setModal(null);
  };

  /* ---- loading / empty ---- */
  if (!loaded)
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Cargando tus finanzas…</div>
      </div>
    );

  const totalBalance = Object.values(balances).reduce((s, v) => s + v, 0);
  const profitBucket = space?.buckets.find((b) => b.profit && !b.archived);
  const monthIncome = space
    ? space.txns
        .filter((t) => t.type === "income" && t.date.slice(0, 7) === todayISO().slice(0, 7))
        .reduce((s, t) => s + t.amount, 0)
    : 0;
  const activeBuckets = space ? space.buckets.filter((b) => !b.archived) : [];
  const bucketName = (id) => space?.buckets.find((b) => b.id === id)?.name || "—";

  return (
    <div className="min-h-screen bg-slate-100" style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-24 pt-6">
        {/* header */}
        <div className="flex items-center gap-2 mb-5">
          <div className="h-9 w-9 rounded-xl bg-teal-700 flex items-center justify-center shrink-0">
            <PiggyBank size={20} className="text-white" />
          </div>
          <button onClick={() => setModal("account")}
            className="flex-1 min-w-0 text-left group" aria-label="Configurar mi cuenta">
            <h1 className="text-base font-bold text-slate-900 leading-tight truncate group-hover:text-teal-700">
              {cloud?.name ? `Hola, ${cloud.name}` : "La Ganancia es Primero"}
            </h1>
            <p className="text-xs text-slate-500">Reparte antes de gastar</p>
          </button>
          <button onClick={() => setModal("account")} aria-label="Mi cuenta"
            className="flex items-center gap-1.5 rounded-full bg-slate-100 text-slate-700 px-3 py-1.5 text-sm font-medium hover:bg-slate-200 shrink-0">
            <UserCog size={15} /> <span className="hidden sm:inline">Mi cuenta</span>
          </button>
          {saveStatus === "saved" && (
            <span className="hidden sm:flex items-center gap-1 text-xs text-slate-400"><Check size={13} /> Guardado</span>
          )}
          {saveStatus === "saving" && <span className="hidden sm:inline text-xs text-slate-400">Guardando…</span>}
          {(saveStatus === "error" || saveStatus === "nostorage") && (
            <span className="flex items-center gap-1 text-xs font-medium text-amber-600">
              <AlertTriangle size={13} /> Sin conexión
            </span>
          )}
          <button onClick={() => setModal("advice")}
            className="flex items-center gap-1.5 rounded-full bg-teal-50 text-teal-700 px-3 py-1.5 text-sm font-medium hover:bg-teal-100">
            <BookOpen size={15} /> <span className="hidden sm:inline">Consejos</span>
          </button>
        </div>

        {/* offline / sync warning */}
        {!storageOk && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 mb-4">
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" />
              <div className="text-sm text-amber-900">
                <p className="font-semibold mb-0.5">Sin conexión con la nube</p>
                <p className="text-amber-800">Tus cambios se están guardando en este dispositivo y se subirán solos cuando vuelva la conexión.</p>
              </div>
            </div>
          </div>
        )}

        {/* space cards — estilo banca en línea */}
        {state.spaces.length > 0 && (
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2 px-0.5">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Mis espacios</h2>
              {state.spaces.length > 1 && (
                <button onClick={() => setModal("reorder")} title="Reordenar espacios"
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100">
                  <ArrowUpDown size={14} /> Reordenar
                </button>
              )}
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
              {state.spaces.map((s, i) => {
                const on = s.id === state.activeSpaceId;
                const col = spaceColor(s, i);
                const total = spaceTotalCents(s);
                return (
                  <button key={s.id}
                    onClick={() => setState((st) => ({ ...st, activeSpaceId: s.id }))}
                    draggable
                    onDragStart={() => setDragIndex(i)}
                    onDragEnd={() => setDragIndex(null)}
                    onDragOver={(e) => onChipDragOver(e, i)}
                    className={`group relative shrink-0 snap-start w-60 sm:w-64 rounded-2xl p-4 text-left text-white bg-gradient-to-br ${gradOf(col)} shadow-md overflow-hidden transition-all cursor-pointer ${
                      on ? "ring-2 ring-offset-2 ring-slate-900" : "opacity-80 hover:opacity-100"
                    } ${dragIndex === i ? "opacity-40 scale-95" : ""}`}>
                    <div className="absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/10" />
                    <div className="absolute -right-2 top-10 h-16 w-16 rounded-full bg-white/10" />
                    <div className="relative flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-medium capitalize backdrop-blur-sm">
                        {s.type === "personal" ? <PiggyBank size={12} /> : <Wallet size={12} />} {s.type}
                      </span>
                      {on && <span className="text-[11px] font-semibold bg-white/25 rounded-full px-2 py-0.5">Activo</span>}
                    </div>
                    <p className="relative text-2xl font-bold tabular-nums mt-6 leading-none">{fmt(total, s.currency)}</p>
                    <div className="relative flex items-end justify-between mt-3">
                      <p className="text-sm font-medium truncate pr-2">{s.name}</p>
                      <span className="text-[11px] font-medium text-white/80 shrink-0">{s.currency}</span>
                    </div>
                  </button>
                );
              })}
              <button onClick={() => setModal("newSpace")}
                className="shrink-0 snap-start w-32 rounded-2xl border-2 border-dashed border-slate-300 text-slate-500 hover:border-teal-400 hover:text-teal-600 flex flex-col items-center justify-center gap-1.5 transition-colors">
                <Plus size={20} /> <span className="text-xs font-medium">Nuevo espacio</span>
              </button>
            </div>
          </div>
        )}

        {/* empty state */}
        {!space && (
          <div className="mt-10 text-center max-w-sm mx-auto">
            <div className="h-14 w-14 rounded-2xl bg-teal-700 flex items-center justify-center mx-auto mb-4">
              <Wallet size={26} className="text-white" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Crea tu primer espacio</h2>
            <p className="text-sm text-slate-500 mt-1.5 mb-5">
              Uno para cada negocio y uno para lo personal. Cada espacio lleva sus propias cuentas y movimientos, sin mezclarse.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button className={btnPrimary} onClick={() => setModal("newSpace")}>
                <Plus size={16} /> Nuevo espacio
              </button>
              <button className={btnGhost} onClick={() => setModal("backupImport")}>
                <Upload size={16} /> Importar respaldo
              </button>
            </div>
          </div>
        )}

        {space && (
          <>
            {/* summary card */}
            <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-5 mb-5 overflow-hidden">
              <div className={`h-1 -mx-5 -mt-5 mb-4 bg-gradient-to-r ${gradOf(spaceColor(space, state.spaces.findIndex((s) => s.id === space.id)))}`} />
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full bg-gradient-to-br ${gradOf(spaceColor(space, state.spaces.findIndex((s) => s.id === space.id)))}`} />
                    <span className="text-sm font-semibold text-slate-800 truncate">{space.name}</span>
                    <span className="text-xs text-slate-300">·</span>
                    <span className="text-xs font-medium text-slate-500 capitalize">{space.type}</span>
                    <span className="text-xs text-slate-300">·</span>
                    <span className="text-xs font-medium text-slate-500">{space.currency}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-3">Balance total</p>
                  <p className="text-4xl font-bold text-slate-900 tabular-nums mt-0.5">
                    {fmt(totalBalance, space.currency)}
                  </p>
                </div>
                <div className="relative">
                  <button onClick={() => setMenuOpen((v) => !v)} aria-label="Más opciones"
                    className="p-2 rounded-lg text-slate-400 hover:bg-slate-100">
                    <MoreVertical size={18} />
                  </button>
                  {menuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                      <div className="absolute right-0 top-10 z-20 w-52 rounded-xl bg-white shadow-lg border border-slate-100 py-1">
                        {[
                          ["Editar cuentas y %", "editBuckets"],
                          ["Ajustar saldo", "adjust"],
                          ["Reordenar espacios", "reorder"],
                          ["Datos y respaldo", "backup"],
                          ["Ajustes del espacio", "spaceSettings"],
                        ].map(([lbl, m]) => (
                          <button key={m} onClick={() => { setMenuOpen(false); setModal(m); }}
                            className="w-full text-left px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50">{lbl}</button>
                        ))}
                        <div className="border-t border-slate-100 mt-1 pt-1">
                          {cloud?.email && (
                            <p className="px-3.5 py-1 text-xs text-slate-400 truncate">{cloud.email}</p>
                          )}
                          <button onClick={() => { setMenuOpen(false); onLogout && onLogout(); }}
                            className="w-full text-left px-3.5 py-2 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2">
                            <LogOut size={15} /> Cerrar sesión
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-1 mt-4 mb-4">
                <div className="flex items-center gap-1.5">
                  <TrendingUp size={15} className="text-teal-600" />
                  <span className="text-xs text-slate-500">Ingresos del mes</span>
                  <span className="text-sm font-semibold text-slate-800 tabular-nums">{fmt(monthIncome, space.currency)}</span>
                </div>
                {profitBucket && (
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                    <span className="text-xs text-slate-500">{profitBucket.name}</span>
                    <span className="text-sm font-semibold text-amber-600 tabular-nums">{fmt(balances[profitBucket.id], space.currency)}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button className={btnPrimary} onClick={() => setModal("income")}>
                  <Plus size={16} /> Ingreso
                </button>
                <button className={btnGhost} onClick={() => setModal("expense")}>
                  <Minus size={16} /> Gasto
                </button>
                <button className={btnGhost} onClick={() => setModal("transfer")}>
                  <ArrowLeftRight size={16} /> Mover
                </button>
              </div>
            </div>

            {/* buckets */}
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-sm font-semibold text-slate-700">Cuentas</h2>
              <button onClick={() => setModal("editBuckets")}
                className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700">
                <SlidersHorizontal size={13} /> Editar
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {activeBuckets.map((b) => {
                const c = colorOf(b.color);
                const bal = balances[b.id] || 0;
                const share = totalBalance > 0 ? Math.max(0, (bal / totalBalance) * 100) : 0;
                return (
                  <div key={b.id}
                    className={`rounded-2xl border p-4 ${b.profit ? "bg-amber-50 border-amber-200" : "bg-white border-slate-100"} shadow-sm`}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${c.dot}`} />
                      <span className="text-sm font-medium text-slate-700 truncate flex-1">{b.name}</span>
                      <span className="text-xs text-slate-400 tabular-nums">{b.percent}%</span>
                    </div>
                    <p className={`text-xl font-bold tabular-nums ${bal < 0 ? "text-rose-600" : "text-slate-900"}`}>
                      {fmt(bal, space.currency)}
                    </p>
                    <div className="mt-2.5 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className={`h-full rounded-full ${c.bar} transition-all duration-500 motion-reduce:transition-none`}
                        style={{ width: `${Math.min(100, share)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* movements */}
            <h2 className="text-sm font-semibold text-slate-700 mb-2.5">Movimientos</h2>
            {space.txns.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center">
                <p className="text-sm text-slate-500">Aún no hay movimientos. Empieza registrando un ingreso.</p>
              </div>
            ) : (
              <div className="rounded-2xl bg-white border border-slate-100 shadow-sm divide-y divide-slate-50">
                {space.txns.slice(0, 60).map((t) => {
                  let icon, tint, title, detail, amt;
                  if (t.type === "income") {
                    icon = <TrendingUp size={16} />; tint = "bg-teal-50 text-teal-600";
                    title = "Ingreso repartido"; detail = t.note || "Distribuido entre cuentas";
                    amt = <span className="text-teal-600">+{fmt(t.amount, space.currency)}</span>;
                  } else if (t.type === "expense") {
                    icon = <Minus size={16} />; tint = "bg-rose-50 text-rose-600";
                    title = t.note || "Gasto"; detail = bucketName(t.bucketId);
                    amt = <span className="text-slate-800">−{fmt(t.amount, space.currency)}</span>;
                  } else if (t.type === "transfer") {
                    icon = <ArrowLeftRight size={16} />; tint = "bg-slate-100 text-slate-500";
                    title = "Transferencia"; detail = `${bucketName(t.fromId)} → ${bucketName(t.toId)}`;
                    amt = <span className="text-slate-800">{fmt(t.amount, space.currency)}</span>;
                  } else {
                    icon = <SlidersHorizontal size={16} />; tint = "bg-slate-100 text-slate-500";
                    title = t.note || "Ajuste"; detail = bucketName(t.bucketId);
                    amt = <span className={t.amount < 0 ? "text-rose-600" : "text-slate-800"}>
                      {t.amount < 0 ? "−" : "+"}{fmt(Math.abs(t.amount), space.currency)}</span>;
                  }
                  return (
                    <div key={t.id} className="group flex items-center gap-3 px-4 py-3">
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${tint}`}>{icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{title}</p>
                        <p className="text-xs text-slate-400 truncate">{fmtDate(t.date)} · {detail}</p>
                      </div>
                      <div className="text-sm font-semibold tabular-nums">{amt}</div>
                      <button
                        onClick={() => updateSpace(space.id, (s) => ({ ...s, txns: s.txns.filter((x) => x.id !== t.id) }))}
                        aria-label="Eliminar movimiento"
                        className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 focus:opacity-100">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* modals */}
      {modal === "advice" && <AdviceLibrary onClose={() => setModal(null)} />}
      {modal === "account" && (
        <AccountModal cloud={cloud} onClose={() => setModal(null)} />
      )}
      {modal === "newSpace" && (
        <NewSpaceModal onClose={() => setModal(null)} onCreate={createSpace}
          suggestedColor={PALETTE[state.spaces.length % PALETTE.length]} />
      )}
      {modal === "reorder" && (
        <ReorderModal spaces={state.spaces} onClose={() => setModal(null)}
          onSave={(ids) => { reorderSpaces(ids); setModal(null); }} />
      )}
      {(modal === "backup" || modal === "backupImport") && (
        <BackupModal state={state} startTab={modal === "backupImport" ? "import" : "export"}
          onClose={() => setModal(null)} onImport={importData} />
      )}
      {space && modal === "income" && (
        <IncomeModal space={space} onClose={() => setModal(null)}
          onSubmit={(p) => { pushTxn({ type: "income", ...p }); setModal(null); }} />
      )}
      {space && modal === "expense" && (
        <ExpenseModal space={space} balances={balances} onClose={() => setModal(null)}
          onSubmit={(p) => { pushTxn({ type: "expense", ...p }); setModal(null); }} />
      )}
      {space && modal === "transfer" && (
        <TransferModal space={space} balances={balances} onClose={() => setModal(null)}
          onSubmit={(p) => { pushTxn({ type: "transfer", ...p }); setModal(null); }} />
      )}
      {space && modal === "adjust" && (
        <AdjustModal space={space} onClose={() => setModal(null)}
          onSubmit={(p) => { pushTxn({ type: "adjust", ...p }); setModal(null); }} />
      )}
      {space && modal === "editBuckets" && (
        <EditBucketsModal space={space} balances={balances} onClose={() => setModal(null)}
          onSave={(buckets) => { updateSpace(space.id, (s) => ({ ...s, buckets })); setModal(null); }} />
      )}
      {space && modal === "spaceSettings" && (
        <SpaceSettingsModal space={space} onClose={() => setModal(null)}
          onSave={({ name, color }) => { updateSpace(space.id, (s) => ({ ...s, name, color })); setModal(null); }}
          onDelete={deleteSpace} />
      )}
    </div>
  );
}
