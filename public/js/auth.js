/**
 * Elite Tutorial — Auth helpers (Supabase)
 */
(function () {
  const DASHBOARD_PATH = '/module/dashboard/dashboard.html';
  const CALLBACK_PATH = '/module/auth/auth-callback.html';

  function getBasePath() {
    // Accommodate Live Server serving from the workspace root
    if (window.location.pathname.startsWith('/public/')) {
      return '/public';
    }
    // Also handle cases where there might be a nested directory
    const parts = window.location.pathname.split('/module/');
    if (parts.length > 1) {
      return parts[0];
    }
    return '';
  }

  function dashboardUrl() {
    return new URL(getBasePath() + DASHBOARD_PATH, window.location.origin).href;
  }

  function callbackUrl() {
    return new URL(getBasePath() + CALLBACK_PATH, window.location.origin).href;
  }

  function formatAuthError(error) {
    if (!error) return 'Something went wrong. Please try again.';
    const msg = error.message || String(error);
    if (msg.includes('Invalid login credentials')) return 'Incorrect email or password.';
    if (msg.includes('User already registered')) return 'An account with this email already exists. Try signing in.';
    if (msg.includes('Email not confirmed')) return 'Please confirm your email before signing in.';
    return msg;
  }

  async function ensureProfile(client, user) {
    const meta = user.user_metadata || {};
    const fullName = meta.full_name || meta.name || meta.fullName || '';
    await client.from('profiles').upsert(
      {
        id: user.id,
        full_name: fullName,
      },
      { onConflict: 'id' }
    );
  }

  window.EliteAuth = {
    dashboardUrl,
    callbackUrl,

    async getSession() {
      const client = window.getSupabaseClient();
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      return data.session;
    },

    async redirectIfAuthenticated() {
      const session = await this.getSession();
      if (session && session.user) {
        this.showLoggedInSnackbar(session.user.email);
        return true;
      }
      return false;
    },

    showLoggedInSnackbar(email) {
      let snackbar = document.getElementById('elite-auth-snackbar');
      if (!snackbar) {
        snackbar = document.createElement('div');
        snackbar.id = 'elite-auth-snackbar';
        document.body.appendChild(snackbar);
        
        const style = document.createElement('style');
        style.textContent = `
          #elite-auth-snackbar {
            position: fixed;
            top: -100px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(8, 8, 8, 0.85);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #fff;
            padding: 14px 24px;
            border-radius: 50px;
            box-shadow: 0 12px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(224, 28, 28, 0.2);
            z-index: 9999;
            display: flex;
            align-items: center;
            gap: 12px;
            font-family: 'Outfit', sans-serif;
            font-size: 0.95rem;
            cursor: pointer;
            transition: top 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          }
          #elite-auth-snackbar:hover {
            background: rgba(16, 16, 16, 0.95);
            border-color: rgba(224, 28, 28, 0.4);
            transform: translateX(-50%) translateY(2px);
          }
          #elite-auth-snackbar.show {
            top: 24px;
          }
          .snack-icon {
            background: linear-gradient(135deg, #e01c1c, #8a0000);
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: bold;
            box-shadow: 0 4px 12px rgba(224, 28, 28, 0.4);
          }
          .snack-text {
            font-weight: 400;
            color: #c8c8c8;
          }
          .snack-text strong {
            color: #fff;
            font-weight: 600;
          }
          .snack-action {
            color: #ff2d2d;
            font-weight: 700;
            margin-left: 8px;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
        `;
        document.head.appendChild(style);
        
        snackbar.addEventListener('click', () => {
          window.location.replace(dashboardUrl());
        });
      }

      snackbar.innerHTML = `
        <div class="snack-icon">✓</div>
        <div class="snack-text">Already logged in as <strong>${email}</strong></div>
        <div class="snack-action">Click to continue →</div>
      `;
      
      setTimeout(() => {
        snackbar.classList.add('show');
      }, 100);
    },

    async signInWithEmail(email, password) {
      const client = window.getSupabaseClient();
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.user) await ensureProfile(client, data.user);
      return data;
    },

    async sendOtp(email) {
      const client = window.getSupabaseClient();
      const { error } = await client.auth.signInWithOtp({ email });
      if (error) throw error;
    },

    async verifyOtp(email, token, type = 'email') {
      const client = window.getSupabaseClient();
      const { data, error } = await client.auth.verifyOtp({ email, token, type });
      if (error) throw error;
      if (data.user) await ensureProfile(client, data.user);
      return data;
    },


    async signUpWithEmail({ email, password, firstName, lastName }) {
      const client = window.getSupabaseClient();
      const fullName = `${firstName} ${lastName}`.trim();
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, first_name: firstName, last_name: lastName },
        },
      });
      if (error) throw error;
      if (data.user) await ensureProfile(client, data.user);
      return data;
    },

    async signInWithGoogle() {
      const client = window.getSupabaseClient();
      const { error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl(),
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      });
      if (error) throw error;
    },

    /** Call on auth-callback.html after OAuth redirect */
    async completeOAuthCallback() {
      const client = window.getSupabaseClient();
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');

      if (code) {
        const { error } = await client.auth.exchangeCodeForSession(code);
        if (error) throw error;
      }

      const { data, error: sessionError } = await client.auth.getSession();
      if (sessionError) throw sessionError;

      const session = data.session;
      if (!session?.user) {
        throw new Error('Sign-in was cancelled or failed. Please try again.');
      }

      await ensureProfile(client, session.user);
      window.location.replace(dashboardUrl());
    },
  };
})();
