declare module "npm:@supabase/supabase-js@2" {
  interface StorageObjectRow {
    name: string | null
    metadata: Record<string, unknown> | null
  }

  export interface ReconciliationResult {
    run_id: string
    expired_reservations: number
    deleted_assets: number
    usage_adjustments: number
    deleting_assets: Array<{ asset_id: string; storage_path: string }>
  }

  export interface ReconciliationClient {
    schema(schema: "storage"): {
      from(table: "objects"): {
        select(columns: "name,metadata"): {
          eq(column: "bucket_id", value: "documentos"): {
            order(column: "name", options: { ascending: boolean }): {
              range(from: number, to: number): PromiseLike<{
                data: StorageObjectRow[] | null
                error: Error | null
              }>
            }
          }
        }
      }
    }
    rpc(
      functionName: "reconcile_document_asset_metadata",
      args: {
        p_storage_objects: Array<{ path: string; size_bytes: number }>
        p_deleted_asset_ids: string[]
      },
    ): PromiseLike<{ data: ReconciliationResult | null; error: Error | null }>
    storage: {
      from(bucket: "documentos"): {
        remove(paths: string[]): PromiseLike<{ error: Error | null }>
      }
    }
  }

  export function createClient(
    supabaseUrl: string,
    supabaseKey: string,
    options: { auth: { autoRefreshToken: boolean; persistSession: boolean } },
  ): ReconciliationClient
}

interface DenoRuntime {
  env: {
    get(name: string): string | undefined
  }
  serve(handler: (request: Request) => Response | Promise<Response>): void
}

declare const Deno: DenoRuntime
