<script lang="ts">
  import TodayView from '$lib/components/TodayView.svelte';
  import NumbersView from '$lib/components/NumbersView.svelte';
  import SettingsModal from '$lib/components/SettingsModal.svelte';
  import ChronicleView from '$lib/components/ChronicleView.svelte';
  

  let currentView = $state<'today' | 'chronicle' | 'numbers'>('today');
  let isSettingsOpen = $state<boolean>(false);
  let todayViewRef: TodayView;
</script>

<div class="app-container">
  <header class="topbar">
    <div class="topbar-inner">
      <nav class="topbar-nav left">
        <button 
          type="button" 
          class="nav-tab" 
          class:active={currentView === 'today'}
          onclick={() => currentView = 'today'}
        >
          Today
        </button>
        <button 
          type="button" 
          class="nav-tab" 
          class:active={currentView === 'chronicle'}
          onclick={() => currentView = 'chronicle'}
        >
          Chronicle
        </button>
      </nav>

      <div class="topbar-brand">
        <span class="brand">RetroGrade</span>
      </div>

      <nav class="topbar-nav right">
        <button 
          type="button" 
          class="nav-tab" 
          class:active={currentView === 'numbers'}
          onclick={() => currentView = 'numbers'}
        >
          Numbers
        </button>
        <button 
          type="button" 
          class="nav-tab" 
          onclick={() => isSettingsOpen = true}
        >
          Settings
        </button>
      </nav>
    </div>
  </header>

  <main class="main-content">
    {#if currentView === 'today'}
      <TodayView bind:this={todayViewRef} />
    {:else if currentView === 'chronicle'}
      <ChronicleView />
    {:else if currentView === 'numbers'}
      <NumbersView />
    {/if}
  </main>

  <SettingsModal 
    bind:open={isSettingsOpen} 
    onDataChanged={() => todayViewRef?.reload()} 
  />
</div>

<style>
  .app-container {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .topbar {
    position: sticky;
    top: 0;
    z-index: 40;
    background: linear-gradient(to bottom, var(--bg-topbar-top), var(--bg-topbar-bottom));
    border-bottom: 1px solid var(--topbar-border);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
    padding: 0 1.5rem;
  }

  .topbar-inner {
    max-width: 980px;
    margin: 0 auto;
    height: 38px;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
  }

  .topbar-nav {
    display: flex;
    align-items: stretch;
    height: 100%;
    gap: 1.5rem;
  }

  .topbar-nav.left {
    justify-content: flex-start;
  }

  .topbar-nav.right {
    justify-content: flex-end;
  }

  .topbar-brand {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0 1.5rem;
  }

  .brand {
    color: var(--text-on-dark);
    font-family: var(--font-slab);
    font-size: 1.4rem;
    font-weight: 400;
    line-height: 1;
    letter-spacing: 0.02em;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
    user-select: none;
  }

  .nav-tab {
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--text-on-dark);
    opacity: 0.7;
    font-family: var(--font-interface);
    font-size: 0.88rem;
    font-weight: 400;
    cursor: pointer;
    padding: 0 0.15rem;
    display: flex;
    align-items: center;
    transition: none;
  }

  .nav-tab:hover {
    opacity: 0.95;
    border-bottom-color: rgba(255, 255, 255, 0.4);
  }

  .nav-tab.active {
    opacity: 1;
    border-bottom-color: var(--text-on-dark);
  }

  .main-content {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: flex-start;     /* Prevents vertical center jitter */
    padding: 3.5rem 1.5rem 5rem;
  }

  .placeholder-view {
    text-align: center;
    max-width: 440px;
  }

  .view-title {
    font-family: var(--font-slab);
    font-size: 2rem;
    font-weight: 300;
    color: var(--text-primary);
    margin-bottom: 0.5rem;
  }

  .view-subtitle {
    font-family: var(--font-interface);
    font-size: 0.9rem;
    color: var(--text-muted);
  }
</style>