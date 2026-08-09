export type EconomicDirection = "income" | "expense";
export type EconomicEntryType = "player_charge" | EconomicDirection;
export type EconomicScheduleFrequency = "weekly" | "monthly" | "yearly";
export type EconomicScheduleStatus = "active" | "paused" | "ended" | "cancelled";
export type EconomicEntryLifecycle = "draft" | "open" | "cancelled";
export type EconomicMovementType = "settlement" | "refund" | "reversal";
export type EconomicPaymentMethod = "cash" | "bank_transfer" | "stripe" | "other";
export type EconomicExternalStatus = "pending" | "succeeded" | "failed" | "cancelled";
export type EconomicStatus =
  | "pending"
  | "overdue"
  | "partial"
  | "paid"
  | "partially_refunded"
  | "refunded"
  | "cancelled";

export interface EconomicSettings {
  id: string;
  workspaceId: string;
  currencyCode: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface EconomicSettingsUpdateInput {
  currencyCode: string;
  timezone: string;
}

export interface EconomicCategory {
  id: string;
  workspaceId: string;
  direction: EconomicDirection;
  code: string;
  name: string;
  isPredefined: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EconomicCategoryCreateInput {
  direction: EconomicDirection;
  code: string;
  name: string;
}

export interface EconomicSchedule {
  id: string;
  workspaceId: string;
  entryType: EconomicEntryType;
  categoryId: string;
  concept: string;
  counterpartyName: string | null;
  playerId: string | null;
  amountMinor: number;
  currencyCode: string;
  frequency: EconomicScheduleFrequency;
  nextDueDate: string;
  endDate: string | null;
  status: EconomicScheduleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface EconomicScheduleCreateInput {
  entryType: EconomicEntryType;
  categoryId: string;
  concept: string;
  counterpartyName?: string | null;
  playerId?: string | null;
  amountMinor: number;
  currencyCode: string;
  frequency: EconomicScheduleFrequency;
  nextDueDate: string;
  endDate?: string | null;
}

export interface EconomicEntry {
  id: string;
  workspaceId: string;
  entryType: EconomicEntryType;
  categoryId: string;
  playerId: string | null;
  concept: string;
  counterpartyName: string | null;
  amountMinor: number;
  currencyCode: string;
  issueDate: string;
  dueDate: string;
  scheduleId: string | null;
  periodKey: string | null;
  lifecycle: EconomicEntryLifecycle;
  cancellationReason: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EconomicEntryCreateInput {
  entryType: EconomicEntryType;
  categoryId: string;
  playerId?: string | null;
  concept: string;
  counterpartyName?: string | null;
  amountMinor: number;
  currencyCode: string;
  issueDate: string;
  dueDate: string;
  scheduleId?: string | null;
  periodKey?: string | null;
}

export interface EconomicMovement {
  id: string;
  workspaceId: string;
  entryId: string;
  movementType: EconomicMovementType;
  paymentMethod: EconomicPaymentMethod;
  amountMinor: number;
  currencyCode: string;
  externalStatus: EconomicExternalStatus;
  originalMovementId: string | null;
  externalReference: string | null;
  occurredAt: string | null;
  createdAt: string;
}

export interface EconomicMovementCreateInput {
  entryId: string;
  movementType: EconomicMovementType;
  paymentMethod: EconomicPaymentMethod;
  amountMinor: number;
  currencyCode: string;
  originalMovementId?: string | null;
  externalReference?: string | null;
  occurredAt?: string | null;
}

export interface EconomicFilters {
  entryType?: EconomicEntryType;
  lifecycle?: EconomicEntryLifecycle;
  categoryId?: string;
  playerId?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
}
