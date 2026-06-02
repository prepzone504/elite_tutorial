/* ============================================
   ELITE TUTORIAL — SHARED SIDEBAR JS
   public/js/sidebar.js
   Included by all module pages for a unified nav.

   Usage:
     <script src="../../js/sidebar.js"></script>
   Then call: initSharedSidebar({ activePage: 'puzzle', rootPath: '../../' });
============================================ */

(function () {
  'use strict';

  /**
   * Build the canonical sidebar HTML and inject it into #sidebar.
   * @param {string} activePage  - one of: home|exam|flashcard|puzzle|analytics|leaderboard|admin
   * @param {string} rootPath    - relative path back to /public  e.g. '../../' or '../'
   */
  function buildSidebar(activePage, rootPath) {
    const root = rootPath || '../../';

    const links = [
      {
        key: 'home',
        label: 'Home',
        href: root + 'module/dashboard/dashboard.html',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                 <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                 <polyline points="9 22 9 12 15 12 15 22"/>
               </svg>`,
        badge: ''
      },
      {
        key: 'exam',
        label: 'Exam for Today',
        href: root + 'module/exam_for_today/exam_for_today.html',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                 <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                 <polyline points="14 2 14 8 20 8"/>
                 <line x1="16" y1="13" x2="8" y2="13"/>
                 <line x1="16" y1="17" x2="8" y2="17"/>
                 <polyline points="10 9 9 9 8 9"/>
               </svg>`,
        badge: '<span class="nav-badge pending-badge" id="sidebar-exam-badge" style="display:none;">0</span>'
      },
      {
        key: 'flashcard',
        label: 'Flash Card',
        href: root + 'module/flash_card/flash_card.html',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                 <rect x="2" y="5" width="20" height="14" rx="3"/>
                 <line x1="2" y1="10" x2="22" y2="10"/>
               </svg>`,
        badge: ''
      },
      {
        key: 'puzzle',
        label: 'Elite Puzzle',
        href: root + 'module/elite_puzzle/elite_puzzle.html',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                 <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
                 <line x1="7" y1="7" x2="7.01" y2="7"/>
               </svg>`,
        badge: '<span class="nav-badge new-badge" id="sidebar-puzzle-badge" style="display:none;">0</span>'
      },
      {
        key: 'analytics',
        label: 'Analytics',
        href: root + 'module/dashboard/dashboard.html#analytics',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                 <line x1="18" y1="20" x2="18" y2="10"/>
                 <line x1="12" y1="20" x2="12" y2="4"/>
                 <line x1="6" y1="20" x2="6" y2="14"/>
               </svg>`,
        badge: ''
      },
      {
        key: 'leaderboard',
        label: 'Leaderboard',
        href: root + 'module/leaderboard/leaderboard.html',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                 <circle cx="12" cy="8" r="7"/>
                 <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
               </svg>`,
        badge: ''
      }
    ];

    const adminLink = {
      key: 'admin',
      label: 'Admin Section',
      href: root + 'module/admin/admin.html',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
               <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
             </svg>`,
      badge: '<span class="nav-badge admin-badge">Admin</span>',
      extraClass: 'admin-link'
    };

    const navItems = links.map(l => {
      const isActive = l.key === activePage;
      const extraClass = isActive ? ' active' : '';
      return `
        <li class="nav-item">
          <a href="${l.href}" class="nav-link${extraClass}" data-page="${l.key}">
            <span class="nav-icon">${l.icon}</span>
            <span class="nav-label">${l.label}</span>
            ${l.badge}
          </a>
        </li>`;
    }).join('');

    const adminItem = `
      <li class="nav-item nav-admin-divider">
        <span class="nav-section-label">Admin</span>
      </li>
      <li class="nav-item">
        <a href="${adminLink.href}" class="nav-link ${adminLink.extraClass}" data-page="admin">
          <span class="nav-icon">${adminLink.icon}</span>
          <span class="nav-label">${adminLink.label}</span>
          ${adminLink.badge}
        </a>
      </li>`;

    return `
      <a href="${root}module/dashboard/dashboard.html" class="sidebar-logo">
        <div class="logo-icon">Z</div>
        <span class="logo-text">Elite <span>Tutorial</span></span>
      </a>
      <nav class="sidebar-nav" aria-label="Main navigation">
        <ul class="nav-list">
          ${navItems}
          ${adminItem}
        </ul>
      </nav>
      <div class="sidebar-footer">
        <div class="user-mini">
          <div class="user-avatar-sm" id="sidebar-user-avatar">IM</div>
          <div class="user-info-sm">
            <span class="user-name-sm" id="sidebar-user-name">Student</span>
            <span class="user-role-sm">Student</span>
          </div>
        </div>
        <button class="logout-btn" id="sidebar-logout-btn" title="Logout">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span>Logout</span>
        </button>
      </div>`;
  }

  /**
   * Inject the logout confirmation modal into the body.
   */
  function buildLogoutModal() {
    const existing = document.getElementById('sb-logout-modal');
    if (existing) return;

    const modal = document.createElement('div');
    modal.className = 'sb-logout-modal';
    modal.id = 'sb-logout-modal';
    modal.innerHTML = `
      <div class="sb-modal-box">
        <div class="sb-modal-icon">🚪</div>
        <h3 class="sb-modal-title">Leaving so soon?</h3>
        <p class="sb-modal-sub">Are you sure you want to log out of Elite Tutorial?</p>
        <div class="sb-modal-actions">
          <button class="sb-modal-btn cancel" id="sb-modal-cancel">Stay</button>
          <button class="sb-modal-btn confirm" id="sb-modal-confirm">Log Out</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }

  /**
   * Inject the leaderboard auth modal into the body.
   */
  function buildLeaderboardAuthModal() {
    const existing = document.getElementById('sb-lb-auth-modal');
    if (existing) return;

    const modal = document.createElement('div');
    modal.className = 'sb-logout-modal';
    modal.id = 'sb-lb-auth-modal';
    modal.innerHTML = `
      <div class="sb-modal-box" style="text-align: left;">
        <div class="sb-modal-icon" style="text-align: center; font-size: 2.5rem; margin-bottom: 10px;">🏆</div>
        <h3 class="sb-modal-title" style="text-align: center; margin-bottom: 8px;">Admin Access</h3>
        <p class="sb-modal-sub" style="text-align: center; margin-bottom: 24px;">Enter credentials to view the Leaderboard.</p>
        
        <div style="margin-bottom: 16px;">
          <label style="display:block; font-size: 0.8rem; color: #7a7a7a; margin-bottom: 6px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Username</label>
          <input type="text" id="lb-auth-user" placeholder="Username" style="width: 100%; padding: 12px; background: #1a1a1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; color: #fff; font-family: inherit; font-size: 0.95rem; outline: none;" />
        </div>
        
        <div style="margin-bottom: 16px;">
          <label style="display:block; font-size: 0.8rem; color: #7a7a7a; margin-bottom: 6px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Password</label>
          <input type="password" id="lb-auth-pass" placeholder="Password" style="width: 100%; padding: 12px; background: #1a1a1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; color: #fff; font-family: inherit; font-size: 0.95rem; outline: none;" />
        </div>
        
        <p id="lb-auth-error" style="color: #ff7070; font-size: 0.85rem; font-weight: 600; text-align: center; margin-bottom: 16px; min-height: 20px;"></p>
        
        <div class="sb-modal-actions">
          <button class="sb-modal-btn cancel" id="lb-auth-cancel">Cancel</button>
          <button class="sb-modal-btn confirm" id="lb-auth-confirm" style="background: linear-gradient(135deg, #fbbf24, #b45309); color: #000; box-shadow: 0 4px 16px rgba(251,191,36,0.3);">Login</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }

  /**
   * Initialize the shared sidebar.
   * @param {Object} options
   * @param {string} options.activePage  - active page key (see links list above)
   * @param {string} options.rootPath    - path to /public root, e.g. '../../' or '../'
   */
  window.initSharedSidebar = function (options) {
    const { activePage = 'home', rootPath = '../../' } = options || {};

    /* ── 1. Inject sidebar HTML ─────────── */
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) {
      console.warn('[Sidebar] #sidebar element not found.');
      return;
    }
    sidebar.innerHTML = buildSidebar(activePage, rootPath);

    /* ── 2. Inject overlay ──────────────── */
    let overlay = document.getElementById('sidebar-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'sidebar-overlay';
      overlay.id = 'sidebar-overlay';
      document.body.appendChild(overlay);
    }

    /* ── 3. Hamburger toggle ─────────────── */
    const menuToggle = document.getElementById('sidebar-menu-toggle');
    if (menuToggle) {
      menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('visible');
      });
    }

    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('visible');
    });

    /* ── 4. Logout modal ─────────────────── */
    buildLogoutModal();
    buildLeaderboardAuthModal();

    const logoutBtn = document.getElementById('sidebar-logout-btn');
    const logoutModal = document.getElementById('sb-logout-modal');
    const cancelBtn = document.getElementById('sb-modal-cancel');
    const confirmBtn = document.getElementById('sb-modal-confirm');

    if (logoutBtn && logoutModal) {
      logoutBtn.addEventListener('click', () => logoutModal.classList.add('visible'));
    }
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => logoutModal.classList.remove('visible'));
    }
    if (logoutModal) {
      logoutModal.addEventListener('click', e => {
        if (e.target === logoutModal) logoutModal.classList.remove('visible');
      });
    }
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        confirmBtn.textContent = 'Logging out…';
        setTimeout(() => { window.location.href = rootPath + 'index.html'; }, 900);
      });
    }

    /* ── 4.5 Leaderboard Auth Modal logic ── */
    const lbAuthModal = document.getElementById('sb-lb-auth-modal');
    const lbAuthCancel = document.getElementById('lb-auth-cancel');
    const lbAuthConfirm = document.getElementById('lb-auth-confirm');
    const lbAuthError = document.getElementById('lb-auth-error');
    const lbAuthUser = document.getElementById('lb-auth-user');
    const lbAuthPass = document.getElementById('lb-auth-pass');
    let pendingLbHref = '';

    const navLinks = sidebar.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      if (link.getAttribute('data-page') === 'leaderboard') {
        link.addEventListener('click', (e) => {
          if (sessionStorage.getItem('lb_admin_auth') !== '1') {
            e.preventDefault();
            pendingLbHref = link.href;
            if (lbAuthModal) {
              lbAuthModal.classList.add('visible');
              lbAuthUser.value = '';
              lbAuthPass.value = '';
              lbAuthError.textContent = '';
            }
          }
        });
      }
    });

    if (lbAuthCancel) {
      lbAuthCancel.addEventListener('click', () => {
        if (lbAuthModal) lbAuthModal.classList.remove('visible');
      });
    }

    if (lbAuthConfirm) {
      lbAuthConfirm.addEventListener('click', () => {
        const u = lbAuthUser.value.trim();
        const p = lbAuthPass.value;
        if (u === 'imokeyz' && p === 'imokeyz') {
          sessionStorage.setItem('lb_admin_auth', '1');
          if (lbAuthModal) lbAuthModal.classList.remove('visible');
          if (pendingLbHref) window.location.href = pendingLbHref;
        } else {
          if (lbAuthError) lbAuthError.textContent = '❌ Invalid credentials';
          // Shake effect
          const box = lbAuthModal.querySelector('.sb-modal-box');
          if (box) {
            box.style.animation = 'none';
            void box.offsetWidth;
            box.style.animation = 'sbModalIn 0.3s ease both';
          }
        }
      });
    }

    /* ── 5. Populate user info from auth ─── */
    populateSidebarUser();

    /* ── 6. Populate notification badges ─── */
    populateSidebarBadges();
  };

  /* ─── Fill in user name / avatar ──── */
  async function populateSidebarUser() {
    try {
      if (!window.EliteAuth) return;
      const session = await window.EliteAuth.getSession();
      if (!session || !session.user) return;

      const meta = session.user.user_metadata || {};
      const fullName = meta.full_name || meta.name || 'Student';
      const firstName = fullName.split(' ')[0];
      const initials = firstName.substring(0, 2).toUpperCase();

      const nameEl = document.getElementById('sidebar-user-name');
      const avatarEl = document.getElementById('sidebar-user-avatar');
      if (nameEl) nameEl.textContent = firstName;
      if (avatarEl) avatarEl.textContent = initials;
    } catch (e) {
      console.warn('[Sidebar] Could not populate user info:', e);
    }
  }

  /* ─── Fill in exam/puzzle badges ─── */
  async function populateSidebarBadges() {
    try {
      if (!window.getSupabaseClient || !window.EliteAuth) return;
      const client = window.getSupabaseClient();
      const session = await window.EliteAuth.getSession();
      if (!session || !session.user) return;

      const userId = session.user.id;

      const [examQRes, attemptsRes, puzzleCountRes] = await Promise.all([
        client.from('exam_questions').select('exam_batch_id'),
        client.from('user_exam_attempts').select('exam_batch_id').eq('user_id', userId),
        client.from('elite_puzzles').select('id', { count: 'exact', head: true })
      ]);

      /* Exam badge */
      const examBadge = document.getElementById('sidebar-exam-badge');
      if (examBadge && examQRes.data) {
        const allBatches = new Set(examQRes.data.map(q => q.exam_batch_id)).size;
        const takenBatches = new Set((attemptsRes.data || []).map(a => a.exam_batch_id)).size;
        const pending = Math.max(0, allBatches - takenBatches);
        if (pending > 0) {
          examBadge.textContent = pending;
          examBadge.style.display = 'inline-flex';
        } else {
          examBadge.style.display = 'none';
        }
      }

      /* Puzzle badge */
      const puzzleBadge = document.getElementById('sidebar-puzzle-badge');
      if (puzzleBadge && puzzleCountRes.count !== null) {
        const pzTotal = puzzleCountRes.count;
        const playedRaw = localStorage.getItem('elite_puzzle_played');
        const playedIds = playedRaw ? new Set(JSON.parse(playedRaw)) : new Set();
        const newPuzzles = Math.max(0, pzTotal - playedIds.size);
        if (newPuzzles > 0) {
          puzzleBadge.textContent = newPuzzles;
          puzzleBadge.style.display = 'inline-flex';
        } else {
          puzzleBadge.style.display = 'none';
        }
      }
    } catch (e) {
      console.warn('[Sidebar] Could not populate badges:', e);
    }
  }
})();
