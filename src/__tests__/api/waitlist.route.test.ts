import { beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.fn();

vi.mock("resend", () => ({
  Resend: vi.fn(function Resend() {
    return { emails: { send } };
  }),
}));

import { POST } from "@/app/api/waitlist/route";

describe("POST /api/waitlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
  });

  it("rechaza un correo inválido", async () => {
    const response = await POST(
      new Request("http://localhost/api/waitlist", {
        method: "POST",
        body: JSON.stringify({ email: "no-valido" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(send).not.toHaveBeenCalled();
  });

  it("informa que el servicio no está configurado", async () => {
    const response = await POST(
      new Request("http://localhost/api/waitlist", {
        method: "POST",
        body: JSON.stringify({ email: "club@ejemplo.es" }),
      }),
    );

    expect(response.status).toBe(503);
  });

  it("reenvía una solicitud válida exclusivamente a Satorus", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.RESEND_FROM_EMAIL = "Satorus <hola@satorus.es>";
    send.mockResolvedValue({ data: { id: "email_123" }, error: null });

    const response = await POST(
      new Request("http://localhost/api/waitlist", {
        method: "POST",
        body: JSON.stringify({ email: "club@ejemplo.es" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "admin@satorus.es",
        replyTo: "club@ejemplo.es",
      }),
    );
  });

  it("convierte una caída del proveedor en un error recuperable", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.RESEND_FROM_EMAIL = "Satorus <hola@satorus.es>";
    send.mockRejectedValueOnce(new Error("connection reset"));

    const response = await POST(
      new Request("http://localhost/api/waitlist", {
        method: "POST",
        body: JSON.stringify({ email: "club@ejemplo.es" }),
      }),
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "No se ha podido enviar la solicitud. Inténtalo de nuevo.",
    });
  });
});
