import { useState } from "react";
import type { PlatformVariant } from "@pulse/types";
import { useParams } from "react-router-dom";
import { sync } from "@/lib/api/client";
import { cn, formatEur } from "@/lib/utils";

const DURATION_OPTIONS = [1, 3, 5, 7, 14];
const PRESETS = [
  { budget: 1, days: 1 },
  { budget: 3, days: 3 },
  { budget: 5, days: 5 },
  { budget: 10, days: 7 },
];

export function BoostStepper({ variant }: { variant: PlatformVariant }) {
  const { slug } = useParams<{ slug: string }>();
  const audiences = slug ? sync.audiences(sync.workspace(slug)?.id ?? "") : [];

  const [enabled, setEnabled] = useState(variant.boostEnabled);
  const [budget, setBudget] = useState(variant.boostBudgetEur || 3);
  const [days, setDays] = useState(variant.boostDurationDays ?? 3);
  const [audienceId, setAudienceId] = useState<string>(
    variant.boostAudiencePresetId ?? audiences[0]?.id ?? "",
  );
  const [objective, setObjective] = useState(variant.boostObjective ?? "VIDEO_VIEW");
  const dailyBudget = days > 0 ? budget / days : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          Promocionar esta variante
        </label>
        {enabled && (
          <div className="text-sm font-semibold tabular-nums text-ws">
            {formatEur(budget)} totales
          </div>
        )}
      </div>

      {enabled && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="label">Presupuesto total</label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="btn-secondary px-2"
                  onClick={() => setBudget((b) => Math.max(0, b - 1))}
                >
                  −
                </button>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="input text-center"
                />
                <button
                  type="button"
                  className="btn-secondary px-2"
                  onClick={() => setBudget((b) => b + 1)}
                >
                  +
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <label className="label">Duración</label>
              <div className="flex flex-wrap gap-1">
                {DURATION_OPTIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDays(d)}
                    className={cn(
                      "rounded-md border px-2 py-1 text-xs",
                      days === d
                        ? "border-ws bg-ws/10 text-ink"
                        : "border-border text-ink-muted hover:bg-hover",
                    )}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1">
            <span className="label mr-1 self-center">Presets:</span>
            {PRESETS.map((p) => (
              <button
                key={`${p.budget}-${p.days}`}
                type="button"
                onClick={() => {
                  setBudget(p.budget);
                  setDays(p.days);
                }}
                className="rounded-md border border-border px-2 py-0.5 text-[11px] text-ink-muted hover:bg-hover"
              >
                {p.budget}€ · {p.days}d
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <label className="label">Objetivo</label>
              <select
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                className="input"
              >
                <option value="VIDEO_VIEW">Reproducciones</option>
                <option value="REACH">Alcance</option>
                <option value="ENGAGEMENT">Engagement</option>
                <option value="CONVERSIONS">Conversiones</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="label">Audiencia</label>
              <select
                value={audienceId}
                onChange={(e) => setAudienceId(e.target.value)}
                className="input"
              >
                {audiences.length === 0 && <option value="">Sin presets</option>}
                {audiences.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-md bg-hover px-3 py-2 text-xs">
            <div className="flex justify-between">
              <span className="text-ink-muted">Total a invertir</span>
              <span className="font-semibold tabular-nums">{formatEur(budget)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted">Diario calculado</span>
              <span className="tabular-nums">{formatEur(dailyBudget)} / día</span>
            </div>
            <div className="mt-1 border-t border-border pt-1 text-[11px] text-ink-muted">
              Vas a gastar <strong className="text-ink">{formatEur(budget)}</strong> en
              total durante <strong className="text-ink">{days} días</strong>.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
