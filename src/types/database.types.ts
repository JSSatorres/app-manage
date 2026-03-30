export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      sedes: {
        Row: {
          id: string;
          nombre: string;
          direccion: string | null;
          configuracion_visual: Json;
          responsable_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          direccion?: string | null;
          configuracion_visual?: Json;
          responsable_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nombre?: string;
          direccion?: string | null;
          configuracion_visual?: Json;
          responsable_id?: string | null;
          updated_at?: string;
        };
      };
      usuarios: {
        Row: {
          id: string;
          email: string;
          nombre: string | null;
          rol: string;
          sede_id: string | null;
          telefono: string | null;
          foto_perfil: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          nombre?: string | null;
          rol: string;
          sede_id?: string | null;
          telefono?: string | null;
          foto_perfil?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          nombre?: string | null;
          rol?: string;
          sede_id?: string | null;
          telefono?: string | null;
          foto_perfil?: string | null;
          updated_at?: string;
        };
      };
      parametros_sistema: {
        Row: {
          id: string;
          categoria: string;
          nombre: string;
          activo: boolean;
          sede_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          categoria: string;
          nombre: string;
          activo?: boolean;
          sede_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          categoria?: string;
          nombre?: string;
          activo?: boolean;
          sede_id?: string | null;
        };
      };
      equipos: {
        Row: {
          id: string;
          nombre: string;
          categoria: string | null;
          sede_id: string;
          entrenador_principal_id: string | null;
          entrenador_adjunto_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          categoria?: string | null;
          sede_id: string;
          entrenador_principal_id?: string | null;
          entrenador_adjunto_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nombre?: string;
          categoria?: string | null;
          sede_id?: string;
          entrenador_principal_id?: string | null;
          entrenador_adjunto_id?: string | null;
          updated_at?: string;
        };
      };
      ejercicios: {
        Row: {
          id: string;
          titulo: string;
          descripcion_detallada: string | null;
          representacion_grafica: string | null;
          objetivo_principal: string | null;
          objetivos_secundarios: string[] | null;
          contenido_tactico: string | null;
          contenido_tecnico: string | null;
          contenido_fisico: string | null;
          dimensiones_campo: string | null;
          numero_jugadores_min: number | null;
          material_necesario: string[] | null;
          drive_video_id: string | null;
          drive_image_id: string | null;
          sede_propietaria_id: string | null;
          sedes_ocultas: string[] | null;
          es_global: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          titulo: string;
          descripcion_detallada?: string | null;
          representacion_grafica?: string | null;
          objetivo_principal?: string | null;
          objetivos_secundarios?: string[] | null;
          contenido_tactico?: string | null;
          contenido_tecnico?: string | null;
          contenido_fisico?: string | null;
          dimensiones_campo?: string | null;
          numero_jugadores_min?: number | null;
          material_necesario?: string[] | null;
          drive_video_id?: string | null;
          drive_image_id?: string | null;
          sede_propietaria_id?: string | null;
          sedes_ocultas?: string[] | null;
          es_global?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          titulo?: string;
          descripcion_detallada?: string | null;
          representacion_grafica?: string | null;
          objetivo_principal?: string | null;
          objetivos_secundarios?: string[] | null;
          contenido_tactico?: string | null;
          contenido_tecnico?: string | null;
          contenido_fisico?: string | null;
          dimensiones_campo?: string | null;
          numero_jugadores_min?: number | null;
          material_necesario?: string[] | null;
          drive_video_id?: string | null;
          drive_image_id?: string | null;
          sede_propietaria_id?: string | null;
          sedes_ocultas?: string[] | null;
          es_global?: boolean;
          updated_at?: string;
        };
      };
      sesiones: {
        Row: {
          id: string;
          fecha: string;
          hora_inicio: string | null;
          duracion_estimada: number | null;
          equipo_id: string;
          entrenador_id: string;
          microciclo: number | null;
          periodo_temporada: string | null;
          objetivo_sesion: string | null;
          observaciones_previas: string | null;
          feedback_post_entreno: string | null;
          estado: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          fecha: string;
          hora_inicio?: string | null;
          duracion_estimada?: number | null;
          equipo_id: string;
          entrenador_id: string;
          microciclo?: number | null;
          periodo_temporada?: string | null;
          objetivo_sesion?: string | null;
          observaciones_previas?: string | null;
          feedback_post_entreno?: string | null;
          estado?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          fecha?: string;
          hora_inicio?: string | null;
          duracion_estimada?: number | null;
          equipo_id?: string;
          entrenador_id?: string;
          microciclo?: number | null;
          periodo_temporada?: string | null;
          objetivo_sesion?: string | null;
          observaciones_previas?: string | null;
          feedback_post_entreno?: string | null;
          estado?: string;
          updated_at?: string;
        };
      };
      sesion_detalle: {
        Row: {
          id: string;
          sesion_id: string;
          ejercicio_id: string;
          orden: number;
          tiempo_ejecucion: number | null;
          tiempo_descanso: number | null;
          variante_aplicada: string | null;
        };
        Insert: {
          id?: string;
          sesion_id: string;
          ejercicio_id: string;
          orden: number;
          tiempo_ejecucion?: number | null;
          tiempo_descanso?: number | null;
          variante_aplicada?: string | null;
        };
        Update: {
          id?: string;
          sesion_id?: string;
          ejercicio_id?: string;
          orden?: number;
          tiempo_ejecucion?: number | null;
          tiempo_descanso?: number | null;
          variante_aplicada?: string | null;
        };
      };
      documentos: {
        Row: {
          id: string;
          titulo: string;
          categoria_doc: string | null;
          drive_file_id: string | null;
          permisos_roles: Json;
          sede_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          titulo: string;
          categoria_doc?: string | null;
          drive_file_id?: string | null;
          permisos_roles?: Json;
          sede_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          titulo?: string;
          categoria_doc?: string | null;
          drive_file_id?: string | null;
          permisos_roles?: Json;
          sede_id?: string | null;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
