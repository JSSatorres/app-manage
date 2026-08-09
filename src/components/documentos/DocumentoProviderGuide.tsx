import { AlertCircle, HardDrive, Play, ShieldCheck } from "lucide-react"
import type { DocumentoProvider } from "./DocumentoProviderEmptyState"

interface DocumentoProviderGuideProps {
  provider: DocumentoProvider
}

const guides = {
  youtube: {
    icon: Play,
    title: "YouTube",
    steps:
      "1. Crea o usa el canal del club. 2. Sube el vídeo y selecciona No listado solo si no contiene información sensible; comprueba que permite inserción. 3. Copia el enlace y pégalo aquí.",
    notice: "No listado no significa privado.",
    storage: "Almacenado en YouTube · no consume espacio de tu plan.",
  },
  google_drive: {
    icon: ShieldCheck,
    title: "Google Drive",
    steps:
      "1. Sube el archivo al Drive del club. 2. Comparte con las personas o grupo correctos; evita Publicar en la Web para contenido interno. 3. Copia el enlace de Drive y pégalo aquí.",
    notice:
      "Quien abra el enlace debe iniciar sesión con una cuenta que tenga permisos en Drive.",
    storage: "Almacenado en Google Drive · no consume espacio de tu plan.",
  },
  supabase_storage: {
    icon: HardDrive,
    title: "Almacenamiento",
    steps:
      "1. Revisa espacio disponible y formatos permitidos. 2. Elige archivo, visibilidad y relaciones. 3. Sube; el archivo quedará privado y contará en tu cuota.",
    notice: "Tamaño máximo de archivo: 100 MB.",
    storage: "Los archivos privados consumen la cuota contratada del club.",
  },
} as const

export function DocumentoProviderGuide({ provider }: DocumentoProviderGuideProps) {
  const guide = guides[provider]
  const Icon = guide.icon

  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center gap-2 font-medium">
        <Icon aria-hidden="true" className="size-4 text-primary" />
        <span>Configura {guide.title}</span>
      </div>
      <p className="leading-6 text-muted-foreground">{guide.steps}</p>
      <p className="flex items-start gap-2 rounded-md bg-muted px-3 py-2 text-muted-foreground">
        <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>{guide.notice}</span>
      </p>
      <p className="text-xs text-muted-foreground">{guide.storage}</p>
    </div>
  )
}
