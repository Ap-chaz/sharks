import { describe, it, expect } from 'vitest';
import { slotsForDate, isBookableSlot, nairobiToUtc, utcToNairobi, todayInNairobi, isValidDate } from '../src/appointments/slots.js';

const day = { open: '08:00', close: '20:00' };
const hours = {
  slotMinutes: 30,
  days: { sun: day, mon: day, tue: day, wed: day, thu: day, fri: day, sat: null },
};

describe('slots', () => {
  it('lists 24 slots on an open day, last at 19:30', () => {
    const s = slotsForDate('2030-01-07', hours); // Monday
    expect(s.length).toBe(24);
    expect(s[0]).toBe('08:00');
    expect(s[23]).toBe('19:30');
  });

  it('is closed on Saturday and open on Sunday', () => {
    expect(slotsForDate('2030-01-05', hours)).toEqual([]); // Saturday
    expect(slotsForDate('2030-01-06', hours).length).toBe(24); // Sunday
  });

  it('converts Nairobi time to UTC and back', () => {
    expect(nairobiToUtc('2030-01-07', '08:00').toISOString()).toBe('2030-01-07T05:00:00.000Z');
    expect(nairobiToUtc('2030-01-07', '01:00').toISOString()).toBe('2030-01-06T22:00:00.000Z');
    expect(utcToNairobi(new Date('2030-01-06T22:00:00Z'))).toEqual({ date: '2030-01-07', time: '01:00' });
  });

  it('gets "today" right between 00:00 and 03:00 Nairobi (the old UTC bug)', () => {
    expect(todayInNairobi(new Date('2030-01-06T22:30:00Z'))).toBe('2030-01-07');
  });

  it('rejects past times, off-grid times and bad dates', () => {
    const now = new Date('2030-01-07T06:00:00Z'); // 09:00 Nairobi
    expect(isBookableSlot('2030-01-07', '08:30', hours, now)).toBe(false);
    expect(isBookableSlot('2030-01-07', '09:30', hours, now)).toBe(true);
    expect(isBookableSlot('2030-01-07', '09:15', hours, now)).toBe(false);
    expect(isBookableSlot('2030-02-30', '09:00', hours, now)).toBe(false);
    expect(isValidDate('2030-02-30')).toBe(false);
  });
});
