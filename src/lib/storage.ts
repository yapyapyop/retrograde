export interface DayEntry {
  date: string;       // "YYYY-MM-DD"
  rating: number;     // 1.0 to 10.0
  note: string;       // text
  updatedAt: string;  // ISO timestamp
}

const STORAGE_KEY = 'retrograde_entries';

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayKey(): string {
  return toDateKey(new Date());
}

export function formatDisplayDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  }).format(date);
}

export function loadAllEntries(): Record<string, DayEntry> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('Failed to load RetroGrade entries:', e);
    return {};
  }
}

export function loadEntry(dateKey: string): DayEntry | null {
  const all = loadAllEntries();
  return all[dateKey] || null;
}

export function saveEntry(entry: DayEntry): void {
  if (typeof window === 'undefined') return;
  try {
    const all = loadAllEntries();
    all[entry.date] = entry;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.error('Failed to save RetroGrade entry:', e);
  }
}

// NEW: Delete an entry cleanly
export function deleteEntry(dateKey: string): void {
  if (typeof window === 'undefined') return;
  try {
    const all = loadAllEntries();
    if (all[dateKey]) {
      delete all[dateKey];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    }
  } catch (e) {
    console.error('Failed to delete entry:', e);
  }
}

export function exportArchive(): void {
  const all = loadAllEntries();
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(all, null, 2));
  const downloadAnchor = document.createElement('a');
  const dateStr = getTodayKey();
  
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `retrograde-backup-${dateStr}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

// HARDENED: Strict schema validation
export function importArchive(jsonText: string): { success: boolean; count: number; error?: string } {
  try {
    const imported = JSON.parse(jsonText);
    if (typeof imported !== 'object' || imported === null || Array.isArray(imported)) {
      return { success: false, count: 0, error: 'File must contain an object map of entries.' };
    }

    const sanitized: Record<string, DayEntry> = {};
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    for (const key in imported) {
      const item = imported[key];
      // Verify date format
      if (!dateRegex.test(item.date)) continue;
      
      // Coerce & clamp rating
      const rating = parseFloat(item.rating);
      if (isNaN(rating) || rating < 1 || rating > 10) continue;

      sanitized[item.date] = {
        date: item.date,
        rating: Math.round(rating * 10) / 10,
        note: typeof item.note === 'string' ? item.note.trim() : '',
        updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : new Date().toISOString()
      };
    }

    const validCount = Object.keys(sanitized).length;
    if (validCount === 0) {
      return { success: false, count: 0, error: 'No valid RetroGrade entries found in file.' };
    }

    const current = loadAllEntries();
    const merged = { ...current, ...sanitized };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));

    return { success: true, count: validCount };
  } catch (err) {
    return { success: false, count: 0, error: 'Corrupt or unreadable JSON file.' };
  }
}

export function getEntryCount(): number {
  return Object.keys(loadAllEntries()).length;
}