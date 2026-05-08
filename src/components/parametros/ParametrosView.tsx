"use client";

import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { useParametros } from "@/hooks/useParametros";
import { useWorkspaceContext } from "@/lib/workspaceContext";
import { CATEGORIAS_PARAMETRO } from "@/lib/constants";
import type { ParametroSistema } from "@/types/parametros";
import { ParametroForm } from "./ParametroForm";
import { ParametrosList } from "./ParametrosList";

const categorias = [
  { key: CATEGORIAS_PARAMETRO.TIPO_OBJETIVO, label: "Tipo objetivo" },
  { key: CATEGORIAS_PARAMETRO.TIPO_CONTENIDO, label: "Tipo contenido" },
  { key: CATEGORIAS_PARAMETRO.MATERIAL, label: "Material" },
  { key: CATEGORIAS_PARAMETRO.CATEGORIA_EDAD, label: "Categoría edad" },
] as const;

export function ParametrosView() {
  const { activeSede } = useWorkspaceContext();
  const [activeTab, setActiveTab] = useState<string>(categorias[0].key);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ParametroSistema | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const currentCategoria = useMemo(() => {
    return categorias.find((c) => c.key === activeTab) ?? categorias[0];
  }, [activeTab]);

  const {
    data,
    loading,
    errorMessage,
    createOne,
    updateOne,
    deleteOne,
    createLoading,
    updateLoading,
    deleteLoading,
    createErrorMessage,
    updateErrorMessage,
    deleteErrorMessage,
  } = useParametros(currentCategoria.key, activeSede?.id ?? null);

  const formTitle = editing ? "Editar parámetro" : "Nuevo parámetro";
  const submitLoading = editing ? updateLoading : createLoading;
  const submitErrorMessage = editing ? updateErrorMessage : createErrorMessage;

  return (
    <div>
      <PageHeader
        title="Parámetros"
        description="Tablas maestras del sistema"
        action={
          <Button
            type="button"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-2 size-4" />
            Nuevo
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          {categorias.map((c) => (
            <TabsTrigger key={c.key} value={c.key}>
              {c.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {categorias.map((c) => (
          <TabsContent key={c.key} value={c.key}>
            {errorMessage && (
              <p className="mb-4 text-sm text-destructive">{errorMessage}</p>
            )}

            <ParametrosList
              data={data ?? []}
              loading={loading}
              deletingId={deletingId}
              onEdit={(row) => {
                setEditing(row);
                setFormOpen(true);
              }}
              onDelete={async (id) => {
                setDeletingId(id);
                await deleteOne(id);
                setDeletingId(null);
              }}
            />
            {deleteErrorMessage && (
              <p className="mt-3 text-sm text-destructive">{deleteErrorMessage}</p>
            )}
            {deleteLoading && deletingId && (
              <p className="mt-3 text-sm text-muted-foreground">Eliminando...</p>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <ParametroForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
        title={formTitle}
        initialValue={editing}
        loading={submitLoading}
        errorMessage={submitErrorMessage}
        onSubmit={async (value) => {
          if (editing) {
            await updateOne(editing.id, {
              nombre: value.nombre,
              activo: value.activo,
              sedeId: editing.sedeId,
            });
            setFormOpen(false);
            setEditing(null);
            return;
          }

          await createOne({
            categoria: currentCategoria.key,
            nombre: value.nombre,
            activo: value.activo,
            sedeId: null,
          });
          setFormOpen(false);
        }}
      />
    </div>
  );
}

