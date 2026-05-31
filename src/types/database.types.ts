export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      documento_entrenadores: {
        Row: {
          created_at: string
          documento_id: string
          entrenador_id: string
          id: string
        }
        Insert: {
          created_at?: string
          documento_id: string
          entrenador_id: string
          id?: string
        }
        Update: {
          created_at?: string
          documento_id?: string
          entrenador_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documento_entrenadores_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
        ]
      }
      documento_equipos: {
        Row: {
          created_at: string | null
          documento_id: string
          equipo_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          documento_id: string
          equipo_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          documento_id?: string
          equipo_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documento_equipos_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_equipos_equipo_id_fkey"
            columns: ["equipo_id"]
            isOneToOne: false
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
        ]
      }
      documento_sedes: {
        Row: {
          created_at: string | null
          documento_id: string
          id: string
          sede_id: string
        }
        Insert: {
          created_at?: string | null
          documento_id: string
          id?: string
          sede_id: string
        }
        Update: {
          created_at?: string | null
          documento_id?: string
          id?: string
          sede_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documento_sedes_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_sedes_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos: {
        Row: {
          categoria_doc: string | null
          created_at: string | null
          drive_file_id: string | null
          extension: string | null
          external_url: string | null
          file_name: string | null
          id: string
          mime_type: string | null
          permisos_roles: Json | null
          sede_id: string | null
          size_bytes: number | null
          source_type: string
          storage_path: string | null
          titulo: string
          updated_at: string | null
          visible_entrenadores: boolean
          workspace_id: string | null
        }
        Insert: {
          categoria_doc?: string | null
          created_at?: string | null
          drive_file_id?: string | null
          extension?: string | null
          external_url?: string | null
          file_name?: string | null
          id?: string
          mime_type?: string | null
          permisos_roles?: Json | null
          sede_id?: string | null
          size_bytes?: number | null
          source_type?: string
          storage_path?: string | null
          titulo: string
          updated_at?: string | null
          visible_entrenadores?: boolean
          workspace_id?: string | null
        }
        Update: {
          categoria_doc?: string | null
          created_at?: string | null
          drive_file_id?: string | null
          extension?: string | null
          external_url?: string | null
          file_name?: string | null
          id?: string
          mime_type?: string | null
          permisos_roles?: Json | null
          sede_id?: string | null
          size_bytes?: number | null
          source_type?: string
          storage_path?: string | null
          titulo?: string
          updated_at?: string | null
          visible_entrenadores?: boolean
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ejercicio_documentos: {
        Row: {
          created_at: string | null
          documento_id: string
          ejercicio_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          documento_id: string
          ejercicio_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          documento_id?: string
          ejercicio_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ejercicio_documentos_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ejercicio_documentos_ejercicio_id_fkey"
            columns: ["ejercicio_id"]
            isOneToOne: false
            referencedRelation: "ejercicios"
            referencedColumns: ["id"]
          },
        ]
      }
      ejercicios: {
        Row: {
          contenido_fisico: string | null
          contenido_tactico: string | null
          contenido_tecnico: string | null
          created_at: string | null
          descripcion_detallada: string | null
          dimensiones_campo: string | null
          drive_image_id: string | null
          drive_video_id: string | null
          es_global: boolean | null
          id: string
          material_necesario: string[] | null
          numero_jugadores_min: number | null
          objetivo_principal: string | null
          objetivos_secundarios: string[] | null
          representacion_grafica: string | null
          sede_propietaria_id: string | null
          sedes_ocultas: string[] | null
          titulo: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          contenido_fisico?: string | null
          contenido_tactico?: string | null
          contenido_tecnico?: string | null
          created_at?: string | null
          descripcion_detallada?: string | null
          dimensiones_campo?: string | null
          drive_image_id?: string | null
          drive_video_id?: string | null
          es_global?: boolean | null
          id?: string
          material_necesario?: string[] | null
          numero_jugadores_min?: number | null
          objetivo_principal?: string | null
          objetivos_secundarios?: string[] | null
          representacion_grafica?: string | null
          sede_propietaria_id?: string | null
          sedes_ocultas?: string[] | null
          titulo: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          contenido_fisico?: string | null
          contenido_tactico?: string | null
          contenido_tecnico?: string | null
          created_at?: string | null
          descripcion_detallada?: string | null
          dimensiones_campo?: string | null
          drive_image_id?: string | null
          drive_video_id?: string | null
          es_global?: boolean | null
          id?: string
          material_necesario?: string[] | null
          numero_jugadores_min?: number | null
          objetivo_principal?: string | null
          objetivos_secundarios?: string[] | null
          representacion_grafica?: string | null
          sede_propietaria_id?: string | null
          sedes_ocultas?: string[] | null
          titulo?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ejercicios_sede_propietaria_id_fkey"
            columns: ["sede_propietaria_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ejercicios_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      entrenador_equipos: {
        Row: {
          created_at: string | null
          entrenador_id: string
          equipo_id: string
          rol: string
        }
        Insert: {
          created_at?: string | null
          entrenador_id: string
          equipo_id: string
          rol?: string
        }
        Update: {
          created_at?: string | null
          entrenador_id?: string
          equipo_id?: string
          rol?: string
        }
        Relationships: [
          {
            foreignKeyName: "entrenador_equipos_entrenador_id_fkey"
            columns: ["entrenador_id"]
            isOneToOne: false
            referencedRelation: "entrenadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrenador_equipos_equipo_id_fkey"
            columns: ["equipo_id"]
            isOneToOne: false
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
        ]
      }
      entrenador_sedes: {
        Row: {
          created_at: string | null
          entrenador_id: string
          rol: string
          sede_id: string
        }
        Insert: {
          created_at?: string | null
          entrenador_id: string
          rol?: string
          sede_id: string
        }
        Update: {
          created_at?: string | null
          entrenador_id?: string
          rol?: string
          sede_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entrenador_sedes_entrenador_id_fkey"
            columns: ["entrenador_id"]
            isOneToOne: false
            referencedRelation: "entrenadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrenador_sedes_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      entrenadores: {
        Row: {
          apellidos: string | null
          created_at: string | null
          email: string | null
          fecha_nacimiento: string | null
          foto_url: string | null
          id: string
          nombre: string
          notas: string | null
          telefono: string | null
          titulacion: string | null
          updated_at: string | null
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          apellidos?: string | null
          created_at?: string | null
          email?: string | null
          fecha_nacimiento?: string | null
          foto_url?: string | null
          id?: string
          nombre: string
          notas?: string | null
          telefono?: string | null
          titulacion?: string | null
          updated_at?: string | null
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          apellidos?: string | null
          created_at?: string | null
          email?: string | null
          fecha_nacimiento?: string | null
          foto_url?: string | null
          id?: string
          nombre?: string
          notas?: string | null
          telefono?: string | null
          titulacion?: string | null
          updated_at?: string | null
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entrenadores_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      equipo_entrenadores: {
        Row: {
          created_at: string | null
          entrenador_id: string
          equipo_id: string
          rol: string
        }
        Insert: {
          created_at?: string | null
          entrenador_id: string
          equipo_id: string
          rol?: string
        }
        Update: {
          created_at?: string | null
          entrenador_id?: string
          equipo_id?: string
          rol?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipo_entrenadores_entrenador_id_fkey"
            columns: ["entrenador_id"]
            isOneToOne: false
            referencedRelation: "entrenadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipo_entrenadores_equipo_id_fkey"
            columns: ["equipo_id"]
            isOneToOne: false
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
        ]
      }
      equipo_jugadores: {
        Row: {
          created_at: string | null
          dorsal: number | null
          equipo_id: string
          jugador_id: string
          posicion: string | null
        }
        Insert: {
          created_at?: string | null
          dorsal?: number | null
          equipo_id: string
          jugador_id: string
          posicion?: string | null
        }
        Update: {
          created_at?: string | null
          dorsal?: number | null
          equipo_id?: string
          jugador_id?: string
          posicion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipo_jugadores_equipo_id_fkey"
            columns: ["equipo_id"]
            isOneToOne: false
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipo_jugadores_jugador_id_fkey"
            columns: ["jugador_id"]
            isOneToOne: false
            referencedRelation: "jugadores"
            referencedColumns: ["id"]
          },
        ]
      }
      equipos: {
        Row: {
          categoria: string | null
          created_at: string | null
          entrenador_adjunto_id: string | null
          entrenador_principal_id: string | null
          id: string
          nombre: string
          sede_id: string
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          categoria?: string | null
          created_at?: string | null
          entrenador_adjunto_id?: string | null
          entrenador_principal_id?: string | null
          id?: string
          nombre: string
          sede_id: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          categoria?: string | null
          created_at?: string | null
          entrenador_adjunto_id?: string | null
          entrenador_principal_id?: string | null
          id?: string
          nombre?: string
          sede_id?: string
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipos_entrenador_adjunto_id_fkey"
            columns: ["entrenador_adjunto_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipos_entrenador_principal_id_fkey"
            columns: ["entrenador_principal_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipos_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipos_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      jugador_equipos: {
        Row: {
          created_at: string | null
          dorsal: number | null
          equipo_id: string
          jugador_id: string
          posicion: string | null
        }
        Insert: {
          created_at?: string | null
          dorsal?: number | null
          equipo_id: string
          jugador_id: string
          posicion?: string | null
        }
        Update: {
          created_at?: string | null
          dorsal?: number | null
          equipo_id?: string
          jugador_id?: string
          posicion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jugador_equipos_equipo_id_fkey"
            columns: ["equipo_id"]
            isOneToOne: false
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jugador_equipos_jugador_id_fkey"
            columns: ["jugador_id"]
            isOneToOne: false
            referencedRelation: "jugadores"
            referencedColumns: ["id"]
          },
        ]
      }
      jugador_sedes: {
        Row: {
          created_at: string | null
          jugador_id: string
          sede_id: string
        }
        Insert: {
          created_at?: string | null
          jugador_id: string
          sede_id: string
        }
        Update: {
          created_at?: string | null
          jugador_id?: string
          sede_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jugador_sedes_jugador_id_fkey"
            columns: ["jugador_id"]
            isOneToOne: false
            referencedRelation: "jugadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jugador_sedes_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      jugadores: {
        Row: {
          apellidos: string | null
          created_at: string | null
          dorsal: number | null
          email: string | null
          fecha_nacimiento: string | null
          foto_url: string | null
          id: string
          nombre: string
          notas: string | null
          pie_dominante: string | null
          posicion: string | null
          telefono: string | null
          tutor_nombre: string | null
          tutor_telefono: string | null
          updated_at: string | null
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          apellidos?: string | null
          created_at?: string | null
          dorsal?: number | null
          email?: string | null
          fecha_nacimiento?: string | null
          foto_url?: string | null
          id?: string
          nombre: string
          notas?: string | null
          pie_dominante?: string | null
          posicion?: string | null
          telefono?: string | null
          tutor_nombre?: string | null
          tutor_telefono?: string | null
          updated_at?: string | null
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          apellidos?: string | null
          created_at?: string | null
          dorsal?: number | null
          email?: string | null
          fecha_nacimiento?: string | null
          foto_url?: string | null
          id?: string
          nombre?: string
          notas?: string | null
          pie_dominante?: string | null
          posicion?: string | null
          telefono?: string | null
          tutor_nombre?: string | null
          tutor_telefono?: string | null
          updated_at?: string | null
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jugadores_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      parametros_sistema: {
        Row: {
          activo: boolean | null
          categoria: string
          created_at: string | null
          id: string
          nombre: string
          sede_id: string | null
          workspace_id: string
        }
        Insert: {
          activo?: boolean | null
          categoria: string
          created_at?: string | null
          id?: string
          nombre: string
          sede_id?: string | null
          workspace_id: string
        }
        Update: {
          activo?: boolean | null
          categoria?: string
          created_at?: string | null
          id?: string
          nombre?: string
          sede_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parametros_sistema_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parametros_sistema_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sede_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          rol: string
          sede_id: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          rol: string
          sede_id: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          rol?: string
          sede_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "sede_invitations_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      sedes: {
        Row: {
          configuracion_visual: Json | null
          created_at: string | null
          direccion: string | null
          id: string
          nombre: string
          responsable_id: string | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          configuracion_visual?: Json | null
          created_at?: string | null
          direccion?: string | null
          id?: string
          nombre: string
          responsable_id?: string | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          configuracion_visual?: Json | null
          created_at?: string | null
          direccion?: string | null
          id?: string
          nombre?: string
          responsable_id?: string | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_sedes_responsable"
            columns: ["responsable_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sedes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sesion_detalle: {
        Row: {
          ejercicio_id: string
          id: string
          orden: number
          sesion_id: string
          tiempo_descanso: number | null
          tiempo_ejecucion: number | null
          variante_aplicada: string | null
        }
        Insert: {
          ejercicio_id: string
          id?: string
          orden: number
          sesion_id: string
          tiempo_descanso?: number | null
          tiempo_ejecucion?: number | null
          variante_aplicada?: string | null
        }
        Update: {
          ejercicio_id?: string
          id?: string
          orden?: number
          sesion_id?: string
          tiempo_descanso?: number | null
          tiempo_ejecucion?: number | null
          variante_aplicada?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sesion_detalle_ejercicio_id_fkey"
            columns: ["ejercicio_id"]
            isOneToOne: false
            referencedRelation: "ejercicios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sesion_detalle_sesion_id_fkey"
            columns: ["sesion_id"]
            isOneToOne: false
            referencedRelation: "sesiones"
            referencedColumns: ["id"]
          },
        ]
      }
      sesion_documentos: {
        Row: {
          created_at: string | null
          documento_id: string
          id: string
          sesion_id: string
        }
        Insert: {
          created_at?: string | null
          documento_id: string
          id?: string
          sesion_id: string
        }
        Update: {
          created_at?: string | null
          documento_id?: string
          id?: string
          sesion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sesion_documentos_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sesion_documentos_sesion_id_fkey"
            columns: ["sesion_id"]
            isOneToOne: false
            referencedRelation: "sesiones"
            referencedColumns: ["id"]
          },
        ]
      }
      sesion_entrenadores: {
        Row: {
          created_at: string | null
          entrenador_id: string
          sesion_id: string
        }
        Insert: {
          created_at?: string | null
          entrenador_id: string
          sesion_id: string
        }
        Update: {
          created_at?: string | null
          entrenador_id?: string
          sesion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sesion_entrenadores_entrenador_id_fkey"
            columns: ["entrenador_id"]
            isOneToOne: false
            referencedRelation: "entrenadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sesion_entrenadores_sesion_id_fkey"
            columns: ["sesion_id"]
            isOneToOne: false
            referencedRelation: "sesiones"
            referencedColumns: ["id"]
          },
        ]
      }
      sesiones: {
        Row: {
          created_at: string | null
          duracion_estimada: number | null
          entrenador_id: string
          equipo_id: string
          estado: string
          fecha: string
          feedback_post_entreno: string | null
          hora_inicio: string | null
          id: string
          microciclo: number | null
          objetivo_sesion: string | null
          observaciones_previas: string | null
          periodo_temporada: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          duracion_estimada?: number | null
          entrenador_id: string
          equipo_id: string
          estado?: string
          fecha: string
          feedback_post_entreno?: string | null
          hora_inicio?: string | null
          id?: string
          microciclo?: number | null
          objetivo_sesion?: string | null
          observaciones_previas?: string | null
          periodo_temporada?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          duracion_estimada?: number | null
          entrenador_id?: string
          equipo_id?: string
          estado?: string
          fecha?: string
          feedback_post_entreno?: string | null
          hora_inicio?: string | null
          id?: string
          microciclo?: number | null
          objetivo_sesion?: string | null
          observaciones_previas?: string | null
          periodo_temporada?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sesiones_entrenador_id_fkey"
            columns: ["entrenador_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sesiones_equipo_id_fkey"
            columns: ["equipo_id"]
            isOneToOne: false
            referencedRelation: "equipos"
            referencedColumns: ["id"]
          },
        ]
      }
      superadmins: {
        Row: {
          created_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          created_at: string | null
          email: string
          foto_perfil: string | null
          id: string
          nombre: string | null
          rol: string
          sede_id: string | null
          telefono: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          foto_perfil?: string | null
          id?: string
          nombre?: string | null
          rol: string
          sede_id?: string | null
          telefono?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          foto_perfil?: string | null
          id?: string
          nombre?: string | null
          rol?: string
          sede_id?: string | null
          telefono?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: string
          token: string
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          invited_by?: string | null
          role: string
          token: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: string
          token?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invitations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string | null
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          role: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_workspace_invitation: {
        Args: { p_token: string }
        Returns: string
      }
      create_sede_invitation: {
        Args: { p_email: string; p_rol?: string; p_sede_id: string }
        Returns: string
      }
      create_workspace_invitation: {
        Args: { p_email: string; p_role?: string; p_workspace_id: string }
        Returns: string
      }
      current_user_rol: { Args: never; Returns: string }
      current_user_sede_id: { Args: never; Returns: string }
      current_user_ws_role: { Args: { p_workspace: string }; Returns: string }
      map_ws_role_to_usuario_rol: { Args: { p_role: string }; Returns: string }
      setup_user_sede: { Args: never; Returns: undefined }
      setup_user_workspaces: { Args: never; Returns: undefined }
      setup_workspace: { Args: { p_club_name: string }; Returns: Json }
      sync_auth_profile: { Args: { p_full_name?: string }; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
