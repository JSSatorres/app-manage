import { cn } from "@/lib/utils";

/**
 * Marca de SportApp para la landing: el mismo icono (capas) en cuadrado azul
 * #3358ff que usa la app (login/registro), wordmark "SportApp" y kicker opcional.
 */
export function Logo({
  className,
  withKicker = false,
  invert = false,
}: {
  className?: string;
  withKicker?: boolean;
  invert?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className="flex size-8 items-center justify-center rounded-[9px] shrink-0"
        style={{ background: "#3358ff" }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="size-4 text-white"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="leading-none">
        <span
          className={cn(
            "text-[16px] font-semibold tracking-[-0.02em]",
            invert ? "text-white" : "text-foreground",
          )}
        >
          SportApp
        </span>
        {withKicker && (
          <span
            className={cn(
              "block text-[9px] font-semibold uppercase tracking-[0.18em]",
              invert ? "text-white/60" : "text-muted-foreground",
            )}
          >
            Elite Management
          </span>
        )}
      </div>
    </div>
  );
}
