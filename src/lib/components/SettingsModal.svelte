<script lang="ts">
  import { exportArchive, importArchive, getEntryCount } from '$lib/storage';

  let { open = $bindable(false), onDataChanged } = $props<{
    open: boolean;
    onDataChanged: () => void;
  }>();

  let fileInput: HTMLInputElement;
  let importMessage = $state<string>('');
  let totalEntries = $derived(open ? getEntryCount() : 0);

  function close() {
    open = false;
    importMessage = '';
  }

  function handleFileSelect(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = importArchive(content);
      if (res.success) {
        importMessage = `Restored ${res.count} entries.`;
        onDataChanged();
      } else {
        importMessage = 'Invalid archive file.';
      }
    };
    reader.readAsText(file);
    target.value = '';
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && open) {
      close();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <!-- Crisp flat backdrop (NO BLUR) -->
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="modal-backdrop" onclick={close}>
    <div class="modal-card" onclick={(e) => e.stopPropagation()}>
      
      <!-- Topbar Header -->
      <div class="modal-header">
        <h2 class="modal-title">Settings & Data</h2>
        <button type="button" class="close-btn" onclick={close} aria-label="Close">✕</button>
      </div>

      <div class="modal-body">
        <div class="stat-row">
          <span class="stat-count">{totalEntries}</span>
          <span class="stat-label">{totalEntries === 1 ? 'day recorded' : 'days recorded'}</span>
        </div>

        <p class="privacy-note">
          RetroGrade is local-first. Your ratings and thoughts stay inside this browser and are never sent to a server.
        </p>

        <div class="rules-divider"></div>

        <!-- Action Rows (2015 Dense Form Style) -->
        <div class="action-grid">
          <div class="action-cell">
            <span class="cell-label">Export Archive</span>
            <span class="cell-desc">Download a raw JSON backup</span>
            <button type="button" class="tactile-btn" onclick={exportArchive}>
              Export JSON
            </button>
          </div>

          <div class="action-cell">
            <span class="cell-label">Import Archive</span>
            <span class="cell-desc">Restore from a JSON file</span>
            <input 
              type="file" 
              accept=".json" 
              bind:this={fileInput} 
              onchange={handleFileSelect} 
              style="display: none;" 
            />
            <button type="button" class="tactile-btn" onclick={() => fileInput.click()}>
              Choose File…
            </button>
          </div>
        </div>

        {#if importMessage}
          <div class="import-alert">{importMessage}</div>
        {/if}
      </div>

      <div class="modal-footer">
        <button type="button" class="tactile-btn footer-btn" onclick={close}>Done</button>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Flat, crisp dark tint — NO BLUR */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(28, 20, 18, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 1rem;
  }

  /* Modest 4px radius, tight directional shadow */
  .modal-card {
    background: var(--bg-canvas);
    border: 1px solid #bba691;
    border-radius: 4px;
    width: 100%;
    max-width: 420px;
    box-shadow: 
      0 4px 14px rgba(0, 0, 0, 0.2),
      0 1px 2px rgba(0, 0, 0, 0.15);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    background: linear-gradient(to bottom, var(--bg-topbar-top), var(--bg-topbar-bottom));
    padding: 0.5rem 0.85rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--topbar-border);
  }

  .modal-title {
    color: var(--text-on-dark);
    font-family: var(--font-slab);
    font-size: 1.05rem;
    font-weight: 300;
    letter-spacing: 0.01em;
  }

  .close-btn {
    background: none;
    border: none;
    color: var(--text-on-dark);
    font-size: 0.9rem;
    cursor: pointer;
    padding: 0.2rem;
    opacity: 0.7;
    /* Instant click, zero tween */
    transition: none;
  }

  .close-btn:hover {
    opacity: 1;
  }

  .modal-body {
    padding: 1.25rem;
  }

  .stat-row {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 0.4rem;
    margin-bottom: 0.35rem;
  }

  .stat-count {
    font-family: var(--font-slab);
    font-size: 1.85rem;
    font-weight: 300;
    color: var(--text-primary);
    line-height: 1;
  }

  .stat-label {
    font-size: 0.85rem;
    font-style: italic;
    color: var(--text-muted);
  }

  .privacy-note {
    font-size: 0.8rem;
    color: var(--text-muted);
    line-height: 1.35;
    text-align: center;
    margin-bottom: 1rem;
  }

  .rules-divider {
    height: 1px;
    background: #d4c3b2;
    border-bottom: 1px solid rgba(255, 255, 255, 0.4);
    margin-bottom: 1.1rem;
  }

  /* Dense 2015-style action grid */
  .action-grid {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .action-cell {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #dfd0be;
    border: 1px solid #c9b49f;
    border-radius: 3px;
    padding: 0.6rem 0.85rem;
  }

  .cell-label {
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--text-primary);
    display: block;
  }

  .cell-desc {
    font-size: 0.75rem;
    color: var(--text-muted);
    font-style: italic;
    display: block;
  }

  /* 2015 Twitter / Classic Mac style tactile button */
  .tactile-btn {
    padding: 0.35rem 0.9rem;
    font-family: var(--font-serif);
    font-size: 0.85rem;
    color: var(--text-primary);
    background: linear-gradient(to bottom, #FAF7F2, #ded0be);
    border: 1px solid #b39f8a;
    border-radius: 3px; /* Modest 3px radius */
    cursor: pointer;
    box-shadow: 
      0 1px 1px rgba(0, 0, 0, 0.08),
      inset 0 1px 0 rgba(255, 255, 255, 0.8);
    /* INSTANT state change: no tweening */
    transition: none;
    white-space: nowrap;
  }

  .tactile-btn:hover {
    background: linear-gradient(to bottom, #ffffff, #e5d8c8);
    border-color: #9d8a77;
  }

  /* Mechanical pressed state */
  .tactile-btn:active {
    background: #d5c4b1;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.15);
    transform: translateY(1px);
  }

  .import-alert {
    margin-top: 0.75rem;
    font-size: 0.8rem;
    font-style: italic;
    color: var(--accent);
    text-align: center;
  }

  .modal-footer {
    padding: 0.5rem 0.85rem;
    background: #d5c4b1;
    border-top: 1px solid #baa692;
    display: flex;
    justify-content: flex-end;
  }

  .footer-btn {
    padding: 0.35rem 1.25rem;
  }
</style>