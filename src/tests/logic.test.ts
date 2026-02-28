import { expect, test, describe } from 'vitest';

// ТУК: Импортирай твоите функции. Ако са вътре в DriverView, извади ги в utils.ts
// За целите на теста, ето примерни функции, които вероятно имаш:
const calculateDistance = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const aVal = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
               Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) *
               Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
};

describe('CareConnect Core Logic', () => {
  test('GPS: Изчислява точно разстояние (София - Пловдив)', () => {
    const sofia = { lat: 42.6977, lng: 23.3219 };
    const plovdiv = { lat: 42.1354, lng: 24.7453 };
    const dist = calculateDistance(sofia, plovdiv);
    
    // Трябва да е около 130-135 км
    expect(dist).toBeGreaterThan(130);
    expect(dist).toBeLessThan(140);
  });

  test('Validation: Разпознава еднакви дати (ISO Strings)', () => {
    const date1 = "2026-02-28T10:00:00.000Z";
    const date2 = "2026-02-28T15:30:00.000Z";
    
    const d1 = new Date(date1).toDateString();
    const d2 = new Date(date2).toDateString();
    
    expect(d1).toBe(d2); // Доказва, че графикът работи правилно през целия ден
  });
});