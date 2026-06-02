/* ============================================
   ZOE TUTORIAL — DASHBOARD JS
   dashboard.js
============================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ─────────────────────────────────────────
     MENTOR DOPAMINE
  ───────────────────────────────────────── */
  async function initMentorDopamine() {
    const overlay = document.getElementById('mentor-overlay');
    const avatar = document.getElementById('mentor-avatar');
    const textEl = document.getElementById('mentor-text');
    const cursor = document.getElementById('mentor-cursor');

    if (!overlay || !avatar || !textEl) return;

    let count = parseInt(localStorage.getItem('mentor_dashboard_v2_count') || '0', 10);
    count++;
    localStorage.setItem('mentor_dashboard_v2_count', count.toString());

    // Show on first visit or every 5th visit
    if (count === 1 || count % 5 === 0) {
      let quotes = ["Keep pushing forward! Every study session brings you closer to your goals."];
      try {
        const res = await fetch('inspirational_quote.json');
        if (res.ok) quotes = await res.json();
      } catch (e) {
        console.error('Could not load quotes', e);
      }

      const msg = quotes[Math.floor(Math.random() * quotes.length)];

      setTimeout(() => {
        overlay.classList.add('visible');
        avatar.src = "../../assets/imo_images/imo_talking.png";

        let i = 0;
        textEl.textContent = "";
        cursor.style.display = 'inline-block';

        const typeInterval = setInterval(() => {
          textEl.textContent += msg.charAt(i);
          i++;
          if (i >= msg.length) {
            clearInterval(typeInterval);
            avatar.src = "../../assets/imo_images/imo_idle.png";
            cursor.style.display = 'none';

            // Disappear after 3 seconds
            setTimeout(() => {
              overlay.classList.remove('visible');
            }, 3000);
          }
        }, 45);

      }, 800); // Slight delay after load for smoothness
    }
  }

  initMentorDopamine();


  /* ─────────────────────────────────────────
     SIDEBAR & NAVIGATION
  ───────────────────────────────────────── */
  const sidebar = document.getElementById('sidebar');
  const menuToggle = document.getElementById('menu-toggle');
  const sidebarOverlay = document.getElementById('sidebar-overlay');
  const navLinks = document.querySelectorAll('.nav-link');
  const breadcrumb = document.getElementById('breadcrumb-title');

  // Toggle sidebar (mobile)
  menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    sidebarOverlay.classList.toggle('visible');
  });

  sidebarOverlay.addEventListener('click', closeSidebar);

  function closeSidebar() {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('visible');
  }

  /* ─────────────────────────────────────────
     PAGE ROUTING
  ───────────────────────────────────────── */
  const pages = {
    home: { el: document.getElementById('page-home'), title: 'Home' },
    exam: { el: document.getElementById('page-exam'), title: 'Exam for Today' },
    flashcard: { el: document.getElementById('page-flashcard'), title: 'Flash Cards' },
    puzzle: { el: document.getElementById('page-puzzle'), title: 'Elite Puzzle' },
    analytics: { el: document.getElementById('page-analytics'), title: 'Analytics' },
    leaderboard: { el: document.getElementById('page-leaderboard'), title: 'Leaderboard' },
    // admin is now a standalone page, handled via redirect only
  };

  function navigateTo(pageKey) {
    // Hide all pages (skip any undefined elements defensively)
    Object.values(pages).forEach(p => {
      if (p && p.el) p.el.classList.remove('active');
    });

    // Show target
    const target = pages[pageKey];
    if (!target || !target.el) return;
    target.el.classList.add('active');

    // Update breadcrumb
    breadcrumb.textContent = target.title;

    // Update nav active state
    navLinks.forEach(link => {
      link.classList.toggle('active', link.dataset.page === pageKey);
    });

    // Page-specific init
    if (pageKey === 'analytics') initCharts();
    if (pageKey === 'flashcard') initFlashCard();
    if (pageKey === 'leaderboard' && window.initLeaderboard) {
      // Reset initialized flag so listeners re-attach after SPA navigation
      window.initLeaderboard();
    }

    // Close sidebar on mobile
    closeSidebar();

    // Scroll to top
    document.querySelector('.page-content').scrollTop = 0;

    // Persist tab in session storage
    sessionStorage.setItem('active_dashboard_tab', pageKey);
  }

  /* ─────────────────────────────────────────
     LEADERBOARD AUTH POPUP
  ───────────────────────────────────────── */
  (function buildLbAuthModal() {
    if (document.getElementById('lb-auth-popup')) return;
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'lb-auth-popup';
    modal.innerHTML = `
      <div class="modal-box" style="max-width:380px; text-align:left;">
        <div style="text-align:center; font-size:2.5rem; margin-bottom:10px;">🏆</div>
        <h3 class="modal-title" style="text-align:center; margin-bottom:6px;">Admin Access</h3>
        <p class="modal-sub" style="text-align:center; margin-bottom:22px;">Enter credentials to view the Leaderboard.</p>
        <div style="margin-bottom:14px;">
          <label style="display:block;font-size:0.78rem;color:var(--text-muted,#666);margin-bottom:6px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Username</label>
          <input type="text" id="lb-popup-user" placeholder="Username" style="width:100%;padding:12px 14px;background:var(--dark-600,#1e1e1e);border:1px solid rgba(255,255,255,0.08);border-radius:10px;color:#fff;font-family:inherit;font-size:0.95rem;outline:none;" />
        </div>
        <div style="margin-bottom:14px;">
          <label style="display:block;font-size:0.78rem;color:var(--text-muted,#666);margin-bottom:6px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Password</label>
          <input type="password" id="lb-popup-pass" placeholder="Password" style="width:100%;padding:12px 14px;background:var(--dark-600,#1e1e1e);border:1px solid rgba(255,255,255,0.08);border-radius:10px;color:#fff;font-family:inherit;font-size:0.95rem;outline:none;" />
        </div>
        <p id="lb-popup-error" style="color:#ff7070;font-size:0.82rem;font-weight:600;text-align:center;margin-bottom:14px;min-height:18px;"></p>
        <div class="modal-actions">
          <button class="modal-btn cancel" id="lb-popup-cancel">Cancel</button>
          <button class="modal-btn confirm" id="lb-popup-confirm" style="background:linear-gradient(135deg,#fbbf24,#b45309);color:#000;box-shadow:0 4px 16px rgba(251,191,36,0.3);">Login</button>
        </div>
      </div>`;
    document.body.appendChild(modal);

    // Cancel
    document.getElementById('lb-popup-cancel').addEventListener('click', () => {
      modal.classList.remove('visible');
    });
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('visible'); });

    // Confirm
    document.getElementById('lb-popup-confirm').addEventListener('click', () => {
      const u = document.getElementById('lb-popup-user').value.trim();
      const p = document.getElementById('lb-popup-pass').value;
      if (u === 'imokeyz' && p === 'imokeyz') {
        sessionStorage.setItem('lb_admin_auth', '1');
        modal.classList.remove('visible');
        navigateTo('leaderboard');
      } else {
        document.getElementById('lb-popup-error').textContent = '❌ Invalid username or password.';
        const box = modal.querySelector('.modal-box');
        box.style.animation = 'none';
        void box.offsetWidth;
        box.style.animation = 'modalIn 0.35s ease both';
      }
    });
  })();

  function showLbAuthPopup() {
    const modal = document.getElementById('lb-auth-popup');
    if (!modal) return;
    const userIn = document.getElementById('lb-popup-user');
    const passIn = document.getElementById('lb-popup-pass');
    const errEl = document.getElementById('lb-popup-error');
    if (userIn) userIn.value = '';
    if (passIn) passIn.value = '';
    if (errEl) errEl.textContent = '';
    modal.classList.add('visible');
  }

  // Attach nav click events
  navLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const page = link.dataset.page;


      if (page === 'puzzle') {
        const badge = document.getElementById('sidebar-puzzle-badge');
        if (badge) {
          badge.style.display = 'none';
        }
      }

      if (page === 'admin') {
        window.location.href = '../admin/admin.html?v=2';
        return;
      }

      // Leaderboard requires admin auth popup
      if (page === 'leaderboard') {
        if (sessionStorage.getItem('lb_admin_auth') !== '1') {
          showLbAuthPopup();
          return;
        }
      }

      if (page) navigateTo(page);
    });
  });

  // Quick links inside home page → exam
  const startExamLink = document.getElementById('start-exam-link');
  const takeExamCardBtn = document.getElementById('take-exam-card-btn');

  if (startExamLink) startExamLink.addEventListener('click', e => { e.preventDefault(); navigateTo('exam'); });
  if (takeExamCardBtn) takeExamCardBtn.addEventListener('click', e => { e.preventDefault(); navigateTo('exam'); });

  // Begin exam button redirects to actual exam page
  const beginExamBtn = document.getElementById('begin-exam-btn');
  if (beginExamBtn) {
    beginExamBtn.addEventListener('click', () => {
      let url = '../exam_for_today/exam_for_today.html';
      if (window.latestBatchId) url += '?batch=' + encodeURIComponent(window.latestBatchId);
      window.location.href = url;
    });
  }

  // Flash card subject pills
  document.querySelectorAll('.fs-pill').forEach(pill => {
    pill.addEventListener('click', function () {
      document.querySelectorAll('.fs-pill').forEach(p => p.classList.remove('active'));
      this.classList.add('active');
    });
  });

  // Puzzle play buttons (UI only)
  document.querySelectorAll('.puzzle-play-btn:not(.locked-btn)').forEach(btn => {
    btn.addEventListener('click', () => showToast('🧩 Puzzle feature coming soon!', 'info'));
  });

  /* Admin section is now a standalone page at ../admin/admin.html */

  /* ─────────────────────────────────────────
     FLASH CARD LOGIC
  ───────────────────────────────────────── */
  const cards = [
    {
      subject: '📐 Mathematics',
      question: 'What is the quadratic formula?',
      answer: 'x = (−b ± √(b²−4ac)) / 2a',
      explanation: 'Used to find roots of any quadratic equation ax² + bx + c = 0',
    },
    {
      subject: '🔬 Physics',
      question: "State Newton's Second Law of Motion.",
      answer: 'F = ma',
      explanation: 'Force equals mass times acceleration. The net force on an object equals the rate of change of its momentum.',
    },
    {
      subject: '⚗️ Chemistry',
      question: 'What is the chemical formula for water?',
      answer: 'H₂O',
      explanation: 'Two hydrogen atoms bonded to one oxygen atom via covalent bonds.',
    },
    {
      subject: '🧬 Biology',
      question: 'What is the powerhouse of the cell?',
      answer: 'Mitochondria',
      explanation: 'Mitochondria generate most of the cell\'s ATP through cellular respiration.',
    },
    {
      subject: '📖 English',
      question: 'What is a simile?',
      answer: 'A comparison using "like" or "as"',
      explanation: 'Example: "She runs like the wind." Similes draw vivid comparisons between two unlike things.',
    },
  ];

  let currentCard = 0;
  let isFlipped = false;

  function initFlashCard() {
    currentCard = 0;
    isFlipped = false;
    renderCard();
  }

  function renderCard() {
    const card = cards[currentCard];
    const inner = document.getElementById('flashcard-inner');
    if (!inner) return;

    // Reset flip
    isFlipped = false;
    inner.classList.remove('flipped');

    inner.querySelector('.fc-subject-tag:first-child') && (
      inner.querySelector('.flashcard-front .fc-subject-tag').textContent = card.subject
    );
    inner.querySelector('.fc-question').textContent = card.question;
    inner.querySelector('.flashcard-back .fc-subject-tag').textContent = '✅ Answer';
    inner.querySelector('.fc-answer').textContent = card.answer;
    inner.querySelector('.fc-explanation').textContent = card.explanation;
    document.getElementById('fc-counter').textContent = `${currentCard + 1} / ${cards.length}`;
  }

  window.flipCard = function () {
    const inner = document.getElementById('flashcard-inner');
    isFlipped = !isFlipped;
    inner.classList.toggle('flipped', isFlipped);
  };

  const fcPrev = document.getElementById('fc-prev');
  const fcNext = document.getElementById('fc-next');

  if (fcPrev) {
    fcPrev.addEventListener('click', () => {
      if (currentCard > 0) { currentCard--; renderCard(); }
      else showToast('You are at the first card!', 'info');
    });
  }

  if (fcNext) {
    fcNext.addEventListener('click', () => {
      if (currentCard < cards.length - 1) { currentCard++; renderCard(); }
      else showToast('🎉 You\'ve reviewed all cards!', 'success');
    });
  }

  window.rateCard = function (rating) {
    const emoji = rating === 'correct' ? '😊 Great!' : '😕 Keep practicing!';
    showToast(emoji, rating === 'correct' ? 'success' : 'warn');
    // Auto advance after rating
    setTimeout(() => {
      if (currentCard < cards.length - 1) { currentCard++; renderCard(); }
    }, 600);
  };

  /* ─────────────────────────────────────────
     ANALYTICS CHARTS
  ───────────────────────────────────────── */
  const chartData = [
    { day: 'Mon', score: 72 },
    { day: 'Tue', score: 80 },
    { day: 'Wed', score: 65 },
    { day: 'Thu', score: 88 },
    { day: 'Fri', score: 91 },
    { day: 'Sat', score: 78 },
    { day: 'Sun', score: 87 },
  ];

  let chartsInit = false;

  function initCharts() {
    if (chartsInit) return;
    chartsInit = true;

    const barChart = document.getElementById('bar-chart');
    const chartLabels = document.getElementById('chart-labels');
    if (!barChart) return;

    barChart.innerHTML = '';
    chartLabels.innerHTML = '';

    const maxScore = Math.max(...chartData.map(d => d.score));

    chartData.forEach((d, i) => {
      // Bar column
      const col = document.createElement('div');
      col.className = 'bar-col';

      const val = document.createElement('div');
      val.className = 'bar-value';
      val.textContent = d.score + '%';

      const fill = document.createElement('div');
      fill.className = 'bar-fill' + (i === chartData.length - 1 ? ' current' : '');
      fill.style.height = '0%';

      col.appendChild(val);
      col.appendChild(fill);
      barChart.appendChild(col);

      // Animate height after paint
      requestAnimationFrame(() => {
        setTimeout(() => {
          fill.style.height = ((d.score / maxScore) * 100) + '%';
        }, 80 + i * 80);
      });

      // Label
      const label = document.createElement('div');
      label.className = 'chart-label';
      label.textContent = d.day;
      chartLabels.appendChild(label);
    });

    // Animate subject bars (reset then grow)
    document.querySelectorAll('.subj-bar').forEach(bar => {
      const target = bar.style.width;
      bar.style.width = '0%';
      requestAnimationFrame(() => {
        setTimeout(() => { bar.style.width = target; }, 200);
      });
    });
  }

  /* ─────────────────────────────────────────
     LOGOUT MODAL
  ───────────────────────────────────────── */
  const logoutBtn = document.getElementById('logout-btn');
  const logoutModal = document.getElementById('logout-modal');
  const modalCancel = document.getElementById('modal-cancel');
  const modalConfirm = document.getElementById('modal-confirm');

  logoutBtn.addEventListener('click', () => {
    logoutModal.classList.add('visible');
  });

  modalCancel.addEventListener('click', () => {
    logoutModal.classList.remove('visible');
  });

  logoutModal.addEventListener('click', e => {
    if (e.target === logoutModal) logoutModal.classList.remove('visible');
  });

  modalConfirm.addEventListener('click', () => {
    showToast('👋 Logging you out...', 'info');
    setTimeout(() => {
      window.location.href = '../../index.html';
    }, 900);
  });

  /* ─────────────────────────────────────────
     TOAST NOTIFICATIONS
  ───────────────────────────────────────── */
  function showToast(message, type = 'info') {
    // Remove existing toasts
    document.querySelectorAll('.zoe-toast').forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = 'zoe-toast';

    const colors = {
      success: { bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.35)', text: '#34d399' },
      warn: { bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.35)', text: '#fbbf24' },
      info: { bg: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.35)', text: '#93c5fd' },
      error: { bg: 'rgba(224,28,28,0.12)', border: 'rgba(224,28,28,0.35)', text: '#ff7070' },
    };

    const c = colors[type] || colors.info;

    toast.style.cssText = `
      position:fixed;
      bottom:28px;
      right:28px;
      z-index:9999;
      background:${c.bg};
      border:1px solid ${c.border};
      color:${c.text};
      padding:13px 22px;
      border-radius:12px;
      font-family:var(--font, 'Outfit', sans-serif);
      font-size:0.9rem;
      font-weight:600;
      box-shadow:0 8px 32px rgba(0,0,0,0.4);
      backdrop-filter:blur(12px);
      transform:translateY(20px);
      opacity:0;
      transition:transform 0.35s cubic-bezier(0.4,0,0.2,1),opacity 0.35s ease;
      max-width:320px;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.style.transform = 'translateY(0)';
      toast.style.opacity = '1';
    });

    // Auto dismiss
    setTimeout(() => {
      toast.style.transform = 'translateY(20px)';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 400);
    }, 3000);
  }

  /* ─────────────────────────────────────────
     NOTIFICATION BUTTON (UI)
  ───────────────────────────────────────── */
  const notifBtn = document.getElementById('notif-btn');
  if (notifBtn) {
    notifBtn.addEventListener('click', () => {
      showToast('🔔 You have 1 pending exam reminder!', 'warn');
    });
  }

  /* ─────────────────────────────────────────
     INIT: Start on home page (or restore from session)
  ───────────────────────────────────────── */
  let savedTab = sessionStorage.getItem('active_dashboard_tab') || 'home';
  // Don't auto-navigate to leaderboard if not authenticated
  if (savedTab === 'leaderboard' && sessionStorage.getItem('lb_admin_auth') !== '1') {
    savedTab = 'home';
  }
  navigateTo(savedTab);

  /* ─────────────────────────────────────────
     DYNAMIC DASHBOARD DATA
  ───────────────────────────────────────── */
  async function fetchDashboardData() {
    console.log('[Dashboard] fetchDashboardData started');
    try {
      if (!window.EliteAuth || !window.getSupabaseClient) {
        console.error('[Dashboard] EliteAuth or getSupabaseClient missing');
        return;
      }

      const session = await window.EliteAuth.getSession();
      if (!session || !session.user) {
        console.error('[Dashboard] No valid session or user found. Exiting early.');
        return;
      }
      console.log('[Dashboard] Session valid for user:', session.user.email);

      const user = session.user;
      const meta = user.user_metadata || {};
      const fullName = meta.full_name || meta.name || 'Student';
      const firstName = fullName.split(' ')[0];

      // 1. Update Greeting & Avatars
      const greetingEl = document.getElementById('user-greeting-name');
      if (greetingEl) greetingEl.textContent = firstName + '!';

      const sidebarName = document.getElementById('sidebar-user-name');
      if (sidebarName) sidebarName.textContent = firstName;

      const initials = firstName.substring(0, 2).toUpperCase();
      const sidebarAvatar = document.getElementById('sidebar-user-avatar');
      if (sidebarAvatar) sidebarAvatar.textContent = initials;
      const topbarAvatar = document.getElementById('topbar-user-avatar');
      if (topbarAvatar) topbarAvatar.textContent = initials;

      const client = window.getSupabaseClient();
      console.log('[Dashboard] Fetching data concurrently...');

      // Fetch session, attempts, and limited exam metadata in parallel
      const [sessionRes, attemptsRes, examsRes] = await Promise.all([
        window.EliteAuth.getSession(),
        client.from('user_exam_attempts').select('*').eq('user_id', user.id),
        client.from('exam_questions').select('exam_batch_id, exam_title, subject, duration_mins, pass_mark, created_at').order('created_at', { ascending: false })
      ]);

      const attempts = attemptsRes.data;
      const attErr = attemptsRes.error;
      const exams = examsRes.data;
      const examErr = examsRes.error;

      const takenBatches = {};
      let examsDoneToday = 0;
      const totalExamsParticipated = (!attErr && attempts) ? attempts.length : 0;
      if (!attErr && attempts) {
        const todayStr = new Date().toDateString();
        attempts.forEach(att => {
          takenBatches[att.exam_batch_id] = att;
          if (new Date(att.completed_at).toDateString() === todayStr) {
            examsDoneToday++;
          }
        });
      }
      console.log('[Dashboard] Exams participated:', totalExamsParticipated, 'Taken batches:', Object.keys(takenBatches));

      const batchMap = {};
      if (!examErr && exams && exams.length > 0) {
        exams.forEach(q => {
          const bKey = q.exam_batch_id || q.exam_title;
          if (!batchMap[bKey]) {
            batchMap[bKey] = { ...q, questionCount: 0, batchKey: bKey };
          }
          batchMap[bKey].questionCount++;
        });
      }

      const allBatches = Object.values(batchMap);
      const uniqueBatches = allBatches.filter(b => !takenBatches[b.batchKey]);
      const completedBatches = allBatches.filter(b => takenBatches[b.batchKey]);

      uniqueBatches.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      completedBatches.sort((a, b) => new Date(takenBatches[b.batchKey].completed_at) - new Date(takenBatches[a.batchKey].completed_at));

      const pendingCount = uniqueBatches.length;
      console.log('[Dashboard] Pending:', pendingCount, 'Completed:', completedBatches.length);

      // ── Update Sidebar Badge (dynamic, not hardcoded) ──
      const sidebarExamBadge = document.getElementById('sidebar-exam-badge');
      if (sidebarExamBadge) {
        if (pendingCount > 0) {
          sidebarExamBadge.textContent = pendingCount;
          sidebarExamBadge.style.display = 'inline-flex';
        } else {
          sidebarExamBadge.style.display = 'none';
        }
      }

      // ── Update "Exams Done" stat card ──
      const examsParticipatedEl = document.getElementById('stat-exams-participated');
      if (examsParticipatedEl) examsParticipatedEl.textContent = totalExamsParticipated;



      // ── Render all exams in the Exam for Today page ──
      const allExamsList = document.getElementById('all-exams-list');
      const allBatchesCombined = [...uniqueBatches, ...completedBatches];

      if (allExamsList) {
        if (allBatchesCombined.length === 0) {
          allExamsList.innerHTML = `
            <div style="text-align:center; padding:60px 20px; background:rgba(255,255,255,0.4); border-radius:24px; border:1px dashed rgba(0,0,0,0.1);">
              <div style="font-size:3rem; margin-bottom:16px;">🎉</div>
              <h3 style="font-size:1.5rem; color:#111; margin-bottom:8px;">No Exams Yet!</h3>
              <p style="color:#666; font-size:1.1rem;">Check back later — your admin will assign exams soon.</p>
            </div>`;
        } else {
          allExamsList.innerHTML = allBatchesCombined.map(batch => {
            const isDone = !!takenBatches[batch.batchKey];
            const attempt = isDone ? takenBatches[batch.batchKey] : null;
            const scorePct = attempt ? Math.round((attempt.score / attempt.total_q) * 100) : null;

            const statusHtml = isDone
              ? `<span class="card-badge" style="background:rgba(5,150,105,0.15);color:#34d399;">✅ Submitted</span>`
              : `<span class="card-badge due">Due Today</span>`;

            const metaText = isDone
              ? `${batch.questionCount} Questions · Score: ${attempt.score}/${attempt.total_q} (${scorePct}%)`
              : `${batch.questionCount} Questions · ${batch.duration_mins || 60} Minutes · Pending`;

            const btnHtml = isDone
              ? `<button class="btn-begin-exam exam-action-btn" data-batch="${batch.batchKey}" data-done="true"
                   style="background:linear-gradient(135deg,#10b981,#059669);">
                   📖 Review Exam <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                 </button>`
              : `<button class="btn-begin-exam exam-action-btn" data-batch="${batch.batchKey}" data-done="false">
                   Begin Exam <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                 </button>`;

            return `
              <div class="exam-card-full" style="margin:0;">
                <div class="ecf-top">
                  <div class="ecf-subject-badge">📐 ${batch.subject || 'General'}</div>
                  ${statusHtml}
                </div>
                <h3 class="ecf-title">${batch.exam_title}</h3>
                <p class="ecf-desc">${isDone
                ? `You have already submitted this exam. You scored ${attempt.score}/${attempt.total_q} (${scorePct}%). You can review your answers.`
                : `Test your understanding of ${batch.subject || 'the subject'}. Complete all ${batch.questionCount} questions before the deadline.`
              }</p>
                <div class="ecf-meta-row">
                  <div class="ecf-meta-item"><span class="ecf-meta-icon">❓</span><span>${batch.questionCount} Questions</span></div>
                  <div class="ecf-meta-item"><span class="ecf-meta-icon">⏱</span><span>${isDone ? 'Submitted' : (batch.duration_mins || 60) + ' Minutes'}</span></div>
                  <div class="ecf-meta-item"><span class="ecf-meta-icon">📊</span><span>Multiple Choice</span></div>
                  <div class="ecf-meta-item"><span class="ecf-meta-icon">🎯</span><span>${isDone ? `Score: ${attempt.score}/${attempt.total_q}` : `Pass Mark: ${batch.pass_mark || 60}%`}</span></div>
                </div>
                ${btnHtml}
              </div>`;
          }).join('');

          // Attach click handlers
          document.querySelectorAll('.exam-action-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              const bId = btn.dataset.batch;
              let url = '../exam_for_today/exam_for_today.html?batch=' + encodeURIComponent(bId);
              window.location.href = url;
            });
          });
        }
      }

      // ── Update home page upcoming exam card (first pending, or first completed) ──
      const titleEl = document.getElementById('upcoming-exam-title');
      const metaEl = document.getElementById('upcoming-exam-meta');
      const statCardPending = document.getElementById('stat-card-pending');
      const upcomingContainer = document.getElementById('upcoming-exam-container');
      const welcomeSub = document.getElementById('welcome-sub-text');
      const statPendingNum = document.getElementById('stat-pending-num');
      const welcomeCount = document.getElementById('welcome-pending-count');

      if (statPendingNum) statPendingNum.textContent = pendingCount;
      if (welcomeCount) welcomeCount.textContent = pendingCount === 1 ? '1 pending exam' : `${pendingCount} pending exams`;

      if (pendingCount > 0) {
        const latestBatch = uniqueBatches[0];
        window.latestBatchId = latestBatch.batchKey;
        if (statCardPending) statCardPending.style.display = 'flex';
        if (upcomingContainer) upcomingContainer.style.display = 'block';
        if (titleEl) titleEl.textContent = latestBatch.exam_title;
        if (metaEl) metaEl.textContent = `${latestBatch.questionCount} Questions · ${latestBatch.duration_mins || 60} Minutes · Pending`;
      } else if (completedBatches.length > 0) {
        const latestDone = completedBatches[0];
        const attempt = takenBatches[latestDone.batchKey];
        const scorePct = Math.round((attempt.score / attempt.total_q) * 100);
        window.latestBatchId = latestDone.batchKey;
        window.latestBatchCompleted = true;
        if (statCardPending) statCardPending.style.display = 'none';
        if (upcomingContainer) upcomingContainer.style.display = 'block';
        if (titleEl) titleEl.textContent = latestDone.exam_title;
        if (metaEl) metaEl.textContent = `✅ Submitted · Score: ${attempt.score}/${attempt.total_q} (${scorePct}%)`;
        if (welcomeSub) welcomeSub.innerHTML = `You have <span class="highlight-pill" style="background:rgba(5,150,105,0.12);color:#34d399;">0 pending exams</span> today. Great job!`;
        const takeExamCardBtnEl = document.getElementById('take-exam-card-btn');
        if (takeExamCardBtnEl) {
          takeExamCardBtnEl.innerHTML = `📖 Review (${scorePct}%)`;
          takeExamCardBtnEl.style.opacity = '1';
        }
        const examProgressLabel = document.querySelector('.exam-progress-label');
        if (examProgressLabel) examProgressLabel.textContent = `Submitted · ${scorePct}%`;
        const examProgressBar = document.querySelector('.exam-progress-bar');
        if (examProgressBar) examProgressBar.style.width = `${scorePct}%`;
      } else {
        if (statCardPending) statCardPending.style.display = 'none';
        if (upcomingContainer) upcomingContainer.style.display = 'none';
        if (welcomeSub) welcomeSub.innerHTML = `You have <span class="highlight-pill" style="background:rgba(5,150,105,0.12);color:#34d399;">0 pending exams</span> today. Great job!`;
      }

      // 4. Fetch Flash Cards
      const { data: flashcards, error: fcErr } = await client.from('flash_cards').select('subject');
      const fcCount = (!fcErr && flashcards) ? flashcards.length : 0;
      const fcNumEl = document.getElementById('stat-flashcard-num');
      if (fcNumEl) fcNumEl.textContent = fcCount;

      // 4.1 Render Flash Card Decks
      const decksMap = new Map();
      if (!fcErr && flashcards) {
        flashcards.forEach(fc => {
          let meta = {};
          try {
            meta = JSON.parse(fc.subject);
            if (!meta.deck_name) throw new Error('Not JSON format');
          } catch(e) {
            // Fallback for old format
            const sub = fc.subject || 'General';
            meta = { deck_name: sub + ' Deck', course: sub, description: 'General review cards' };
          }
          
          if (!decksMap.has(meta.deck_name)) {
            decksMap.set(meta.deck_name, { ...meta, count: 1 });
          } else {
            decksMap.get(meta.deck_name).count++;
          }
        });
      }

      const uniqueDecks = Array.from(decksMap.values());
      const fcListEl = document.getElementById('all-flashcards-list');
      if (fcListEl) {
        if (uniqueDecks.length === 0) {
          fcListEl.innerHTML = `<div class="empty-state">No flash card decks available yet.</div>`;
        } else {
          fcListEl.innerHTML = uniqueDecks.map(deck => `
            <div class="exam-card-full fc-theme" style="margin:0; padding:0;">
              <div style="padding: 24px;">
                <div class="ecf-top">
                  <div class="ecf-subject-badge">🧬 ${deck.course}</div>
                  <span class="card-badge new-badge" style="background:rgba(56,189,248,0.15);color:#38bdf8;">New Deck</span>
                </div>
                <h3 class="ecf-title">${deck.deck_name}</h3>
                <p class="ecf-desc">${deck.description}</p>
                <div class="ecf-meta-row">
                  <div class="ecf-meta-item"><span class="ecf-meta-icon">📝</span><span>${deck.count} Cards</span></div>
                </div>
              </div>
              <a href="../flash_card/flash_card.html?deck=${encodeURIComponent(deck.deck_name)}" class="btn-begin-exam" style="display: block; width: calc(100% - 48px); margin: 0 24px 24px; text-decoration: none; text-align: center;">
                Study Now <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </a>
            </div>
          `).join('');
        }
      }

      // 4.5 Fetch Elite Puzzles Count and Rows (responsive badge & list)
      const [puzzlesRes, pzAttemptsRes] = await Promise.all([
        client.from('elite_puzzles').select('*').order('created_at', { ascending: false }),
        client.from('puzzle_attempts').select('puzzle_id, score').eq('user_id', user.id)
      ]);

      const allPuzzles = puzzlesRes.data || [];
      const pzAttempts = pzAttemptsRes.data || [];

      const completedPuzzlesMap = {};
      pzAttempts.forEach(a => {
        completedPuzzlesMap[a.puzzle_id] = a;
      });

      const pzTotal = allPuzzles.length;
      const newPuzzles = allPuzzles.filter(p => !completedPuzzlesMap[p.id]).length;

      window.elitePuzzlesCount = pzTotal;
      const puzzleBadge = document.getElementById('sidebar-puzzle-badge');
      if (puzzleBadge) {
        if (newPuzzles > 0) {
          puzzleBadge.textContent = newPuzzles;
          puzzleBadge.style.display = 'inline-flex';
        } else {
          puzzleBadge.style.display = 'none';
        }
      }

      // ── Render all puzzles in the Elite Puzzle page ──
      const allPuzzlesList = document.getElementById('all-puzzles-list');
      if (allPuzzlesList) {
        if (allPuzzles.length === 0) {
          allPuzzlesList.innerHTML = `
            <div style="text-align:center; padding:60px 20px; background:rgba(255,255,255,0.4); border-radius:24px; border:1px dashed rgba(0,0,0,0.1);">
              <div style="font-size:3rem; margin-bottom:16px;">🧩</div>
              <h3 style="font-size:1.5rem; color:#111; margin-bottom:8px;">No Puzzles Yet!</h3>
              <p style="color:#666; font-size:1.1rem;">Check back later — your admin will assign puzzles soon.</p>
            </div>`;
        } else {
          allPuzzlesList.innerHTML = allPuzzles.map(p => {
            const isDone = !!completedPuzzlesMap[p.id];
            const attempt = completedPuzzlesMap[p.id];

            const emojis = ['🔢', '⚗️', '🧬', '🔭', '📐', '🎯', '🧠', '🔬'];
            const emoji = emojis[Math.abs(String(p.id).split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % emojis.length];
            const roundsCount = p.rounds ? p.rounds.length : 0;

            const statusHtml = isDone
              ? `<span class="card-badge" style="background:rgba(5,150,105,0.15);color:#34d399;">✅ Completed</span>`
              : `<span class="card-badge new-badge" style="background:rgba(124,58,237,0.15);color:#9d6aff;">New Challenge</span>`;

            const btnHtml = isDone
              ? `<button class="btn-begin-exam puzzle-action-btn" data-puzzle="${p.id}"
                   style="background:linear-gradient(135deg,#10b981,#059669);">
                   📖 Review Results <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                 </button>`
              : `<button class="btn-begin-exam puzzle-action-btn" data-puzzle="${p.id}"
                   style="background:linear-gradient(135deg,#7c3aed,#5b21b6);">
                   Play Now <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                 </button>`;

            return `
              <div class="exam-card-full" style="margin:0;">
                <div class="ecf-top">
                  <div class="ecf-subject-badge">${emoji} ${p.level_label || 'Puzzle'}</div>
                  ${statusHtml}
                </div>
                <h3 class="ecf-title">${p.title || 'Untitled Puzzle'}</h3>
                <p class="ecf-desc">${isDone
                ? `You have completed this puzzle. You scored ${attempt.score} points.`
                : `Test your skills. Catch the correct balls to score points in ${roundsCount} rounds!`
              }</p>
                <div class="ecf-meta-row">
                  <div class="ecf-meta-item"><span class="ecf-meta-icon">❓</span><span>${roundsCount} Rounds</span></div>
                  <div class="ecf-meta-item"><span class="ecf-meta-icon">⏱</span><span>${p.time_limit || 3} Minutes</span></div>
                  <div class="ecf-meta-item"><span class="ecf-meta-icon">🏷️</span><span>${p.course_code || 'General'}</span></div>
                  <div class="ecf-meta-item"><span class="ecf-meta-icon">🎯</span><span>${isDone ? `Score: ${attempt.score}` : 'Catch balls'}</span></div>
                </div>
                ${btnHtml}
              </div>`;
          }).join('');

          // Attach click handlers
          document.querySelectorAll('.puzzle-action-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              const pId = btn.dataset.puzzle;
              window.location.href = '../elite_puzzle/elite_puzzle.html?puzzle=' + encodeURIComponent(pId);
            });
          });
        }
      }

      // 5. Fetch User Stats (Fully dynamic, no hardcoded values)
      const { data: stats, error: statsErr } = await client
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      const avgScoreEl = document.getElementById('stat-avg-score');
      const hoursEl = document.getElementById('stat-study-hours');
      if (!statsErr && stats) {
        if (avgScoreEl) avgScoreEl.textContent = (stats.average_score || 0) + '%';
        if (hoursEl) hoursEl.textContent = (stats.study_hours || 0);
      } else {
        if (avgScoreEl) avgScoreEl.textContent = '0%';
        if (hoursEl) hoursEl.textContent = '0';
      }

      // 5. Fetch Recent Activity
      const { data: activities, error: actErr } = await client
        .from('user_activity')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(4);

      const actList = document.getElementById('recent-activity-list');
      if (actList) {
        if (!actErr && activities && activities.length > 0) {
          actList.innerHTML = activities.map(act => {
            let icon = '✔'; let color = '#34d399'; let bg = 'rgba(5,150,105,0.12)';
            if (act.type === 'flashcard') { icon = '🃏'; color = '#9d6aff'; bg = 'rgba(124,58,237,0.12)'; }
            if (act.type === 'puzzle') { icon = '🧩'; color = '#ff7070'; bg = 'rgba(224,28,28,0.12)'; }
            return `
              <li class="activity-item">
                <div class="act-icon" style="background:${bg};color:${color};">${icon}</div>
                <div class="act-text">
                  <span class="act-title">${act.title}</span>
                  <span class="act-time">Recently</span>
                </div>
                <span class="act-score ${act.is_good ? 'good' : ''}">${act.score || ''}</span>
              </li>
            `;
          }).join('');
        } else {
          actList.innerHTML = `<li style="text-align:center; padding: 20px; color: #888;">No recent activity yet. Go study!</li>`;
        }
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  }

  fetchDashboardData();

  /* ─────────────────────────────────────────
     IMO ASSISTANT WELCOME
  ───────────────────────────────────────── */
  async function initImoAssistant() {
    try {
      if (sessionStorage.getItem('tutor_assistant_shown_v2') === 'true') {
        console.log("[IMO Assistant] Already shown this session. Skipping.");
        return; // Already shown this session
      }
      sessionStorage.setItem('tutor_assistant_shown_v2', 'true');
    } catch (e) {
      console.warn("sessionStorage not available", e);
    }

    console.log("[IMO Assistant] Initializing chat bubble...");

    const container = document.createElement('div');
    container.id = 'imo-assistant-container';

    const style = document.createElement('style');
    style.textContent = `
      #imo-assistant-container {
        position: fixed;
        top: 20px;
        right: -400px;
        z-index: 10000;
        display: flex;
        align-items: flex-start;
        gap: 16px;
        transition: right 0.7s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.5s ease, transform 0.5s ease;
        opacity: 0;
      }
      #imo-assistant-container.slide-in {
        right: 30px;
        opacity: 1;
      }
      #imo-assistant-container.fade-out {
        opacity: 0;
        transform: translateY(-20px) scale(0.95);
        pointer-events: none;
      }
      .imo-avatar {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2), 0 0 0 2px rgba(255, 255, 255, 0.8);
        overflow: hidden;
        background: linear-gradient(135deg, #1f0505 0%, #4a0000 100%);
        position: relative;
        flex-shrink: 0;
        z-index: 2;
        animation: floatAvatar 3.5s ease-in-out infinite;
      }
      @keyframes floatAvatar {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-6px); }
      }
      .imo-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center top;
        transition: opacity 0.3s ease;
      }
      .imo-bubble {
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(24px) saturate(150%);
        -webkit-backdrop-filter: blur(24px) saturate(150%);
        border: 1px solid rgba(0, 0, 0, 0.08);
        border-radius: 24px 4px 24px 24px;
        padding: 20px 24px;
        max-width: 320px;
        box-shadow: 0 16px 40px rgba(0,0,0,0.12), inset 0 0 0 1px rgba(255,255,255,0.5);
        position: relative;
        transform-origin: top right;
        transform: scale(0.8) translateY(-20px);
        opacity: 0;
        transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.6s ease;
        z-index: 1;
      }
      #imo-assistant-container.slide-in .imo-bubble {
        transform: scale(1) translateY(0);
        opacity: 1;
        transition-delay: 0.35s;
      }
      /* The tiny triangle pointing to the avatar */
      .imo-bubble::after {
        content: '';
        position: absolute;
        top: 24px;
        right: -7px;
        width: 14px;
        height: 14px;
        background: rgba(255, 255, 255, 0.95);
        border-right: 1px solid rgba(0, 0, 0, 0.08);
        border-top: 1px solid rgba(0, 0, 0, 0.08);
        transform: rotate(45deg);
        backdrop-filter: blur(24px);
      }
      .imo-bubble-text {
        font-family: 'Outfit', sans-serif;
        font-size: 0.98rem;
        line-height: 1.6;
        color: #333;
        font-weight: 500;
        margin: 0;
      }
      .imo-bubble-text strong {
        color: #000;
        font-weight: 800;
      }
      .type-cursor {
        display: inline-block;
        width: 6px;
        height: 18px;
        background: var(--red-bright, #ff2d2d);
        vertical-align: middle;
        margin-left: 6px;
        border-radius: 4px;
        animation: blink 0.8s step-end infinite;
      }
      @keyframes blink { 50% { opacity: 0; } }
      
      @media (max-width: 768px) {
        #imo-assistant-container {
          top: 16px;
          right: -100%;
          width: calc(100% - 32px);
          gap: 12px;
        }
        #imo-assistant-container.slide-in {
          right: 16px;
        }
        .imo-avatar {
          width: 64px; height: 64px;
        }
        .imo-bubble {
          max-width: none;
          flex: 1;
          padding: 16px 20px;
        }
        .imo-bubble::after {
          top: 20px;
        }
        .imo-bubble-text {
          font-size: 0.9rem;
        }
      }
    `;
    document.head.appendChild(style);

    const avatar = document.createElement('div');
    avatar.className = 'imo-avatar';
    const img = document.createElement('img');
    img.src = '../../assets/imo_images/imo_talking.png';
    avatar.appendChild(img);

    const bubble = document.createElement('div');
    bubble.className = 'imo-bubble';
    const textSpan = document.createElement('span');
    textSpan.className = 'imo-bubble-text';
    const cursor = document.createElement('span');
    cursor.className = 'type-cursor';

    bubble.appendChild(textSpan);
    bubble.appendChild(cursor);

    container.appendChild(bubble);
    container.appendChild(avatar);
    document.body.appendChild(container);

    let quotes = ["Keep pushing forward! Every study session brings you closer to your goals."];
    try {
      const res = await fetch('inspirational_quote.json');
      if (res.ok) quotes = await res.json();
    } catch (e) {
      console.error('Could not load quotes', e);
    }
    const fullText = quotes[Math.floor(Math.random() * quotes.length)];

    // 1. Slide in
    setTimeout(() => {
      console.log("[IMO Assistant] Sliding in...");
      container.classList.add('slide-in');
    }, 400);

    // 2. Typing effect
    let charIndex = 0;
    setTimeout(() => {
      const typeInterval = setInterval(() => {
        textSpan.textContent += fullText[charIndex];
        charIndex++;

        if (charIndex >= fullText.length) {
          clearInterval(typeInterval);

          // 3. Switch to idle image
          setTimeout(() => {
            img.style.opacity = 0;
            setTimeout(() => {
              img.src = '../../assets/imo_images/imo_idle.png';
              img.style.opacity = 1;
              cursor.style.display = 'none';

              // 4. Wait 3 seconds then fade out
              setTimeout(() => {
                container.classList.add('fade-out');
                setTimeout(() => container.remove(), 700); // cleanup
              }, 3000);

            }, 200); // crossfade time
          }, 600); // wait a bit after typing finishes
        }
      }, 40); // typing speed
    }, 1100);
  }

  // Fetch dynamic data from Supabase
  fetchDashboardData();

  initImoAssistant();

});
