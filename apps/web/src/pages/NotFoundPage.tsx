import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="grid h-full place-items-center p-6">
      <div className="card max-w-md p-8 text-center">
        <div className="text-6xl">🤔</div>
        <h2 className="mt-3 text-lg font-semibold">No encontrado</h2>
        <p className="mt-1 text-sm text-ink-muted">
          La ruta que buscas no existe o el workspace no está disponible.
        </p>
        <Link to="/overview" className="btn-primary mt-4 inline-flex">
          Volver al resumen
        </Link>
      </div>
    </div>
  );
}
