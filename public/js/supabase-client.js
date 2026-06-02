/**
 * Elite Tutorial — Supabase client singleton
 */
(function () {
  function getConfig() {
    const cfg = window.ELITE_SUPABASE;
    if (!cfg?.url || !cfg?.anonKey) {
      throw new Error(
        'Missing Supabase config. Copy public/js/supabase-config.example.js to supabase-config.js and add your keys.'
      );
    }
    if (cfg.url.includes('YOUR_PROJECT_REF') || cfg.anonKey.includes('YOUR_SUPABASE')) {
      throw new Error('Update supabase-config.js with your real Supabase URL and anon key.');
    }
    return cfg;
  }

  window.getSupabaseClient = function getSupabaseClient() {
    if (window.__eliteSupabase) return window.__eliteSupabase;

    if (typeof supabase === 'undefined' || !supabase.createClient) {
      throw new Error('Supabase JS library not loaded.');
    }

    const { url, anonKey } = getConfig();
    window.__eliteSupabase = supabase.createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    return window.__eliteSupabase;
  };
})();
