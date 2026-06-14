/* ============================================
   ZOE TUTORIAL — FLASH CARD JS
   flash_card.js
   ─ With "Reviewed Done" tracking via Supabase
============================================ */

document.addEventListener('DOMContentLoaded', async () => {

  // ── DATA ──
  let flashcards = []; // Will be populated dynamically
  let allDecksMap = new Map(); // Store metadata for decks
  let selectedDeckName = null;
  let reviewedDecks = new Map(); // deck_name → { got_it_count, hard_count, reviewed_at }

  // ── STATE ──
  let currentCardIdx = 0;
  let isFlipped = false;
  
  // Stats
  let gotItCount = 0;
  let hardCount = 0;

  // ── DOM ELEMENTS ──
  const viewDeck = document.getElementById('deck-view');
  const viewStart = document.getElementById('start-view');
  const viewCard = document.getElementById('card-view');
  const viewComp = document.getElementById('completion-view');

  const btnStartBio = document.getElementById('deck-bio123');
  const btnStartDeckNow = document.getElementById('btn-start-deck');
  const btnBackToLibrary = document.getElementById('btn-back-to-library');
  const btnQuit = document.getElementById('btn-quit');
  const btnRestart = document.getElementById('btn-restart');
  const btnHome = document.getElementById('btn-home');

  const flashcardOuter = document.getElementById('flashcard');
  const flashcardInner = document.getElementById('flashcard-inner');
  const txtQuestion = document.getElementById('fc-question');
  const txtAnswer = document.getElementById('fc-answer');
  const txtExplanation = document.getElementById('fc-explanation');

  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const rateRow = document.getElementById('rate-row');
  const btnWrong = document.getElementById('btn-wrong');
  const btnCorrect = document.getElementById('btn-correct');

  const progText = document.getElementById('progress-text');
  const deckProgWrap = document.getElementById('deck-progress');
  const progFill = document.getElementById('progress-fill');

  // ── HELPER: Get current user ID ──
  async function getCurrentUserId() {
    try {
      const session = await window.EliteAuth.getSession();
      if (session && session.user) return session.user.id;
    } catch (e) { /* ignore */ }
    return null;
  }

  // ══════════════════════════════════════════════
  //  FETCH REVIEWED DECKS FROM SUPABASE
  // ══════════════════════════════════════════════
  async function fetchReviewedDecks() {
    try {
      const client = window.getSupabaseClient();
      const userId = await getCurrentUserId();
      if (!client || !userId) return;

      const { data, error } = await client
        .from('flash_card_reviews')
        .select('deck_name, got_it_count, hard_count, reviewed_at')
        .eq('user_id', userId);

      if (error) {
        console.warn('[FlashCard] Could not fetch reviews:', error.message);
        return;
      }

      reviewedDecks.clear();
      if (data) {
        data.forEach(row => {
          reviewedDecks.set(row.deck_name, {
            got_it_count: row.got_it_count,
            hard_count: row.hard_count,
            reviewed_at: row.reviewed_at
          });
        });
      }
    } catch (err) {
      console.warn('[FlashCard] fetchReviewedDecks error:', err);
    }
  }

  // ══════════════════════════════════════════════
  //  SAVE REVIEW TO SUPABASE (upsert)
  // ══════════════════════════════════════════════
  async function saveReviewToSupabase(deckName, gotIt, hard) {
    try {
      const client = window.getSupabaseClient();
      const userId = await getCurrentUserId();
      if (!client || !userId) return;

      const { error } = await client
        .from('flash_card_reviews')
        .upsert({
          user_id: userId,
          deck_name: deckName,
          got_it_count: gotIt,
          hard_count: hard,
          reviewed_at: new Date().toISOString()
        }, { onConflict: 'user_id,deck_name' });

      if (error) {
        console.error('[FlashCard] Save review error:', error.message);
      } else {
        // Update local cache
        reviewedDecks.set(deckName, {
          got_it_count: gotIt,
          hard_count: hard,
          reviewed_at: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('[FlashCard] saveReviewToSupabase error:', err);
    }
  }

  // ══════════════════════════════════════════════
  //  RENDER DECK CARDS (with reviewed state)
  // ══════════════════════════════════════════════
  function renderDeckGrid(uniqueDecks) {
    const deckGrid = document.getElementById('deck-grid');
    if (!deckGrid) return;

    if (uniqueDecks.length === 0) {
      deckGrid.innerHTML = `<div class="empty-state">No flash card decks available yet.</div>`;
      return;
    }

    deckGrid.innerHTML = uniqueDecks.map(deck => {
      const isReviewed = reviewedDecks.has(deck.deck_name);
      const reviewData = isReviewed ? reviewedDecks.get(deck.deck_name) : null;
      
      let pCount = parseInt(localStorage.getItem('fc_part_' + deck.deck_name) || '0', 10);
      if (isReviewed && pCount === 0) pCount = 1; // Fallback if they played before we added this

      // Badge
      const badgeHtml = `<span class="card-badge new-badge" style="background:rgba(56,189,248,0.15);color:#38bdf8;">${pCount > 0 ? 'Studied' : 'New Deck'}</span>`;

      // Button text: "Study Again" or "Study Now"
      const btnText = pCount > 0 ? 'Study Again' : 'Study Now';
      const btnIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`;

      const statsHtml = `<div class="ecf-meta-row">
             <div class="ecf-meta-item"><span class="ecf-meta-icon">📝</span><span>${deck.cards.length} Cards</span></div>
             ${pCount > 0 ? `<div class="ecf-meta-item" style="background:rgba(52,211,153,0.1);border-color:rgba(52,211,153,0.2);color:#34d399;"><span class="ecf-meta-icon">🔄</span><span>Participated: ${pCount} times</span></div>` : ''}
           </div>`;

      return `
        <div class="exam-card-full fc-theme" style="margin:0; padding:0; width:100%;">
          <div style="padding: 24px;">
            <div class="ecf-top">
              <div class="ecf-subject-badge">🧬 ${deck.course}</div>
              ${badgeHtml}
            </div>
            <h3 class="ecf-title">${deck.deck_name}</h3>
            <p class="ecf-desc">${deck.description}</p>
            ${statsHtml}
          </div>
          <button class="btn-begin-exam btn-open-deck" data-deck="${escapeHtml(deck.deck_name)}" style="display: block; width: calc(100% - 48px); margin: 0 24px 24px;">
            ${btnText} ${btnIcon}
          </button>
        </div>
      `;
    }).join('');

    // Attach listeners
    document.querySelectorAll('.btn-open-deck').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const dName = e.currentTarget.getAttribute('data-deck');
        openStartOverlay(dName);
      });
    });
  }

  // ── FETCH AND INITIALIZATION LOGIC ──
  async function initFlashCards() {
    const client = window.getSupabaseClient();
    if (!client) {
      console.error("Supabase client not initialized.");
      return;
    }

    try {
      // Fetch reviewed decks first so we can render badges
      await fetchReviewedDecks();

      const { data, error } = await client.from('flash_cards').select('*');
      if (error) throw error;
      
      const decksMap = new Map();
      if (data) {
        data.forEach(fc => {
          let meta = {};
          try {
            meta = JSON.parse(fc.subject);
            if (!meta.deck_name) throw new Error('Not JSON format');
          } catch(e) {
            const sub = fc.subject || 'General';
            meta = { deck_name: sub + ' Deck', course: sub, description: 'General review cards' };
          }
          
          if (!decksMap.has(meta.deck_name)) {
            decksMap.set(meta.deck_name, { ...meta, cards: [fc] });
          } else {
            decksMap.get(meta.deck_name).cards.push(fc);
          }
        });
      }
      
      allDecksMap = decksMap;
      const uniqueDecks = Array.from(decksMap.values());

      // Render deck cards with reviewed state
      renderDeckGrid(uniqueDecks);

      // Check URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const preselectedDeck = urlParams.get('deck');
      if (preselectedDeck && decksMap.has(preselectedDeck)) {
        openStartOverlay(preselectedDeck);
      }

      // ── RESTORE STATE ──
      if (sessionStorage.getItem('fc_is_playing') === 'true') {
        const deckName = sessionStorage.getItem('fc_active_deck');
        if (deckName && decksMap.has(deckName)) {
          selectedDeckName = deckName;
          const deckInfo = decksMap.get(deckName);
          flashcards = deckInfo.cards.map(c => ({
            id: c.id,
            q: c.question,
            a: c.answer,
            exp: c.explanation || '',
            viewCount: c.view_count || 0
          }));
          currentCardIdx = parseInt(sessionStorage.getItem('fc_card_idx') || '0', 10);
          gotItCount = parseInt(sessionStorage.getItem('fc_got_it') || '0', 10);
          hardCount = parseInt(sessionStorage.getItem('fc_hard') || '0', 10);
          
          document.getElementById('cv-deck-badge').textContent = `🧬 ${deckInfo.course}`;

          viewDeck.style.display = 'none';
          viewStart.style.display = 'none';
          viewComp.style.display = 'none';
          viewCard.style.display = 'flex';
          deckProgWrap.style.display = 'block';
          document.body.classList.add('game-mode-active');
          
          renderCard();
          return;
        }
      }

    } catch (err) {
      console.error('Error fetching flashcards:', err);
      const deckGrid = document.getElementById('deck-grid');
      if (deckGrid) deckGrid.innerHTML = `<div class="empty-state">Error loading decks. Please try again.</div>`;
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ── STATE PERSISTENCE ──
  function saveState() {
    sessionStorage.setItem('fc_active_deck', selectedDeckName);
    sessionStorage.setItem('fc_card_idx', currentCardIdx.toString());
    sessionStorage.setItem('fc_got_it', gotItCount.toString());
    sessionStorage.setItem('fc_hard', hardCount.toString());
    sessionStorage.setItem('fc_is_playing', 'true');
  }

  function clearState() {
    sessionStorage.removeItem('fc_active_deck');
    sessionStorage.removeItem('fc_card_idx');
    sessionStorage.removeItem('fc_got_it');
    sessionStorage.removeItem('fc_hard');
    sessionStorage.removeItem('fc_is_playing');
  }

  // Kick off
  initFlashCards();

  function openStartOverlay(deckName) {
    const deckInfo = allDecksMap.get(deckName);
    if (!deckInfo) return;
    
    selectedDeckName = deckName;
    const isReviewed = reviewedDecks.has(deckName);
    const reviewData = isReviewed ? reviewedDecks.get(deckName) : null;

    document.getElementById('start-title').textContent = deckInfo.deck_name;

    if (isReviewed) {
      const d = new Date(reviewData.reviewed_at);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      document.getElementById('start-desc').textContent = `You last studied this deck on ${dateStr}. It contains ${deckInfo.cards.length} cards. Feel free to study again!`;
      btnStartDeckNow.textContent = '🔄 Study Again';
    } else {
      document.getElementById('start-desc').textContent = `${deckInfo.description} Contains ${deckInfo.cards.length} cards.`;
      btnStartDeckNow.textContent = 'Start Studying';
    }
    
    // Set global flashcards array to just this deck
    flashcards = deckInfo.cards.map(c => ({
      id: c.id,
      q: c.question,
      a: c.answer,
      exp: c.explanation || '',
      viewCount: c.view_count || 0
    }));
    
    document.getElementById('cv-deck-badge').textContent = `🧬 ${deckInfo.course}`;

    viewDeck.style.display = 'none';
    viewStart.style.display = 'flex';
  }

  btnBackToLibrary.addEventListener('click', () => {
    viewStart.style.display = 'none';
    viewDeck.style.display = 'block';
  });

  btnStartDeckNow.addEventListener('click', () => {
    // Reset state
    currentCardIdx = 0;
    gotItCount = 0;
    hardCount = 0;

    saveState();

    // Switch Views
    viewStart.style.display = 'none';
    viewCard.style.display = 'flex';
    viewComp.style.display = 'none';
    deckProgWrap.style.display = 'block';

    document.body.classList.add('game-mode-active');

    renderCard();
  });

  btnQuit.addEventListener('click', quitToLibrary);
  btnHome.addEventListener('click', quitToLibrary);

  function quitToLibrary() {
    clearState();
    viewCard.style.display = 'none';
    viewComp.style.display = 'none';
    viewStart.style.display = 'none';
    viewDeck.style.display = 'block';
    deckProgWrap.style.display = 'none';
    document.body.classList.remove('game-mode-active');

    // Re-render deck grid to reflect any new reviewed states
    const uniqueDecks = Array.from(allDecksMap.values());
    renderDeckGrid(uniqueDecks);
  }

  btnRestart.addEventListener('click', () => {
    btnStartDeckNow.click();
  });


  // ── FLASHCARD LOGIC ──
  flashcardOuter.addEventListener('click', () => {
    isFlipped = !isFlipped;
    flashcardInner.classList.toggle('flipped', isFlipped);
    
    // Show rating buttons when back is revealed
    if (isFlipped) {
      rateRow.style.opacity = '1';
      rateRow.style.pointerEvents = 'auto';
      rateRow.style.transform = 'translateY(0)';
    }
  });

  function renderCard() {
    isFlipped = false;
    flashcardInner.classList.remove('flipped');
    
    // Hide rating buttons initially
    rateRow.style.opacity = '0';
    rateRow.style.pointerEvents = 'none';
    rateRow.style.transform = 'translateY(10px)';

    const card = flashcards[currentCardIdx];
    
    // Animate text change slightly
    txtQuestion.style.opacity = 0;
    txtAnswer.style.opacity = 0;
    
    setTimeout(() => {
      txtQuestion.textContent = card.q;
      txtAnswer.textContent = card.a;
      txtExplanation.textContent = card.exp;
      txtQuestion.style.opacity = 1;
      txtAnswer.style.opacity = 1;
      
      const vcEl = document.getElementById('fc-view-count');
      const vcElBack = document.getElementById('fc-view-count-back');
      if (vcEl) {
        vcEl.innerHTML = `<span class="fc-view-icon">👀</span> Viewed (${card.viewCount} times)`;
      }
      if (vcElBack) {
        vcElBack.innerHTML = `<span class="fc-view-icon">👀</span> Viewed (${card.viewCount} times)`;
      }

      // Increment view count in background
      incrementCardViewCount(card);
    }, 150);

    // Update Progress
    const humanNum = currentCardIdx + 1;
    progText.textContent = `${humanNum} / ${flashcards.length}`;
    progFill.style.width = `${(humanNum / flashcards.length) * 100}%`;

    // Button states
    const isFirst = (currentCardIdx === 0);
    btnPrev.disabled = isFirst;
  }

  btnPrev.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentCardIdx > 0) {
      currentCardIdx--;
      saveState();
      renderCard();
    }
  });

  btnNext.addEventListener('click', (e) => {
    e.stopPropagation();
    advanceCard();
  });

  // Rating buttons
  btnWrong.addEventListener('click', (e) => {
    e.stopPropagation();
    hardCount++;
    advanceCard();
  });

  btnCorrect.addEventListener('click', (e) => {
    e.stopPropagation();
    gotItCount++;
    advanceCard();
  });

  function advanceCard() {
    if (currentCardIdx < flashcards.length - 1) {
      currentCardIdx++;
      saveState();
      renderCard();
    } else {
      showCompletion();
    }
  }

  async function showCompletion() {
    clearState();
    viewCard.style.display = 'none';
    viewComp.style.display = 'flex';
    deckProgWrap.style.display = 'none';

    document.body.classList.remove('game-mode-active');

    document.getElementById('cs-gotit').textContent = gotItCount;
    document.getElementById('cs-hard').textContent = hardCount;

    // ── SAVE REVIEW TO SUPABASE ──
    if (selectedDeckName) {
      let currentPCount = parseInt(localStorage.getItem('fc_part_' + selectedDeckName) || '0', 10);
      if (currentPCount === 0 && reviewedDecks.has(selectedDeckName)) currentPCount = 1; // Fallback
      localStorage.setItem('fc_part_' + selectedDeckName, currentPCount + 1);
      
      await saveReviewToSupabase(selectedDeckName, gotItCount, hardCount);
    }
  }

  // ── VIEW TRACKING ──
  async function incrementCardViewCount(card) {
    if (!card || !card.id) return;
    try {
      const client = window.getSupabaseClient();
      if (!client) return;

      // Increment locally
      card.viewCount++;
      const vcEl = document.getElementById('fc-view-count');
      const vcElBack = document.getElementById('fc-view-count-back');
      if (vcEl) {
        vcEl.innerHTML = `<span class="fc-view-icon">👀</span> Viewed (${card.viewCount} times)`;
      }
      if (vcElBack) {
        vcElBack.innerHTML = `<span class="fc-view-icon">👀</span> Viewed (${card.viewCount} times)`;
      }

      // Update the original object in allDecksMap so the count persists when returning to library
      for (const deck of allDecksMap.values()) {
        const origCard = deck.cards.find(orig => orig.id === card.id);
        if (origCard) {
          origCard.view_count = card.viewCount;
        }
      }

      // Update in Supabase
      const { error } = await client.from('flash_cards')
        .update({ view_count: card.viewCount })
        .eq('id', card.id);
        
      if (error) {
        console.warn('[FlashCard] Supabase view update failed (did you run the SQL command?):', error.message);
      }
    } catch (err) {
      console.warn('[FlashCard] Could not increment view count', err);
    }
  }

});
