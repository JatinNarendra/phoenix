interface RealtimePostgresChangesPayload<T> {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: T;
  old: T;
  errors: null | unknown[];
  schema: string;
  table: string;
}

declare module "@supabase/realtime-js" {
  interface RealtimeChannelBindings {
    [key: string]: Array<{
      type: string;
      filter: Record<string, unknown>;
      callback: (...args: unknown[]) => void;
      id?: string;
    }>;
  }

  class RealtimeChannel {
    bindings: RealtimeChannelBindings;
    on(
      event: "postgres_changes",
      filter: { event: string; schema: string; table: string },
      callback: (payload: RealtimePostgresChangesPayload<unknown>) => void
    ): this;
    subscribe(): Promise<{
      data: { channel: RealtimeChannel };
      error: Error | null;
    }>;
  }
}
