// Standard CORS headers for Supabase Edge Functions.
// Allows the trivia app (Vercel) to call Edge Functions without preflight errors.
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
};
