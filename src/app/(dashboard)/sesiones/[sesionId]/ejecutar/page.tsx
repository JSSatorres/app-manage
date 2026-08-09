import { SesionEjecutarView } from "@/components/sesiones/SesionEjecutarView";

interface SesionEjecutarPageProps {
  params: Promise<{ sesionId: string }>;
}

export default async function SesionEjecutarPage({ params }: SesionEjecutarPageProps) {
  const { sesionId } = await params;
  return <SesionEjecutarView sesionId={sesionId} />;
}
