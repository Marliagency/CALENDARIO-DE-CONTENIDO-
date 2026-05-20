import { Loader2 } from "lucide-react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";

/**
 * Wrapper que protege rutas. Redirige a /login si no hay sesión,
 * pasando la URL actual como state.from para volver tras login.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="grid h-screen place-items-center">
        <Loader2 className="size-6 animate-spin text-ink-muted" />
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
