declare module "@supabase/realtime-js" {
  export type RealtimePostgresChangesPayload<T = Record<string, unknown>> = {
    schema: string;
    table: string;
    commit_timestamp: string;
    eventType: "INSERT" | "UPDATE" | "DELETE";
    new: T;
    old: T;
    errors: null | unknown[];
  };

  interface RealtimeChannelBindings {
    [key: string]: Array<{
      type: string;
      filter: Record<string, unknown>;
      callback: (payload: RealtimePostgresChangesPayload<unknown>) => void;
      id?: string;
    }>;
  }

  class RealtimeChannel {
    bindings: RealtimeChannelBindings;
    on<T>(
      event: "postgres_changes",
      filter: {
        event: "*" | "INSERT" | "UPDATE" | "DELETE";
        schema: string;
        table: string;
      },
      callback: (payload: RealtimePostgresChangesPayload<T>) => void
    ): this;
    subscribe(): this;
  }
}
