import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FormField } from "@/components/shared/FormField";

/**
 * Task 3.2 — a11y de `FormField`: el `<label>` debe asociarse al input hijo
 * vía `htmlFor`/`id` (generado con `useId()` si el consumidor no pasa uno
 * explícito), sin romper la firma que ya usan los 8 forms migrados en 3.1.
 */

describe("FormField", () => {
  it("asocia el label al input hijo con un id generado automáticamente", () => {
    render(
      <FormField label="Nombre">
        <input />
      </FormField>,
    );

    const input = screen.getByLabelText("Nombre");
    expect(input).toBeInTheDocument();
    expect(input.id).toBeTruthy();
  });

  it("respeta un id explícito ya presente en el hijo", () => {
    render(
      <FormField label="Email">
        <input id="mi-id-explicito" />
      </FormField>,
    );

    const input = screen.getByLabelText("Email");
    expect(input.id).toBe("mi-id-explicito");
  });

  it("genera ids distintos para instancias distintas (sin colisiones)", () => {
    render(
      <>
        <FormField label="Campo A">
          <input />
        </FormField>
        <FormField label="Campo B">
          <input />
        </FormField>
      </>,
    );

    const inputA = screen.getByLabelText("Campo A");
    const inputB = screen.getByLabelText("Campo B");
    expect(inputA.id).not.toBe(inputB.id);
  });

  it("no rompe cuando el hijo no es un elemento clonable (texto plano)", () => {
    render(<FormField label="Solo texto">contenido</FormField>);

    expect(screen.getByText("Solo texto")).toBeInTheDocument();
    expect(screen.getByText("contenido")).toBeInTheDocument();
  });
});
