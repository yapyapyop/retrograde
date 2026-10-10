<script lang="ts">
  import { onMount } from 'svelte';
  import { loadAllEntries, type DayEntry, formatDisplayDate } from '$lib/storage';

  let entries = $state<DayEntry[]>([]);

  onMount(() => {
    const all = loadAllEntries();
    entries = Object.values(all).sort((a, b) => a.date.localeCompare(b.date));
  });

  const totalCount = $derived(entries.length);

  const averageRating = $derived.by(() => {
    if (totalCount === 0) return '—';
    const sum = entries.reduce((acc, e) => acc + e.rating, 0);
    return (sum / totalCount).toFixed(1);
  });

  const highestEntry = $derived.by(() => {
    if (totalCount === 0) return null;
    return [...entries].sort((a, b) => b.rating - a.rating)[0];
  });

  const lowestEntry = $derived.by(() => {
    if (totalCount === 0) return null;
    return [...entries].sort((a, b) => a.rating - b.rating)[0];
  });

  // Full 1-10 Distribution (Bucketed by Floor)
  const distribution = $derived.by(() => {
    if (totalCount === 0) return [];

    const counts: Record<number, number> = {};
    for (let i = 1; i <= 10; i++) counts[i] = 0;

    for (const e of entries) {
      // Floor logic: 7.9 -> 7, 8.5 -> 8, 10 -> 10
      const bucket = e.rating >= 10 ? 10 : Math.floor(e.rating);
      const clamped = Math.max(1, Math.min(10, bucket));
      counts[clamped] = (counts[clamped] || 0) + 1;
    }

    const maxFrequency = Math.max(...Object.values(counts), 1);

    // Always render full 10 down to 1
    const rows = [];
    for (let b = 10; b >= 1; b--) {
      rows.push({
        score: b,
        count: counts[b],
        percent: (counts[b] / maxFrequency) * 100
      });
    }
    return rows;
  });

  const monthlyBreakdown = $derived.by(() => {
    if (totalCount === 0) return [];

    const groups: Record<string, DayEntry[]> = {};
    for (const e of entries) {
      const monthKey = e.date.slice(0, 7);
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(e);
    }

    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .map((mKey) => {
        const monthEntries = groups[mKey];
        const avg = monthEntries.reduce((sum, e) => sum + e.rating, 0) / monthEntries.length;
        const [year, month] = mKey.split('-');
        const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
        const name = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(dateObj);

        return {
          monthKey: mKey,
          name,
          avg: avg.toFixed(1),
          count: monthEntries.length
        };
      });
  });
</script>

<div class="numbers-container">
  {#if totalCount === 0}
    <div class="empty-state">
      <h2 class="empty-title">No Numbers Yet</h2>
      <p class="empty-desc">Head over to Today to record your first mark.</p>
    </div>
  {:else}
    <!-- Page Header (Sentence Case) -->
    <header class="numbers-page-header">
      <h2 class="view-title">Numbers</h2>
      <span class="view-tagline">— What your recorded days add up to</span>
    </header>

    <!-- Hero Instrument: All-Time Average -->
    <section class="hero-instrument">
      <div class="hero-box">
        <span class="hero-label">All-time average</span>
        <div class="hero-score-row">
          <span class="hero-num">{averageRating}</span>
          <span class="hero-denom">/ 10</span>
        </div>
        <span class="hero-subtext">across {totalCount} {totalCount === 1 ? 'day' : 'days'} recorded</span>
      </div>
    </section>

    <!-- Extremes (Sentence Case Ledger) -->
    <section class="ledger-extremes">
      {#if highestEntry}
        <div class="extreme-row">
          <span class="extreme-label">Highest day</span>
          <div class="extreme-data">
            <span class="extreme-score">{highestEntry.rating.toFixed(1)} <span class="denom">/ 10</span></span>
            <span class="extreme-date">{formatDisplayDate(new Date(highestEntry.date + 'T00:00:00'))}</span>
          </div>
        </div>
      {/if}

      {#if lowestEntry}
        <div class="extreme-row">
          <span class="extreme-label">Lowest day</span>
          <div class="extreme-data">
            <span class="extreme-score">{lowestEntry.rating.toFixed(1)} <span class="denom">/ 10</span></span>
            <span class="extreme-date">{formatDisplayDate(new Date(lowestEntry.date + 'T00:00:00'))}</span>
          </div>
        </div>
      {/if}
    </section>

    <div class="archival-rule"></div>

    <!-- Rating Distribution (Full 1-10 Spectrum) -->
    <section class="distribution-section">
      <h3 class="section-heading">Rating distribution</h3>
      <div class="histogram">
        {#each distribution as row}
          <div class="histogram-row">
            <span class="row-score">{row.score}</span>
            <div class="bar-track">
              {#if row.count > 0}
                <div class="bar-fill" style="width: {row.percent}%;"></div>
              {/if}
            </div>
            <span class="row-count" class:has-count={row.count > 0}>
              {row.count > 0 ? row.count : '—'}
            </span>
          </div>
        {/each}
      </div>
    </section>

    <div class="archival-rule"></div>

    <!-- Monthly Ledger -->
    <section class="monthly-section">
      <h3 class="section-heading">By month</h3>
      <div class="monthly-ledger">
        {#each monthlyBreakdown as month}
          <div class="month-row">
            <span class="month-name">{month.name}</span>
            <div class="month-data">
              <span class="month-avg">{month.avg} <span class="denom">/ 10</span></span>
              <span class="month-count">({month.count} {month.count === 1 ? 'day' : 'days'})</span>
            </div>
          </div>
        {/each}
      </div>
    </section>
  {/if}
</div>

<style>
  .numbers-container {
    width: 100%;
    max-width: 520px;
    display: flex;
    flex-direction: column;
  }

  .empty-state {
    text-align: center;
    padding: 3rem 1rem;
  }

  .empty-title {
    font-family: var(--font-slab);
    font-size: 1.6rem;
    font-weight: 300;
    color: var(--text-primary);
    margin-bottom: 0.5rem;
  }

  .empty-desc {
    font-family: var(--font-interface);
    font-size: 0.9rem;
    color: var(--text-muted);
  }

  .numbers-page-header {
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
    margin-bottom: 2rem;
  }

  .view-title {
    font-family: var(--font-slab);
    font-size: 1.5rem;
    font-weight: 400;
    color: var(--text-primary);
    line-height: 1;
    letter-spacing: -0.01em;
  }

  .view-tagline {
    font-family: var(--font-interface);
    font-size: 0.88rem;
    font-style: italic;
    color: var(--text-muted);
  }

  /* Hero Instrument */
  .hero-instrument {
    display: flex;
    justify-content: center;
    margin-bottom: 2rem;
  }

  .hero-box {
    background: #fbf7ef;
    border: 1px solid #bfac99;
    border-radius: 4px;
    padding: 1.1rem 2.25rem;
    text-align: center;
    box-shadow: 
      0 1px 0 rgba(255, 255, 255, 0.9),
      inset 0 1px 3px rgba(0, 0, 0, 0.06);
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  /* NO ALL-CAPS: Sentence Case */
  .hero-label {
    font-family: var(--font-interface);
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--text-muted);
    margin-bottom: 0.25rem;
  }

  .hero-score-row {
    display: flex;
    align-items: baseline;
    gap: 0.35rem;
  }

  .hero-num {
    font-family: var(--font-interface);
    font-size: 3rem;
    font-weight: 400;
    color: var(--text-primary);
    line-height: 1;
    letter-spacing: -0.03em;
  }

  .hero-denom {
    font-family: var(--font-interface);
    font-size: 1.1rem;
    color: var(--text-muted);
  }

  .hero-subtext {
    font-family: var(--font-interface);
    font-size: 0.82rem;
    color: var(--text-muted);
    font-style: italic;
    margin-top: 0.35rem;
  }

  /* Extremes Ledger */
  .ledger-extremes {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    margin-bottom: 1.5rem;
  }

  .extreme-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    padding: 0.35rem 0.2rem;
    border-bottom: 1px dashed #d1c2b0;
  }

  /* NO ALL-CAPS */
  .extreme-label {
    font-family: var(--font-interface);
    font-size: 0.88rem;
    font-weight: 500;
    color: var(--text-muted);
  }

  .extreme-data {
    display: flex;
    align-items: baseline;
    gap: 0.85rem;
  }

  .extreme-score {
    font-family: var(--font-interface);
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--accent);
  }

  .extreme-score .denom {
    font-size: 0.75rem;
    color: var(--text-muted);
    font-weight: 400;
  }

  .extreme-date {
    font-family: var(--font-interface);
    font-size: 0.88rem;
    color: var(--text-primary);
  }

  .archival-rule {
    height: 1px;
    background: #bfac99;
    margin: 1.5rem 0;
    opacity: 0.6;
  }

  /* NO ALL-CAPS Section Headings */
  .section-heading {
    font-family: var(--font-interface);
    font-size: 0.92rem;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 0.85rem;
    letter-spacing: -0.01em;
  }

  /* Full 10-1 Histogram */
  .histogram {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .histogram-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .row-score {
    font-family: var(--font-interface);
    font-size: 0.82rem;
    font-weight: 500;
    color: var(--text-muted);
    width: 1.8ch;
    text-align: right;
  }

  .bar-track {
    flex: 1;
    height: 11px; /* Slim, refined tactile track */
    background: #e2d4c3;
    border-radius: 2px;
    overflow: hidden;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.08);
  }

  .bar-fill {
    height: 100%;
    background: var(--accent);
    border-radius: 2px;
  }

  .row-count {
    font-family: var(--font-interface);
    font-size: 0.8rem;
    color: #a89a8c;
    width: 2ch;
    text-align: right;
  }

  .row-count.has-count {
    color: var(--text-primary);
    font-weight: 500;
  }

  /* Monthly Ledger */
  .monthly-ledger {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }

  .month-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    padding: 0.35rem 0.2rem;
    border-bottom: 1px dashed #d1c2b0;
  }

  .month-name {
    font-family: var(--font-interface);
    font-size: 0.92rem;
    font-weight: 500;
    color: var(--text-primary);
  }

  .month-data {
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
  }

  .month-avg {
    font-family: var(--font-interface);
    font-size: 0.92rem;
    font-weight: 600;
    color: var(--accent);
  }

  .month-avg .denom {
    font-size: 0.72rem;
    font-weight: 400;
    color: var(--text-muted);
  }

  .month-count {
    font-family: var(--font-interface);
    font-size: 0.8rem;
    color: var(--text-muted);
  }
</style>