import { Link } from "react-router";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-code text-sm text-[#ff6026]">404</p>
      <h1 className="font-display text-4xl font-bold uppercase tracking-wide">
        Ruta no encontrada
      </h1>
      <Link to="/" className="text-sm text-muted-foreground underline">
        Volver al inicio
      </Link>
    </div>
  );
}
