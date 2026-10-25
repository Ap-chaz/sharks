const OFFSET_HOURS = 3;
const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function isValidDate(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(dateStr + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === dateStr;
}

// Nairobi local date + time -> UTC Date
export function nairobiToUtc(dateStr, hhmm) {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const [h, mi] = hhmm.split(':').map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h - OFFSET_HOURS, mi));
}

// UTC Date -> { date: 'YYYY-MM-DD', time: 'HH:MM' } in Nairobi
export function utcToNairobi(utcDate) {
  const shifted = new Date(utcDate.getTime() + OFFSET_HOURS * 3600 * 1000);
  const iso = shifted.toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

export function todayInNairobi(now = new Date()) {
  return utcToNairobi(now).date;
}

// All slot start times ('HH:MM', Nairobi) for a date, or [] if closed/invalid.
export function slotsForDate(dateStr, hours) {
  if (!isValidDate(dateStr) || !hours) return [];
  const dayKey = DAYS[new Date(dateStr + 'T00:00:00Z').getUTCDay()];
  const day = hours.days?.[dayKey];
  if (!day) return [];
  const step = hours.slotMinutes;
  const out = [];
  for (let t = toMinutes(day.open); t + step <= toMinutes(day.close); t += step) {
    out.push(String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'));
  }
  return out;
}

export function isBookableSlot(dateStr, hhmm, hours, now = new Date()) {
  if (!slotsForDate(dateStr, hours).includes(hhmm)) return false;
  return nairobiToUtc(dateStr, hhmm).getTime() > now.getTime();
}
