// Date and Time utility functions formatted for Asia/Kolkata timezone (UTC +5:30)

/**
 * Returns current date/time in Asia/Kolkata timezone
 */
export const getKolkataDate = (dateInput?: Date | string | number | null): Date => {
  if (!dateInput) return new Date();
  if (dateInput instanceof Date) return dateInput;
  if (typeof dateInput === 'object' && 'seconds' in dateInput) {
    return new Date((dateInput as any).seconds * 1000);
  }
  return new Date(dateInput);
};

/**
 * Returns date string in YYYY-MM-DD format for Asia/Kolkata timezone
 */
export const getKolkataDateKey = (dateInput?: Date | string | number | null): string => {
  const d = getKolkataDate(dateInput);
  // Format as YYYY-MM-DD in Asia/Kolkata
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(d); // e.g. "2026-07-25"
};

/**
 * Returns today's date key YYYY-MM-DD in Asia/Kolkata
 */
export const getKolkataTodayKey = (): string => {
  return getKolkataDateKey(new Date());
};

/**
 * Returns human-readable date in Asia/Kolkata (e.g., "25 July 2026")
 */
export const formatKolkataDate = (dateInput?: Date | string | number | null): string => {
  if (!dateInput) return 'N/A';
  const d = getKolkataDate(dateInput);
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
};

/**
 * Returns human-readable date and time in Asia/Kolkata (e.g., "25 Jul 2026, 06:30 PM")
 */
export const formatKolkataDateTime = (dateInput?: Date | string | number | null): string => {
  if (!dateInput) return 'N/A';
  const d = getKolkataDate(dateInput);
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d);
};

/**
 * Checks if a given date corresponds to Kolkata today
 */
export const isKolkataToday = (dateInput?: Date | string | number | null): boolean => {
  if (!dateInput) return false;
  return getKolkataDateKey(dateInput) === getKolkataTodayKey();
};

/**
 * Shift a date key (YYYY-MM-DD) by given offset in days
 */
export const offsetDateKey = (dateKey: string, offsetDays: number): string => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().split('T')[0];
};

/**
 * Get human readable display date from date key (e.g. "2026-07-25" -> "25 July 2026")
 */
export const displayDateFromKey = (dateKey: string): string => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
};

/**
 * Calculate elapsed time description (e.g. "2 hours ago", "1 day ago")
 */
export const getTimeElapsedStr = (dateInput?: Date | string | number | null): string => {
  if (!dateInput) return 'N/A';
  const past = getKolkataDate(dateInput).getTime();
  const now = new Date().getTime();
  const diffMs = Math.max(0, now - past);
  
  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};
