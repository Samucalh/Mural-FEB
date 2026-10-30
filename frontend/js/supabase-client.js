const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.APP_CONFIG;
if (!window.supabase || !SUPABASE_URL.startsWith("https://") || SUPABASE_ANON_KEY.includes("SUA_CHAVE")) {
  console.warn("Configure SUPABASE_URL e SUPABASE_ANON_KEY em config.js.");
}
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
