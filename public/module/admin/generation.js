/* ============================================
   ELITE TUTORIAL — AI CONTENT STUDIO
   generation.js (shared)
============================================ */

const DEMO_STUDENTS = [
  { id: 'u1', name: 'Imohiosen A.', email: 'imohiosen@elitetutorial.com' },
  { id: 'u2', name: 'Ogheneruona B.', email: 'oghene@elitetutorial.com' },
  { id: 'u3', name: 'Chidera N.', email: 'chidera@elitetutorial.com' },
  { id: 'u4', name: 'Tunde S.', email: 'tunde@elitetutorial.com' },
  { id: 'u5', name: 'Adaora M.', email: 'adaora@elitetutorial.com' },
  { id: 'u6', name: 'Emeka O.', email: 'emeka@elitetutorial.com' },
  { id: 'u7', name: 'Fatima K.', email: 'fatima@elitetutorial.com' },
  { id: 'u8', name: 'James P.', email: 'james@elitetutorial.com' },
];

const AI_MODELS = []; // Handled manually in HTML now

/* ── Mistral API keys (fetched from Supabase app_settings) ── */
let _apiKeys = [];
let _keysLoaded = false;
let _keyIndex = 0;

async function loadMistralApiKeys() {
  if (_keysLoaded) return _apiKeys;
  try {
    const client = window.getSupabaseClient();
    const { data, error } = await client
      .from('app_settings')
      .select('value')
      .eq('key', 'mistral_api_key')
      .single();
    if (!error && data && data.value) {
      // Support comma-separated keys in the database value
      _apiKeys = data.value.split(',').map(k => k.trim()).filter(Boolean);
    }
  } catch (err) {
    console.error('loadMistralApiKeys error:', err);
  }
  _keysLoaded = true;
  if (_apiKeys.length === 0) {
    throw new Error('No Mistral API keys configured in database. Add comma-separated keys to app_settings → mistral_api_key.');
  }
  return _apiKeys;
}

function getMistralApiKey() {
  // Round-robin selection (synchronous — keys must be loaded first)
  if (_apiKeys.length === 0) {
    throw new Error('API keys not loaded. Call loadMistralApiKeys() first.');
  }
  const key = _apiKeys[_keyIndex % _apiKeys.length];
  _keyIndex++;
  return key;
}

/* ── Real Mistral API call (uses a specific key) ── */
async function callMistralApiWithKey(apiKey, modelId, prompt) {
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelId,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Mistral API error ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

/* ── Backward-compatible wrapper (round-robin key) ── */
async function callMistralApi(modelId, prompt) {
  await loadMistralApiKeys();
  const apiKey = getMistralApiKey();
  return callMistralApiWithKey(apiKey, modelId, prompt);
}

/* ── Build the prompt for Mistral ── */
function buildExamPrompt(count, optionCount, subject, userPrompt, difficulty) {
  const letters = ['A', 'B', 'C', 'D', 'E'].slice(0, optionCount).join(', ');
  const diffText = difficulty === 'mixed'
    ? 'a mix of easy, medium, and hard'
    : difficulty;
  return `You are an expert exam question creator for Nigerian secondary school students.

Generate exactly ${count} multiple-choice exam questions for the subject: ${subject}.
Difficulty: ${diffText}.
Options per question: ${optionCount} (labelled ${letters}).

Additional context from admin: ${userPrompt}

Rules:
- Return ONLY valid JSON. No markdown.
- Format: [{"question":"...","options":[{"letter":"A","text":"...","correct":false},{"letter":"B","text":"...","correct":true},...],"difficulty":"medium","explanation":"A brief explanation of why the correct answer is right"}]
- Exactly one option per question must have "correct": true.
- Each question must be clear, unambiguous, and appropriate for SS2/SS3 level.
- Do NOT number the questions — the system will number them.
- Generate all ${count} questions. Do not truncate.`;
}

/* ── Parse the Mistral JSON response into our internal format ── */
function parseMistralExamResponse(rawText, subject) {
  // Strip markdown code fences if present
  let clean = rawText.trim();
  clean = clean.replace(/^```[\w]*\n?/,'').replace(/\n?```$/,'').trim();

  let parsed;
  try {
    parsed = JSON.parse(clean);
  } catch (e) {
    // Try to find a JSON array in the text
    const match = clean.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (!match) throw new Error('AI returned invalid JSON. Please try again.');
    parsed = JSON.parse(match[0]);
  }

  if (!Array.isArray(parsed)) throw new Error('AI response was not a JSON array.');

  return parsed.map((item, idx) => ({
    num: idx + 1,
    question: `${item.question || `Question ${idx + 1}`}`,
    options: (item.options || []).map(o => ({
      letter: o.letter,
      text: o.text,
      correct: !!o.correct,
    })),
    difficulty: item.difficulty || 'medium',
    explanation: item.explanation || 'No explanation provided.',
  }));
}

const SUBJECTS = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Economics', 'Further Mathematics'];

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function checkAdminAuth() {
  if (sessionStorage.getItem('elite_admin_auth') !== '1') {
    const gate = document.getElementById('auth-gate');
    if (gate) gate.style.display = 'flex';
    document.querySelector('.studio-shell')?.classList.add('blurred');
    return false;
  }
  return true;
}

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
  }, 3500);
}

function initModelGrid(containerId, defaultId = 'mistral-large-latest') {
  const container = document.getElementById(containerId);
  if (!container) return () => 'mistral-large-latest';

  let selected = defaultId;
  
  // Ensure the default model card is set to active
  container.querySelectorAll('.model-card').forEach(card => {
    if (card.dataset.model === defaultId) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
    
    card.addEventListener('click', () => {
      container.querySelectorAll('.model-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      selected = card.dataset.model;
    });
  });

  return () => selected;
}

function initDifficultyChips(containerId, defaultDiff = 'medium') {
  const container = document.getElementById(containerId);
  if (!container) return () => 'medium';

  const levels = ['easy', 'medium', 'hard', 'mixed'];
  let selected = defaultDiff;

  container.innerHTML = levels.map(d => `
    <button type="button" class="diff-chip ${d === defaultDiff ? 'active' : ''}" data-diff="${d}">
      ${d.charAt(0).toUpperCase() + d.slice(1)}
    </button>
  `).join('');

  container.querySelectorAll('.diff-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      container.querySelectorAll('.diff-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      selected = chip.dataset.diff;
    });
  });

  return () => selected;
}

function initOptionPills(containerId, defaultCount = 4) {
  const container = document.getElementById(containerId);
  if (!container) return () => 4;

  let selected = defaultCount;
  const counts = [4, 5];

  container.innerHTML = counts.map(n => `
    <button type="button" class="option-pill ${n === defaultCount ? 'active' : ''}" data-count="${n}">
      ${n} Options<br><small style="font-weight:500;opacity:0.7">A–${String.fromCharCode(64 + n)}</small>
    </button>
  `).join('');

  container.querySelectorAll('.option-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      container.querySelectorAll('.option-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      selected = parseInt(pill.dataset.count, 10);
    });
  });

  return () => selected;
}

function initQuestionRange(inputId, displayId, defaultVal = 40) {
  const input = document.getElementById(inputId);
  const display = document.getElementById(displayId);
  if (!input || !display) return () => defaultVal;

  input.value = defaultVal;
  display.textContent = defaultVal;
  input.addEventListener('input', () => {
    display.textContent = input.value;
  });
  return () => parseInt(input.value, 10);
}

function initUserDispatch(listId, searchId, allBtnId, selectedBtnId, panelId) {
  const listEl = document.getElementById(listId);
  const searchEl = document.getElementById(searchId);
  const allBtn = document.getElementById(allBtnId);
  const selectedBtn = document.getElementById(selectedBtnId);
  const panel = document.getElementById(panelId);
  const selectAllBtn = document.getElementById(`${listId}-select-all`);

  if (!listEl) return { getDispatch: () => ({ mode: 'all', users: [] }) };

  let mode = 'all';

  function renderList(filter = '') {
    const q = filter.toLowerCase();
    const filtered = DEMO_STUDENTS.filter(s =>
      s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
    );

    listEl.innerHTML = filtered.map(s => `
      <label class="user-item" data-id="${s.id}">
        <input type="checkbox" class="user-cb" value="${s.id}" ${mode === 'all' ? 'checked' : ''} />
        <div class="user-avatar">${s.name.charAt(0)}</div>
        <div class="user-info">
          <div class="name">${s.name}</div>
          <div class="email">${s.email}</div>
        </div>
      </label>
    `).join('');
  }

  renderList();

  if (searchEl) {
    searchEl.addEventListener('input', () => renderList(searchEl.value));
  }

  if (allBtn && selectedBtn) {
    allBtn.addEventListener('click', () => {
      mode = 'all';
      allBtn.classList.add('active');
      selectedBtn.classList.remove('active');
      if (panel) panel.classList.add('hidden');
      renderList(searchEl?.value || '');
    });
    selectedBtn.addEventListener('click', () => {
      mode = 'selected';
      selectedBtn.classList.add('active');
      allBtn.classList.remove('active');
      if (panel) panel.classList.remove('hidden');
      renderList(searchEl?.value || '');
      listEl.querySelectorAll('.user-cb').forEach(cb => { cb.checked = false; });
    });
  }

  if (selectAllBtn) {
    selectAllBtn.addEventListener('click', () => {
      const boxes = listEl.querySelectorAll('.user-cb');
      const allChecked = [...boxes].every(b => b.checked);
      boxes.forEach(b => { b.checked = !allChecked; });
      selectAllBtn.textContent = allChecked ? 'Select All' : 'Deselect All';
    });
  }

  return {
    getDispatch() {
      if (mode === 'all') {
        return { mode: 'all', users: DEMO_STUDENTS.map(s => s.id) };
      }
      const ids = [...listEl.querySelectorAll('.user-cb:checked')].map(cb => cb.value);
      return { mode: 'selected', users: ids };
    },
    getMode: () => mode,
  };
}

function setGenerating(loadingEl, active, textEl, message) {
  if (!loadingEl) return;
  loadingEl.classList.toggle('active', active);
  if (textEl && message) textEl.innerHTML = message;
}

function randomDiff(baseDiff) {
  if (baseDiff !== 'mixed') return baseDiff;
  const opts = ['easy', 'medium', 'hard'];
  return opts[Math.floor(Math.random() * opts.length)];
}

function initModeToggle(autoBtnId, manualBtnId, autoSectionId, manualSectionId, defaultMode = 'auto', onModeChange) {
  const autoBtn       = document.getElementById(autoBtnId);
  const manualBtn     = document.getElementById(manualBtnId);
  const autoSection   = document.getElementById(autoSectionId);
  const manualSection = document.getElementById(manualSectionId);

  let mode = defaultMode;

  function apply() {
    if (autoBtn)   autoBtn.classList.toggle('active', mode === 'auto');
    if (manualBtn) manualBtn.classList.toggle('active', mode === 'manual');
    if (autoSection)   autoSection.classList.toggle('hidden', mode !== 'auto');
    if (manualSection) manualSection.classList.toggle('hidden', mode !== 'manual');
    if (typeof onModeChange === 'function') onModeChange(mode);
  }

  if (autoBtn)   autoBtn.addEventListener('click',   () => { mode = 'auto';   apply(); });
  if (manualBtn) manualBtn.addEventListener('click', () => { mode = 'manual'; apply(); });
  apply();

  return () => mode;
}

function normalizeLine(line) {
  return line.replace(/\r/g, '').trim();
}

function splitIntoBlocks(rawText) {
  let text = (rawText || '').replace(/\r\n/g, '\n').trim();
  if (!text) return [];

  const lines = text.split('\n');

  // ── PASS 1: Find line indices where each numbered question starts ──
  const extractNumRegex = /^\s*(?:(?:question|q|ques)\s*:?\s*(\d+)[\)\.\-]?|(\d+)\s*[\)\.\-])(?:[ \t]+|$)/i;
  const answerRegex = /^\s*(?:answer|ans|correct)\s*[:=-]/i;

  const questionStarts = [];  // Array of { lineIdx, num }
  let expectedNumber = 1;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(extractNumRegex);
    if (match) {
      const num = parseInt(match[1] || match[2], 10);
      if (num === expectedNumber) {
        questionStarts.push({ lineIdx: i, num });
        expectedNumber++;
      }
    }
  }

  // If no sequential questions found, fall back to blank-line splitting
  if (questionStarts.length === 0) {
    let fallback = text.split(/\n\s*\n+/).map(b => b.trim()).filter(Boolean);
    if (fallback.length > 1) return fallback;

    // Fallback 2: Aggressive splitting after ANSWER lines
    const aggressiveBlocks = [];
    let current = [];
    let sawAns = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (sawAns && line.trim() !== '') {
        aggressiveBlocks.push(current.join('\n'));
        current = [];
        sawAns = false;
      }
      current.push(line);
      if (answerRegex.test(line)) sawAns = true;
    }
    if (current.length > 0) aggressiveBlocks.push(current.join('\n'));
    const aggValid = aggressiveBlocks.map(b => b.trim()).filter(Boolean);
    return aggValid.length > 1 ? aggValid : fallback;
  }

  // ── PASS 2: Extract clean blocks — one per numbered question ──
  // Each block runs from its "Question: N." line up to (but not including)
  // the next question's start line.  Within that range we trim off any
  // orphan content that appears AFTER the ANSWER line.
  const blocks = [];

  for (let q = 0; q < questionStarts.length; q++) {
    const startLine = questionStarts[q].lineIdx;
    const endLine = (q + 1 < questionStarts.length)
      ? questionStarts[q + 1].lineIdx
      : lines.length;

    // Collect lines for this question, but stop after the FIRST answer line
    // plus any trailing blank lines.  Everything after that is orphan junk.
    const blockLines = [];
    let foundAnswer = false;

    for (let i = startLine; i < endLine; i++) {
      const line = lines[i];

      if (foundAnswer) {
        // After the answer we only allow blank lines (ignore orphan content)
        if (line.trim() === '') continue;
        // If we hit non-blank text after the answer, it's orphan — stop
        break;
      }

      blockLines.push(line);

      if (answerRegex.test(line)) {
        foundAnswer = true;
      }
    }

    const joined = blockLines.join('\n').trim();
    if (joined) blocks.push(joined);
  }

  return blocks;
}

function parseManualExamInput(raw, optionCount) {
  const blocks = splitIntoBlocks(raw);
  if (!blocks.length) return [];
  const letters = ['A', 'B', 'C', 'D', 'E'];

  const items = [];
  for (const block of blocks) {
    const lines = block.split('\n').map(normalizeLine).filter(Boolean);
    if (!lines.length) continue;

    // Extract answer (supports: Answer: B | Ans: C | Correct: A)
    let answerLetter = '';
    const remaining = [];
    for (const ln of lines) {
      const m = ln.match(/^(answer|ans|correct)\s*[:=-]\s*([A-E])/i);
      if (m) {
        answerLetter = m[2].toUpperCase();
      } else {
        remaining.push(ln);
      }
    }

    // First non-option line is question
    let question = '';
    const optionLines = [];
    for (const ln of remaining) {
      const opt = ln.match(/^([A-E])[\)\.\:\-]\s*(.+)$/i);
      if (opt) optionLines.push({ letter: opt[1].toUpperCase(), text: opt[2].trim() });
      else if (!question) question = ln.replace(/^\d+[\)\.\-]\s*/, '').trim();
      else {
        // Continuation line → append to question
        question += ` ${ln}`.trim();
      }
    }

    if (!question) continue;

    // If options are missing/partial, we still build placeholders
    const opts = [];
    for (let i = 0; i < optionCount; i++) {
      const letter = letters[i];
      const provided = optionLines.find(o => o.letter === letter);
      opts.push({
        letter,
        text: provided ? provided.text : `Option ${letter}`,
        correct: answerLetter ? letter === answerLetter : false,
      });
    }

    // If they provided answer as text, allow: Answer: 16 (matches option text)
    if (!answerLetter) {
      const mTxt = block.match(/^(answer|ans|correct)\s*[:=-]\s*(.+)$/im);
      if (mTxt && mTxt[2]) {
        const ansText = mTxt[2].trim();
        const match = opts.find(o => o.text.toLowerCase() === ansText.toLowerCase());
        if (match) match.correct = true;
      }
    }

    items.push({ question, options: opts });
  }

  return items;
}

function parseManualFlashInput(raw) {
  const text = (raw || '').trim();
  if (!text) return [];

  // Preferred format:
  // Front: ...
  // Back: ...
  // (blank line) repeat
  const blocks = splitIntoBlocks(text);
  const items = [];
  for (const block of blocks) {
    let front = '';
    let back = '';
    const lines = block.split('\n').map(normalizeLine).filter(Boolean);
    for (const ln of lines) {
      const f = ln.match(/^front\s*[:=-]\s*(.+)$/i);
      const b = ln.match(/^back\s*[:=-]\s*(.+)$/i);
      if (f) front = f[1].trim();
      else if (b) back = b[1].trim();
    }

    // Fallback: allow "term - definition" single line
    if (!front && !back && lines.length === 1) {
      const parts = lines[0].split(/\s*-\s*/);
      if (parts.length >= 2) {
        front = parts[0].trim();
        back = parts.slice(1).join(' - ').trim();
      }
    }

    if (!front) continue;
    if (!back) back = 'Add explanation/definition here.';
    items.push({ front, back });
  }
  return items;
}

function parseManualPuzzleInput(raw, optionCount) {
  const blocks = splitIntoBlocks(raw);
  if (!blocks.length) return [];

  const letters = ['A', 'B', 'C', 'D', 'E'];
  const items = [];
  for (const block of blocks) {
    const lines = block.split('\n').map(normalizeLine).filter(Boolean);
    if (!lines.length) continue;

    let correct = '';
    const remaining = [];
    for (const ln of lines) {
      const m = ln.match(/^(answer|ans|correct)\s*[:=-]\s*(.+)$/i);
      if (m) correct = m[2].trim();
      else remaining.push(ln);
    }

    let question = '';
    const optionLines = [];
    for (const ln of remaining) {
      const opt = ln.match(/^([A-E])[\)\.\:\-]\s*(.+)$/i);
      if (opt) optionLines.push({ letter: opt[1].toUpperCase(), text: opt[2].trim() });
      else if (!question) question = ln.replace(/^\d+[\)\.\-]\s*/, '').trim();
      else question += ` ${ln}`.trim();
    }

    if (!question) continue;

    // Build option strings
    const opts = [];
    for (let i = 0; i < optionCount; i++) {
      const letter = letters[i];
      const provided = optionLines.find(o => o.letter === letter);
      opts.push(provided ? provided.text : `Option ${letter}`);
    }

    // Determine correctAnswer:
    // - If correct is A-E → map to option value
    // - else treat it as literal answer text
    let correctAnswer = '';
    if (correct && /^[A-E]$/i.test(correct)) {
      const idx = letters.indexOf(correct.toUpperCase());
      correctAnswer = opts[idx] || opts[0];
    } else if (correct) {
      correctAnswer = correct;
    } else {
      correctAnswer = opts[1] || opts[0];
    }

    items.push({ question, options: opts, correctAnswer });
  }
  return items;
}

// generateExamQuestions — fires CONCURRENT requests across all API keys
async function generateExamQuestions(count, optionCount, subject, prompt, difficulty, modelId, onProgress, startItems = []) {
  const keys = await loadMistralApiKeys();
  const CONCURRENCY = keys.length; // Fire one request per key simultaneously
  let allItems = [...startItems];

  while (allItems.length < count) {
    const remaining = count - allItems.length;
    const batchCount = Math.min(CONCURRENCY, remaining);

    onProgress?.(allItems.length, count, `Generating ${batchCount} question(s) concurrently`, allItems);

    // Build one prompt per concurrent slot
    const promises = [];
    for (let k = 0; k < batchCount; k++) {
      const keyToUse = keys[k % keys.length];
      const fullPrompt = buildExamPrompt(1, optionCount, subject, prompt, difficulty);

      const task = (async () => {
        let retries = 3;
        while (retries > 0) {
          try {
            const rawText = await callMistralApiWithKey(keyToUse, modelId, fullPrompt);
            return parseMistralExamResponse(rawText, subject);
          } catch (err) {
            retries--;
            if (retries === 0) {
              console.error(`Key ${keyToUse.slice(0,6)}... failed after retries:`, err);
              return []; // Return empty on total failure — other keys may succeed
            }
            console.warn(`Retrying with key ${keyToUse.slice(0,6)}...`, err);
          }
        }
        return [];
      })();

      promises.push(task);
    }

    // Fire all concurrently and collect results
    const results = await Promise.allSettled(promises);

    for (const result of results) {
      if (allItems.length >= count) break;
      const batchItems = result.status === 'fulfilled' ? result.value : [];
      if (!batchItems.length) continue;

      const numberedBatch = batchItems.map((item, idx) => ({
        ...item,
        num: allItems.length + idx + 1
      }));

      allItems = allItems.concat(numberedBatch);
      localStorage.setItem('elite_exam_partial_gen', JSON.stringify(allItems));
      onProgress?.(allItems.length, count, `Generated question`, allItems);
    }

    // If zero results came back from all keys, throw to avoid infinite loop
    const anySuccess = results.some(r => r.status === 'fulfilled' && r.value.length > 0);
    if (!anySuccess) {
      throw new Error('All API keys failed. Check your keys in app_settings.');
    }
  }

  onProgress?.(count, count, `Generation complete`, allItems);
  return allItems.slice(0, count);
}

async function generateFlashCardsAI(count, subject, prompt, difficulty, modelId, onProgress) {
  const BATCH_SIZE = 15;
  let allItems = [];

  while (allItems.length < count) {
    const remaining = count - allItems.length;
    const currentBatchCount = Math.min(BATCH_SIZE, remaining);

    onProgress?.(allItems.length, count, `Generating flash cards`);

    const fullPrompt = `You are an expert AI assistant creating flashcards for a course: ${subject}.
Generate exactly ${currentBatchCount} flashcards.
Difficulty: ${difficulty}.
Context: ${prompt}

Rules:
- Return ONLY valid JSON. No markdown.
- Format: [{"front":"Question or term...","back":"Clear explanation or definition...","difficulty":"${difficulty}"}]
- Keep it concise but highly educational.
- Generate all ${currentBatchCount} flashcards. Do not truncate.`;

    let retries = 3;
    let batchItems = [];

    while (retries > 0) {
      try {
        const rawText = await callMistralApi(modelId, fullPrompt);
        let clean = rawText.trim().replace(/^```[\w]*\n?/,'').replace(/\n?```$/,'').trim();
        let parsed = JSON.parse(clean);
        if (!Array.isArray(parsed)) throw new Error('Not an array');
        
        batchItems = parsed.map(item => ({
          front: item.front || 'Question missing',
          back: item.back || 'Answer missing',
          difficulty: item.difficulty || difficulty
        }));
        break;
      } catch (err) {
        retries--;
        if (retries === 0) throw new Error(`Flashcard generation failed: ${err.message}`);
        console.warn('Retrying flashcard generation...', err);
      }
    }

    allItems = allItems.concat(batchItems);
  }

  onProgress?.(count, count, `Processing complete`);
  return allItems.slice(0, count).map((item, idx) => ({ ...item, num: idx + 1, front: `${item.front}` }));
}

async function formatManualFlashCardsAI(rawText, subject, difficulty, modelId, onProgress) {
  onProgress?.(0, 0, `Detecting questions and formatting...`);

  const fullPrompt = `You are an expert AI assistant formatting flashcards for a course: ${subject}.
The user has provided raw text containing questions and answers.
Your job is to detect all the questions/answers, and format them into a structured JSON array.

Raw Text:
"""
${rawText}
"""

Rules:
- TELL THE AI NOT TO CHANGE THE QUESTION AND THE ANSWER. Keep the exact text provided by the user.
- Return ONLY valid JSON. No markdown.
- Format: [{"front":"...","back":"...","difficulty":"${difficulty}"}]
- Detect the number of questions automatically and output all of them. Do not truncate.`;

  let retries = 3;
  while (retries > 0) {
    try {
      const rawRes = await callMistralApi(modelId, fullPrompt);
      let clean = rawRes.trim().replace(/^```[\w]*\n?/,'').replace(/\n?```$/,'').trim();
      let parsed = JSON.parse(clean);
      if (!Array.isArray(parsed)) throw new Error('Not an array');
      
      onProgress?.(parsed.length, parsed.length, `Processed ${parsed.length} questions`);
      return parsed.map((item, idx) => ({
        num: idx + 1,
        front: `${item.front}`,
        back: item.back,
        difficulty: item.difficulty || difficulty
      }));
    } catch (err) {
      retries--;
      if (retries === 0) throw new Error(`Manual formatting failed: ${err.message}`);
      console.warn('Retrying manual format...', err);
    }
  }
  return [];
}

async function saveFlashCardsToDB(deckName, course, description, cards) {
  const client = window.getSupabaseClient();
  const batchId = crypto.randomUUID();
  
  // Store deck metadata inside subject column as JSON
  const subjectMetadata = JSON.stringify({
    deck_name: deckName,
    course: course,
    description: description
  });

  const rowsToInsert = cards.map(c => ({
    batch_id: batchId,
    subject: subjectMetadata,
    question: c.front,
    answer: c.back,
    explanation: ''
  }));

  const { data, error } = await client.from('flash_cards').insert(rowsToInsert);
  if (error) throw new Error(error.message);
  return data;
}

async function generatePuzzleQuestions(count, subject, prompt, difficulty, modelId, optionCount, onProgress) {
  const BATCH_SIZE = 20;
  let allItems = [];
  const letters = ['A', 'B', 'C', 'D', 'E'].slice(0, optionCount).join(', ');

  while (allItems.length < count) {
    const remaining = count - allItems.length;
    const currentBatchCount = Math.min(BATCH_SIZE, remaining);

    onProgress?.(allItems.length, count, `Generating puzzle rounds`);

    const fullPrompt = `You are an expert exam question creator for Nigerian secondary school students.
Generate exactly ${currentBatchCount} multiple-choice puzzle questions for the subject/course code: ${subject}.
Difficulty: ${difficulty}.
Options per question: ${optionCount} (labelled ${letters}).

Additional context from admin: ${prompt}

Rules:
- Return ONLY valid JSON. No markdown.
- Format: [{"question":"...","options":[{"letter":"A","text":"...","correct":false},{"letter":"B","text":"...","correct":true},...],"difficulty":"medium"}]
- Exactly one option per question must have "correct": true.
- Keep the options very short as they will be displayed on small floating puzzle balls.
- Do NOT number the questions — the system will number them.
- Generate all ${currentBatchCount} questions. Do not truncate.`;

    let retries = 3;
    let batchItems = [];

    while (retries > 0) {
      try {
        const rawText = await callMistralApi(modelId, fullPrompt);
        const parsed = parseMistralExamResponse(rawText, subject);
        
        batchItems = parsed.map((item, i) => {
          const correctOpt = item.options.find(o => o.correct) || item.options[0];
          return {
            question: item.question,
            options: item.options.map(o => o.text),
            correctAnswer: correctOpt.text,
            difficulty: item.difficulty,
          };
        });
        break;
      } catch (err) {
        retries--;
        if (retries === 0) throw new Error(`Puzzle generation failed: ${err.message}`);
        console.warn('Retrying Mistral puzzle generation...', err);
      }
    }

    allItems = allItems.concat(batchItems);
  }

  onProgress?.(count, count, `Generation complete`);
  return allItems.slice(0, count).map((item, idx) => ({ ...item, num: idx + 1 }));
}

async function saveElitePuzzle(title, courseCode, timeLimit, levelLabel, rounds) {
  const client = window.getSupabaseClient();
  const { data, error } = await client
    .from('elite_puzzles')
    .insert([{
      title,
      course_code: courseCode,
      time_limit: parseInt(timeLimit, 10),
      level_label: levelLabel,
      rounds
    }]);

  if (error) {
    console.error('Error saving elite puzzle:', error);
    throw new Error('Failed to save elite puzzle: ' + error.message);
  }
  return data;
}

function renderExamPreview(container, items) {
  if (!container) return;
  if (!items.length) {
    container.innerHTML = `<div class="preview-empty"><div class="icon">📋</div><h4>No questions yet</h4><p>Configure settings and click Generate Preview</p></div>`;
    return;
  }
  container.innerHTML = items.map(item => `
    <div class="preview-card" style="animation-delay:${item.num * 0.05}s">
      <div class="preview-card-header">
        <span class="preview-card-num">Q${item.num}</span>
        <span class="preview-card-diff diff-${item.difficulty}">${item.difficulty}</span>
      </div>
      <p class="preview-card-q">${item.question}</p>
      <div class="preview-options">
        ${item.options.map(o => `
          <div class="preview-opt ${o.correct ? 'correct' : ''}">${o.letter}. ${o.text}</div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

function renderFlashPreview(container, items) {
  if (!container) return;
  if (!items.length) {
    container.innerHTML = `<div class="preview-empty"><div class="icon">🃏</div><h4>No flash cards yet</h4><p>Configure your deck and generate</p></div>`;
    return;
  }
  container.innerHTML = items.slice(0, 6).map(item => `
    <div class="preview-card flash-preview-card">
      <div class="flash-preview-inner">
        <div class="preview-card-header">
          <span class="preview-card-num">Card ${item.num}</span>
          <span class="preview-card-diff diff-${item.difficulty}">${item.difficulty}</span>
        </div>
        <div class="flash-preview-front">${item.front}</div>
        <div class="flash-preview-back">${item.back}</div>
      </div>
    </div>
  `).join('') + (items.length > 6 ? `<p style="text-align:center;color:var(--text-muted);font-size:0.85rem;margin-top:12px;">+ ${items.length - 6} more cards</p>` : '');
}

function renderPuzzlePreview(container, items) {
  if (!container) return;
  if (!items.length) {
    container.innerHTML = `<div class="preview-empty"><div class="icon">🧩</div><h4>No puzzle items yet</h4><p>Configure arena settings and generate</p></div>`;
    return;
  }
  container.innerHTML = items.slice(0, 6).map(item => `
    <div class="preview-card">
      <div class="preview-card-header">
        <span class="preview-card-num">Round ${item.num}</span>
        <span class="preview-card-diff diff-${item.difficulty}">${item.difficulty}</span>
      </div>
      <p class="preview-card-q">${item.question}</p>
      <div class="preview-options">
        ${item.options.map(o => `
          <div class="preview-opt ${o === item.correctAnswer ? 'correct' : ''}">${o}</div>
        `).join('')}
      </div>
      <p style="font-size:0.75rem;color:var(--text-muted);margin-top:8px;">✅ +${item.points} pts · ❌ −${item.penalty} pts</p>
    </div>
  `).join('') + (items.length > 6 ? `<p style="text-align:center;color:var(--text-muted);font-size:0.85rem;margin-top:12px;">+ ${items.length - 6} more rounds</p>` : '');
}

function updatePreviewStats(statsEl, count, subject, model) {
  if (!statsEl) return;
  statsEl.innerHTML = `
    <div class="preview-stat"><div class="num">${count}</div><div class="lbl">Generated</div></div>
    <div class="preview-stat"><div class="num" style="font-size:0.9rem">${subject.slice(0, 3)}</div><div class="lbl">Subject</div></div>
    <div class="preview-stat"><div class="num" style="font-size:0.75rem">${model.split('-')[0]}</div><div class="lbl">AI Model</div></div>
  `;
  statsEl.style.display = count ? 'grid' : 'none';
}

async function simulateGeneration(loadingEl, textEl, count, modelName, onComplete) {
  // This is now only used for manual (paste) mode — AI mode uses the real progress callback
  setGenerating(loadingEl, true, textEl, `Processing <strong>${count}</strong> questions…`);
  await new Promise(r => setTimeout(r, 600));
  setGenerating(loadingEl, false);
  onComplete();
}

function populateSubjectSelect(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel || !sel.options || sel.options.length > 1) return;
  SUBJECTS.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    sel.appendChild(opt);
  });
  if (selectId === 'subject-select') sel.value = 'Mathematics';
  if (selectId === 'flash-subject-select' || selectId === 'puzzle-subject-select') sel.value = 'Biology';
}

document.addEventListener('DOMContentLoaded', () => {
  populateSubjectSelect('subject-select');
  populateSubjectSelect('flash-subject-select');
  // Removed puzzle populate to allow text input
});
