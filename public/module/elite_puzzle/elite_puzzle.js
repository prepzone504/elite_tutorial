/* ============================================
   Elite TUTORIAL — Elite PUZZLE JS
   elite_puzzle.js
============================================ */

document.addEventListener('DOMContentLoaded', () => {

    // ── STATE ──
    let allPuzzles = [];
    let currentPuzzleData = null;
    let questions = [];
    let baseTimeLimit = 180;

    let score = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let currentQIdx = 0;

    let timeRemaining = 180;
    let timerInterval;
    let gameLoopReq;
    const ballsData = [];

    // ── STATE PERSISTENCE ──
    function savePuzzleState() {
        if (!isPlaying || !currentPuzzleData) return;
        sessionStorage.setItem('puzzle_playing_id', String(currentPuzzleData.id));
        sessionStorage.setItem('puzzle_is_playing', 'true');
        sessionStorage.setItem('puzzle_score', score.toString());
        sessionStorage.setItem('puzzle_correct', correctCount.toString());
        sessionStorage.setItem('puzzle_wrong', wrongCount.toString());
        sessionStorage.setItem('puzzle_current_q', currentQIdx.toString());
        sessionStorage.setItem('puzzle_time', timeRemaining.toString());
        sessionStorage.setItem('puzzle_answers', JSON.stringify(userAnswers));
    }

    function clearPuzzleState() {
        sessionStorage.removeItem('puzzle_playing_id');
        sessionStorage.removeItem('puzzle_is_playing');
        sessionStorage.removeItem('puzzle_score');
        sessionStorage.removeItem('puzzle_correct');
        sessionStorage.removeItem('puzzle_wrong');
        sessionStorage.removeItem('puzzle_current_q');
        sessionStorage.removeItem('puzzle_time');
        sessionStorage.removeItem('puzzle_answers');
    }

    // ── ONE-TIME EXAM TRACKING ──
    let completedPuzzleIds = new Set();
    let userAttemptsMap = {};
    let isReviewMode = false;
    let userAnswers = [];
    let totalTimeTaken = 0;

    // ── DOM ELEMENTS ──
    const listView = document.getElementById('puzzle-list-view');
    const startView = document.getElementById('start-view');
    const gameView = document.getElementById('game-view');
    const resultView = document.getElementById('result-view');

    const puzzleCardGrid = document.getElementById('puzzle-card-grid');
    const plTotalPuzzles = document.getElementById('pl-total-puzzles');
    const plCompletedPuzzles = document.getElementById('pl-completed-puzzles');
    const plNewPuzzles = document.getElementById('pl-new-puzzles');

    const puzzleDetailTitle = document.getElementById('puzzle-detail-title');
    const puzzleDetailDesc = document.getElementById('puzzle-detail-desc');
    const ruleTime = document.getElementById('rule-time');

    const btnStart = document.getElementById('btn-start-game');
    const btnQuit = document.getElementById('btn-quit');
    const btnPlayAgain = document.getElementById('btn-play-again');
    const btnBackList = document.getElementById('btn-back-list');
    const btnBackFromResult = document.getElementById('btn-back-from-result');

    const timeDisplay = document.getElementById('time-display');
    const scoreDisplay = document.getElementById('score-display');
    const scoreBox = document.getElementById('score-box');
    const questionText = document.getElementById('question-text');
    const arena = document.getElementById('arena');
    const feedbackPop = document.getElementById('feedback-pop');

    // Sidebar & logout are now handled by sidebar.js + initSharedSidebar()

    // ── FETCH ALL PUZZLES ──
    async function fetchAllPuzzles() {
        try {
            const client = window.getSupabaseClient();
            const { data, error } = await client
                .from('elite_puzzles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error || !data || data.length === 0) {
                puzzleCardGrid.innerHTML = `
                    <div class="pl-empty">
                        <div class="pl-empty-icon">🧩</div>
                        <h3>No Puzzles Available</h3>
                        <p>Check back later — new puzzles will appear here.</p>
                    </div>`;
                return;
            }

            allPuzzles = data;
            renderPuzzleCards(data);
        } catch (e) {
            console.error("Error fetching puzzles", e);
            puzzleCardGrid.innerHTML = `<div class="pl-empty"><h3>Failed to load puzzles</h3><p>Please try again later.</p></div>`;
        }
    }

    // ── FETCH USER ATTEMPTS (one-time exam tracking) ──
    async function fetchUserAttempts() {
        try {
            const client = window.getSupabaseClient();
            let userId = null;
            try {
                const session = await window.EliteAuth.getSession();
                if (session && session.user) userId = session.user.id;
            } catch (e) {
                console.warn('[Puzzle] Could not get session for fetching attempts', e);
            }

            if (userId) {
                const { data } = await client
                    .from('puzzle_attempts')
                    .select('*')
                    .eq('user_id', userId);

                if (data) {
                    data.forEach(a => {
                        if (a.puzzle_id) {
                            const pid = String(a.puzzle_id);
                            completedPuzzleIds.add(pid);
                            userAttemptsMap[pid] = a;
                        }
                    });
                }
            }
            updatePuzzleBadge();
            // Re-render cards if already loaded so completed state shows immediately
            if (allPuzzles.length > 0) {
                renderPuzzleCards(allPuzzles);
            }
        } catch (e) {
            console.warn('Could not fetch attempts', e);
        }
    }

    function updatePuzzleBadge() {
        try {
            const total = allPuzzles.length;
            const completed = completedPuzzleIds.size;
            const newCount = total - completed;
            plCompletedPuzzles.textContent = completed;
            plNewPuzzles.textContent = newCount;
            const puzzleBadge = document.getElementById('sidebar-puzzle-badge');
            if (puzzleBadge) {
                if (newCount > 0) {
                    puzzleBadge.textContent = newCount;
                    puzzleBadge.style.display = 'inline-flex';
                } else {
                    puzzleBadge.style.display = 'none';
                }
            }
        } catch (e) { console.warn('Badge update error', e); }
    }

    // ── RENDER PUZZLE CARDS ──
    function renderPuzzleCards(puzzles) {
        const total = puzzles.length;
        const completed = completedPuzzleIds.size;
        const newCount = total - completed;

        plTotalPuzzles.textContent = total;
        plCompletedPuzzles.textContent = completed;
        plNewPuzzles.textContent = newCount;

        puzzleCardGrid.innerHTML = puzzles.map(p => {
            const isCompleted = completedPuzzleIds.has(String(p.id));
            const isNew = !isCompleted;
            const attempt = userAttemptsMap[String(p.id)];

            const emojis = ['🔢', '⚗️', '🧬', '🔭', '📐', '🎯', '🧠', '🔬'];
            const emoji = emojis[Math.abs(String(p.id).split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % emojis.length];

            const roundsCount = p.rounds ? p.rounds.length : 0;

            const statusHtml = isCompleted
              ? `<span class="card-badge" style="background:rgba(5,150,105,0.15);color:#34d399;">✅ Completed</span>`
              : `<span class="card-badge new-badge" style="background:rgba(124,58,237,0.15);color:#9d6aff;">New Challenge</span>`;

            const btnHtml = isCompleted
              ? `<button class="btn-begin-exam pzl-play-btn" data-puzzle-id="${p.id}"
                   style="background:linear-gradient(135deg,#10b981,#059669); width: calc(100% - 48px); margin: 0 24px 24px;">
                   📖 Review Results <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                 </button>`
              : `<button class="btn-begin-exam pzl-play-btn" data-puzzle-id="${p.id}"
                   style="background:linear-gradient(135deg,#7c3aed,#5b21b6); width: calc(100% - 48px); margin: 0 24px 24px;">
                   Play Now <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                 </button>`;

            return `
              <div class="exam-card-full pzl-card" data-puzzle-id="${p.id}" style="margin:0; padding:0;">
                <div style="padding: 24px;">
                  <div class="ecf-top">
                    <div class="ecf-subject-badge">${emoji} ${p.level_label || 'Puzzle'}</div>
                    ${statusHtml}
                  </div>
                  <h3 class="ecf-title">${p.title || 'Untitled Puzzle'}</h3>
                  <p class="ecf-desc">${isCompleted
                  ? `You have completed this puzzle. You scored ${attempt.score} points.`
                  : `Test your skills. Catch the correct balls to score points in ${roundsCount} rounds!`
                }</p>
                  <div class="ecf-meta-row">
                    <div class="ecf-meta-item"><span class="ecf-meta-icon">❓</span><span>${roundsCount} Rounds</span></div>
                    <div class="ecf-meta-item"><span class="ecf-meta-icon">⏱</span><span>${p.time_limit || 3} Minutes</span></div>
                    <div class="ecf-meta-item"><span class="ecf-meta-icon">🏷️</span><span>${p.course_code || 'General'}</span></div>
                    <div class="ecf-meta-item"><span class="ecf-meta-icon">🎯</span><span>${isCompleted ? `Score: ${attempt.score}` : 'Catch balls'}</span></div>
                  </div>
                </div>
                ${btnHtml}
              </div>`;
        }).join('');

        // Click card OR play button → select puzzle
        document.querySelectorAll('.pzl-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const id = card.dataset.puzzleId;
                const puzzle = puzzles.find(p => p.id === id);
                if (puzzle) selectPuzzle(puzzle);
            });
        });

        // Direct play button click handler
        document.querySelectorAll('.pzl-play-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const card = btn.closest('.pzl-card');
                if (!card) return;
                const id = card.dataset.puzzleId;
                const puzzle = puzzles.find(p => p.id === id);
                if (puzzle) selectPuzzle(puzzle);
            });
        });
    }

    // ── SELECT PUZZLE → START SCREEN or REVIEW ──
    async function selectPuzzle(puzzle) {
        const puzzleId = String(puzzle.id);
        // If already completed, show review instead of playing
        if (completedPuzzleIds.has(puzzleId)) {
            await showReview(puzzle, userAttemptsMap[puzzleId]);
            return;
        }

        currentPuzzleData = puzzle;

        questions = (puzzle.rounds || []).map(r => ({
            q: r.question,
            options: r.options,
            ans: r.correctAnswer
        }));

        baseTimeLimit = (puzzle.time_limit || 3) * 60;

        puzzleDetailTitle.textContent = puzzle.title || 'Puzzle';
        puzzleDetailDesc.textContent = `Test your skills with ${puzzle.level_label || 'this challenge'}. Catch the correct balls to score points!`;
        ruleTime.textContent = `${puzzle.time_limit || 3} minutes`;

        listView.style.display = 'none';
        startView.style.display = 'flex';
        resultView.style.display = 'none';
        gameView.style.display = 'none';
    }

    // ── SHOW REVIEW (for completed one-time puzzles) ──
    async function showReview(puzzle, attempt) {
        isReviewMode = true;
        currentPuzzleData = puzzle;

        const icon = document.getElementById('res-icon');
        icon.textContent = '📋';

        const reviewTitle = document.getElementById('res-title');
        reviewTitle.textContent = 'Review';

        document.getElementById('res-sub-text').textContent = `Your results for ${puzzle.title}:`;

        const finalScore = document.getElementById('final-score');
        finalScore.textContent = attempt?.score ?? 0;
        finalScore.className = 'rsc-val ' + ((attempt?.score ?? 0) < 0 ? 'negative' : '');

        document.getElementById('res-correct').textContent = '—';
        document.getElementById('res-wrong').textContent = '—';

        btnPlayAgain.style.display = 'none';

        listView.style.display = 'none';
        startView.style.display = 'none';
        gameView.style.display = 'none';
        resultView.style.display = 'flex';

        // Get stored answers — try in-memory first, then fetch from Supabase DB
        let storedAnswers = attempt?.answers;

        if (!storedAnswers || storedAnswers.length === 0) {
            // Fetch from Supabase DB directly
            try {
                const client = window.getSupabaseClient();
                const session = await window.EliteAuth.getSession();
                if (session && session.user) {
                    const { data } = await client
                        .from('puzzle_attempts')
                        .select('*')
                        .eq('puzzle_id', puzzle.id)
                        .eq('user_id', session.user.id)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .single();

                    if (data) {
                        const pid = String(puzzle.id);
                        userAttemptsMap[pid] = data;
                        storedAnswers = data.answers;
                        // Update score from DB data
                        const scoreEl = document.getElementById('final-score');
                        scoreEl.textContent = data.score ?? finalScore.textContent;
                        scoreEl.className = 'rsc-val ' + ((data.score ?? 0) < 0 ? 'negative' : '');
                    }
                }
            } catch (e) {
                console.warn('[Puzzle] Could not fetch attempt from DB for review', e);
            }
        }

        const storedQs = (puzzle.rounds || []).map(r => ({
            q: r.question,
            options: r.options,
            ans: r.correctAnswer
        }));
        renderReviewSection(storedAnswers, storedQs);
    }

    // ── BACK TO LIST ──
    function goBackToList() {
        stopGame();
        listView.style.display = 'flex';
        startView.style.display = 'none';
        resultView.style.display = 'none';
        gameView.style.display = 'none';

        if (allPuzzles.length > 0) {
            renderPuzzleCards(allPuzzles);
        }
    }

    btnBackList.addEventListener('click', goBackToList);
    btnBackFromResult.addEventListener('click', goBackToList);

    // ── NAVIGATION ──
    btnStart.addEventListener('click', startGame);
    btnQuit.addEventListener('click', quitGame);
    btnPlayAgain.addEventListener('click', startGame);

    function quitGame() {
        stopGame();
        listView.style.display = 'flex';
        startView.style.display = 'none';
        gameView.style.display = 'none';
        resultView.style.display = 'none';
    }

    function startGame() {
        if (currentPuzzleData) {
            const pid = String(currentPuzzleData.id);
            if (completedPuzzleIds.has(pid)) {
                showToast('You have already completed this puzzle. Replays are not allowed.', 'error');
                goBackToList();
                return;
            }
        }

        if (questions.length === 0) {
            showToast('No questions available for this puzzle.', 'error');
            return;
        }

        score = 0;
        correctCount = 0;
        wrongCount = 0;
        currentQIdx = 0;
        timeRemaining = baseTimeLimit;
        userAnswers = [];
        totalTimeTaken = 0;
        updateScoreUI();
        updateTimerUI();

        listView.style.display = 'none';
        startView.style.display = 'none';
        resultView.style.display = 'none';
        gameView.style.display = 'flex';

        document.body.classList.add('game-mode-active');
        isPlaying = true;
        savePuzzleState();
        startTimer();
        loadQuestion();

        if (gameLoopReq) cancelAnimationFrame(gameLoopReq);
        gameLoopReq = requestAnimationFrame(physicsLoop);
    }

    function stopGame() {
        isPlaying = false;
        clearPuzzleState();
        clearInterval(timerInterval);
        if (gameLoopReq) cancelAnimationFrame(gameLoopReq);
        arena.innerHTML = '';
        ballsData.length = 0;
        document.body.classList.remove('game-mode-active');
    }

    function gameOver() {
        stopGame();
        gameView.style.display = 'none';
        resultView.style.display = 'flex';

        isReviewMode = true;
        totalTimeTaken = baseTimeLimit - timeRemaining;

        const allDone = currentQIdx >= questions.length;
        document.getElementById('res-title').textContent = allDone ? 'Puzzle Complete!' : "Time's Up!";

        const finalScore = document.getElementById('final-score');
        finalScore.textContent = score;
        finalScore.className = 'rsc-val ' + (score < 0 ? 'negative' : '');

        document.getElementById('res-correct').textContent = correctCount;
        document.getElementById('res-wrong').textContent = wrongCount;

        const icon = document.getElementById('res-icon');
        if (score >= 50) icon.textContent = '🏆';
        else if (score >= 0) icon.textContent = '👍';
        else icon.textContent = '💔';

        const subText = currentPuzzleData
            ? `Here is how you performed in ${currentPuzzleData.title}:`
            : 'Here is how you performed:';
        document.getElementById('res-sub-text').textContent = subText;

        btnPlayAgain.style.display = 'none';

        saveAttemptToLeaderboard(score);
    }

    function markPuzzleCompletedLocally(pid, finalScore) {
        completedPuzzleIds.add(pid);
        userAttemptsMap[pid] = {
            score: finalScore,
            answers: userAnswers,
            time_taken: totalTimeTaken
        };
        updatePuzzleBadge();
        renderPuzzleCards(allPuzzles);
    }

    async function saveAttemptToLeaderboard(finalScore) {
        try {
            const client = window.getSupabaseClient();
            const pid = currentPuzzleData ? String(currentPuzzleData.id) : null;

            let userId = null;
            let studentName = 'Student';
            try {
                const session = await window.EliteAuth.getSession();
                if (session && session.user) {
                    userId = session.user.id;
                    const meta = session.user.user_metadata || {};
                    studentName = meta.full_name || meta.name || 'Student';
                }
            } catch (e) {
                console.warn('[Puzzle] Could not get session for saving', e);
            }

            if (userId && pid) {
                const { error } = await client.from('puzzle_attempts').insert([{
                    user_id: userId,
                    student_name: studentName,
                    puzzle_id: pid,
                    puzzle_level: 1,
                    score: finalScore,
                    answers: userAnswers,
                    time_taken: totalTimeTaken
                }]);

                if (error) throw error;
            }

            // Always mark completed in-memory regardless of DB result
            if (pid) {
                markPuzzleCompletedLocally(pid, finalScore);
            }
        } catch (err) {
            console.error("Failed to save puzzle attempt", err);
            showToast('Warning: Could not save results to cloud. Please run the SQL script in Supabase.', 'error');
            // Even if DB save fails, mark completed locally so user can review
            if (currentPuzzleData) {
                markPuzzleCompletedLocally(String(currentPuzzleData.id), finalScore);
            }
        }

        renderReviewSection(userAnswers, questions);
    }

    // ── TIMER ──
    function startTimer() {
        timerInterval = setInterval(() => {
            timeRemaining--;
            updateTimerUI();
            savePuzzleState();
            if (timeRemaining <= 0) {
                gameOver();
            }
        }, 1000);
    }

    function updateTimerUI() {
        const m = Math.floor(timeRemaining / 60);
        const s = timeRemaining % 60;
        timeDisplay.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    // ── QUESTION & BALLS ──
    function loadQuestion() {
        if (currentQIdx >= questions.length) {
            gameOver();
            return;
        }
        const qData = questions[currentQIdx];

        const optText = Array.isArray(qData.options) ? qData.options : [];
        const questionDisplay = qData.q || 'Question text unavailable';
        questionText.textContent = questionDisplay;

        arena.innerHTML = '';
        ballsData.length = 0;

        const options = [...optText].sort(() => Math.random() - 0.5);

        const rect = arena.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;

        const ballSize = window.innerWidth <= 600 ? 75 : 90;
        const radius = ballSize / 2;

        options.forEach((opt, idx) => {
            const el = document.createElement('div');
            el.className = `puzzle-ball pb-color-${idx % 5}`;
            el.textContent = opt;

            const x = Math.random() * (w - ballSize);
            const y = Math.random() * (h - ballSize);

            let vx = (Math.random() - 0.5);
            let vy = (Math.random() - 0.5);

            if (Math.abs(vx) < 0.2) vx = vx < 0 ? -0.3 : 0.3;
            if (Math.abs(vy) < 0.2) vy = vy < 0 ? -0.3 : 0.3;

            if (window.innerWidth > 768) { vx *= 1.1; vy *= 1.1; }

            el.style.left = `${x}px`;
            el.style.top = `${y}px`;

            el.addEventListener('mousedown', (e) => handleBallClick(e, opt, qData.ans));
            el.addEventListener('touchstart', (e) => { e.preventDefault(); handleBallClick(e, opt, qData.ans); }, { passive: false });

            arena.appendChild(el);
            ballsData.push({ el, x, y, vx, vy, radius, size: ballSize });
        });
    }

    function handleBallClick(e, selectedOpt, correctOpt) {
        if (!isPlaying) return;

        const isCorrect = (selectedOpt === correctOpt);
        const currentQ = questions[currentQIdx];

        userAnswers.push({
            question: currentQ?.q || 'Unknown question',
            selectedAnswer: selectedOpt,
            correctAnswer: correctOpt,
            isCorrect
        });

        let clientX = e.clientX;
        let clientY = e.clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        }

        showFeedback(isCorrect ? "+10" : "-5", isCorrect, clientX, clientY);

        if (isCorrect) {
            score += 10;
            correctCount++;
            animateScoreBox(true);
            currentQIdx++;
            loadQuestion();
        } else {
            score -= 5;
            wrongCount++;
            animateScoreBox(false);
        }

        savePuzzleState();
        updateScoreUI();
    }

    // ── PHYSICS LOOP ──
    function physicsLoop() {
        if (!isPlaying) return;

        const rect = arena.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;

        ballsData.forEach(b => {
            b.x += b.vx;
            b.y += b.vy;

            if (b.x <= 0) {
                b.x = 0;
                b.vx *= -1;
            } else if (b.x + b.size >= w) {
                b.x = w - b.size;
                b.vx *= -1;
            }

            if (b.y <= 0) {
                b.y = 0;
                b.vy *= -1;
            } else if (b.y + b.size >= h) {
                b.y = h - b.size;
                b.vy *= -1;
            }

            b.el.style.transform = `translate(${b.x}px, ${b.y}px)`;
            if (!b.initializedTransform) {
                b.el.style.left = '0px';
                b.el.style.top = '0px';
                b.initializedTransform = true;
            }
        });

        gameLoopReq = requestAnimationFrame(physicsLoop);
    }

    // ── UI EFFECTS ──
    function updateScoreUI() {
        scoreDisplay.textContent = score;
        if (score < 0) {
            scoreDisplay.classList.add('negative');
        } else {
            scoreDisplay.classList.remove('negative');
        }
    }

    function animateScoreBox(isPositive) {
        scoreBox.classList.remove('pop', 'pop-neg');
        void scoreBox.offsetWidth;
        scoreBox.classList.add(isPositive ? 'pop' : 'pop-neg');
    }

    function showFeedback(text, isPositive, x, y) {
        const clone = feedbackPop.cloneNode();
        clone.textContent = text;
        clone.className = 'feedback-pop ' + (isPositive ? 'show-pos' : 'show-neg');
        clone.style.left = `${x - 20}px`;
        clone.style.top = `${y - 40}px`;
        document.body.appendChild(clone);

        setTimeout(() => {
            if (document.body.contains(clone)) {
                document.body.removeChild(clone);
            }
        }, 1000);
    }

    function showToast(message, type = 'info') {
        document.querySelectorAll('.pzl-toast').forEach(t => t.remove());
        const toast = document.createElement('div');
        toast.className = 'pzl-toast';
        const colors = {
            success: { bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.35)', text: '#34d399' },
            warn: { bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.35)', text: '#fbbf24' },
            info: { bg: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.35)', text: '#93c5fd' },
            error: { bg: 'rgba(224,28,28,0.12)', border: 'rgba(224,28,28,0.35)', text: '#ff7070' },
        };
        const c = colors[type] || colors.info;
        toast.style.cssText = `
            position:fixed; bottom:28px; right:28px; z-index:9999;
            background:${c.bg}; border:1px solid ${c.border}; color:${c.text};
            padding:13px 22px; border-radius:12px;
            font-family:'Outfit',sans-serif; font-size:0.9rem; font-weight:600;
            box-shadow:0 8px 32px rgba(0,0,0,0.4); backdrop-filter:blur(12px);
            transform:translateY(20px); opacity:0;
            transition:transform 0.35s cubic-bezier(0.4,0,0.2,1),opacity 0.35s ease;
            max-width:320px;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        requestAnimationFrame(() => {
            toast.style.transform = 'translateY(0)';
            toast.style.opacity = '1';
        });
        setTimeout(() => {
            toast.style.transform = 'translateY(20px)';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    }

    // ── REVIEW SECTION ──
    function renderReviewSection(answers, allQuestions) {
        const container = document.getElementById('review-section');
        if (!container) return;

        if (!answers || answers.length === 0) {
            container.innerHTML = '<p class="review-empty">No answers recorded.</p>';
            container.style.display = 'block';
            return;
        }

        const correctCount = answers.filter(a => a.isCorrect).length;

        container.innerHTML = `
            <div class="review-header">
                <h3>📋 Answer Review</h3>
                <span class="review-summary">${correctCount}/${answers.length} correct</span>
            </div>
            <div class="review-list">
                ${answers.map((a, i) => `
                    <div class="review-item ${a.isCorrect ? 'rev-correct' : 'rev-wrong'}">
                        <div class="rev-q-num">Q${i + 1}</div>
                        <div class="rev-q-body">
                            <p class="rev-question">${a.question}</p>
                            <div class="rev-answers">
                                <span class="rev-label">Your answer:</span>
                                <span class="rev-val ${a.isCorrect ? 'rev-val-correct' : 'rev-val-wrong'}">${a.selectedAnswer}</span>
                            </div>
                            ${!a.isCorrect ? `
                            <div class="rev-answers">
                                <span class="rev-label">Correct answer:</span>
                                <span class="rev-val rev-val-correct">${a.correctAnswer}</span>
                            </div>` : ''}
                        </div>
                        <div class="rev-icon">${a.isCorrect ? '✅' : '❌'}</div>
                    </div>
                `).join('')}
            </div>
        `;
        container.style.display = 'block';
    }

    // ── INIT ──
    // (Sidebar & logout are initialized by sidebar.js before this script runs)
    // Load attempts FIRST so puzzle cards render with correct completed state
    fetchUserAttempts().then(async () => {
        await fetchAllPuzzles();

        // ── RESTORE STATE ──
        if (sessionStorage.getItem('puzzle_is_playing') === 'true') {
            const playingId = sessionStorage.getItem('puzzle_playing_id');
            const targetPuzzle = allPuzzles.find(p => String(p.id) === playingId);
            if (targetPuzzle) {
                currentPuzzleData = targetPuzzle;
                questions = (targetPuzzle.rounds || []).map(r => ({
                    q: r.question,
                    options: r.options,
                    ans: r.correctAnswer
                }));
                baseTimeLimit = (targetPuzzle.time_limit || 3) * 60;

                score = parseInt(sessionStorage.getItem('puzzle_score') || '0', 10);
                correctCount = parseInt(sessionStorage.getItem('puzzle_correct') || '0', 10);
                wrongCount = parseInt(sessionStorage.getItem('puzzle_wrong') || '0', 10);
                currentQIdx = parseInt(sessionStorage.getItem('puzzle_current_q') || '0', 10);
                timeRemaining = parseInt(sessionStorage.getItem('puzzle_time') || baseTimeLimit.toString(), 10);
                try {
                    userAnswers = JSON.parse(sessionStorage.getItem('puzzle_answers')) || [];
                } catch(e) { userAnswers = []; }

                updateScoreUI();
                updateTimerUI();

                listView.style.display = 'none';
                startView.style.display = 'none';
                resultView.style.display = 'none';
                gameView.style.display = 'flex';

                document.body.classList.add('game-mode-active');
                isPlaying = true;
                startTimer();
                loadQuestion();

                if (gameLoopReq) cancelAnimationFrame(gameLoopReq);
                gameLoopReq = requestAnimationFrame(physicsLoop);
                return;
            }
        }

        const urlParams = new URLSearchParams(window.location.search);
        const puzzleId = urlParams.get('puzzle');
        if (puzzleId && allPuzzles) {
            const targetPuzzle = allPuzzles.find(p => String(p.id) === puzzleId);
            if (targetPuzzle) {
                selectPuzzle(targetPuzzle);
            }
        }
    });
});
