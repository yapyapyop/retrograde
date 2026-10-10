<script lang="ts">
  import { onMount } from 'svelte';
  import { 
    toDateKey, 
    getTodayKey, 
    formatDisplayDate, 
    loadEntry, 
    saveEntry,
    deleteEntry,
  } from '$lib/storage';

  let currentDate = $state<Date>(new Date());
  let currentDateKey = $derived(toDateKey(currentDate));
  let isToday = $derived(currentDateKey === getTodayKey());
  let displayDate = $derived(formatDisplayDate(currentDate));

  let ratingStr = $state<string>('');
  let note = $state<string>('');
  let saveStatus = $state<'idle' | 'saved'>('idle');
  let hasSavedRecord = $derived(loadEntry(currentDateKey) !== null);

  export function reload() {
    loadForCurrentDate();
  }

  function loadForCurrentDate() {
    const existing = loadEntry(currentDateKey);
    if (existing) {
      ratingStr = existing.rating.toString();
      note = existing.note;
    } else {
      ratingStr = '';
      note = '';
    }
    saveStatus = 'idle';
  }

  onMount(() => {
    loadForCurrentDate();
  });

  function changeDate(days: number) {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + days);
    if (toDateKey(next) > getTodayKey()) return;
    currentDate = next;
    loadForCurrentDate();
  }

  function handleDelete() {
  if (confirm(`Delete the entry for ${displayDate}?`)) {
    deleteEntry(currentDateKey);
    ratingStr = '';
    note = '';
    saveStatus = 'idle';
  }
}

  function goToToday() {
    currentDate = new Date();
    loadForCurrentDate();
  }

  const numericRating = $derived(
    ratingStr !== '' && !isNaN(parseFloat(ratingStr)) ? parseFloat(ratingStr) : null
  );

  const isValidRating = $derived(
    numericRating !== null && numericRating >= 1 && numericRating <= 10
  );

  function handleSave() {
    if (!isValidRating || numericRating === null) return;

    saveEntry({
      date: currentDateKey,
      rating: numericRating,
      note: note.trim(),
      updatedAt: new Date().toISOString()
    });

    saveStatus = 'saved';
    setTimeout(() => {
      saveStatus = 'idle';
    }, 2000);
  }

  function handleKeydown(e: KeyboardEvent) {
    // 1. Cmd/Ctrl + Enter to save from anywhere
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
      return;
    }

    // 2. Arrow Key Date Navigation
    const isTyping = ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName);

    if (e.key === 'ArrowLeft' && (!isTyping || e.altKey)) {
      e.preventDefault();
      changeDate(-1);
    } else if (e.key === 'ArrowRight' && (!isTyping || e.altKey)) {
      if (!isToday) {
        e.preventDefault();
        changeDate(1);
      }
    }
  }

  function adjustRating(delta: number) {
    let current = numericRating ?? 7.0;
    let next = Math.round((current + delta) * 10) / 10;
    if (next >= 1 && next <= 10) {
      ratingStr = next.toFixed(1);
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="entry-card">
  <!-- Date Navigator (Unified Cluster) -->
  <div class="date-navigator">
    <button type="button" class="nav-arrow" onclick={() => changeDate(-1)} title="Previous day">‹</button>
    <span class="date-display">{displayDate}</span>
    <button type="button" class="nav-arrow" disabled={isToday} onclick={() => changeDate(1)} title="Next day">›</button>

    {#if !isToday}
      <button type="button" class="today-shortcut" onclick={goToToday}>Today</button>
    {/if}
  </div>

  <h1 class="prompt">How was your day?</h1>

  <!-- 1. The Score: An Engineered Instrument Readout -->
  <div class="score-container">
    <div class="score-instrument">
      <input
        type="number"
        class="score-input"
        step="0.1"
        min="1"
        max="10"
        placeholder="—"
        bind:value={ratingStr}
        onkeydown={(e) => {
          if (e.key === 'ArrowUp') { e.preventDefault(); adjustRating(0.1); }
          if (e.key === 'ArrowDown') { e.preventDefault(); adjustRating(-0.1); }
        }}
      />
      <span class="score-scale">/ 10</span>
    </div>
  </div>

  <!-- 2. The Writing Area: An Archival Document Sheet -->
  <div class="note-section">
    <label for="why" class="why-label">Why?</label>
    <textarea
      id="why"
      bind:value={note}
      placeholder="A few words, if you feel like it…"
      rows="4"
    ></textarea>
  </div>

  <!-- 3. The Action: A Tactile Mechanical Keycap -->
  <div class="action-container">
    <div class="action-left">
      {#if hasSavedRecord}
        <button
          type="button"
          class="trash-btn"
          title="Delete this entry"
          onclick={handleDelete}
        >
          <svg
            viewBox="0 0 24 24"
            width="15"
            height="15"
            stroke="currentColor"
            stroke-width="1.75"
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      {/if}
    </div>

    <button
      type="button"
      class="mechanical-key"
      class:saved={saveStatus === 'saved'}
      disabled={!isValidRating}
      onclick={handleSave}
    >
      {saveStatus === 'saved' ? 'Saved' : 'Save'}
    </button>
  </div>
</div>

<style>
  .entry-card {
    width: 100%;
    max-width: 440px;
    display: flex;
    flex-direction: column;
  }

  /* Date Navigator */
  .date-navigator {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin-bottom: 0.35rem;
  }

  .date-display {
    font-family: var(--font-interface);
    font-size: 0.88rem;
    font-weight: 400;             /* Thinner font weight */
    color: var(--text-muted);
    letter-spacing: 0.01em;
    user-select: none;
  }

  .nav-arrow {
    background: none;
    border: none;
    font-family: var(--font-interface);
    font-size: 1.15rem;
    line-height: 1;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0 0.2rem;
    transition: none;
  }

  .nav-arrow:hover:not(:disabled) {
    color: var(--text-primary);
  }

  .nav-arrow:disabled {
    opacity: 0.25;
    cursor: default;
  }

  .today-shortcut {
    background: none;
    border: none;
    font-family: var(--font-interface);
    font-size: 0.78rem;
    font-weight: 500;
    color: var(--accent);
    cursor: pointer;
    padding-left: 0.25rem;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  /* Prompt: Thinner weight (300) removes the heavy SaaS feel */
  .prompt {
    font-family: var(--font-interface);
    font-size: 2rem;
    font-weight: 300;             /* Thinned out significantly */
    color: var(--text-primary);
    letter-spacing: -0.01em;
    text-align: center;
    margin-bottom: 2rem;
  }

  /* -------------------------------------------------- */
  /* SURFACE 1: The Score (Engineered Instrument Dial)   */
  /* -------------------------------------------------- */
  .score-container {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 2.25rem;
  }

  .score-instrument {
    display: inline-flex;
    align-items: baseline;
    background: #fbf7ef;
    border: 1px solid #bfac99;
    border-radius: 3px;
    padding: 0.3rem 1.1rem;
    box-shadow: 
      0 1px 0 rgba(255, 255, 255, 0.9),
      inset 0 1px 2px rgba(0, 0, 0, 0.08);
  }

  .score-input {
    width: 3.5ch;
    font-family: var(--font-interface);
    font-size: 2.25rem;
    font-weight: 400;             /* Thinner, architectural weight */
    color: var(--text-primary);
    background: transparent;
    border: none;
    outline: none;
    text-align: center;
    letter-spacing: -0.02em;
    -moz-appearance: textfield;
  }

  .score-input::-webkit-outer-spin-button,
  .score-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .score-scale {
    font-family: var(--font-interface);
    font-size: 0.85rem;           /* Distinctly secondary metadata */
    font-weight: 400;
    color: var(--text-muted);
    letter-spacing: 0.03em;
    margin-left: 0.4rem;
    user-select: none;
  }

  /* -------------------------------------------------- */
  /* SURFACE 2: The Note (The Archival Writing Sheet)   */
  /* -------------------------------------------------- */
  .note-section {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    margin-bottom: 1.25rem;
  }

  .why-label {
    font-family: var(--font-interface);
    font-size: 0.9rem;
    font-weight: 400;             /* Light, unassuming prompt */
    color: var(--text-muted);
    margin-bottom: 0.45rem;
  }

  /* Flat, spacious paper sheet */
  textarea {
    width: 100%;
    background-color: var(--bg-field);
    border: 1px solid #c9b49f;
    border-radius: 3px;
    padding: 0.9rem 1rem;
    font-family: var(--font-memory);
    font-size: 1.05rem;
    color: var(--text-primary);
    line-height: 1.6;
    resize: none;
    outline: none;
    box-shadow: 
      inset 0 1px 3px rgba(0, 0, 0, 0.05),
      0 1px 0 rgba(255, 255, 255, 0.8);
  }

  textarea::placeholder {
    color: #A89C91;
    font-style: italic;
  }

  textarea:focus {
    border-color: #814f46;
  }

  /* -------------------------------------------------- */
  /* SURFACE 3: The Save Key (The Mechanical Switch)    */
  /* -------------------------------------------------- */
  .action-container {
    width: 100%;
    display: flex;
    justify-content: space-between; /* Pushes trash left, save right */
    align-items: center;
  }

  .action-left {
    display: flex;
    align-items: center;
  }

  /* Quiet Tactile Trash Button */
  .trash-btn {
    background: transparent;
    border: none;
    color: var(--text-muted);
    opacity: 0.6;
    padding: 0.4rem;
    border-radius: 3px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: none; /* Instant mechanical snap */
  }

  .trash-btn:hover {
    opacity: 1;
    color: #9e3d30; /* Muted brick red warning */
    background: rgba(158, 61, 48, 0.08);
  }

  .trash-btn:active {
    transform: translateY(1px);
  }

  .delete-btn {
    background: none;
    border: none;
    font-family: var(--font-interface);
    font-size: 0.8rem;
    color: var(--text-muted);
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 2px;
    opacity: 0.6;
    transition: opacity 0.1s ease, color 0.1s ease;
  }

  .delete-btn:hover {
    opacity: 1;
    color: #9e3d30; /* Muted brick red warning */
  }

  /* Stepped mechanical keycap with 2px physical lip */
  .mechanical-key {
    padding: 0.5rem 2.25rem;
    font-family: var(--font-interface);
    font-size: 0.88rem;
    font-weight: 500;
    color: var(--text-primary);
    background: linear-gradient(to bottom, #fcf9f4, #dcd0bf);
    border: 1px solid #b39f8a;
    border-bottom: 1px solid #9e8a76;
    border-radius: 3px;
    cursor: pointer;
    box-shadow: 
      0 2px 0 #b39f8a,           /* Physical bottom keycap shelf */
      0 3px 2px rgba(0, 0, 0, 0.08);
    transition: none;            /* Pure mechanical instantaneous click */
  }

  .mechanical-key:hover:not(:disabled) {
    background: linear-gradient(to bottom, #ffffff, #e5d9c9);
  }

  /* The Mechanical Click Down */
  .mechanical-key:active:not(:disabled) {
    transform: translateY(2px);  /* Depresses the keycap completely */
    box-shadow: 
      0 0 0 #b39f8a,
      inset 0 1px 2px rgba(0, 0, 0, 0.15);
  }

  .mechanical-key.saved {
    background: var(--bg-topbar-bottom);
    color: #fff;
    border-color: var(--topbar-border);
    box-shadow: 0 2px 0 #4a2823;
  }

  .mechanical-key:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    box-shadow: 0 1px 0 #b39f8a;
  }
</style>