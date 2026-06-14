/* ============================================
   Elite TUTORIAL — LEADERBOARD JS
   leaderboard.js
============================================ */

(function () {

    // ── STATE ──
    let currentUser = null;
    let currentTab = 'exam';
    let currentPuzzle = '';
    let allPuzzles = [];

    /**
     * puzzleIdTitleMap: { String(puzzle_id) → title }
     *   Solves the problem where puzzle_id may be stored as integer or UUID
     *   but compared as a string. All IDs are coerced to String() for safe comparison.
     */
    let puzzleIdTitleMap = {};

    let leaderboardData = [];
    let realtimeChannel = null;
    let initialized = false;

    // ── AUTH LOGIC ──
    function setupAuth() {
        const loginOverlay = document.getElementById('login-overlay');
        const mainWrapper = document.getElementById('lb-main-wrapper');
        const loginForm = document.getElementById('admin-login-form');
        const togglePwBtn = document.getElementById('toggle-pw');
        const pwInput = document.getElementById('admin-password');
        const loginError = document.getElementById('login-error');
        const loginCard = document.getElementById('login-card');

        if (togglePwBtn && pwInput) {
            togglePwBtn.addEventListener('click', () => {
                const isPassword = pwInput.type === 'password';
                pwInput.type = isPassword ? 'text' : 'password';
                togglePwBtn.textContent = isPassword ? '🙈' : '👁️';
            });
        }

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const user = document.getElementById('admin-username').value.trim();
                const pass = document.getElementById('admin-password').value;
                
                if (user === 'imokeyz' && pass === 'imokeyz') {
                    sessionStorage.setItem('lb_admin_auth', '1');
                    if (loginOverlay) loginOverlay.classList.remove('active');
                    if (mainWrapper) mainWrapper.style.display = 'flex';
                    if (!initialized) initLeaderboardCore();
                } else {
                    if (loginError) loginError.textContent = '❌ Invalid username or password.';
                    if (loginCard) {
                        loginCard.classList.add('shake');
                        setTimeout(() => loginCard.classList.remove('shake'), 600);
                    }
                }
            });
        }
    }

    // ── INIT ──
    async function initLeaderboard() {
        setupAuth();
        
        const loginOverlay = document.getElementById('login-overlay');
        const mainWrapper = document.getElementById('lb-main-wrapper');
        
        if (sessionStorage.getItem('lb_admin_auth') === '1') {
            if (loginOverlay) loginOverlay.classList.remove('active');
            if (mainWrapper) mainWrapper.style.display = 'flex';
            initLeaderboardCore();
        } else {
            if (loginOverlay) loginOverlay.classList.add('active');
            if (mainWrapper) mainWrapper.style.display = 'none';
        }
    }

    async function initLeaderboardCore() {
        const tabs = document.querySelectorAll('#page-leaderboard .lb-tab');
        // Wire up tab navigation
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.getAttribute('data-tab');
                if (target === 'exam') {
                    window.location.href = 'leaderboard.html';
                }
            });
        });

        const puzzleSelectWrapper = document.getElementById('puzzle-select-wrapper');
        const puzzleSelect = document.getElementById('lb-puzzle-select');
        const podium1 = document.getElementById('podium-1');
        const podium2 = document.getElementById('podium-2');
        const podium3 = document.getElementById('podium-3');
        const lbList = document.getElementById('lb-list');
        const stickyBar = document.getElementById('user-sticky-bar');
        const usbRank = document.getElementById('usb-rank');
        const usbAvatar = document.getElementById('usb-avatar');
        const usbName = document.getElementById('usb-name');
        const usbScore = document.getElementById('usb-score');

        if (!lbList) return;
        if (!window.getSupabaseClient) {
            console.error('[Leaderboard] Supabase client missing!');
            return;
        }

        // ── AUTH ──
        try {
            if (window.EliteAuth && window.EliteAuth.getSession) {
                const session = await window.EliteAuth.getSession();
                if (session && session.user) {
                    currentUser = session.user;
                    const meta = currentUser.user_metadata || {};
                    const fullName = meta.full_name || meta.name || 'Student';
                    const initText = fullName.substring(0, 2).toUpperCase();
                    if (usbAvatar) usbAvatar.textContent = initText;
                    if (usbName) usbName.textContent = 'You';
                }
            }
        } catch (e) {
            console.warn('[Leaderboard] Auth error:', e);
        }

        // ── FETCH PUZZLES ──
        await fetchPuzzles(puzzleSelect);

        currentTab = 'puzzle';
        if (puzzleSelectWrapper) puzzleSelectWrapper.style.display = 'block';

        await loadLeaderboard(podium1, podium2, podium3, lbList, stickyBar, usbRank, usbScore);

        if (!initialized) {
            initialized = true;

            if (puzzleSelect) {
                puzzleSelect.addEventListener('change', (e) => {
                    // Always coerce to String for type-safe comparison
                    currentPuzzle = String(e.target.value);
                    loadLeaderboard(podium1, podium2, podium3, lbList, stickyBar, usbRank, usbScore);
                });
            }

            setupRealtime(podium1, podium2, podium3, lbList, stickyBar, usbRank, usbScore);
        }
    }



    // ── FETCH PUZZLES (ELITE PUZZLE) ──
    // Advanced algorithm: builds puzzleIdTitleMap with String-coerced keys
    // so puzzle_id matches regardless of whether stored as int or string
    async function fetchPuzzles(puzzleSelect) {
        if (!puzzleSelect) return;
        const client = window.getSupabaseClient();

        const { data, error } = await client
            .from('elite_puzzles')
            .select('id, title, created_at')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[Leaderboard] Failed to fetch puzzles', error);
            return;
        }

        if (data) {
            allPuzzles = data;
            puzzleIdTitleMap = {};

            puzzleSelect.innerHTML = '';
            data.forEach(p => {
                // Coerce to String for safe cross-type comparison
                const pid = String(p.id);
                puzzleIdTitleMap[pid] = p.title;

                const opt = document.createElement('option');
                opt.value = pid;
                opt.textContent = p.title;
                puzzleSelect.appendChild(opt);
            });

            // Default: most recently created puzzle
            if (data.length > 0) {
                const firstId = String(data[0].id);
                puzzleSelect.value = firstId;
                currentPuzzle = firstId;
            }
        }
    }

    // ── LOAD LEADERBOARD ──
    // Strict tab isolation: exam tab only reads user_exam_attempts,
    // puzzle tab only reads puzzle_attempts — never mixed.
    async function loadLeaderboard(podium1, podium2, podium3, lbList, stickyBar, usbRank, usbScore) {
        const client = window.getSupabaseClient();
        if (!lbList) return;

        lbList.innerHTML = '<div style="text-align:center; padding: 40px; color: var(--lb-text-muted, #9ca3af);">Loading ranking...</div>';
        resetPodiumItem(podium1);
        resetPodiumItem(podium2);
        resetPodiumItem(podium3);
        if (usbRank) usbRank.textContent = '--';
        if (usbScore) usbScore.textContent = '0 pts';
        if (stickyBar) stickyBar.classList.add('hidden');

        let rawData = [];

        // ── PUZZLE TAB: fetch ONLY puzzle_attempts — no exam data ever ──
        // Type-safe: coerce all puzzle_id values to String before comparison
        if (!currentPuzzle) return;

        const { data, error } = await client
            .from('puzzle_attempts')
            .select('user_id, student_name, score, puzzle_id');

        if (error) {
            console.warn('[Leaderboard] Puzzle fetch error:', error);
        } else if (data) {
            rawData = data.filter(row => String(row.puzzle_id) === currentPuzzle);
        }

        // ── AGGREGATE: sum scores per user (handles multiple attempts) ──
        const userMap = {};
        rawData.forEach(row => {
            const uid = row.user_id;
            if (!userMap[uid]) {
                userMap[uid] = { userId: uid, name: row.student_name || 'Student', score: 0 };
            }
            userMap[uid].score += (row.score || 0);
        });

        // ── RANK: Advanced Algorithm (Sort by score desc, then name asc, strict sequential ranks) ──
        leaderboardData = Object.values(userMap).sort((a, b) => {
            // Primary sort: score descending
            if (b.score !== a.score) return b.score - a.score;
            // Secondary sort (tie-breaker): name alphabetically
            return a.name.localeCompare(b.name);
        });
        
        // Assign strictly sequential ranks so no two players share the same position (1, 2, 3, 4, 5...)
        for (let i = 0; i < leaderboardData.length; i++) {
            leaderboardData[i].rank = i + 1;
        }

        renderLeaderboard(podium1, podium2, podium3, lbList, stickyBar, usbRank, usbScore);
    }

    // ── HELPERS ──
    function isMe(userId) {
        return currentUser && currentUser.id === userId;
    }

    function getDisplayName(user) {
        if (isMe(user.userId)) return 'You';
        return user.name;
    }

    function resetPodiumItem(el) {
        if (!el) return;
        el.style.opacity = '0.3';
        const nameEl = el.querySelector('.podium-name');
        const scoreEl = el.querySelector('.podium-score');
        const avatarEl = el.querySelector('.podium-avatar');
        if (nameEl) { nameEl.textContent = 'Empty'; nameEl.classList.remove('is-you'); }
        if (scoreEl) scoreEl.textContent = '0 pts';
        if (avatarEl) { avatarEl.textContent = '?'; avatarEl.classList.remove('is-you'); }
    }

    function populatePodiumItem(el, data) {
        if (!el || !data) return;
        el.style.opacity = '1';
        const nameEl = el.querySelector('.podium-name');
        const scoreEl = el.querySelector('.podium-score');
        const avatarEl = el.querySelector('.podium-avatar');
        const displayName = getDisplayName(data);

        if (nameEl) {
            nameEl.textContent = displayName;
            nameEl.classList.toggle('is-you', isMe(data.userId));
        }
        if (scoreEl) scoreEl.textContent = `${data.score} pts`;
        if (avatarEl) {
            avatarEl.textContent = data.name.substring(0, 2).toUpperCase();
            avatarEl.classList.toggle('is-you', isMe(data.userId));
        }
    }

    // ── RENDER ──
    function renderLeaderboard(podium1, podium2, podium3, lbList, stickyBar, usbRank, usbScore) {
        if (!lbList) return;
        lbList.innerHTML = '';

        if (leaderboardData.length === 0) {
            lbList.innerHTML = '<div style="text-align:center; padding: 40px; color: var(--lb-text-muted, #9ca3af);">No scores available yet.</div>';
            if (stickyBar) stickyBar.classList.add('hidden');
            return;
        }

        const [first, second, third] = leaderboardData;
        if (first) populatePodiumItem(podium1, first);
        if (second) populatePodiumItem(podium2, second);
        if (third) populatePodiumItem(podium3, third);

        const top3Ids = [first, second, third].filter(Boolean).map(u => u.userId);
        const userInTop3 = currentUser && top3Ids.includes(currentUser.id);

        // Ranks 4 and beyond: Render all using an advanced chunking algorithm with Intersection Observer
        const restOfData = leaderboardData.slice(3);
        let visibleCount = 0;
        const chunkSize = 20;
        
        function renderChunk() {
            const chunk = restOfData.slice(visibleCount, visibleCount + chunkSize);
            if (chunk.length === 0) return;
            
            const fragment = document.createDocumentFragment();
            chunk.forEach((user, idx) => {
                const li = document.createElement('li');
                li.className = 'lb-row';
                li.style.animationDelay = `${(idx % chunkSize) * 0.05}s`;

                const isMeRow = isMe(user.userId);
                if (isMeRow) li.classList.add('is-you');

                const displayName = getDisplayName(user);
                const youBadge = isMeRow ? '<span class="you-badge">You</span>' : '';
                const avatarClass = isMeRow ? 'row-avatar is-you' : 'row-avatar';
                const nameClass = isMeRow ? 'row-name is-you' : 'row-name';

                li.innerHTML = `
                    <div class="row-rank">${user.rank}</div>
                    <div class="${avatarClass}">${user.name.substring(0, 2).toUpperCase()}</div>
                    <div class="row-info">
                        <div class="${nameClass}">${displayName}${youBadge}</div>
                        <div class="row-sub">${isMeRow ? user.name : 'Player'}</div>
                    </div>
                    <div class="row-score">${user.score} pts</div>
                `;
                fragment.appendChild(li);
            });
            lbList.appendChild(fragment);
            visibleCount += chunk.length;
        }

        renderChunk();

        // Advanced Algorithm: Infinite Scroll lazy-loader
        if (window.lbObserver) window.lbObserver.disconnect();
        
        window.lbObserver = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && visibleCount < restOfData.length) {
                renderChunk();
                // move observer
                window.lbObserver.disconnect();
                if (lbList.lastElementChild) {
                    window.lbObserver.observe(lbList.lastElementChild);
                }
            }
        }, { rootMargin: "200px" });

        if (lbList.lastElementChild && visibleCount < restOfData.length) {
            window.lbObserver.observe(lbList.lastElementChild);
        }

        // Sticky bottom bar — only if user NOT in top 3
        if (currentUser) {
            const myData = leaderboardData.find(u => u.userId === currentUser.id);
            if (myData && !userInTop3) {
                if (stickyBar) stickyBar.classList.remove('hidden');
                if (usbRank) usbRank.textContent = `#${myData.rank}`;
                if (usbScore) usbScore.textContent = `${myData.score} pts`;
            } else {
                if (stickyBar) stickyBar.classList.add('hidden');
            }
        } else {
            if (stickyBar) stickyBar.classList.add('hidden');
        }
    }

    // ── REALTIME ──
    function setupRealtime(podium1, podium2, podium3, lbList, stickyBar, usbRank, usbScore) {
        const client = window.getSupabaseClient();
        if (realtimeChannel) client.removeChannel(realtimeChannel);

        realtimeChannel = client.channel('leaderboard_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'puzzle_attempts' }, () => {
                loadLeaderboard(podium1, podium2, podium3, lbList, stickyBar, usbRank, usbScore);
            })
            .subscribe();
    }

    // ── EXPOSE ──
    window.initLeaderboard = initLeaderboard;

    // ── STANDALONE AUTO-INIT ──
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLeaderboard);
    } else {
        initLeaderboard();
    }

})();
