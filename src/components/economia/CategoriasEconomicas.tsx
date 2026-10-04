"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { EconomicCategory, EconomicCategoryCreateInput, EconomicDirection } from "@/types/economia";

interface CategoriasEconomicasProps {
  categorias: readonly EconomicCategory[];
  onCreate: (input: EconomicCategoryCreateInput) => Promise<unknown> | unknown;
  onSetActive: (id: string, isActive: boolean) => Promise<unknown> | unknown;
  onArchive: (id: string) => Promise<unknown> | unknown;
  loading?: boolean;
  errorMessage?: string | null;
}

const emptyCategory = { name: "", code: "", direction: "income" as EconomicDirection };

export function CategoriasEconomicas({
  categorias,
  onCreate,
  onSetActive,
  onArchive,
  loading = false,
  errorMessage,
}: CategoriasEconomicasProps) {
  const [newCategory, setNewCategory] = useState(emptyCategory);
  const [categoryToArchive, setCategoryToArchive] = useState<EconomicCategory | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  async function createCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newCategory.name.trim();
    const code = newCategory.code.trim().toUpperCase();
    if (!name || !code) {
      setFormError("Indica el nombre y el código de la categoría.");
      return;
    }
    setFormError(null);
    await onCreate({ direction: newCategory.direction, code, name });
    setNewCategory(emptyCategory);
  }

  async function confirmArchive() {
    if (!categoryToArchive) return;
    await onArchive(categoryToArchive.id);
    setCategoryToArchive(null);
  }

  const incomes = categorias.filter((category) => category.direction === "income");
  const expenses = categorias.filter((category) => category.direction === "expense");

  return (
    <section aria-labelledby="categorias-economicas-title" className="space-y-5">
      <div>
        <h2 id="categorias-economicas-title" className="text-lg font-semibold">Categorías económicas</h2>
        <p className="text-sm text-muted-foreground">Desactiva las categorías predefinidas o archiva las personalizadas sin alterar los movimientos históricos.</p>
      </div>

      {(errorMessage || formError) && <p role="alert" className="text-sm text-destructive">{errorMessage ?? formError}</p>}

      <form onSubmit={createCategory} noValidate className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-card p-3 shadow-card sm:grid-cols-4 sm:p-4">
        <label className="col-span-2 grid gap-1 text-[12.5px] font-medium text-foreground/80">
          Nombre de la categoría
          <Input value={newCategory.name} onChange={(event) => setNewCategory((current) => ({ ...current, name: event.target.value }))} disabled={loading} />
        </label>
        <label className="grid gap-1 text-[12.5px] font-medium text-foreground/80">
          Código
          <Input value={newCategory.code} onChange={(event) => setNewCategory((current) => ({ ...current, code: event.target.value }))} disabled={loading} />
        </label>
        <label className="grid gap-1 text-[12.5px] font-medium text-foreground/80">
          Tipo
          <select value={newCategory.direction} onChange={(event) => setNewCategory((current) => ({ ...current, direction: event.target.value as EconomicDirection }))} disabled={loading} className="h-9 w-full rounded-lg border border-input bg-card px-2.5 text-sm shadow-[0_1px_2px_rgb(15_23_42/0.04)]">
            <option value="income">Ingreso</option>
            <option value="expense">Gasto</option>
          </select>
        </label>
        <Button type="submit" className="col-span-2 self-end sm:col-span-1 sm:col-start-4" disabled={loading}>{loading ? "Guardando…" : "Añadir categoría"}</Button>
      </form>

      <CategoryGroup title="Ingresos" categories={incomes} loading={loading} onSetActive={onSetActive} onArchive={setCategoryToArchive} />
      <CategoryGroup title="Gastos" categories={expenses} loading={loading} onSetActive={onSetActive} onArchive={setCategoryToArchive} />

      <AlertDialog open={Boolean(categoryToArchive)} onOpenChange={(open) => !open && setCategoryToArchive(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archivar categoría</AlertDialogTitle>
            <AlertDialogDescription>Los movimientos históricos conservarán esta categoría. Podrás consultarlos, pero no estará disponible para nuevas entradas.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmArchive()} disabled={loading}>Confirmar archivo</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function CategoryGroup({
  title,
  categories,
  loading,
  onSetActive,
  onArchive,
}: {
  title: string;
  categories: readonly EconomicCategory[];
  loading: boolean;
  onSetActive: (id: string, isActive: boolean) => Promise<unknown> | unknown;
  onArchive: (category: EconomicCategory) => void;
}) {
  return (
    <section aria-labelledby={`${title.toLowerCase()}-categories-title`}>
      <h3 id={`${title.toLowerCase()}-categories-title`} className="mb-2 flex items-center gap-2 font-semibold"><span aria-hidden="true" className={title === "Ingresos" ? "size-2 rounded-full bg-success" : "size-2 rounded-full bg-destructive"} />{title}</h3>
      {categories.length === 0 ? <p className="text-sm text-muted-foreground">No hay categorías configuradas.</p> : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-card">
          {categories.map((category) => (
            <li key={category.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{category.name}</p>
                <p className="text-xs text-muted-foreground">{category.code}{category.isPredefined ? " · Predefinida" : " · Personalizada"}</p>
              </div>
              {category.isPredefined ? (
                <Switch
                  aria-label={category.name}
                  checked={category.isActive}
                  disabled={loading}
                  onCheckedChange={(isActive) => void onSetActive(category.id, isActive)}
                />
              ) : (
                <Button type="button" variant="outline" size="sm" onClick={() => onArchive(category)} disabled={loading || !category.isActive}>
                  {category.isActive ? `Archivar ${category.name}` : "Archivada"}
                </Button>
              )}
              <span className={category.isActive ? "rounded-md bg-success/10 px-1.5 py-0.5 text-[11px] font-semibold text-success" : "rounded-md bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground"}>{category.isActive ? "Activa" : "Inactiva"}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
