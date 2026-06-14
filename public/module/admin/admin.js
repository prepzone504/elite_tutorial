/* ============================================
   ELITE TUTORIAL — ADMIN PANEL JS
   admin.js
============================================ */

document.addEventListener('DOMContentLoaded', () => {

  const loginOverlayEarly = document.getElementById('login-overlay');
  const adminWrapperEarly = document.getElementById('admin-wrapper');
  // Auto-login removed: Always require password when entering admin panel

  /* ─────────────────────────────────────────
     LOGIN GATE
  ───────────────────────────────────────── */
  const ADMIN_USER = 'imokeyz';
  const ADMIN_PASS = 'imokeyz';

  const loginOverlay = document.getElementById('login-overlay');
  const adminWrapper  = document.getElementById('admin-wrapper');
  const loginForm     = document.getElementById('admin-login-form');
  const loginError    = document.getElementById('login-error');
  const loginCard     = document.getElementById('login-card');
  const togglePwBtn   = document.getElementById('toggle-pw');
  const pwInput       = document.getElementById('admin-password');

  // Toggle password visibility
  if (togglePwBtn && pwInput) {
    togglePwBtn.addEventListener('click', () => {
      const isPassword = pwInput.type === 'password';
      pwInput.type = isPassword ? 'text' : 'password';
      togglePwBtn.textContent = isPassword ? '🙈' : '👁️';
    });
  }

  // Handle login form submit
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const username = document.getElementById('admin-username').value.trim();
      const password = document.getElementById('admin-password').value;

      if (username === ADMIN_USER && password === ADMIN_PASS) {
        // Success — hide login, show admin panel
        sessionStorage.setItem('elite_admin_auth', '1');
        loginOverlay.classList.remove('active');
        adminWrapper.classList.add('active');
        loginError.textContent = '';
        showToast('✅ Welcome, Admin!', 'success');
      } else {
        // Failed — shake and show error
        loginError.textContent = '❌ Invalid username or password.';
        loginCard.classList.add('shake');
        setTimeout(() => loginCard.classList.remove('shake'), 600);
      }
    });
  }

  // Logout button
  const logoutBtn = document.getElementById('admin-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem('elite_admin_auth');
      adminWrapper.classList.remove('active');
      loginOverlay.classList.add('active');
      // Clear fields
      document.getElementById('admin-username').value = '';
      document.getElementById('admin-password').value = '';
      loginError.textContent = '';
    });
  }

  /* ─────────────────────────────────────────
     ADMIN SUB-TABS
  ───────────────────────────────────────── */
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', function () {
      // Deactivate all tabs and panels
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.admin-tab-panel').forEach(p => p.classList.remove('active'));

      // Activate clicked tab and its panel
      this.classList.add('active');
      const targetPanel = document.getElementById(this.dataset.tab);
      if (targetPanel) targetPanel.classList.add('active');
    });
  });

  /* ─────────────────────────────────────────
     ADMIN SETTINGS INTERACTIONS
  ───────────────────────────────────────── */

  // Maintenance toggle label
  const maintenanceToggle = document.getElementById('setting-maintenance');
  if (maintenanceToggle) {
    maintenanceToggle.addEventListener('change', function () {
      const label = this.closest('.admin-toggle').querySelector('.toggle-label');
      label.textContent = this.checked ? 'On' : 'Off';
    });
  }

  // Save settings button
  const btnSaveSettings = document.getElementById('btn-save-settings');
  if (btnSaveSettings) {
    btnSaveSettings.addEventListener('click', () => {
      showToast('💾 Settings saved successfully!', 'success');
    });
  }

  // Add question button
  const btnAddQuestion = document.getElementById('btn-add-question');
  if (btnAddQuestion) {
    btnAddQuestion.addEventListener('click', () => {
      showToast('➕ Add Question form coming soon!', 'info');
    });
  }

  // Add user button
  const btnAddUser = document.getElementById('btn-add-user');
  if (btnAddUser) {
    btnAddUser.addEventListener('click', () => {
      showToast('➕ Add User form coming soon!', 'info');
    });
  }

  /* ─────────────────────────────────────────
     TOAST HELPER
  ───────────────────────────────────────── */
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'toastOut 0.4s ease forwards';
      setTimeout(() => toast.remove(), 400);
    }, 3000);
  }

  /* ─────────────────────────────────────────
     DYNAMIC ADMIN DATA (Stats & Submissions)
  ───────────────────────────────────────── */
  const userDetailModal = document.getElementById('user-detail-modal');
  if (userDetailModal) {
      userDetailModal.style.display = 'none'; // hidden by default
      const closeBtn = document.getElementById('ud-close-btn');
      if (closeBtn) {
          closeBtn.addEventListener('click', () => {
              userDetailModal.style.display = 'none';
          });
      }
      userDetailModal.addEventListener('click', (e) => {
          if (e.target === userDetailModal) userDetailModal.style.display = 'none';
      });
  }

  async function fetchAdminData() {
      if (!window.getSupabaseClient) return;
      const client = window.getSupabaseClient();
      
      try {
          // 1. Fetch Flashcards count
          const { data: fCards, error: fcErr } = await client.from('flash_cards').select('id');
          if (fcErr) console.error('Flashcard RLS Error:', fcErr);
          if (fCards) document.getElementById('stat-flashcards').textContent = fCards.length;

          // 2. Fetch User Stats (Total Students)
          const { data: uStats, error: usErr } = await client.from('user_stats').select('user_id');
          if (usErr) console.error('User Stats RLS Error:', usErr);
          if (uStats) document.getElementById('stat-total-students').textContent = uStats.length;

          // 3. Fetch Exam Questions (Total Questions & Active Exams)
          const { data: eQuestions, error: eqErr } = await client.from('exam_questions').select('exam_batch_id');
          if (eqErr) console.error('Exam Qs RLS Error:', eqErr);
          if (eQuestions) {
              document.getElementById('stat-total-questions').textContent = eQuestions.length;
              const uniqueBatches = new Set(eQuestions.map(q => q.exam_batch_id));
              document.getElementById('stat-active-exams').textContent = uniqueBatches.size;
          }

          // 4. Fetch Recent Submissions (Exams & Puzzles)
          const { data: examAttempts, error: attErr } = await client
              .from('user_exam_attempts')
              .select('*')
              .order('completed_at', { ascending: false });
              
          if (attErr) {
              console.error('Attempts RLS Error:', attErr);
              showToast('❌ Database Error: RLS Policies blocking admin.', 'error');
          }

          const { data: puzzleAttempts, error: puzzErr } = await client
              .from('puzzle_attempts')
              .select('*')
              .order('completed_at', { ascending: false });

          if (puzzErr) {
              console.error('Puzzle Attempts Error:', puzzErr);
          }

          // 5. Fetch Elite Puzzles for titles
          const { data: puzzles, error: pErr } = await client
              .from('elite_puzzles')
              .select('id, title');
              
          const puzzleTitleMap = {};
          if (puzzles) {
              puzzles.forEach(p => {
                  puzzleTitleMap[String(p.id)] = p.title;
              });
          }

          // Merge and sort
          let attempts = [];
          if (examAttempts) {
              attempts = attempts.concat(examAttempts.map(a => ({...a, type: 'exam'})));
          }
          if (puzzleAttempts) {
              attempts = attempts.concat(puzzleAttempts.map(a => ({...a, type: 'puzzle'})));
          }
          
          attempts.sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));

          const subList = document.getElementById('admin-submissions-list');
          if (subList && attempts) {
              if (attempts.length === 0) {
                  subList.innerHTML = '<tr><td colspan="5" style="text-align:center;">No submissions yet.</td></tr>';
              } else {
                  subList.innerHTML = attempts.map(att => {
                      // Calculate percentage depending on type
                      let pct = 0;
                      let isPass = false;
                      let scoreClass = 'poor';
                      let subjectName = '';
                      
                      if (att.type === 'exam') {
                          pct = Math.round((att.score / att.total_q) * 100);
                          isPass = pct >= 60;
                          scoreClass = pct >= 80 ? 'good' : (pct >= 50 ? 'mid' : 'poor');
                          subjectName = att.subject || att.exam_title || 'Unknown Exam';
                      } else {
                          // Puzzle score
                          pct = att.score; // puzzles use raw score or points
                          isPass = att.score > 0;
                          scoreClass = att.score >= 50 ? 'good' : (att.score >= 20 ? 'mid' : 'poor');
                          const pTitle = puzzleTitleMap[String(att.puzzle_id)] || 'Unknown Puzzle';
                          subjectName = `Elite Puzzle: ${pTitle}`;
                      }
                      
                      const badgeClass = isPass ? 'pass' : 'fail';
                      const badgeText = isPass ? 'Passed' : 'Failed';
                      const scoreText = att.type === 'exam' ? `${pct}%` : `${pct} pts`;
                      
                      // Format time nicely
                      const dateObj = new Date(att.completed_at);
                      const timeStr = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

                      return `
                          <tr class="submission-row" data-userid="${att.user_id}" data-username="${att.student_name || 'Unknown Student'}" style="cursor: pointer;">
                              <td data-label="Student" style="color: #3b82f6; font-weight: 500;">${att.student_name || 'Unknown Student'}</td>
                              <td data-label="Exam / Module">${subjectName}</td>
                              <td data-label="Score" class="tbl-score ${scoreClass}">${scoreText}</td>
                              <td data-label="Time" class="tbl-time">${timeStr}</td>
                              <td data-label="Status"><span class="tbl-badge ${badgeClass}">${badgeText}</span></td>
                          </tr>
                      `;
                  }).join('');

                  // Add click listeners to rows to open User Detail Modal
                  document.querySelectorAll('.submission-row').forEach(row => {
                      row.addEventListener('click', () => {
                          const uid = row.dataset.userid;
                          const uname = row.dataset.username;
                          openUserDetailModal(uid, uname, attempts, puzzleTitleMap);
                      });
                  });
              }
          }
      } catch(e) {
          console.error('Error fetching admin data:', e);
      }
  }

  function openUserDetailModal(userId, userName, allAttempts, puzzleTitleMap = {}) {
      if (!userDetailModal) return;

      document.getElementById('ud-student-name').textContent = userName + "'s Details";

      // Filter attempts for this user
      const userAttempts = allAttempts.filter(a => a.user_id === userId);
      
      document.getElementById('ud-exams-taken').textContent = userAttempts.length;
      
      let totalPct = 0;
      userAttempts.forEach(a => {
          totalPct += Math.round((a.score / a.total_q) * 100);
      });
      const avgPct = userAttempts.length > 0 ? Math.round(totalPct / userAttempts.length) : 0;
      document.getElementById('ud-avg-score').textContent = avgPct + '%';

      const historyList = document.getElementById('ud-history-list');
      if (userAttempts.length === 0) {
          historyList.innerHTML = '<tr><td colspan="5" style="text-align:center;">No history found.</td></tr>';
      } else {
          historyList.innerHTML = userAttempts.map(att => {
              let pct = 0;
              let isPass = false;
              let subjectName = '';
              let scoreDisplay = '';
              let btnHtml = '';
              
              if (att.type === 'exam') {
                  pct = Math.round((att.score / att.total_q) * 100);
                  isPass = pct >= 60;
                  subjectName = att.subject || att.exam_title || 'Unknown Exam';
                  scoreDisplay = `${pct}% (${att.score}/${att.total_q})`;
                  btnHtml = `
                      <button class="review-btn"
                          data-type="exam"
                          data-batch="${att.exam_batch_id}"
                          data-userid="${userId}"
                          style="background:#3b82f6;color:white;border:none;padding:5px 12px;border-radius:4px;font-size:13px;cursor:pointer;">
                          Review Exam
                      </button>`;
              } else {
                  pct = att.score;
                  isPass = att.score > 0;
                  const pTitle = puzzleTitleMap[String(att.puzzle_id)] || 'Unknown Puzzle';
                  subjectName = `Elite Puzzle: ${pTitle}`;
                  scoreDisplay = `${pct} pts`;
                  btnHtml = `
                      <button class="review-btn"
                          data-type="puzzle"
                          style="background:#10b981;color:white;border:none;padding:5px 12px;border-radius:4px;font-size:13px;cursor:pointer;">
                          View Leaderboard
                      </button>`;
              }

              const badgeClass = isPass ? 'pass' : 'fail';
              const badgeText = isPass ? 'Passed' : 'Failed';
              const dateObj = new Date(att.completed_at);
              const timeStr = dateObj.toLocaleDateString();

              return `
                  <tr>
                      <td data-label="Exam Title">${subjectName}</td>
                      <td data-label="Score">${scoreDisplay}</td>
                      <td data-label="Date">${timeStr}</td>
                      <td data-label="Status"><span class="tbl-badge ${badgeClass}">${badgeText}</span></td>
                      <td data-label="Action">
                          ${btnHtml}
                      </td>
                  </tr>
              `;
          }).join('');

          // Attach click handlers AFTER setting innerHTML to avoid & HTML-entity corruption
          historyList.querySelectorAll('.review-btn').forEach(btn => {
              btn.addEventListener('click', () => {
                  if (btn.dataset.type === 'exam') {
                      const url = new URL('../exam_for_today/exam_for_today.html', window.location.href);
                      url.searchParams.set('batch', btn.dataset.batch);
                      url.searchParams.set('userId', btn.dataset.userid);
                      url.searchParams.set('admin', 'true');
                      window.location.href = url.toString();
                  } else if (btn.dataset.type === 'puzzle') {
                      window.location.href = '../dashboard/dashboard.html#leaderboard';
                  }
              });
          });
      }

      userDetailModal.style.display = 'flex';
  }

  // Trigger fetch if already logged in or after successful login
  if (sessionStorage.getItem('elite_admin_auth') === '1') {
      fetchAdminData();
  }
  
  // Wrap the existing login success logic to fetch data
  if (loginForm) {
      // Re-attach or override the submit event listener is tricky if we don't rewrite it.
      // Easiest is to add a hook. I'll just attach an extra listener that runs if it was successful.
      loginForm.addEventListener('submit', () => {
          setTimeout(() => {
              if (sessionStorage.getItem('elite_admin_auth') === '1') {
                  fetchAdminData();
              }
          }, 100);
      });
  }

});
