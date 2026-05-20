import { Download, Plus } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { sync } from "@/lib/api/client";
import { PageHeader } from "@/components/ui/PageHeader";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { cn, formatNumber } from "@/lib/utils";

type Tab =
  | "producto"
  | "visual"
  | "tono"
  | "audiencia"
  | "mensajes"
  | "referencias"
  | "campanas";

const TABS: { id: Tab; label: string }[] = [
  { id: "producto", label: "Producto" },
  { id: "visual", label: "Identidad visual" },
  { id: "tono", label: "Tono de voz" },
  { id: "audiencia", label: "Audiencia" },
  { id: "mensajes", label: "Mensajes y Hooks" },
  { id: "referencias", label: "Referencias" },
  { id: "campanas", label: "Campañas" },
];

export function BrandBrainPage() {
  const { slug } = useParams<{ slug: string }>();
  const ws = slug ? sync.workspace(slug) : undefined;
  const [tab, setTab] = useState<Tab>("producto");

  if (!ws) return <NotFoundPage />;

  const brain = sync.brain(ws.id);

  return (
    <div>
      <PageHeader
        title="Brand Brain"
        description="Documento vivo del workspace. La IA usa este contexto para generar y revisar contenido."
        actions={
          <button type="button" className="btn-secondary">
            <Download className="size-4" /> Exportar a PDF
          </button>
        }
      />
      <div className="border-b border-border bg-base/30 px-6">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "shrink-0 border-b-2 px-3 py-3 text-sm font-medium transition-colors",
                tab === t.id
                  ? "border-ws text-ink"
                  : "border-transparent text-ink-muted hover:text-ink",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {!brain || !brain.productDescription ? (
          <div className="card flex flex-col gap-2 p-6 text-sm">
            <div className="font-semibold">Brand Brain vacío</div>
            <p className="text-ink-muted">
              Aún no has rellenado el Brand Brain de este workspace. Empieza por la
              pestaña <strong>Producto</strong> para darle contexto a la IA sobre qué
              representa.
            </p>
          </div>
        ) : (
          <>
            {tab === "producto" && <ProductoTab brainId={brain.id} workspaceId={ws.id} />}
            {tab === "visual" && <VisualTab workspaceId={ws.id} />}
            {tab === "tono" && <TonoTab workspaceId={ws.id} />}
            {tab === "audiencia" && <AudienciaTab workspaceId={ws.id} />}
            {tab === "mensajes" && <MensajesTab workspaceId={ws.id} />}
            {tab === "referencias" && <ReferenciasTab workspaceId={ws.id} />}
            {tab === "campanas" && <CampanasTab workspaceId={ws.id} />}
          </>
        )}
      </div>
    </div>
  );
}

function ProductoTab({ brainId, workspaceId }: { brainId: string; workspaceId: string }) {
  const brain = sync.brain(workspaceId);
  if (!brain) return null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Block title="Descripción del producto" full>
        <p className="text-sm leading-relaxed">{brain.productDescription}</p>
      </Block>
      <Block title="Tagline principal">
        <div className="rounded-md bg-hover px-4 py-3 text-lg font-semibold">
          {brain.taglineMain}
        </div>
        {brain.taglinesAlt.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {brain.taglinesAlt.map((t) => (
              <span key={t} className="pill bg-hover text-ink">
                {t}
              </span>
            ))}
          </div>
        )}
      </Block>
      <Block title="UVP — Unique Value Prop">
        <p className="text-sm font-medium">{brain.uniqueValueProp}</p>
      </Block>
      <Block title="Problema que resolvemos">
        <p className="text-sm leading-relaxed">{brain.problemSolved}</p>
      </Block>
      <Block title="Lo que NO somos">
        <ul className="space-y-1">
          {brain.whatWeAreNot.map((w) => (
            <li key={w} className="flex items-center gap-2 text-sm">
              <span className="text-red-400">✕</span> {w}
            </li>
          ))}
        </ul>
      </Block>
      <Block title="Competidores" full>
        <table className="w-full text-sm">
          <tbody>
            {brain.competitors.map((c) => (
              <tr key={c.name} className="border-b border-border/60 last:border-0">
                <td className="py-2 font-medium">{c.name}</td>
                <td className="py-2 text-ink-muted">{c.differentiator}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Block>
      {brain.techStackNotes && (
        <Block title="Notas técnicas">
          <p className="text-sm">{brain.techStackNotes}</p>
        </Block>
      )}
      {brain.pricingNotes && (
        <Block title="Pricing / Monetización">
          <p className="text-sm">{brain.pricingNotes}</p>
          {brain.monetizationNotes && (
            <p className="mt-1 text-sm text-ink-muted">{brain.monetizationNotes}</p>
          )}
        </Block>
      )}
    </div>
  );
}

function VisualTab({ workspaceId }: { workspaceId: string }) {
  const ws = sync.workspaces().find((w) => w.id === workspaceId);
  const assets = sync.assets(workspaceId).filter((a) => a.section === "logo" || a.section === "moodboard");

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Block title="Paleta de colores">
        <div className="flex gap-3">
          <ColorChip color={ws?.brandColorPrimary} label="Primario" />
          {ws?.brandColorSecondary && (
            <ColorChip color={ws.brandColorSecondary} label="Secundario" />
          )}
        </div>
      </Block>
      <Block title="Tipografía">
        <div className="space-y-1 text-sm">
          <div className="font-bold text-base">Inter — Bold</div>
          <div className="font-medium">Inter — Medium</div>
          <div>Inter — Regular</div>
        </div>
      </Block>
      <Block title="Logos" full>
        {assets.length === 0 ? (
          <p className="text-sm text-ink-muted">Aún no hay logos subidos.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {assets.map((a) => (
              <div key={a.id} className="card p-3">
                <div className="grid aspect-square place-items-center rounded-md bg-hover text-xs text-ink-muted">
                  {a.fileType?.includes("svg") ? "SVG" : "IMG"}
                </div>
                <div className="mt-2 truncate text-xs font-medium">{a.name}</div>
              </div>
            ))}
          </div>
        )}
      </Block>
    </div>
  );
}

function TonoTab({ workspaceId }: { workspaceId: string }) {
  const brain = sync.brain(workspaceId);
  if (!brain) return null;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Block title="Adjetivos de marca">
        <div className="flex flex-wrap gap-1.5">
          {brain.brandAdjectives.map((a) => (
            <span key={a} className="pill bg-ws/10 text-ws">
              {a}
            </span>
          ))}
        </div>
      </Block>
      <Block title="Cómo hablamos">
        <p className="text-sm leading-relaxed">{brain.howWeTalk}</p>
      </Block>
      <Block title="Cómo NO hablamos" full>
        <ul className="space-y-1">
          {brain.howWeDontTalk.map((w) => (
            <li key={w} className="flex items-center gap-2 text-sm">
              <span className="text-red-400">✕</span> {w}
            </li>
          ))}
        </ul>
      </Block>
      <Block title="Copy aprobado" full>
        <div className="space-y-2">
          {brain.copyApprovedExamples.map((e, i) => (
            <div key={i} className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3">
              <div className="text-sm">{e.text}</div>
              <div className="mt-1.5 flex items-center gap-2 text-[11px] text-ink-muted">
                <span className="font-semibold uppercase">{e.platform}</span>
                {e.notes && <span>· {e.notes}</span>}
              </div>
            </div>
          ))}
        </div>
      </Block>
      <Block title="Copy rechazado" full>
        <div className="space-y-2">
          {brain.copyRejectedExamples.map((e, i) => (
            <div key={i} className="rounded-md border border-red-500/30 bg-red-500/5 p-3">
              <div className="text-sm">{e.text}</div>
              <div className="mt-1.5 text-[11px] text-ink-muted">{e.reason}</div>
            </div>
          ))}
        </div>
      </Block>
      <Block title="Claims permitidos">
        <ul className="space-y-1">
          {brain.claimsAllowed.map((c) => (
            <li key={c} className="flex items-start gap-2 text-sm">
              <span className="text-emerald-400">✓</span> {c}
            </li>
          ))}
        </ul>
      </Block>
      <Block title="Claims prohibidos">
        <ul className="space-y-1">
          {brain.claimsForbidden.map((c) => (
            <li key={c} className="flex items-start gap-2 text-sm">
              <span className="text-red-400">✕</span> {c}
            </li>
          ))}
        </ul>
      </Block>
      {brain.disclaimersRequired.length > 0 && (
        <Block title="Disclaimers obligatorios" full>
          <ul className="space-y-1">
            {brain.disclaimersRequired.map((d) => (
              <li key={d} className="text-sm italic text-ink-muted">{d}</li>
            ))}
          </ul>
        </Block>
      )}
    </div>
  );
}

function AudienciaTab({ workspaceId }: { workspaceId: string }) {
  const personas = sync.personas(workspaceId);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {personas.map((p) => (
        <div key={p.id} className="card p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-semibold">{p.name}</div>
              <div className="text-xs text-ink-muted">{p.ageRange}</div>
            </div>
            {p.isProTarget && (
              <span className="pill bg-violet-500/15 text-violet-400">Pro target</span>
            )}
          </div>
          <p className="mt-3 text-sm text-ink-muted">{p.demographics}</p>
          <div className="mt-3 space-y-2 text-sm">
            <PersonaField label="Pains">
              <ul className="ml-4 list-disc space-y-0.5">
                {p.pains.map((pain) => (
                  <li key={pain}>{pain}</li>
                ))}
              </ul>
            </PersonaField>
            <PersonaField label="JTBD funcional">{p.jtbdFunctional}</PersonaField>
            <PersonaField label="JTBD emocional">{p.jtbdEmotional}</PersonaField>
            <PersonaField label="Promesa">{p.promise}</PersonaField>
            <PersonaField label="Hooks ganadores">
              <div className="flex flex-wrap gap-1.5">
                {p.workingHooks.map((h) => (
                  <span key={h} className="pill bg-hover text-ink">{h}</span>
                ))}
              </div>
            </PersonaField>
          </div>
        </div>
      ))}
      <button type="button" className="card flex min-h-[200px] flex-col items-center justify-center gap-2 text-ink-muted hover:bg-hover">
        <Plus className="size-5" /> Añadir persona
      </button>
    </div>
  );
}

function PersonaField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-ink-muted">{label}</div>
      <div className="mt-0.5 text-sm">{children}</div>
    </div>
  );
}

function MensajesTab({ workspaceId }: { workspaceId: string }) {
  const hooks = sync.hooks(workspaceId);
  return (
    <div className="space-y-4">
      <Block title="Hook library" full>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-ink-muted">
              <th className="py-2 pr-3 font-medium">Hook</th>
              <th className="py-2 pr-3 font-medium">Formato</th>
              <th className="py-2 pr-3 font-medium">Probado</th>
              <th className="py-2 font-medium">Resultado</th>
            </tr>
          </thead>
          <tbody>
            {hooks.map((h) => (
              <tr key={h.id} className="border-b border-border/60 last:border-0">
                <td className="py-2.5 pr-3 font-medium">{h.text}</td>
                <td className="py-2.5 pr-3 text-ink-muted">{h.format ?? "—"}</td>
                <td className="py-2.5 pr-3">
                  {h.testedAt ? (
                    <span className="pill bg-emerald-500/15 text-emerald-400">Sí</span>
                  ) : (
                    <span className="pill bg-hover text-ink-muted">No</span>
                  )}
                </td>
                <td className="py-2.5 text-ink-muted">{h.resultNotes ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Block>
    </div>
  );
}

function ReferenciasTab({ workspaceId }: { workspaceId: string }) {
  const allAssets = sync.assets(workspaceId);

  const sections: { id: string; label: string }[] = [
    { id: "logo", label: "Logos y assets de marca" },
    { id: "screenshot", label: "Capturas del producto" },
    { id: "ad_own", label: "Anuncios propios" },
    { id: "ad_reference", label: "Referencias externas" },
    { id: "document", label: "Documentos" },
    { id: "video_ref", label: "Vídeos de referencia" },
  ];

  return (
    <div className="space-y-4">
      {sections.map((s) => {
        const assets = allAssets.filter((a) => a.section === s.id);
        if (assets.length === 0) return null;
        return (
          <Block title={s.label} full key={s.id}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {assets.map((a) => (
                <div key={a.id} className="rounded-md border border-border p-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="truncate font-medium">{a.name}</div>
                    {a.fileSizeBytes != null && (
                      <span className="text-[11px] text-ink-muted">
                        {formatNumber(Math.round(a.fileSizeBytes / 1024))} KB
                      </span>
                    )}
                  </div>
                  {a.description && (
                    <p className="mt-1 text-xs text-ink-muted line-clamp-2">
                      {a.description}
                    </p>
                  )}
                  {typeof a.metadata?.summary === "string" && (
                    <div className="mt-2 rounded-md bg-hover p-2 text-[11px] text-ink-muted">
                      <strong className="text-ink">Resumen IA:</strong>{" "}
                      {String(a.metadata.summary)}
                    </div>
                  )}
                  {a.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {a.tags.map((t) => (
                        <span key={t} className="pill bg-hover text-ink-muted">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Block>
        );
      })}
    </div>
  );
}

function CampanasTab({ workspaceId }: { workspaceId: string }) {
  const campaigns = sync.campaigns(workspaceId);
  if (campaigns.length === 0) {
    return (
      <p className="text-sm text-ink-muted">No hay campañas todavía.</p>
    );
  }
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {campaigns.map((c) => (
        <div key={c.id} className="card p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-semibold">{c.name}</div>
              <div className="text-xs text-ink-muted">
                Objetivo: {c.objective} · KPI: {c.kpiName ?? "—"}
              </div>
            </div>
            <span className="pill bg-emerald-500/15 text-emerald-400">{c.status}</span>
          </div>
          {c.notes && <p className="mt-3 text-sm text-ink-muted">{c.notes}</p>}
        </div>
      ))}
    </div>
  );
}

function Block({
  title,
  full,
  children,
}: {
  title: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("card p-4", full && "lg:col-span-2")}>
      <div className="label mb-3">{title}</div>
      {children}
    </div>
  );
}

function ColorChip({ color, label }: { color?: string; label: string }) {
  return (
    <div className="flex-1">
      <div
        className="h-16 w-full rounded-md border border-border"
        style={{ backgroundColor: color }}
      />
      <div className="mt-1 flex items-center justify-between text-xs">
        <span>{label}</span>
        <span className="font-mono text-ink-muted">{color}</span>
      </div>
    </div>
  );
}
