<script lang="ts">
  import { onMount } from 'svelte';
  import { loadAllEntries, type DayEntry, formatDisplayDate } from '$lib/storage';

  let entries = $state<DayEntry[]>([]);
  let selectedDate = $state<string>('');

  // Tooltip State (Persistent for smooth gliding)
  let tooltipEntry = $state<DayEntry | null>(null);
  let isTooltipVisible = $state<boolean>(false);
  let hideTimer: ReturnType<typeof setTimeout> | null = null;

  onMount(() => {
    const all = loadAllEntries();
    const sorted = Object.values(all).sort((a, b) => a.date.localeCompare(b.date));
    entries = sorted;
    if (sorted.length > 0) {
      selectedDate = sorted[sorted.length - 1].date;
    }
  });

  const activeEntry = $derived(
    entries.find((e) => e.date === selectedDate) ?? null
  );

  const totalCount = $derived(entries.length);
  const averageRating = $derived(
    totalCount > 0
      ? (entries.reduce((sum, e) => sum + e.rating, 0) / totalCount).toFixed(1)
      : '—'
  );

  // Dynamic Y-Axis Scaling
  const yBounds = $derived.by(() => {
    if (entries.length === 0) return { min: 1, max: 10, ticks: [10, 7, 5, 2] };

    const ratings = entries.map((e) => e.rating);
    const minR = Math.min(...ratings);
    const maxR = Math.max(...ratings);

    let min = Math.max(1, Math.floor(minR - 0.4));
    let max = Math.min(10, Math.ceil(maxR + 0.4));

    if (max - min < 2) {
      min = Math.max(1, min - 1);
      max = Math.min(10, max + 1);
    }

    const ticks: number[] = [];
    for (let val = max; val >= min; val -= 1) {
      ticks.push(val);
    }
    return { min, max, ticks };
  });

  // SVG Geometry
  const svgWidth = 640;
  const svgHeight = 230;
  const padding = { top: 25, right: 35, bottom: 35, left: 35 };

  const plotWidth = svgWidth - padding.left - padding.right;
  const plotHeight = svgHeight - padding.top - padding.bottom;

  const timeBounds = $derived.by(() => {
    if (entries.length === 0) return { min: 0, max: 1 };
    const times = entries.map((e) => new Date(e.date + 'T00:00:00').getTime());
    const min = Math.min(...times);
    const max = Math.max(...times);
    const oneDay = 86400000;
    return {
      min: min - oneDay,
      max: max === min ? max + oneDay : max + oneDay
    };
  });

  function getX(dateStr: string): number {
    const t = new Date(dateStr + 'T00:00:00').getTime();
    const progress = (t - timeBounds.min) / (timeBounds.max - timeBounds.min);
    return padding.left + progress * plotWidth;
  }

  function getY(rating: number): number {
    const norm = (rating - yBounds.min) / (yBounds.max - yBounds.min);
    return padding.top + (1 - norm) * plotHeight;
  }

  const xTicks = $derived.by(() => {
    if (entries.length < 2) return [];
    const first = entries[0];
    const last = entries[entries.length - 1];
    const midIndex = Math.floor(entries.length / 2);
    const mid = entries[midIndex];

    const formatShort = (dStr: string) => {
      const d = new Date(dStr + 'T00:00:00');
      return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d);
    };

    return [
      { label: formatShort(first.date), x: getX(first.date) },
      { label: formatShort(mid.date), x: getX(mid.date) },
      { label: formatShort(last.date), x: getX(last.date) }
    ];
  });

  const linePath = $derived.by(() => {
    if (entries.length < 2) return '';
    let path = '';
    const maxGapMs = 3 * 86400000;

    for (let i = 0; i < entries.length; i++) {
      const curr = entries[i];
      const currT = new Date(curr.date + 'T00:00:00').getTime();
      const x = getX(curr.date);
      const y = getY(curr.rating);

      if (i === 0) {
        path += `M ${x} ${y}`;
      } else {
        const prev = entries[i - 1];
        const prevT = new Date(prev.date + 'T00:00:00').getTime();
        if (currT - prevT > maxGapMs) {
          path += ` M ${x} ${y}`;
        } else {
          path += ` L ${x} ${y}`;
        }
      }
    }
    return path;
  });

  const avgY = $derived.by(() => {
    if (averageRating === '—') return null;
    const avg = parseFloat(averageRating);
    if (avg < yBounds.min || avg > yBounds.max) return null;
    return getY(avg);
  });

  // Tooltip Hover Handlers
  function handlePointEnter(entry: DayEntry) {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    tooltipEntry = entry;
    isTooltipVisible = true;
  }

  function handlePointLeave() {
    hideTimer = setTimeout(() => {
      isTooltipVisible = false;
    }, 300); // 300ms exit fade
  }

  function formatTooltipDate(dStr: string): string {
    const d = new Date(dStr + 'T00:00:00');
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    }).format(d);
  }

  // Tooltip Placement & Arrow Alignment Math
  const tooltipCoords = $derived.by(() => {
    if (!tooltipEntry) return { xPercent: 50, yPercent: 50, align: 'center', arrowOffsetPercent: 50 };

    const rawX = getX(tooltipEntry.date);
    const rawY = getY(tooltipEntry.rating);

    const xPercent = (rawX / svgWidth) * 100;
    const yPercent = (rawY / svgHeight) * 100;

    // Clamping logic: near edges, shift box inward and slide arrow
    if (xPercent < 22) {
      return { xPercent: Math.max(xPercent, 4), yPercent, align: 'left', arrowOffsetPercent: 20 };
    } else if (xPercent > 78) {
      return { xPercent: Math.min(xPercent, 96), yPercent, align: 'right', arrowOffsetPercent: 80 };
    }
    return { xPercent, yPercent, align: 'center', arrowOffsetPercent: 50 };
  });
</script>

<div class="chronicle-container">
  {#if entries.length === 0}
    <div class="empty-state">
      <h2 class="empty-title">The Chronicle is Empty</h2>
      <p class="empty-desc">Head over to Today to record your first mark.</p>
    </div>
  {:else}
    <header class="chronicle-page-header">
      <h2 class="view-title">Chronicle</h2>
      <span class="view-tagline">— A timeline of your lived days</span>
    </header>

    <div class="graph-instrument-bar">
      <div class="stat-group">
        <span>{totalCount} {totalCount === 1 ? 'day' : 'days'} recorded</span>
        <span class="bullet">·</span>
        <span>Average: <strong>{averageRating}</strong></span>
      </div>
      <div class="legend-group">
        <span class="legend-item"><span class="legend-dot"></span> Rating</span>
        {#if avgY !== null}
          <span class="legend-item"><span class="legend-dash"></span> Average</span>
        {/if}
      </div>
    </div>

    <div class="timeline-frame">
      <svg viewBox="0 0 {svgWidth} {svgHeight}" class="timeline-svg">
        <!-- Y Gridlines -->
        {#each entries as entry}
          {@const cx = getX(entry.date)}
          {@const cy = getY(entry.rating)}
          {@const isSelected = entry.date === selectedDate}
          {@const isHovered = tooltipEntry?.date === entry.date && isTooltipVisible}

          <!-- Outer highlight ring -->
          {#if isSelected || isHovered}
            <circle {cx} {cy} r={isSelected ? 9 : 8} class="point-ring" class:active-ring={isSelected} />
          {/if}

          <!-- Visual Dot (Crisp & Small) -->
          <circle
            {cx}
            {cy}
            r={isHovered ? 5.5 : 4}
            class="point-dot"
            class:selected={isSelected}
          />

          <!-- Invisible Generous Hitbox (36px wide target for effortless hovering) -->
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <circle
            {cx}
            {cy}
            r="18"
            class="point-hitbox"
            onmouseenter={() => handlePointEnter(entry)}
            onmouseleave={handlePointLeave}
            onclick={() => (selectedDate = entry.date)}
          />
        {/each}

        <!-- X Baseline -->
        <line
          x1={padding.left}
          y1={svgHeight - padding.bottom}
          x2={svgWidth - padding.right}
          y2={svgHeight - padding.bottom}
          class="axis-baseline"
        />

        <!-- X Ticks -->
        {#each xTicks as tick}
          <line
            x1={tick.x}
            y1={svgHeight - padding.bottom}
            x2={tick.x}
            y2={svgHeight - padding.bottom + 4}
            class="tick-mark"
          />
          <text
            x={tick.x}
            y={svgHeight - padding.bottom + 16}
            class="axis-label x-axis"
          >
            {tick.label}
          </text>
        {/each}

        {#each yBounds.ticks as tick}
          {@const yPos = getY(tick)}
          <!-- Subtle Grid Line across plot -->
          <line
            x1={padding.left}
            y1={yPos}
            x2={svgWidth - padding.right}
            y2={yPos}
            class="grid-line"
          />
          <!-- 4px Y-Tick Mark -->
          <line
            x1={padding.left - 4}
            y1={yPos}
            x2={padding.left}
            y2={yPos}
            class="tick-mark"
          />
          <!-- Y-Axis Label Number -->
          <text x={padding.left - 8} y={yPos + 3.5} class="axis-label">{tick}</text>
        {/each}

        <!-- Vertical Y-Axis Spine Line -->
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={svgHeight - padding.bottom}
          class="axis-baseline"
        />

        <!-- Horizontal X-Axis Baseline -->
        <line
          x1={padding.left}
          y1={svgHeight - padding.bottom}
          x2={svgWidth - padding.right}
          y2={svgHeight - padding.bottom}
          class="axis-baseline"
        />

        <!-- Average Baseline -->
        {#if avgY !== null}
          <line
            x1={padding.left}
            y1={avgY}
            x2={svgWidth - padding.right}
            y2={avgY}
            class="avg-line"
          />
        {/if}

        <!-- Trajectory -->
        {#if linePath}
          <path d={linePath} class="trajectory-line" />
        {/if}

        <!-- Interactive Points -->
        {#each entries as entry}
          {@const cx = getX(entry.date)}
          {@const cy = getY(entry.rating)}
          {@const isSelected = entry.date === selectedDate}
          {@const isHovered = tooltipEntry?.date === entry.date && isTooltipVisible}

          {#if isSelected || isHovered}
            <circle {cx} {cy} r={isSelected ? 9 : 8} class="point-ring" class:active-ring={isSelected} />
          {/if}

          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <circle
            {cx}
            {cy}
            r={isHovered ? 6 : 4.5}
            class="point-dot"
            class:selected={isSelected}
            onmouseenter={() => handlePointEnter(entry)}
            onmouseleave={handlePointLeave}
            onclick={() => (selectedDate = entry.date)}
          />
        {/each}
      </svg>

      <!-- Persistent Gliding Callout Tooltip -->
      {#if tooltipEntry}
        <div
          class="tactile-tooltip"
          class:visible={isTooltipVisible}
          class:align-left={tooltipCoords.align === 'left'}
          class:align-right={tooltipCoords.align === 'right'}
          style="
            left: {tooltipCoords.xPercent}%; 
            top: {tooltipCoords.yPercent}%;
            --arrow-x: {tooltipCoords.arrowOffsetPercent}%;
          "
        >
          <div class="tooltip-header">
            <span class="tooltip-date">{formatTooltipDate(tooltipEntry.date)}</span>
            <span class="tooltip-score"><strong>{tooltipEntry.rating.toFixed(1)}</strong> <span class="denom">/ 10</span></span>
          </div>
          {#if tooltipEntry.note}
            <p class="tooltip-snippet">{tooltipEntry.note}</p>
          {/if}
          <!-- Callout Beak Pointer -->
          <div class="tooltip-arrow"></div>
        </div>
      {/if}
    </div>

    <!-- Borderless Record Below -->
    {#if activeEntry}
      <article class="record-view">
        <header class="record-header">
          <h3 class="record-date">
            {formatDisplayDate(new Date(activeEntry.date + 'T00:00:00'))}
          </h3>
          <div class="record-score">
            <span class="score-num">{activeEntry.rating.toFixed(1)}</span>
            <span class="score-denom">/ 10</span>
          </div>
        </header>

        <div class="record-body">
          {#if activeEntry.note}
            <p class="record-text">{activeEntry.note}</p>
          {:else}
            <p class="record-empty">No note recorded for this day.</p>
          {/if}
        </div>
      </article>
    {/if}
  {/if}
</div>

<style>
  .chronicle-container {
    width: 100%;
    max-width: 640px;
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

  .chronicle-page-header {
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
    margin-bottom: 1.5rem;
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

  .graph-instrument-bar {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.45rem;
    padding: 0 0.15rem;
    font-family: var(--font-interface);
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .stat-group {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .stat-group strong {
    color: var(--text-primary);
    font-weight: 600;
  }

  .bullet {
    opacity: 0.4;
  }

  .legend-group {
    display: flex;
    align-items: center;
    gap: 0.85rem;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .legend-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--accent);
    display: inline-block;
  }

  .legend-dash {
    width: 12px;
    height: 1px;
    border-top: 1.5px dashed #9d8b7a;
    display: inline-block;
  }

  /* The Framed Instrument */
  .timeline-frame {
    position: relative;
    width: 100%;
    background: var(--bg-field);
    border: 1px solid #bfac99;
    border-radius: 3px;
    box-shadow: 
      inset 0 1px 3px rgba(0, 0, 0, 0.05),
      0 1px 0 rgba(255, 255, 255, 0.8);
    margin-bottom: 2rem;
  }

  .timeline-svg {
    width: 100%;
    height: auto;
    display: block;
    user-select: none;
  }

  .grid-line {
    stroke: #e4d8c8;
    stroke-width: 1;
    stroke-dasharray: 2 3;
  }

  .axis-baseline {
    stroke: #d8cbba;
    stroke-width: 1;
  }

  .tick-mark {
    stroke: #bfac99;
    stroke-width: 1;
  }

  .axis-label {
    font-family: var(--font-interface);
    font-size: 9.5px;
    font-weight: 500;
    fill: #9d8a77;
    text-anchor: end;
  }

  .axis-label.x-axis {
    text-anchor: middle;
    font-size: 9px;
  }

  .avg-line {
    stroke: #9d8b7a;
    stroke-width: 1;
    stroke-dasharray: 4 4;
  }

  .trajectory-line {
    fill: none;
    stroke: #b39f8a;
    stroke-width: 1.5;
    opacity: 0.6;
  }

  /* Interactive Points */
  .point-hitbox {
    fill: transparent;
    cursor: pointer;
  }

  .point-dot {
    pointer-events: none; /* Mouse interacts with the hitbox above it */
    fill: var(--accent);
    stroke: #FAF7F2;
    stroke-width: 1.5;
    transition: r 0.1s ease;
  }

  .point-dot:hover {
    r: 6;
  }

  .point-dot.selected {
    fill: #4a2823;
    stroke: #fff;
    stroke-width: 2;
  }

  .point-ring {
    fill: none;
    stroke: var(--accent);
    stroke-width: 1.5;
    opacity: 0.3;
  }

  .point-ring.active-ring {
    opacity: 0.55;
    stroke-width: 2;
  }

  /* -------------------------------------------------- */
  /* Persistent Gliding Callout Tooltip                 */
  /* -------------------------------------------------- */
  .tactile-tooltip {
    position: absolute;
    pointer-events: none;
    z-index: 50;
    width: max-content;
    max-width: 220px;
    background: #FAF7F2;
    border: 1px solid #bfaea0;
    border-radius: 3px;
    padding: 0.45rem 0.65rem 0.5rem;
    box-shadow: 
      0 3px 10px rgba(0, 0, 0, 0.14),
      0 1px 2px rgba(0, 0, 0, 0.08);
    
    /* Default: centered above point */
    transform: translate(-50%, -100%) translateY(-11px);
    
    /* BUTTERY HIGHCHARTS SLIDE & FADE */
    opacity: 0;
    transition: 
      left 0.14s cubic-bezier(0.2, 0, 0, 1),
      top 0.14s cubic-bezier(0.2, 0, 0, 1),
      opacity 0.15s ease;
  }

  .tactile-tooltip.visible {
    opacity: 1;
  }

  /* Edge Clamping Alignment */
  .tactile-tooltip.align-left {
    transform: translate(-10%, -100%) translateY(-11px);
  }

  .tactile-tooltip.align-right {
    transform: translate(-90%, -100%) translateY(-11px);
  }

  /* Callout Beak Arrow */
  .tooltip-arrow {
    position: absolute;
    bottom: -5px;
    left: var(--arrow-x, 50%);
    transform: translateX(-50%) rotate(45deg);
    width: 8px;
    height: 8px;
    background: #FAF7F2;
    border-right: 1px solid #bfaea0;
    border-bottom: 1px solid #bfaea0;
    transition: left 0.14s cubic-bezier(0.2, 0, 0, 1);
  }

  .tooltip-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .tooltip-date {
    font-family: var(--font-interface);
    font-size: 0.78rem;
    font-weight: 500;
    color: var(--text-primary);
    white-space: nowrap;
  }

  .tooltip-score {
    font-family: var(--font-interface);
    font-size: 0.8rem;
    color: var(--accent);
    white-space: nowrap;
  }

  .tooltip-score strong {
    font-weight: 600;
  }

  .tooltip-score .denom {
    font-size: 0.68rem;
    color: var(--text-muted);
  }

  .tooltip-snippet {
    font-family: var(--font-memory);
    font-size: 0.82rem;
    color: var(--text-muted);
    line-height: 1.35;
    margin-top: 0.25rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Record View Below */
  .record-view {
    width: 100%;
    padding: 0 0.25rem;
  }

  .record-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    border-bottom: 1px solid #bfac99;
    padding-bottom: 0.6rem;
    margin-bottom: 0.85rem;
  }

  .record-date {
    font-family: var(--font-interface);
    font-size: 1.05rem;
    font-weight: 500;
    color: var(--text-primary);
    letter-spacing: -0.01em;
  }

  .record-score {
    display: flex;
    align-items: baseline;
    gap: 0.25rem;
  }

  .score-num {
    font-family: var(--font-interface);
    font-size: 1.45rem;
    font-weight: 600;
    color: var(--accent);
    line-height: 1;
  }

  .score-denom {
    font-family: var(--font-interface);
    font-size: 0.82rem;
    color: var(--text-muted);
  }

  .record-body {
    min-height: 100px;
  }

  .record-text {
    font-family: var(--font-memory);
    font-size: 1.15rem;
    color: var(--text-primary);
    line-height: 1.6;
    margin: 0;
  }

  .record-empty {
    font-family: var(--font-memory);
    font-size: 1rem;
    font-style: italic;
    color: var(--text-muted);
  }
</style>