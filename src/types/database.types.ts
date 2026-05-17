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
          workspace_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          direccion?: string | null;
          configuracion_visual?: Json;
          responsable_id?: string | null;
          workspace_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nombre?: string;
          direccion?: string | null;
          configuracion_visual?: Json;
          responsable_id?: string | null;
          workspace_id?: string;
          updated_at?: string;
        };
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
      };
      workspaces: {
        Row: {
          id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      workspace_members: {
        Row: {
          workspace_id: string;
          user_id: string;
          role: string;
          created_at: string;
        };
        Insert: {
          workspace_id: string;
          user_id: string;
          role?: string;
          created_at?: string;
        };
        Update: {
          role?: string;
        };
        Relationships: [];
      };
      entrenadores: {
        Row: {
          id: string;
          nombre: string;
          apellidos: string | null;
          email: string | null;
          telefono: string | null;
          fecha_nacimiento: string | null;
          titulacion: string | null;
          foto_url: string | null;
          notas: string | null;
          user_id: string | null;
          workspace_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          apellidos?: string | null;
          email?: string | null;
          telefono?: string | null;
          fecha_nacimiento?: string | null;
          titulacion?: string | null;
          foto_url?: string | null;
          notas?: string | null;
          user_id?: string | null;
          workspace_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nombre?: string;
          apellidos?: string | null;
          email?: string | null;
          telefono?: string | null;
          fecha_nacimiento?: string | null;
          titulacion?: string | null;
          foto_url?: string | null;
          notas?: string | null;
          user_id?: string | null;
          workspace_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      jugadores: {
        Row: {
          id: string;
          nombre: string;
          apellidos: string | null;
          email: string | null;
          telefono: string | null;
          fecha_nacimiento: string | null;
          dorsal: number | null;
          posicion: string | null;
          pie_dominante: string | null;
          foto_url: string | null;
          notas: string | null;
          tutor_nombre: string | null;
          tutor_telefono: string | null;
          user_id: string | null;
          workspace_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          apellidos?: string | null;
          email?: string | null;
          telefono?: string | null;
          fecha_nacimiento?: string | null;
          dorsal?: number | null;
          posicion?: string | null;
          pie_dominante?: string | null;
          foto_url?: string | null;
          notas?: string | null;
          tutor_nombre?: string | null;
          tutor_telefono?: string | null;
          user_id?: string | null;
          workspace_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nombre?: string;
          apellidos?: string | null;
          email?: string | null;
          telefono?: string | null;
          fecha_nacimiento?: string | null;
          dorsal?: number | null;
          posicion?: string | null;
          pie_dominante?: string | null;
          foto_url?: string | null;
          notas?: string | null;
          tutor_nombre?: string | null;
          tutor_telefono?: string | null;
          user_id?: string | null;
          workspace_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      entrenador_sedes: {
        Row: {
          entrenador_id: string;
          sede_id: string;
          rol: string;
          created_at: string;
        };
        Insert: {
          entrenador_id: string;
          sede_id: string;
          rol?: string;
          created_at?: string;
        };
        Update: {
          rol?: string;
        };
        Relationships: [
          {
            foreignKeyName: "entrenador_sedes_entrenador_id_fkey";
            columns: ["entrenador_id"];
            isOneToOne: false;
            referencedRelation: "entrenadores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "entrenador_sedes_sede_id_fkey";
            columns: ["sede_id"];
            isOneToOne: false;
            referencedRelation: "sedes";
            referencedColumns: ["id"];
          },
        ];
      };
      entrenador_equipos: {
        Row: {
          entrenador_id: string;
          equipo_id: string;
          rol: string;
          created_at: string;
        };
        Insert: {
          entrenador_id: string;
          equipo_id: string;
          rol?: string;
          created_at?: string;
        };
        Update: {
          rol?: string;
        };
        Relationships: [
          {
            foreignKeyName: "entrenador_equipos_entrenador_id_fkey";
            columns: ["entrenador_id"];
            isOneToOne: false;
            referencedRelation: "entrenadores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "entrenador_equipos_equipo_id_fkey";
            columns: ["equipo_id"];
            isOneToOne: false;
            referencedRelation: "equipos";
            referencedColumns: ["id"];
          },
        ];
      };
      jugador_sedes: {
        Row: {
          jugador_id: string;
          sede_id: string;
          created_at: string;
        };
        Insert: {
          jugador_id: string;
          sede_id: string;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "jugador_sedes_jugador_id_fkey";
            columns: ["jugador_id"];
            isOneToOne: false;
            referencedRelation: "jugadores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "jugador_sedes_sede_id_fkey";
            columns: ["sede_id"];
            isOneToOne: false;
            referencedRelation: "sedes";
            referencedColumns: ["id"];
          },
        ];
      };
      jugador_equipos: {
        Row: {
          jugador_id: string;
          equipo_id: string;
          dorsal: number | null;
          posicion: string | null;
          created_at: string;
        };
        Insert: {
          jugador_id: string;
          equipo_id: string;
          dorsal?: number | null;
          posicion?: string | null;
          created_at?: string;
        };
        Update: {
          dorsal?: number | null;
          posicion?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "jugador_equipos_jugador_id_fkey";
            columns: ["jugador_id"];
            isOneToOne: false;
            referencedRelation: "jugadores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "jugador_equipos_equipo_id_fkey";
            columns: ["equipo_id"];
            isOneToOne: false;
            referencedRelation: "equipos";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      sync_auth_profile: {
        Args: { p_full_name?: string | null };
        Returns: undefined;
      };
      setup_workspace: {
        Args: { p_club_name: string };
        Returns: { workspace_id: string; sede_id: string };
      };
      create_sede_invitation: {
        Args: { p_sede_id: string; p_email: string; p_rol?: string };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
  };
}
