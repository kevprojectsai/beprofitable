import React, { useState } from "react";
import {
  X, ChevronLeft, ChevronRight, BookOpen, TrendingDown, Rocket,
  TrendingUp, Wallet, PiggyBank, Landmark, LineChart, Brain,
} from "lucide-react";
import { ADVICE } from "./advice.js";

const ICONS = { BookOpen, TrendingDown, Rocket, TrendingUp, Wallet, PiggyBank, Landmark, LineChart, Brain };
const C = {
  teal:   { soft: "bg-teal-50",   text: "text-teal-700",   dot: "bg-teal-500" },
  rose:   { soft: "bg-rose-50",   text: "text-rose-700",   dot: "bg-rose-500" },
  amber:  { soft: "bg-amber-50",  text: "text-amber-700",  dot: "bg-amber-500" },
  lime:   { soft: "bg-lime-50",   text: "text-lime-700",   dot: "bg-lime-500" },
  sky:    { soft: "bg-sky-50",    text: "text-sky-700",    dot: "bg-sky-500" },
  violet: { soft: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-500" },
  orange: { soft: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500" },
  cyan:   { soft: "bg-cyan-50",   text: "text-cyan-700",   dot: "bg-cyan-500" },
};
const col = (c) => C[c] || C.teal;

export default function AdviceLibrary({ onClose }) {
  const [catId, setCatId] = useState(null);
  const cat = ADVICE.find((c) => c.id === catId) || null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-16 pt-6">
        {/* header */}
        <div className="flex items-center gap-2 mb-5">
          {cat ? (
            <button onClick={() => setCatId(null)} aria-label="Volver"
              className="p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-200">
              <ChevronLeft size={20} />
            </button>
          ) : (
            <div className="h-9 w-9 rounded-xl bg-teal-700 flex items-center justify-center shrink-0">
              <BookOpen size={18} className="text-white" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-slate-900 leading-tight truncate">
              {cat ? cat.name : "Guía Profit First"}
            </h1>
            <p className="text-xs text-slate-500 truncate">
              {cat ? cat.summary : "Consejos por situación financiera"}
            </p>
          </div>
          <button onClick={onClose} aria-label="Cerrar"
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-200">
            <X size={20} />
          </button>
        </div>

        {!cat ? (
          <>
            <p className="text-sm text-slate-600 mb-4">
              Elige tu situación y encuentra qué hacer. Todo está basado en el método de <i>La Ganancia es Primero</i>.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {ADVICE.map((c) => {
                const Icon = ICONS[c.icon] || BookOpen;
                const cc = col(c.color);
                return (
                  <button key={c.id} onClick={() => setCatId(c.id)}
                    className="text-left rounded-2xl bg-white border border-slate-100 shadow-sm p-4 hover:border-slate-300 transition-colors">
                    <div className={`h-10 w-10 rounded-xl ${cc.soft} flex items-center justify-center mb-2.5`}>
                      <Icon size={20} className={cc.text} />
                    </div>
                    <p className="text-sm font-semibold text-slate-800 leading-snug">{c.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{c.tips.length} consejos</p>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <div className="space-y-3">
            {cat.tips.map((t) => {
              const cc = col(cat.color);
              return (
                <div key={t.id} className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4">
                  <div className="flex items-start gap-2.5">
                    <span className={`h-2.5 w-2.5 rounded-full ${cc.dot} mt-1.5 shrink-0`} />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{t.title}</p>
                      <p className="text-sm text-slate-600 mt-1 leading-relaxed">{t.body}</p>
                    </div>
                  </div>
                </div>
              );
            })}
            <p className="text-xs text-slate-400 pt-1">
              Pronto: un asesor que lea estos consejos junto con tus números y te diga exactamente qué hacer en tu caso.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
