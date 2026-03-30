export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-3xl font-bold">Sin conexión</h1>
      <p className="text-muted-foreground max-w-md">
        No tienes conexión a internet. Comprueba tu conexión y vuelve a
        intentarlo.
      </p>
    </div>
  );
}
