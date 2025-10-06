import { createClient } from "@supabase/supabase-js";
import { Database } from "@/app/types/supabase";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseStorageUrl = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_URL;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase environment variables:", {
    url: !!supabaseUrl,
    key: !!supabaseAnonKey,
    storageUrl: !!supabaseStorageUrl,
  });
}

console.log("Supabase URL:", supabaseUrl);
console.log("Supabase Key exists:", !!supabaseAnonKey);

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
        },
        ...(supabaseStorageUrl && {
          storage: {
            url: supabaseStorageUrl,
          },
        }),
      })
    : null;

// Test connection
if (supabase) {
  supabase.auth.getSession().then(({ data, error }) => {
    if (error) {
      console.error("Supabase connection error:", error);
    } else {
      console.log("Supabase connected successfully");
    }
  });
}
