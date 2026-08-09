import { z } from "zod";

const maxSafeInteger = Number.MAX_SAFE_INTEGER;

export const amountMinorSchema = z
  .number()
  .int("El importe debe ser un número entero.")
  .positive("El importe debe ser positivo.")
  .max(maxSafeInteger, "El importe supera el máximo permitido.");

export const currencyCodeSchema = z
  .string()
  .regex(/^[A-Z]{3}$/, "La moneda debe ser un código ISO de tres letras en mayúsculas.");

export const economicDirectionSchema = z.enum(["income", "expense"]);
export const economicEntryTypeSchema = z.enum(["player_charge", "income", "expense"]);
export const economicScheduleFrequencySchema = z.enum(["weekly", "monthly", "yearly"]);
export const economicScheduleStatusSchema = z.enum(["active", "paused", "ended", "cancelled"]);
export const economicEntryLifecycleSchema = z.enum(["draft", "open", "cancelled"]);
export const economicMovementTypeSchema = z.enum(["settlement", "refund", "reversal"]);
export const economicPaymentMethodSchema = z.enum(["cash", "bank_transfer", "stripe", "other"]);
export const economicExternalStatusSchema = z.enum(["pending", "succeeded", "failed", "cancelled"]);

const idSchema = z.string().uuid("Identificador inválido.");
const optionalIdSchema = idSchema.nullable().optional();
const optionalTextSchema = z.string().trim().min(1).nullable().optional();

const isoDateSchema = z.string().refine(isValidIsoDate, "La fecha debe ser válida y tener formato AAAA-MM-DD.");

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function validateEntryTarget(
  value: { entryType: "player_charge" | "income" | "expense"; playerId?: string | null; counterpartyName?: string | null },
  context: z.RefinementCtx,
) {
  if (value.entryType === "player_charge") {
    if (!value.playerId) {
      context.addIssue({ code: "custom", path: ["playerId"], message: "El jugador es obligatorio para un cargo." });
    }
    if (value.counterpartyName) {
      context.addIssue({ code: "custom", path: ["counterpartyName"], message: "Un cargo a jugador no admite contraparte." });
    }
    return;
  }

  if (value.entryType === "expense") {
    if (value.playerId) {
      context.addIssue({ code: "custom", path: ["playerId"], message: "Un gasto no puede asociarse a un jugador." });
    }
    if (!value.counterpartyName) {
      context.addIssue({ code: "custom", path: ["counterpartyName"], message: "La contraparte es obligatoria." });
    }
  }
}

export const economicSettingsSchema = z.object({
  currencyCode: currencyCodeSchema.default("EUR"),
  timezone: z.string().refine(isValidTimeZone, "La zona horaria debe ser IANA válida.").default("Europe/Madrid"),
});

export const economicCategorySchema = z.object({
  direction: economicDirectionSchema,
  code: z.string().trim().min(1, "El código es obligatorio.").max(100),
  name: z.string().trim().min(1, "El nombre es obligatorio.").max(120),
});

const economicScheduleBaseSchema = z.object({
  entryType: economicEntryTypeSchema,
  categoryId: idSchema,
  concept: z.string().trim().min(1, "El concepto es obligatorio.").max(250),
  counterpartyName: optionalTextSchema,
  playerId: optionalIdSchema,
  amountMinor: amountMinorSchema,
  currencyCode: currencyCodeSchema.default("EUR"),
  frequency: economicScheduleFrequencySchema,
  nextDueDate: isoDateSchema,
  endDate: isoDateSchema.nullable().optional(),
  status: economicScheduleStatusSchema.default("active"),
});

export const economicScheduleSchema = economicScheduleBaseSchema.superRefine((value, context) => {
  validateEntryTarget(value, context);
  if (value.endDate && value.endDate < value.nextDueDate) {
    context.addIssue({ code: "custom", path: ["endDate"], message: "La fecha de fin no puede preceder a la próxima fecha." });
  }
});

const economicEntryBaseSchema = z.object({
  entryType: economicEntryTypeSchema,
  categoryId: idSchema,
  playerId: optionalIdSchema,
  concept: z.string().trim().min(1, "El concepto es obligatorio.").max(250),
  counterpartyName: optionalTextSchema,
  amountMinor: amountMinorSchema,
  currencyCode: currencyCodeSchema.default("EUR"),
  issueDate: isoDateSchema,
  dueDate: isoDateSchema,
  scheduleId: optionalIdSchema,
  periodKey: z.string().trim().min(1).nullable().optional(),
  lifecycle: economicEntryLifecycleSchema.default("open"),
});

export const economicEntrySchema = economicEntryBaseSchema.superRefine((value, context) => {
  validateEntryTarget(value, context);
  if (value.dueDate < value.issueDate) {
    context.addIssue({ code: "custom", path: ["dueDate"], message: "El vencimiento no puede preceder a la emisión." });
  }
});

export const economicMovementSchema = z
  .object({
    entryId: idSchema,
    movementType: economicMovementTypeSchema,
    paymentMethod: economicPaymentMethodSchema,
    amountMinor: amountMinorSchema,
    currencyCode: currencyCodeSchema,
    externalStatus: economicExternalStatusSchema.default("succeeded"),
    originalMovementId: optionalIdSchema,
    externalReference: optionalTextSchema,
    occurredAt: z.string().datetime().nullable().optional(),
  })
  .superRefine((value, context) => {
    const isAdjustment = value.movementType === "refund" || value.movementType === "reversal";
    if (isAdjustment && !value.originalMovementId) {
      context.addIssue({ code: "custom", path: ["originalMovementId"], message: "El ajuste debe referenciar un movimiento original." });
    }
    if (!isAdjustment && value.originalMovementId) {
      context.addIssue({ code: "custom", path: ["originalMovementId"], message: "Un cobro no admite movimiento original." });
    }
  });

export const economicFiltersSchema = z
  .object({
    entryType: economicEntryTypeSchema.optional(),
    lifecycle: economicEntryLifecycleSchema.optional(),
    categoryId: idSchema.optional(),
    playerId: idSchema.optional(),
    fromDate: isoDateSchema.optional(),
    toDate: isoDateSchema.optional(),
    search: z.string().trim().max(250).optional(),
  })
  .superRefine((value, context) => {
    if (value.fromDate && value.toDate && value.toDate < value.fromDate) {
      context.addIssue({ code: "custom", path: ["toDate"], message: "La fecha final no puede preceder a la inicial." });
    }
  });

export type EconomicSettingsInput = z.infer<typeof economicSettingsSchema>;
export type EconomicCategoryInput = z.infer<typeof economicCategorySchema>;
export type EconomicScheduleInput = z.infer<typeof economicScheduleSchema>;
export type EconomicEntryInput = z.infer<typeof economicEntrySchema>;
export type EconomicMovementInput = z.infer<typeof economicMovementSchema>;
export type EconomicFiltersInput = z.infer<typeof economicFiltersSchema>;
