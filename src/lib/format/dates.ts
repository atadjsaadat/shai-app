const MONTH_NAMES = ['january','february','march','april','may','june','july','august','september','october','november','december'];
const MONTH_SHORT  = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];

// Parses date_of_birth stored as "YYYY-MM", "MM/YYYY", "August 2022", or "Aug 2022"
export function parseDob(dob: string | null | undefined): Date | null {
  if (!dob) return null;
  const s = dob.trim();
  if (/^\d{4}-\d{2}$/.test(s)) {
    const d = new Date(s + '-01');
    return isNaN(d.getTime()) ? null : d;
  }
  if (/^\d{1,2}\/\d{4}$/.test(s)) {
    const [m, y] = s.split('/').map(Number);
    return (m >= 1 && m <= 12) ? new Date(y, m - 1, 1) : null;
  }
  const parts = s.split(/\s+/);
  if (parts.length === 2) {
    const monthStr = parts[0].toLowerCase();
    const year = parseInt(parts[1], 10);
    let idx = MONTH_NAMES.indexOf(monthStr);
    if (idx === -1) idx = MONTH_SHORT.indexOf(monthStr);
    if (idx !== -1 && !isNaN(year)) return new Date(year, idx, 1);
  }
  return null;
}

export function formatAge(days: number | null): string {
  if (days == null || days < 0) return '';
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} old`;
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) === 1 ? '' : 's'} old`;
  if (days < 365) return `${Math.floor(days / 30)} month${Math.floor(days / 30) === 1 ? '' : 's'} old`;
  const y = Math.floor(days / 365);
  const m = Math.floor((days % 365) / 30);
  return m > 0 ? `${y}y ${m}mo old` : `${y} year${y === 1 ? '' : 's'} old`;
}

// "Wednesday, 5 August 2026"
export function formatDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

// "5 Aug 2026"
export function formatDateMedium(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// "5 Aug"
export function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// "today" / "tomorrow" / "in 3 days" / "5 Aug"
export function formatRelativeDate(iso: string): string {
  const diff = Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000);
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  if (diff > 1 && diff < 8) return `in ${diff} days`;
  return formatDateShort(iso);
}

// "today" / "yesterday" / "3 days ago" / "2w ago" / "1mo ago"
export function formatPastDate(iso: string): string {
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (diff === 0) return 'today';
  if (diff === 1) return 'yesterday';
  if (diff < 8) return `${diff} days ago`;
  if (diff < 35) return `${Math.round(diff / 7)}w ago`;
  return `${Math.round(diff / 30)}mo ago`;
}
