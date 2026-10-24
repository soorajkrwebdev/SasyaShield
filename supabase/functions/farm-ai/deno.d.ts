declare module 'https://deno.land/std@0.168.0/http/server.ts' {
  export function serve(handler: (req: Request) => Response | Promise<Response>): void;
}

declare module 'https://esm.sh/@supabase/supabase-js@2.45.0' {
  export interface SupabaseAuth {
    getUser(): Promise<{ data: { user: any }; error: any }>;
  }
  export interface SupabaseClient {
    auth: SupabaseAuth;
  }
  export function createClient(url: string, key: string, options?: any): SupabaseClient;
}