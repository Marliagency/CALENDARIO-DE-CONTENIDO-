import { sync } from "@/lib/api/client";
import { PageHeader } from "@/components/ui/PageHeader";
import { getInitials } from "@/lib/utils";

export function ProfilePage() {
  const user = sync.user();
  return (
    <div>
      <PageHeader title="Mi cuenta" description="Información del usuario." />
      <div className="mx-auto max-w-xl space-y-4 p-6">
        <div className="card flex items-center gap-4 p-5">
          <span className="grid size-14 place-items-center rounded-full bg-ws text-lg font-semibold text-white">
            {getInitials(user.name)}
          </span>
          <div>
            <div className="font-semibold">{user.name}</div>
            <div className="text-sm text-ink-muted">{user.email}</div>
          </div>
        </div>
        <div className="card space-y-3 p-5">
          <Field label="Nombre">
            <input className="input" defaultValue={user.name} />
          </Field>
          <Field label="Email">
            <input className="input" defaultValue={user.email} />
          </Field>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
