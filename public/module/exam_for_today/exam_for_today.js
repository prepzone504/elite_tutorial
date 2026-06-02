/* ============================================
   Elite TUTORIAL — EXAM FOR TODAY JS
   exam_for_today.js
============================================ */

document.addEventListener('DOMContentLoaded', () => {

    // ── STATE ──
    let questionsData = [];
    let totalQ = 0;
    let currentQ = 0; // 0 to N-1
    let answers = [];
    let visited = [];
    let flagged = [];

    let examSubmitted = false;
    let examTimer;
    let timeRemaining = 40 * 60; // 40 minutes default
    let activeBatchId = null;
    let currentExamSubject = 'General';

    // ── STATE PERSISTENCE ──
    function saveExamState() {
        if (!activeBatchId || examSubmitted) return;
        sessionStorage.setItem('exam_active_batch', activeBatchId);
        sessionStorage.setItem('exam_is_playing', 'true');
        sessionStorage.setItem('exam_current_q', currentQ.toString());
        sessionStorage.setItem('exam_answers', JSON.stringify(answers));
        sessionStorage.setItem('exam_visited', JSON.stringify(visited));
        sessionStorage.setItem('exam_flagged', JSON.stringify(flagged));
        sessionStorage.setItem('exam_time_remaining', timeRemaining.toString());
    }

    function clearExamState() {
        sessionStorage.removeItem('exam_active_batch');
        sessionStorage.removeItem('exam_is_playing');
        sessionStorage.removeItem('exam_current_q');
        sessionStorage.removeItem('exam_answers');
        sessionStorage.removeItem('exam_visited');
        sessionStorage.removeItem('exam_flagged');
        sessionStorage.removeItem('exam_time_remaining');
    }

    // ── DOM ELEMENTS ──
    const qNumBadge = document.getElementById('q-number-badge');
    const qText = document.getElementById('question-text');
    const btnFlag = document.getElementById('flag-btn');
    const lblFlag = document.getElementById('flag-label');
    const progFill = document.getElementById('progress-fill');
    const optBtns = document.querySelectorAll('.option-btn');
    const ansRevBox = document.getElementById('answer-review-box');

    const gridDrawer = document.getElementById('q-grid-drawer');
    const gridDesktop = document.getElementById('q-grid-desktop');

    const btnPrev = document.getElementById('bn-prev');
    const btnNext = document.getElementById('bn-next');

    // Desktop/Inner navigation buttons
    const qnPrev = document.getElementById('qn-prev');
    const qnNext = document.getElementById('qn-next');
    
    const startOverlay = document.getElementById('start-screen-overlay');
    const btnStartNow = document.getElementById('btn-start-now');

    // ── INIT FETCH ──
    async function initExam() {
        if (!window.getSupabaseClient) {
            console.error('[Exam] Supabase client missing!');
            return;
        }

        const urlParams = new URLSearchParams(window.location.search);
        const batchId = urlParams.get('batch');
        const client = window.getSupabaseClient();
        
        // Show loading state
        const startDesc = document.getElementById('start-desc-text') || document.querySelector('.start-desc');
        qText.textContent = "Loading exam questions...";
        if (startDesc) startDesc.textContent = "Loading exam details...";

        let finalBatchId = batchId;

        // If no batch ID is provided, find the most recent exam batch ID first (fast query)
        if (sessionStorage.getItem('exam_is_playing') === 'true') {
            finalBatchId = sessionStorage.getItem('exam_active_batch') || batchId;
        }

        if (!finalBatchId) {
            const { data: latestQ } = await client
                .from('exam_questions')
                .select('exam_batch_id')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            if (latestQ) {
                finalBatchId = latestQ.exam_batch_id;
            }
        }

        // Get total count first to show progress
        const { count, error: countErr } = await client
            .from('exam_questions')
            .select('*', { count: 'exact', head: true })
            .eq('exam_batch_id', finalBatchId);

        if (countErr || !count) {
            console.error('[Exam] Failed to count exam questions:', countErr);
            qText.textContent = "Error: Could not load the exam questions. Please try again later.";
            if (startDesc) startDesc.textContent = "Error: Could not load the exam questions.";
            return;
        }

        // Fetch in chunks to show progress to user
        let allData = [];
        const PAGE_SIZE = 100;
        if (startDesc) startDesc.textContent = `Loading 0/${count} questions...`;
        
        for (let i = 0; i < count; i += PAGE_SIZE) {
            const fetched = Math.min(i + PAGE_SIZE, count);
            qText.textContent = `Fetching questions... ${fetched} / ${count}`;
            if (startDesc) startDesc.textContent = `Loading ${fetched}/${count} questions...`;
            
            const { data: chunk, error: chunkErr } = await client
                .from('exam_questions')
                .select('*')
                .eq('exam_batch_id', finalBatchId)
                .order('created_at', { ascending: true })
                .range(i, i + PAGE_SIZE - 1);
            
            if (chunkErr) {
                console.error('[Exam] Chunk fetch error:', chunkErr);
                break;
            }
            if (chunk) allData = allData.concat(chunk);
        }

        const data = allData;

        if (!data || data.length === 0) {
            qText.textContent = "Error: No questions found. Please try again later.";
            return;
        }

        activeBatchId = finalBatchId;
        if (data[0] && data[0].subject) {
            currentExamSubject = data[0].subject;
        }

        let user = null;
        try {
            if (window.EliteAuth && window.EliteAuth.getSession) {
                const session = await window.EliteAuth.getSession();
                if (session && session.user) user = session.user;
            }
        } catch(e) {
            console.warn('[Exam] Could not get session for attempt check:', e);
        }
        
        // Admin override for Review Mode
        const targetUserId = urlParams.get('userId');
        const isAdminParam = urlParams.get('admin') === 'true';
        const isAdmin = isAdminParam || sessionStorage.getItem('elite_admin_auth') === '1';
        const queryUserId = (isAdmin && targetUserId) ? targetUserId : (user ? user.id : null);

        console.log('[Exam] TargetUserId:', queryUserId, 'BatchId:', finalBatchId);

        if (queryUserId && finalBatchId) {
            const { data: attempt, error: attemptErr } = await client
                .from('user_exam_attempts')
                .select('*')
                .eq('user_id', queryUserId)
                .eq('exam_batch_id', finalBatchId)
                .single();

            console.log('[Exam] Attempt check result:', { attempt, attemptErr });
            
            if (attempt || (isAdmin && targetUserId)) {
                console.log('[Exam] Entering REVIEW mode.');
                
                if (attemptErr && isAdmin) {
                    console.warn('[Exam] Admin review forced, but attempt fetch failed (likely RLS). Showing correct answers only.');
                }
                
                // Load questions in review mode (read-only)
                questionsData = data.map(row => {
                    const opts = Array.isArray(row.options) ? row.options : [];
                    const correctIndex = opts.findIndex(o => o.correct === true);
                    const textOptions = opts.map(o => o.text);
                    return {
                        q: row.question_text,
                        options: textOptions,
                        ans: correctIndex !== -1 ? correctIndex : 0,
                        exp: row.explanation || "This is the correct answer."
                    };
                });

                totalQ = questionsData.length;
                
                // If we saved their answers, use them! Otherwise fallback to -1.
                if (attempt && attempt.answers && Array.isArray(attempt.answers) && attempt.answers.length === totalQ) {
                    answers = attempt.answers;
                } else {
                    answers = Array(totalQ).fill(-1); 
                }
                
                visited = Array(totalQ).fill(true);
                flagged = Array(totalQ).fill(false);
                examSubmitted = true; // Lock into review mode

                generateGrids();
                renderQuestion();
                updateGrids();

                // Skip the start overlay — go straight to review
                if (startOverlay) startOverlay.classList.add('hidden');
                
                // Hide submit buttons, show review header
                const submitTopBtn = document.getElementById('submit-btn-top');
                const submitSideBtn = document.getElementById('submit-btn-sidebar');
                if (submitTopBtn) submitTopBtn.style.display = 'none';
                if (submitSideBtn) submitSideBtn.style.display = 'none';
                const timerDisplay = document.getElementById('timer-display');
                if (timerDisplay) {
                    timerDisplay.textContent = isAdmin ? '🔎 Admin Review' : '✅ Review Mode';
                }

                return; // Don't continue to normal exam init
            }
        } else if (isAdmin && targetUserId) {
            console.warn('[Exam] Admin review mode, but batchId missing.');
        } else {
            console.warn('[Exam] No target user or batchId — cannot check for previous attempts.');
        }

        // Map DB format to UI format
        questionsData = data.map(row => {
            const opts = Array.isArray(row.options) ? row.options : [];
            const correctIndex = opts.findIndex(o => o.correct === true);
            const textOptions = opts.map(o => o.text);
            
            return {
                q: row.question_text,
                options: textOptions,
                ans: correctIndex !== -1 ? correctIndex : 0, // Fallback if none marked
                exp: row.explanation || "This is the correct answer based on the generated AI context." // Provide default if missing
            };
        });

        totalQ = questionsData.length;
        if (data[0] && data[0].duration_mins) {
            timeRemaining = data[0].duration_mins * 60;
        }

        // ── RESTORE STATE ──
        if (sessionStorage.getItem('exam_is_playing') === 'true') {
            currentQ = parseInt(sessionStorage.getItem('exam_current_q') || '0', 10);
            timeRemaining = parseInt(sessionStorage.getItem('exam_time_remaining') || timeRemaining.toString(), 10);
            try {
                answers = JSON.parse(sessionStorage.getItem('exam_answers')) || Array(totalQ).fill(-1);
                visited = JSON.parse(sessionStorage.getItem('exam_visited')) || Array(totalQ).fill(false);
                flagged = JSON.parse(sessionStorage.getItem('exam_flagged')) || Array(totalQ).fill(false);
            } catch(e) {
                answers = Array(totalQ).fill(-1);
                visited = Array(totalQ).fill(false);
                flagged = Array(totalQ).fill(false);
            }
            
            generateGrids();
            renderQuestion();
            updateGrids();
            
            if (startOverlay) startOverlay.classList.add('hidden');
            startTimer();
            return;
        }
        
        // Init arrays
        answers = Array(totalQ).fill(-1);
        visited = Array(totalQ).fill(false);
        flagged = Array(totalQ).fill(false);
        visited[0] = true;

        generateGrids();
        renderQuestion();
        updateGrids();

        // Update Start Screen text dynamically
        document.querySelector('.start-title').textContent = data[0].exam_title || "Exam";
        document.querySelector('.start-desc').textContent = `You have ${Math.floor(timeRemaining/60)} minutes to complete ${totalQ} questions. The timer will start as soon as you click the button below.`;

        if (btnStartNow) {
            btnStartNow.addEventListener('click', () => {
                if (startOverlay) startOverlay.classList.add('hidden');
                saveExamState();
                startTimer();
            });
        }
    }

    initExam();

    // ── RENDER QUESTION ──
    function renderQuestion() {
        const qData = questionsData[currentQ];

        // Header
        qNumBadge.textContent = `Q ${currentQ + 1} / ${totalQ}`;
        qText.textContent = qData.q;
        progFill.style.width = `${((currentQ + 1) / totalQ) * 100}%`;

        // Flag State
        if (flagged[currentQ]) {
            btnFlag.classList.add('flagged');
            lblFlag.textContent = 'Flagged';
        } else {
            btnFlag.classList.remove('flagged');
            lblFlag.textContent = 'Flag';
        }

        // Options
        optBtns.forEach((btn, idx) => {
            if (idx >= qData.options.length) {
                btn.style.display = 'none';
                return;
            } else {
                btn.style.display = 'flex';
            }

            // clear styles
            btn.classList.remove('selected', 'correct-ans', 'wrong-ans');
            btn.disabled = examSubmitted;

            // set text
            const textSpan = btn.querySelector('.opt-text');
            textSpan.textContent = qData.options[idx];

            // set selection
            if (answers[currentQ] === idx) {
                btn.classList.add('selected');
            }

            // Review mode styles
            if (examSubmitted) {
                if (idx === qData.ans) {
                    btn.classList.add('correct-ans');
                } else if (answers[currentQ] === idx && idx !== qData.ans) {
                    btn.classList.add('wrong-ans');
                }
            }
        });

        // Review Box
        if (examSubmitted) {
            ansRevBox.style.display = 'flex';
            document.getElementById('arb-correct-val').textContent = qData.options[qData.ans];
            document.getElementById('arb-explain').textContent = qData.exp;
        } else {
            ansRevBox.style.display = 'none';
        }

        // Nav Buttons State
        if (btnPrev) btnPrev.style.opacity = currentQ === 0 ? "0.5" : "1";
        if (btnNext) btnNext.style.opacity = currentQ === totalQ - 1 ? "0.5" : "1";

        if (qnPrev) qnPrev.disabled = currentQ === 0;
        if (qnNext) qnNext.disabled = currentQ === totalQ - 1;
    }

    // ── OPTION SELECTION ──
    optBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            if (examSubmitted) return; // disabled

            const optIdx = parseInt(btn.dataset.opt);

            if (answers[currentQ] === optIdx) {
                answers[currentQ] = -1;
                btn.classList.remove('selected');
            } else {
                answers[currentQ] = optIdx;
                optBtns.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            }

            saveExamState();
            updateGrids();
        });
    });

    // ── FLAG TOGGLE ──
    btnFlag.addEventListener('click', () => {
        flagged[currentQ] = !flagged[currentQ];
        saveExamState();
        renderQuestion();
        updateGrids();
    });

    // ── NAVIGATION ──
    function goToQuestion(idx) {
        if (idx < 0 || idx >= totalQ) return;
        currentQ = idx;
        visited[currentQ] = true;
        saveExamState();
        renderQuestion();
        updateGrids();
    }

    if (btnPrev) btnPrev.addEventListener('click', () => goToQuestion(currentQ - 1));
    if (btnNext) btnNext.addEventListener('click', () => goToQuestion(currentQ + 1));
    if (qnPrev) qnPrev.addEventListener('click', () => goToQuestion(currentQ - 1));
    if (qnNext) qnNext.addEventListener('click', () => goToQuestion(currentQ + 1));

    // ── GRIDS ──
    function generateGrids() {
        gridDrawer.innerHTML = '';
        gridDesktop.innerHTML = '';

        for (let i = 0; i < totalQ; i++) {
            // drawer cell
            const dCell = document.createElement('div');
            dCell.className = 'q-cell';
            dCell.textContent = i + 1;
            dCell.onclick = () => { goToQuestion(i); closeDrawer(); };
            gridDrawer.appendChild(dCell);

            // desktop cell
            const deskCell = document.createElement('div');
            deskCell.className = 'q-cell';
            deskCell.textContent = i + 1;
            deskCell.onclick = () => goToQuestion(i);
            gridDesktop.appendChild(deskCell);
        }
    }

    function updateGrids() {
        const dCells = gridDrawer.children;
        const deskCells = gridDesktop.children;

        for (let i = 0; i < totalQ; i++) {
            let classes = 'q-cell';

            if (i === currentQ) classes += ' active';

            if (flagged[i]) {
                classes += ' flag';
            } else if (answers[i] !== -1) {
                classes += ' ans';
            } else if (visited[i]) {
                classes += ' not-ans';
            } // else not visited

            // In review mode, show correct/wrong
            if (examSubmitted) {
                classes = 'q-cell'; // reset
                if (i === currentQ) classes += ' active';

                if (answers[i] === questionsData[i].ans) {
                    classes += ' ans'; // green
                } else if (answers[i] !== -1) {
                    classes += ' not-ans'; // red
                } else {
                    // skipped
                    classes += ' not-vis'; // grey
                }
            }

            dCells[i].className = classes;
            deskCells[i].className = classes;
        }
    }

    // ── DRAWER (MOBILE) ──
    const drawer = document.getElementById('nav-drawer');
    const drawerOverlay = document.getElementById('nav-drawer-overlay');
    const btnNavigator = document.getElementById('bn-navigator');
    const btnCloseDrawer = document.getElementById('nav-drawer-close');

    function openDrawer() {
        drawerOverlay.classList.add('visible');
        drawer.classList.add('open');
    }

    function closeDrawer() {
        drawerOverlay.classList.remove('visible');
        drawer.classList.remove('open');
    }

    if (btnNavigator) btnNavigator.addEventListener('click', openDrawer);
    if (btnCloseDrawer) btnCloseDrawer.addEventListener('click', closeDrawer);
    if (drawerOverlay) drawerOverlay.addEventListener('click', closeDrawer);

    // Bottom flag button
    const bnFlag = document.getElementById('bn-flag');
    if (bnFlag) {
        bnFlag.addEventListener('click', () => {
            btnFlag.click(); // trigger top flag button
        });
    }

    // ── TIMER ──
    const timerDisplay = document.getElementById('timer-display');

    function startTimer() {
        updateTimerDisplay();
        examTimer = setInterval(() => {
            if (examSubmitted) {
                clearInterval(examTimer);
                return;
            }

            timeRemaining--;
            updateTimerDisplay();
            saveExamState();

            if (timeRemaining <= 0) {
                clearInterval(examTimer);
                submitExam(true); // auto submit
            }
        }, 1000);
    }

    function updateTimerDisplay() {
        const m = Math.floor(timeRemaining / 60);
        const s = timeRemaining % 60;
        timerDisplay.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }


    // ── SUBMISSION ──
    const submitTopBtn = document.getElementById('submit-btn-top');
    const submitSideBtn = document.getElementById('submit-btn-sidebar');
    const modal = document.getElementById('submit-modal');
    const modCancel = document.getElementById('modal-cancel');
    const modConfirm = document.getElementById('modal-confirm');
    const modSummary = document.getElementById('modal-summary');

    function openSubmitModal() {
        if (examSubmitted) return;
        const answeredCount = answers.filter(a => a !== -1).length;
        const notAnsCount = totalQ - answeredCount;

        modSummary.innerHTML = `
      <div class="ms-item"><span class="ms-val ans">${answeredCount}</span><span>Answered</span></div>
      <div class="ms-item"><span class="ms-val not">${notAnsCount}</span><span>Unanswered</span></div>
    `;
        modal.classList.add('visible');
    }

    if (submitTopBtn) submitTopBtn.addEventListener('click', openSubmitModal);
    if (submitSideBtn) submitSideBtn.addEventListener('click', openSubmitModal);
    if (modCancel) modCancel.addEventListener('click', () => modal.classList.remove('visible'));
    if (modConfirm) modConfirm.addEventListener('click', () => {
        modal.classList.remove('visible');
        submitExam(false);
    });

    async function submitExam(auto = false) {
        examSubmitted = true;
        clearInterval(examTimer);
        clearExamState();

        // Calculate score
        let correct = 0;
        let wrong = 0;
        let skipped = 0;

        answers.forEach((ans, i) => {
            if (ans === -1) skipped++;
            else if (ans === questionsData[i].ans) correct++;
            else wrong++;
        });

        const pct = correct / totalQ;

        // Save attempt to Supabase
        let user = null;
        try {
            if (window.EliteAuth && window.EliteAuth.getSession) {
                const session = await window.EliteAuth.getSession();
                if (session && session.user) user = session.user;
            }
        } catch(e) { console.warn('[Exam] Could not get session for saving:', e); }

        if (user && window.getSupabaseClient) {
            const client = window.getSupabaseClient();
            const batchId = activeBatchId;

            if (batchId) {
                try {
                    const meta = user.user_metadata || {};
                    const fullName = meta.full_name || meta.name || 'Student';
                    const examTitle = document.querySelector('.start-title').textContent || 'Exam';

                    // Insert attempt
                    await client.from('user_exam_attempts').insert([{
                        user_id: user.id,
                        exam_batch_id: batchId,
                        score: correct,
                        total_q: totalQ,
                        student_name: fullName,
                        exam_title: examTitle,
                        subject: currentExamSubject,
                        answers: answers
                    }]);

                    // Update user stats
                    const { data: stats } = await client.from('user_stats').select('*').eq('user_id', user.id).single();
                    if (stats) {
                        const newExams = (stats.exams_taken || 0) + 1;
                        const oldAvg = stats.average_score || 0;
                        const currentScorePct = Math.round((correct / totalQ) * 100);
                        const newAvg = Math.round(((oldAvg * (newExams - 1)) + currentScorePct) / newExams);
                        
                        await client.from('user_stats').update({
                            exams_taken: newExams,
                            average_score: newAvg,
                            last_active: new Date().toISOString()
                        }).eq('user_id', user.id);
                    } else {
                        // First exam
                        const currentScorePct = Math.round((correct / totalQ) * 100);
                        await client.from('user_stats').insert([{
                            user_id: user.id,
                            exams_taken: 1,
                            average_score: currentScorePct,
                            streak_days: 1
                        }]);
                    }
                } catch (err) {
                    console.error('[Exam] Failed to save exam attempt:', err);
                }
            }
        }

        // Populate result screen
        document.getElementById('result-score-num').textContent = correct;
        document.getElementById('result-score-total').textContent = `/ ${totalQ}`;
        document.getElementById('rs-correct').textContent = correct;
        document.getElementById('rs-wrong').textContent = wrong;
        document.getElementById('rs-skipped').textContent = skipped;

        const ring = document.getElementById('score-ring-circle');
        // stroke-dasharray is 314
        setTimeout(() => {
            ring.style.strokeDashoffset = 314 - (314 * pct);
        }, 100);

        const msg = document.getElementById('result-message');
        const emoji = document.getElementById('result-emoji');
        if (pct >= 0.8) {
            msg.textContent = "Excellent work!"; emoji.textContent = "🏆";
        } else if (pct >= 0.6) {
            msg.textContent = "Good job!"; emoji.textContent = "👏";
        } else {
            msg.textContent = "Keep practicing!"; emoji.textContent = "📚";
        }

        if (auto) {
            document.getElementById('result-title').textContent = "Time's Up!";
        }

        document.getElementById('result-screen').classList.add('visible');
        updateGrids();
    }

    // Review Answers
    document.getElementById('result-review-btn').addEventListener('click', () => {
        document.getElementById('result-screen').classList.remove('visible');

        // Change UI for review mode
        if (submitTopBtn) submitTopBtn.style.display = 'none';
        if (submitSideBtn) submitSideBtn.style.display = 'none';
        timerDisplay.textContent = "Review Mode";

        goToQuestion(0);
    });

});
