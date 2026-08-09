import { getSupabaseClient } from "@/services/supabase";
import { calculateOutstandingMinor, deriveEconomicStatus, nextOccurrenceDate } from "@/lib/economia";
import type {
  EconomicCategory,
  EconomicCategoryCreateInput,
  EconomicDirection,
  EconomicEntry,
  EconomicEntryCreateInput,
  EconomicFilters,
  EconomicMovement,
  EconomicMovementCreateInput,
  EconomicSettings,
  EconomicSettingsUpdateInput,
  EconomicSchedule,
  EconomicScheduleCreateInput,
  EconomicScheduleFrequency,
  EconomicScheduleStatus,
  EconomicStatus,
} from "@/types/economia";
import type { Database } from "@/types/database.types";

type EconomicSettingsRow = Database["public"]["Tables"]["economic_settings"]["Row"];
type EconomicCategoryRow = Database["public"]["Tables"]["economic_categories"]["Row"];
type EconomicAuditEventRow = Database["public"]["Tables"]["economic_audit_events"]["Row"];
type EconomicEntryRow = Database["public"]["Tables"]["economic_entries"]["Row"];
type EconomicMovementRow = Database["public"]["Tables"]["economic_movements"]["Row"];
type EconomicScheduleRow = Database["public"]["Tables"]["economic_schedules"]["Row"];
type WorkspaceId = string | null | undefined;

export const ECONOMIC_SETTINGS_SELECT_FIELDS = "id,workspace_id,currency_code,timezone,created_at,updated_at";
export const ECONOMIC_CATEGORIES_SELECT_FIELDS = "id,workspace_id,direction,code,name,is_predefined,is_active,created_at,updated_at";
export const ECONOMIC_ENTRIES_SELECT_FIELDS =
  "id,workspace_id,entry_type,category_id,player_id,concept,counterparty_name,amount_minor,currency_code,issue_date,due_date,schedule_id,period_key,lifecycle,cancellation_reason,cancelled_at,cancelled_by,created_at,updated_at";
export const ECONOMIC_MOVEMENTS_SELECT_FIELDS =
  "id,workspace_id,entry_id,movement_type,payment_method,amount_minor,currency_code,external_status,original_movement_id,external_reference,occurred_at,created_at";
export const ECONOMIC_SCHEDULES_SELECT_FIELDS =
  "id,workspace_id,entry_type,category_id,player_id,concept,counterparty_name,amount_minor,currency_code,frequency,next_due_date,end_date,status,created_at,updated_at";
export const ECONOMIC_AUDIT_EVENTS_SELECT_FIELDS =
  "id,workspace_id,entity_type,entity_id,action,actor_id,old_data,new_data,created_at";

export interface EconomicCategoryUpdateInput {
  name?: string;
  direction?: EconomicDirection;
  code?: string;
}

export interface FetchEconomicCategoriesOptions {
  includeInactive?: boolean;
}

export interface EconomicEntryUpdateInput {
  categoryId?: string;
  playerId?: string | null;
  concept?: string;
  counterpartyName?: string | null;
  amountMinor?: number;
  currencyCode?: string;
  issueDate?: string;
  dueDate?: string;
}

export interface EconomicScheduleUpdateInput {
  categoryId?: string;
  playerId?: string | null;
  concept?: string;
  counterpartyName?: string | null;
  amountMinor?: number;
  currencyCode?: string;
  frequency?: EconomicScheduleFrequency;
  nextDueDate?: string;
  endDate?: string | null;
  status?: EconomicScheduleStatus;
}

export interface FetchEconomicSchedulesOptions {
  status?: EconomicScheduleStatus;
}

export interface EconomicAuditEvent {
  id: string;
  workspaceId: string;
  entityType: string;
  entityId: string;
  action: string;
  actorId: string | null;
  oldData: unknown | null;
  newData: unknown | null;
  createdAt: string;
}

export interface FetchEconomicAuditEventsOptions {
  entityType?: string;
  entityId?: string;
}

export interface EconomicExportFilters extends EconomicFilters {
  /** PerÃ­odo UI: period_key o vencimiento mensual. El estado se deriva tras cargar movimientos. */
  period?: string;
  status?: EconomicStatus;
}

export interface EconomicExportData {
  entries: EconomicEntry[];
  movementsByEntry: Record<string, EconomicMovement[]>;
  totalEntries: number;
  sourceEntriesCount: number;
  complete: true;
}

export interface FetchEconomicExportOptions {
  pageSize?: number;
  maxEntries?: number;
  maxMovements?: number;
}

export const ECONOMIC_EXPORT_PAGE_SIZE = 500;
export const ECONOMIC_EXPORT_MAX_ENTRIES = 10_000;
export const ECONOMIC_EXPORT_MAX_MOVEMENTS = 50_000;

function missingWorkspaceError() {
  return new Error("Missing active workspace");
}

function missingSupabaseClientError() {
  return new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

function mapEconomicSettings(row: Partial<EconomicSettingsRow>): EconomicSettings {
  return {
    id: row.id ?? "",
    workspaceId: row.workspace_id ?? "",
    currencyCode: row.currency_code ?? "",
    timezone: row.timezone ?? "",
    createdAt: row.created_at ?? "",
    updatedAt: row.updated_at ?? "",
  };
}

function mapEconomicCategory(row: Partial<EconomicCategoryRow>): EconomicCategory {
  return {
    id: row.id ?? "",
    workspaceId: row.workspace_id ?? "",
    direction: (row.direction ?? "income") as EconomicDirection,
    code: row.code ?? "",
    name: row.name ?? "",
    isPredefined: row.is_predefined ?? false,
    isActive: row.is_active ?? false,
    createdAt: row.created_at ?? "",
    updatedAt: row.updated_at ?? "",
  };
}

function mapEconomicEntry(row: Partial<EconomicEntryRow>): EconomicEntry {
  return {
    id: row.id ?? "",
    workspaceId: row.workspace_id ?? "",
    entryType: (row.entry_type ?? "income") as EconomicEntry["entryType"],
    categoryId: row.category_id ?? "",
    playerId: row.player_id ?? null,
    concept: row.concept ?? "",
    counterpartyName: row.counterparty_name ?? null,
    amountMinor: row.amount_minor ?? 0,
    currencyCode: row.currency_code ?? "",
    issueDate: row.issue_date ?? "",
    dueDate: row.due_date ?? "",
    scheduleId: row.schedule_id ?? null,
    periodKey: row.period_key ?? null,
    lifecycle: (row.lifecycle ?? "draft") as EconomicEntry["lifecycle"],
    cancellationReason: row.cancellation_reason ?? null,
    cancelledAt: row.cancelled_at ?? null,
    cancelledBy: row.cancelled_by ?? null,
    createdAt: row.created_at ?? "",
    updatedAt: row.updated_at ?? "",
  };
}

function mapEconomicMovement(row: Partial<EconomicMovementRow>): EconomicMovement {
  return {
    id: row.id ?? "",
    workspaceId: row.workspace_id ?? "",
    entryId: row.entry_id ?? "",
    movementType: (row.movement_type ?? "settlement") as EconomicMovement["movementType"],
    paymentMethod: (row.payment_method ?? "other") as EconomicMovement["paymentMethod"],
    amountMinor: row.amount_minor ?? 0,
    currencyCode: row.currency_code ?? "",
    externalStatus: (row.external_status ?? "pending") as EconomicMovement["externalStatus"],
    originalMovementId: row.original_movement_id ?? null,
    externalReference: row.external_reference ?? null,
    occurredAt: row.occurred_at ?? null,
    createdAt: row.created_at ?? "",
  };
}

function mapEconomicSchedule(row: Partial<EconomicScheduleRow>): EconomicSchedule {
  return {
    id: row.id ?? "",
    workspaceId: row.workspace_id ?? "",
    entryType: (row.entry_type ?? "income") as EconomicSchedule["entryType"],
    categoryId: row.category_id ?? "",
    concept: row.concept ?? "",
    counterpartyName: row.counterparty_name ?? null,
    playerId: row.player_id ?? null,
    amountMinor: row.amount_minor ?? 0,
    currencyCode: row.currency_code ?? "",
    frequency: (row.frequency ?? "monthly") as EconomicSchedule["frequency"],
    nextDueDate: row.next_due_date ?? "",
    endDate: row.end_date ?? null,
    status: (row.status ?? "active") as EconomicSchedule["status"],
    createdAt: row.created_at ?? "",
    updatedAt: row.updated_at ?? "",
  };
}

function mapEconomicAuditEvent(row: Partial<EconomicAuditEventRow>): EconomicAuditEvent {
  return {
    id: row.id ?? "",
    workspaceId: row.workspace_id ?? "",
    entityType: row.entity_type ?? "",
    entityId: row.entity_id ?? "",
    action: row.action ?? "",
    actorId: row.actor_id ?? null,
    oldData: row.old_data ?? null,
    newData: row.new_data ?? null,
    createdAt: row.created_at ?? "",
  };
}

async function isEconomicCategoryUsed(id: string, workspaceId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: missingSupabaseClientError() };

  const [entriesResult, schedulesResult] = await Promise.all([
    supabase
      .from("economic_entries")
      .select("id", { count: "exact", head: true })
      .eq("category_id", id)
      .eq("workspace_id", workspaceId),
    supabase
      .from("economic_schedules")
      .select("id", { count: "exact", head: true })
      .eq("category_id", id)
      .eq("workspace_id", workspaceId),
  ]);

  const error = entriesResult.error ?? schedulesResult.error;
  if (error) return { data: null, error };

  return { data: (entriesResult.count ?? 0) > 0 || (schedulesResult.count ?? 0) > 0, error: null };
}

async function hasSucceededEconomicMovement(id: string, workspaceId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: missingSupabaseClientError() };

  const { count, error } = await supabase
    .from("economic_movements")
    .select("id", { count: "exact", head: true })
    .eq("entry_id", id)
    .eq("workspace_id", workspaceId)
    .eq("external_status", "succeeded");

  return { data: (count ?? 0) > 0, error };
}

export async function fetchEconomicSettings(workspaceId: WorkspaceId) {
  if (!workspaceId) return { data: null, error: missingWorkspaceError() };

  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: missingSupabaseClientError() };

  const { data, error } = await supabase
    .from("economic_settings")
    .select(ECONOMIC_SETTINGS_SELECT_FIELDS)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  return { data: data ? mapEconomicSettings(data) : null, error };
}

export async function updateEconomicSettings(
  id: string,
  workspaceId: WorkspaceId,
  input: EconomicSettingsUpdateInput,
) {
  if (!workspaceId) return { data: null, error: missingWorkspaceError() };

  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: missingSupabaseClientError() };

  const { data, error, count } = await supabase
    .from("economic_settings")
    .update({ currency_code: input.currencyCode, timezone: input.timezone })
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select(ECONOMIC_SETTINGS_SELECT_FIELDS)
    .single();

  return { data: data ? mapEconomicSettings(data) : null, error, count };
}

export async function fetchEconomicCategories(
  workspaceId: WorkspaceId,
  options: FetchEconomicCategoriesOptions = {},
) {
  if (!workspaceId) return { data: null, error: missingWorkspaceError() };

  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: missingSupabaseClientError() };

  let query = supabase
    .from("economic_categories")
    .select(ECONOMIC_CATEGORIES_SELECT_FIELDS)
    .eq("workspace_id", workspaceId);

  if (!options.includeInactive) query = query.eq("is_active", true);

  const { data, error } = await query.order("name", { ascending: true });
  return { data: data ? data.map(mapEconomicCategory) : null, error };
}

export async function createEconomicCategory(workspaceId: WorkspaceId, input: EconomicCategoryCreateInput) {
  if (!workspaceId) return { data: null, error: missingWorkspaceError() };

  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: missingSupabaseClientError() };

  const { data, error, count } = await supabase
    .from("economic_categories")
    .insert({
      workspace_id: workspaceId,
      direction: input.direction,
      code: input.code,
      name: input.name,
      is_predefined: false,
      is_active: true,
    })
    .select(ECONOMIC_CATEGORIES_SELECT_FIELDS)
    .single();

  return { data: data ? mapEconomicCategory(data) : null, error, count };
}

export async function updateEconomicCategory(
  id: string,
  workspaceId: WorkspaceId,
  input: EconomicCategoryUpdateInput,
) {
  if (!workspaceId) return { data: null, error: missingWorkspaceError() };

  const hasIdentityChange = input.direction !== undefined || input.code !== undefined;
  if (hasIdentityChange) {
    const usageResult = await isEconomicCategoryUsed(id, workspaceId);
    if (usageResult.error) return { data: null, error: usageResult.error };
    if (usageResult.data) {
      return { data: null, error: new Error("Cannot change direction or code of an economic category already in use") };
    }
  }

  const payload = {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.direction !== undefined ? { direction: input.direction } : {}),
    ...(input.code !== undefined ? { code: input.code } : {}),
  };
  if (Object.keys(payload).length === 0) return { data: null, error: new Error("No economic category changes provided") };

  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: missingSupabaseClientError() };

  const { data, error, count } = await supabase
    .from("economic_categories")
    .update(payload)
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select(ECONOMIC_CATEGORIES_SELECT_FIELDS)
    .single();

  return { data: data ? mapEconomicCategory(data) : null, error, count };
}

export async function setEconomicCategoryActive(id: string, workspaceId: WorkspaceId, isActive: boolean) {
  if (!workspaceId) return { data: null, error: missingWorkspaceError() };

  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: missingSupabaseClientError() };

  const { data, error, count } = await supabase
    .from("economic_categories")
    .update({ is_active: isActive })
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select(ECONOMIC_CATEGORIES_SELECT_FIELDS)
    .single();

  return { data: data ? mapEconomicCategory(data) : null, error, count };
}

export async function archiveEconomicCategory(id: string, workspaceId: WorkspaceId) {
  return setEconomicCategoryActive(id, workspaceId, false);
}

function validateEconomicScheduleInput(input: EconomicScheduleCreateInput): Error | null {
  if (input.entryType === "player_charge") {
    if (!input.playerId) return new Error("A player charge schedule requires a player");
    if (input.counterpartyName) return new Error("A player charge schedule cannot have a counterparty");
  } else if (input.entryType === "expense") {
    if (input.playerId) return new Error("An expense schedule cannot have a player");
    if (!input.counterpartyName?.trim()) return new Error("An expense schedule requires a counterparty");
  }

  try {
    nextOccurrenceDate(input.nextDueDate, input.frequency);
    if (input.endDate) {
      nextOccurrenceDate(input.endDate, input.frequency);
      if (input.endDate < input.nextDueDate) {
        return new Error("A schedule end date cannot precede its next due date");
      }
    }
  } catch (error) {
    return error instanceof Error ? error : new Error("Invalid economic schedule date or frequency");
  }

  return null;
}

function validateEconomicScheduleStatus(status: EconomicScheduleStatus): Error | null {
  if (["active", "paused", "ended", "cancelled"].includes(status)) return null;
  return new Error("Invalid economic schedule status");
}

export async function fetchEconomicSchedules(
  workspaceId: WorkspaceId,
  options: FetchEconomicSchedulesOptions = {},
) {
  if (!workspaceId) return { data: null, error: missingWorkspaceError() };

  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: missingSupabaseClientError() };

  let query = supabase
    .from("economic_schedules")
    .select(ECONOMIC_SCHEDULES_SELECT_FIELDS)
    .eq("workspace_id", workspaceId);
  if (options.status) query = query.eq("status", options.status);

  const { data, error } = await query.order("next_due_date", { ascending: true });
  return { data: data ? data.map(mapEconomicSchedule) : null, error };
}

export async function createEconomicSchedule(workspaceId: WorkspaceId, input: EconomicScheduleCreateInput) {
  if (!workspaceId) return { data: null, error: missingWorkspaceError() };

  const validationError = validateEconomicScheduleInput(input);
  if (validationError) return { data: null, error: validationError };

  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: missingSupabaseClientError() };

  const { data, error, count } = await supabase
    .from("economic_schedules")
    .insert({
      workspace_id: workspaceId,
      entry_type: input.entryType,
      category_id: input.categoryId,
      player_id: input.playerId ?? null,
      concept: input.concept.trim(),
      counterparty_name: input.entryType === "player_charge" ? null : input.counterpartyName?.trim() ?? null,
      amount_minor: input.amountMinor,
      currency_code: input.currencyCode,
      frequency: input.frequency,
      next_due_date: input.nextDueDate,
      end_date: input.endDate ?? null,
      status: "active",
    })
    .select(ECONOMIC_SCHEDULES_SELECT_FIELDS)
    .single();

  return { data: data ? mapEconomicSchedule(data) : null, error, count };
}

export async function updateEconomicSchedule(
  id: string,
  workspaceId: WorkspaceId,
  input: EconomicScheduleUpdateInput,
) {
  if (!workspaceId) return { data: null, error: missingWorkspaceError() };
  if (input.status) {
    const statusError = validateEconomicScheduleStatus(input.status);
    if (statusError) return { data: null, error: statusError };
  }
  if (input.nextDueDate && input.frequency) {
    try {
      nextOccurrenceDate(input.nextDueDate, input.frequency);
    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error("Invalid economic schedule date or frequency") };
    }
  }

  const payload = {
    ...(input.categoryId !== undefined ? { category_id: input.categoryId } : {}),
    ...(input.playerId !== undefined ? { player_id: input.playerId } : {}),
    ...(input.concept !== undefined ? { concept: input.concept.trim() } : {}),
    ...(input.counterpartyName !== undefined ? { counterparty_name: input.counterpartyName?.trim() ?? null } : {}),
    ...(input.amountMinor !== undefined ? { amount_minor: input.amountMinor } : {}),
    ...(input.currencyCode !== undefined ? { currency_code: input.currencyCode } : {}),
    ...(input.frequency !== undefined ? { frequency: input.frequency } : {}),
    ...(input.nextDueDate !== undefined ? { next_due_date: input.nextDueDate } : {}),
    ...(input.endDate !== undefined ? { end_date: input.endDate } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
  };
  if (Object.keys(payload).length === 0) return { data: null, error: new Error("No economic schedule changes provided") };

  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: missingSupabaseClientError() };

  const { data, error, count } = await supabase
    .from("economic_schedules")
    .update(payload)
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select(ECONOMIC_SCHEDULES_SELECT_FIELDS)
    .single();

  return { data: data ? mapEconomicSchedule(data) : null, error, count };
}

export async function createEconomicEntry(workspaceId: WorkspaceId, input: EconomicEntryCreateInput) {
  if (!workspaceId) return { data: null, error: missingWorkspaceError() };
  if (input.entryType === "player_charge" && !input.playerId) {
    return { data: null, error: new Error("A player charge requires a player") };
  }
  if (input.entryType === "expense" && input.playerId) {
    return { data: null, error: new Error("An expense cannot have a player") };
  }
  if (input.entryType === "expense" && !input.counterpartyName?.trim()) {
    return { data: null, error: new Error("An expense requires a counterparty") };
  }

  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: missingSupabaseClientError() };

  const playerId = input.playerId ?? null;
  const counterpartyName = input.entryType === "player_charge" ? null : input.counterpartyName?.trim() ?? null;
  const { data, error, count } = await supabase
    .from("economic_entries")
    .insert({
      workspace_id: workspaceId,
      entry_type: input.entryType,
      category_id: input.categoryId,
      player_id: playerId,
      concept: input.concept,
      counterparty_name: counterpartyName,
      amount_minor: input.amountMinor,
      currency_code: input.currencyCode,
      issue_date: input.issueDate,
      due_date: input.dueDate,
      schedule_id: input.scheduleId ?? null,
      period_key: input.periodKey ?? null,
      lifecycle: "open",
    })
    .select(ECONOMIC_ENTRIES_SELECT_FIELDS)
    .single();

  return { data: data ? mapEconomicEntry(data) : null, error, count };
}

async function fetchEconomicScheduleForOccurrence(id: string, workspaceId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: missingSupabaseClientError() };

  const { data, error } = await supabase
    .from("economic_schedules")
    .select(ECONOMIC_SCHEDULES_SELECT_FIELDS)
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  return { data: data ? mapEconomicSchedule(data) : null, error };
}

async function fetchEconomicScheduleOccurrence(scheduleId: string, workspaceId: string, periodKey: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: missingSupabaseClientError() };

  const { data, error } = await supabase
    .from("economic_entries")
    .select(ECONOMIC_ENTRIES_SELECT_FIELDS)
    .eq("schedule_id", scheduleId)
    .eq("period_key", periodKey)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  return { data: data ? mapEconomicEntry(data) : null, error };
}

async function advanceEconomicScheduleAfterOccurrence(schedule: EconomicSchedule) {
  let nextDueDate: string;
  try {
    nextDueDate = nextOccurrenceDate(schedule.nextDueDate, schedule.frequency);
  } catch (error) {
    return { error: error instanceof Error ? error : new Error("Invalid economic schedule date or frequency") };
  }

  const input: EconomicScheduleUpdateInput =
    schedule.endDate && nextDueDate > schedule.endDate
      ? { status: "ended" }
      : { nextDueDate };
  const result = await updateEconomicSchedule(schedule.id, schedule.workspaceId, input);
  return { error: result.error };
}

export async function generateNextEconomicOccurrence(scheduleId: string, workspaceId: WorkspaceId) {
  if (!workspaceId) return { data: null, error: missingWorkspaceError(), reused: false };

  const scheduleResult = await fetchEconomicScheduleForOccurrence(scheduleId, workspaceId);
  if (scheduleResult.error) return { data: null, error: scheduleResult.error, reused: false };
  const schedule = scheduleResult.data;
  if (!schedule) return { data: null, error: new Error("Economic schedule not found in the active workspace"), reused: false };
  if (schedule.status !== "active") {
    return { data: null, error: new Error("Only active economic schedules can generate occurrences"), reused: false };
  }
  if (schedule.endDate && schedule.nextDueDate > schedule.endDate) {
    const endResult = await updateEconomicSchedule(schedule.id, workspaceId, { status: "ended" });
    return { data: null, error: endResult.error ?? new Error("The economic schedule has ended"), reused: false };
  }

  const periodKey = schedule.nextDueDate;
  const existingResult = await fetchEconomicScheduleOccurrence(schedule.id, workspaceId, periodKey);
  if (existingResult.error) return { data: null, error: existingResult.error, reused: false };
  if (existingResult.data) {
    const advanceResult = await advanceEconomicScheduleAfterOccurrence(schedule);
    return { data: existingResult.data, error: advanceResult.error, reused: true };
  }

  const entryResult = await createEconomicEntry(workspaceId, {
    entryType: schedule.entryType,
    categoryId: schedule.categoryId,
    playerId: schedule.playerId,
    concept: schedule.concept,
    counterpartyName: schedule.counterpartyName,
    amountMinor: schedule.amountMinor,
    currencyCode: schedule.currencyCode,
    issueDate: schedule.nextDueDate,
    dueDate: schedule.nextDueDate,
    scheduleId: schedule.id,
    periodKey,
  });
  if (entryResult.data) {
    const advanceResult = await advanceEconomicScheduleAfterOccurrence(schedule);
    return { data: entryResult.data, error: advanceResult.error, reused: false };
  }

  const concurrentResult = await fetchEconomicScheduleOccurrence(schedule.id, workspaceId, periodKey);
  if (concurrentResult.error) return { data: null, error: concurrentResult.error, reused: false };
  if (concurrentResult.data) {
    const advanceResult = await advanceEconomicScheduleAfterOccurrence(schedule);
    return { data: concurrentResult.data, error: advanceResult.error, reused: true };
  }

  return { data: null, error: entryResult.error, reused: false };
}

export async function fetchEconomicEntries(workspaceId: WorkspaceId, filters: EconomicFilters = {}) {
  if (!workspaceId) return { data: null, error: missingWorkspaceError() };

  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: missingSupabaseClientError() };

  let query = supabase
    .from("economic_entries")
    .select(ECONOMIC_ENTRIES_SELECT_FIELDS)
    .eq("workspace_id", workspaceId);

  if (filters.entryType) query = query.eq("entry_type", filters.entryType);
  if (filters.lifecycle) query = query.eq("lifecycle", filters.lifecycle);
  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.playerId) query = query.eq("player_id", filters.playerId);
  if (filters.fromDate) query = query.gte("due_date", filters.fromDate);
  if (filters.toDate) query = query.lte("due_date", filters.toDate);
  if (filters.search) query = query.ilike("concept", `%${filters.search}%`);

  const { data, error } = await query.order("due_date", { ascending: false });
  return { data: data ? data.map(mapEconomicEntry) : null, error };
}

export async function fetchEconomicMovements(workspaceId: WorkspaceId) {
  if (!workspaceId) return { data: null, error: missingWorkspaceError() };

  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: missingSupabaseClientError() };

  const { data, error } = await supabase
    .from("economic_movements")
    .select(ECONOMIC_MOVEMENTS_SELECT_FIELDS)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  return { data: data ? data.map(mapEconomicMovement) : null, error };
}

/**
 * Carga un export completo y verificable. El filtro `status` no se manda a la BD:
 * depende de los movimientos y por eso se calcula solo despuÃ©s de paginar todas las
 * entradas base y todos sus movimientos scoped.
 */
export async function fetchEconomicExport(
  workspaceId: WorkspaceId,
  filters: EconomicExportFilters = {},
  options: FetchEconomicExportOptions = {},
) {
  if (!workspaceId) return { data: null, error: missingWorkspaceError() };
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: missingSupabaseClientError() };

  const pageSize = options.pageSize ?? ECONOMIC_EXPORT_PAGE_SIZE;
  const maxEntries = options.maxEntries ?? ECONOMIC_EXPORT_MAX_ENTRIES;
  const maxMovements = options.maxMovements ?? ECONOMIC_EXPORT_MAX_MOVEMENTS;
  if (!Number.isInteger(pageSize) || pageSize < 1 || !Number.isInteger(maxEntries) || maxEntries < 1 || !Number.isInteger(maxMovements) || maxMovements < 1) {
    return { data: null, error: new Error("Invalid economic export pagination limits") };
  }
  if (filters.period && !/^\d{4}-\d{2}$/.test(filters.period)) {
    return { data: null, error: new Error("Invalid economic export period") };
  }

  let countQuery = supabase
    .from("economic_entries")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);
  countQuery = applyEconomicExportEntryFilters(countQuery, filters);
  const { count, error: countError } = await countQuery;
  if (countError) return { data: null, error: countError };
  if (count === null) return { data: null, error: new Error("Could not confirm the complete economic export count") };
  if (count > maxEntries) return { data: null, error: new Error("The economic export exceeds its safe entry limit") };

  const entries: EconomicEntry[] = [];
  for (let offset = 0; offset < count; offset += pageSize) {
    let pageQuery = supabase
      .from("economic_entries")
      .select(ECONOMIC_ENTRIES_SELECT_FIELDS)
      .eq("workspace_id", workspaceId);
    pageQuery = applyEconomicExportEntryFilters(pageQuery, filters);
    const { data, error } = await pageQuery.order("due_date", { ascending: false }).range(offset, Math.min(offset + pageSize - 1, count - 1));
    if (error) return { data: null, error };
    entries.push(...(data ?? []).map(mapEconomicEntry));
  }
  if (entries.length !== count) {
    return { data: null, error: new Error("The economic export could not be completed: entry count changed or a page is missing") };
  }

  const movementsByEntry: Record<string, EconomicMovement[]> = {};
  const entryIds = entries.map((entry) => entry.id);
  let fetchedMovements = 0;
  for (let offset = 0; offset < entryIds.length; offset += ECONOMIC_EXPORT_PAGE_SIZE) {
    const entryIdBatch = entryIds.slice(offset, offset + ECONOMIC_EXPORT_PAGE_SIZE);
    const movementCountQuery = supabase
      .from("economic_movements")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .in("entry_id", entryIdBatch);
    const { count: movementCount, error: movementCountError } = await movementCountQuery;
    if (movementCountError) return { data: null, error: movementCountError };
    if (movementCount === null) return { data: null, error: new Error("Could not confirm the complete economic movement export") };
    if (fetchedMovements + movementCount > maxMovements) return { data: null, error: new Error("The economic export exceeds its safe movement limit") };

    const batchMovements: EconomicMovement[] = [];
    for (let pageOffset = 0; pageOffset < movementCount; pageOffset += pageSize) {
      const { data, error } = await supabase
        .from("economic_movements")
        .select(ECONOMIC_MOVEMENTS_SELECT_FIELDS)
        .eq("workspace_id", workspaceId)
        .in("entry_id", entryIdBatch)
        .order("created_at", { ascending: true })
        .range(pageOffset, Math.min(pageOffset + pageSize - 1, movementCount - 1));
      if (error) return { data: null, error };
      batchMovements.push(...(data ?? []).map(mapEconomicMovement));
    }
    if (batchMovements.length !== movementCount) {
      return { data: null, error: new Error("The economic export could not be completed: movement count changed or a page is missing") };
    }
    fetchedMovements += batchMovements.length;
    for (const movement of batchMovements) (movementsByEntry[movement.entryId] ??= []).push(movement);
  }

  try {
    const exportedEntries = filters.status
      ? entries.filter((entry) => deriveEconomicStatus(entry, movementsByEntry[entry.id] ?? []) === filters.status)
      : entries;
    return {
      data: {
        entries: exportedEntries,
        movementsByEntry,
        totalEntries: exportedEntries.length,
        sourceEntriesCount: count,
        complete: true as const,
      } satisfies EconomicExportData,
      error: null,
    };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error : new Error("Could not derive economic export status") };
  }
}

function applyEconomicExportEntryFilters<Query extends {
  eq: (column: string, value: string) => Query;
  gte: (column: string, value: string) => Query;
  ilike: (column: string, value: string) => Query;
  lte: (column: string, value: string) => Query;
  or: (filters: string) => Query;
}>(query: Query, filters: EconomicExportFilters): Query {
  let filteredQuery = query;
  if (filters.entryType) filteredQuery = filteredQuery.eq("entry_type", filters.entryType);
  if (filters.lifecycle) filteredQuery = filteredQuery.eq("lifecycle", filters.lifecycle);
  if (filters.categoryId) filteredQuery = filteredQuery.eq("category_id", filters.categoryId);
  if (filters.playerId) filteredQuery = filteredQuery.eq("player_id", filters.playerId);
  if (filters.fromDate) filteredQuery = filteredQuery.gte("due_date", filters.fromDate);
  if (filters.toDate) filteredQuery = filteredQuery.lte("due_date", filters.toDate);
  if (filters.search) filteredQuery = filteredQuery.ilike("concept", `%${filters.search}%`);
  if (filters.period) {
    const [year, month] = filters.period.split("-").map(Number);
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    filteredQuery = filteredQuery.or(`period_key.eq.${filters.period},and(due_date.gte.${filters.period}-01,due_date.lte.${filters.period}-${lastDay})`);
  }
  return filteredQuery;
}

export async function updateEconomicEntry(
  id: string,
  workspaceId: WorkspaceId,
  input: EconomicEntryUpdateInput,
) {
  if (!workspaceId) return { data: null, error: missingWorkspaceError() };

  const hasProtectedFieldChange =
    input.amountMinor !== undefined || input.currencyCode !== undefined || input.playerId !== undefined;
  if (hasProtectedFieldChange) {
    const movementResult = await hasSucceededEconomicMovement(id, workspaceId);
    if (movementResult.error) return { data: null, error: movementResult.error };
    if (movementResult.data) {
      return { data: null, error: new Error("Cannot change amount, currency or player after a confirmed movement") };
    }
  }

  const payload = {
    ...(input.categoryId !== undefined ? { category_id: input.categoryId } : {}),
    ...(input.playerId !== undefined ? { player_id: input.playerId } : {}),
    ...(input.concept !== undefined ? { concept: input.concept } : {}),
    ...(input.counterpartyName !== undefined ? { counterparty_name: input.counterpartyName } : {}),
    ...(input.amountMinor !== undefined ? { amount_minor: input.amountMinor } : {}),
    ...(input.currencyCode !== undefined ? { currency_code: input.currencyCode } : {}),
    ...(input.issueDate !== undefined ? { issue_date: input.issueDate } : {}),
    ...(input.dueDate !== undefined ? { due_date: input.dueDate } : {}),
  };
  if (Object.keys(payload).length === 0) return { data: null, error: new Error("No economic entry changes provided") };

  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: missingSupabaseClientError() };

  const { data, error, count } = await supabase
    .from("economic_entries")
    .update(payload)
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select(ECONOMIC_ENTRIES_SELECT_FIELDS)
    .single();

  return { data: data ? mapEconomicEntry(data) : null, error, count };
}

export async function cancelEconomicEntry(id: string, workspaceId: WorkspaceId, reason: string) {
  if (!workspaceId) return { data: null, error: missingWorkspaceError() };
  if (!reason.trim()) return { data: null, error: new Error("A cancellation reason is required") };

  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: missingSupabaseClientError() };

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { data: null, error: authError ?? new Error("Missing authenticated user") };

  const { data, error, count } = await supabase
    .from("economic_entries")
    .update({
      lifecycle: "cancelled",
      cancellation_reason: reason.trim(),
      cancelled_at: new Date().toISOString(),
      cancelled_by: authData.user.id,
    })
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select(ECONOMIC_ENTRIES_SELECT_FIELDS)
    .single();

  return { data: data ? mapEconomicEntry(data) : null, error, count };
}

async function fetchEconomicEntryForMovement(id: string, workspaceId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: missingSupabaseClientError() };

  const { data, error } = await supabase
    .from("economic_entries")
    .select(ECONOMIC_ENTRIES_SELECT_FIELDS)
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  return { data: data ? mapEconomicEntry(data) : null, error };
}

async function fetchEconomicMovementsForEntry(entryId: string, workspaceId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: missingSupabaseClientError() };

  const { data, error } = await supabase
    .from("economic_movements")
    .select(ECONOMIC_MOVEMENTS_SELECT_FIELDS)
    .eq("entry_id", entryId)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  return { data: data ? data.map(mapEconomicMovement) : null, error };
}

function validateEconomicMovement(input: EconomicMovementCreateInput, entry: EconomicEntry, movements: EconomicMovement[]) {
  if (input.currencyCode !== entry.currencyCode) {
    return new Error("The movement currency must match its entry currency");
  }

  if (input.movementType === "settlement") {
    if (input.originalMovementId) return new Error("A settlement cannot reference an original movement");
    try {
      if (input.amountMinor > calculateOutstandingMinor(entry, movements)) {
        return new Error("The settlement cannot exceed the outstanding amount");
      }
    } catch (error) {
      return error instanceof Error ? error : new Error("Could not calculate the outstanding amount");
    }
    return null;
  }

  if (!input.originalMovementId) return new Error("A refund or reversal requires an original movement");

  const original = movements.find((movement) => movement.id === input.originalMovementId);
  if (!original || original.entryId !== entry.id || original.workspaceId !== entry.workspaceId) {
    return new Error("The original movement must belong to the same entry and workspace");
  }
  if (original.movementType !== "settlement" || original.externalStatus !== "succeeded") {
    return new Error("A refund or reversal must reference a confirmed settlement");
  }

  const adjustedMinor = movements
    .filter(
      (movement) =>
        movement.originalMovementId === original.id &&
        movement.externalStatus === "succeeded" &&
        (movement.movementType === "refund" || movement.movementType === "reversal"),
    )
    .reduce((total, movement) => total + movement.amountMinor, 0);
  if (input.amountMinor > original.amountMinor - adjustedMinor) {
    return new Error("The refund or reversal cannot exceed the original movement net amount");
  }

  return null;
}

export async function recordEconomicMovement(workspaceId: WorkspaceId, input: EconomicMovementCreateInput) {
  if (!workspaceId) return { data: null, error: missingWorkspaceError() };

  const entryResult = await fetchEconomicEntryForMovement(input.entryId, workspaceId);
  if (entryResult.error) return { data: null, error: entryResult.error };
  if (!entryResult.data) return { data: null, error: new Error("Economic entry not found in the active workspace") };

  const movementsResult = await fetchEconomicMovementsForEntry(input.entryId, workspaceId);
  if (movementsResult.error) return { data: null, error: movementsResult.error };
  const validationError = validateEconomicMovement(input, entryResult.data, movementsResult.data ?? []);
  if (validationError) return { data: null, error: validationError };

  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: missingSupabaseClientError() };

  const { data, error, count } = await supabase
    .from("economic_movements")
    .insert({
      workspace_id: workspaceId,
      entry_id: input.entryId,
      movement_type: input.movementType,
      payment_method: input.paymentMethod,
      amount_minor: input.amountMinor,
      currency_code: input.currencyCode,
      external_status: "succeeded",
      original_movement_id: input.movementType === "settlement" ? null : input.originalMovementId ?? null,
      external_reference: input.externalReference ?? null,
      occurred_at: input.occurredAt ?? null,
    })
    .select(ECONOMIC_MOVEMENTS_SELECT_FIELDS)
    .single();

  return { data: data ? mapEconomicMovement(data) : null, error, count };
}

export async function recordEconomicAdjustment(workspaceId: WorkspaceId, input: EconomicMovementCreateInput) {
  if (input.movementType === "settlement") {
    return { data: null, error: new Error("An economic adjustment must be a refund or reversal") };
  }
  return recordEconomicMovement(workspaceId, input);
}

export async function fetchEconomicAuditEvents(
  workspaceId: WorkspaceId,
  options: FetchEconomicAuditEventsOptions = {},
) {
  if (!workspaceId) return { data: null, error: missingWorkspaceError() };

  const supabase = getSupabaseClient();
  if (!supabase) return { data: null, error: missingSupabaseClientError() };

  let query = supabase
    .from("economic_audit_events")
    .select(ECONOMIC_AUDIT_EVENTS_SELECT_FIELDS)
    .eq("workspace_id", workspaceId);
  if (options.entityType) query = query.eq("entity_type", options.entityType);
  if (options.entityId) query = query.eq("entity_id", options.entityId);

  const { data, error } = await query.order("created_at", { ascending: false });
  return { data: data ? data.map(mapEconomicAuditEvent) : null, error };
}
