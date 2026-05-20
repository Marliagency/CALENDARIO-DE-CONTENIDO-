import { AlertTriangle, Bell, Check, Info, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { http, type Notification } from "@/lib/api/http";
import { mockMode } from "@/lib/api/client";
import { cn, timeAgo } from "@/lib/utils";

const POLL_INTERVAL_MS = 60_000;

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    if (mockMode) {
      // Generamos algunas notificaciones de ejemplo en modo mock.
      const mock: Notification[] = [
        {
          id: "n1",
          kind: "piece_in_review",
          severity: "info",
          title: "Nueva pieza para revisar",
          body: "Hook del lunes — POV 5 apps",
          createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          url: "/w/qyro/queue",
        },
        {
          id: "n2",
          kind: "token_expiring",
          severity: "warning",
          title: "Token de @qyro Facebook caduca en 3 días",
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          url: "/w/qyro/settings/connections",
        },
      ];
      setItems(mock);
      setUnreadCount(mock.length);
      return;
    }
    setLoading(true);
    try {
      const res = await http.getNotifications();
      setItems(res.items);
      setUnreadCount(res.unreadCount);
    } catch {
      // Si falla (ej: no autenticado), ignorar silenciosamente.
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (open && ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function markRead(id: string) {
    if (mockMode) {
      setItems((arr) => arr.filter((n) => n.id !== id));
      setUnreadCount((c) => Math.max(0, c - 1));
      return;
    }
    await http.markNotificationRead(id);
    load();
  }

  async function dismiss(id: string) {
    if (mockMode) {
      setItems((arr) => arr.filter((n) => n.id !== id));
      setUnreadCount((c) => Math.max(0, c - 1));
      return;
    }
    await http.dismissNotification(id);
    load();
  }

  async function markAll() {
    if (mockMode) {
      setItems([]);
      setUnreadCount(0);
      return;
    }
    await http.markAllRead();
    load();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="relative btn-ghost"
        aria-label="Notificaciones"
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid min-w-[18px] place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-[360px] max-w-[calc(100vw-1rem)]">
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <div className="text-sm font-semibold">Notificaciones</div>
              <div className="flex items-center gap-1">
                {loading && (
                  <Loader2 className="size-3 animate-spin text-ink-muted" />
                )}
                {items.length > 0 && (
                  <button
                    type="button"
                    className="text-xs text-ink-muted hover:text-ink"
                    onClick={markAll}
                  >
                    Marcar todas
                  </button>
                )}
              </div>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {items.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-ink-muted">
                  No hay notificaciones nuevas.
                </div>
              ) : (
                items.map((n) => (
                  <NotificationItem
                    key={n.id}
                    n={n}
                    onClose={() => setOpen(false)}
                    onMarkRead={() => markRead(n.id)}
                    onDismiss={() => dismiss(n.id)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationItem({
  n,
  onClose,
  onMarkRead,
  onDismiss,
}: {
  n: Notification;
  onClose: () => void;
  onMarkRead: () => void;
  onDismiss: () => void;
}) {
  const Icon =
    n.severity === "error"
      ? AlertTriangle
      : n.severity === "warning"
        ? AlertTriangle
        : Info;
  const color =
    n.severity === "error"
      ? "text-red-400"
      : n.severity === "warning"
        ? "text-amber-400"
        : "text-blue-400";

  const isRead = !!n.readAt;

  const Wrapper = (props: { children: React.ReactNode }) =>
    n.url ? (
      <Link
        to={n.url}
        onClick={() => {
          onMarkRead();
          onClose();
        }}
        className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-hover"
      >
        {props.children}
      </Link>
    ) : (
      <div className="flex items-start gap-2 px-3 py-2">{props.children}</div>
    );

  return (
    <div
      className={cn(
        "border-b border-border/60 last:border-0 group relative",
        !isRead && "bg-hover/30",
      )}
    >
      <Wrapper>
        <Icon className={cn("mt-0.5 size-4 shrink-0", color)} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{n.title}</div>
          {n.body && (
            <div className="mt-0.5 text-xs text-ink-muted line-clamp-2">
              {n.body}
            </div>
          )}
          <div className="mt-1 text-[11px] text-ink-muted">{timeAgo(n.createdAt)}</div>
        </div>
        {!isRead && (
          <span className="mt-1.5 size-2 rounded-full bg-ws" aria-label="No leída" />
        )}
      </Wrapper>
      <button
        type="button"
        className="absolute right-1 top-1 hidden rounded p-0.5 text-ink-muted hover:bg-base hover:text-ink group-hover:block"
        onClick={onDismiss}
        aria-label="Descartar"
      >
        <X className="size-3" />
      </button>
    </div>
  );
}
