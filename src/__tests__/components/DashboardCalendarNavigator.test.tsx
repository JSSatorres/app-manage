import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardCalendarNavigator } from "@/components/dashboard/DashboardCalendarNavigator";

const weekDays = [
  "2026-08-03",
  "2026-08-04",
  "2026-08-05",
  "2026-08-06",
  "2026-08-07",
  "2026-08-08",
  "2026-08-09",
];

describe("DashboardCalendarNavigator", () => {
  it("da contexto al contador de sesiones dentro del día semanal", () => {
    render(
      <DashboardCalendarNavigator
        activeDay="2026-08-08"
        weekDays={weekDays}
        weekRange="3–9 Ago 2026"
        sessionCountByDay={new Map([["2026-08-08", 2]])}
        onDateChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", {
        name: /sábado, 8 de agosto de 2026, 2 sesiones/i,
      }),
    ).toBeVisible();
  });

  it("muestra el contador de sesiones dentro de los días del mes", () => {
    render(
      <DashboardCalendarNavigator
        activeDay="2026-08-08"
        weekDays={weekDays}
        weekRange="3–9 Ago 2026"
        sessionCountByDay={new Map([
          ["2026-08-08", 2],
          ["2026-08-17", 3],
        ])}
        onDateChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Ver calendario mensual" }));

    expect(
      screen.getByRole("button", {
        name: /lunes, 17 de agosto de 2026, 3 sesiones/i,
      }),
    ).toBeVisible();
  });

  it("alterna de forma exclusiva entre la semana y el calendario mensual", () => {
    render(
      <DashboardCalendarNavigator
        activeDay="2026-08-08"
        weekDays={weekDays}
        weekRange="3–9 Ago 2026"
        sessionCountByDay={new Map([["2026-08-08", 2]])}
        onDateChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Días de la semana")).toBeVisible();
    expect(screen.queryByLabelText("Calendario mensual")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ver calendario mensual" }));

    expect(screen.queryByLabelText("Días de la semana")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Calendario mensual")).toBeVisible();
    expect(screen.getByRole("button", { name: "Ver semana" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: "Ver semana" }));

    expect(screen.getByLabelText("Días de la semana")).toBeVisible();
    expect(screen.queryByLabelText("Calendario mensual")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Ver calendario mensual" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("permite elegir una fecha desde el selector de mes y año", async () => {
    const onDateChange = vi.fn();

    render(
      <DashboardCalendarNavigator
        activeDay="2026-08-08"
        weekDays={weekDays}
        weekRange="3–9 Ago 2026"
        sessionCountByDay={new Map([["2026-08-08", 2]])}
        onDateChange={onDateChange}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Elegir fecha: 3–9 Ago 2026" }),
    );

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: /mes/i })).toBeVisible();
      expect(screen.getByRole("combobox", { name: /año/i })).toBeVisible();
    });

    fireEvent.click(
      screen.getByRole("button", { name: /17 de agosto de 2026/i }),
    );

    expect(onDateChange).toHaveBeenCalledWith("2026-08-17");
    expect(
      screen.queryByRole("combobox", { name: /mes/i }),
    ).not.toBeInTheDocument();
  });
});
