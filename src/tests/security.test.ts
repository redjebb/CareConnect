import { expect, test, describe } from 'vitest';

describe('Data Security & Filtering', () => {
  const mockClients = [
    { id: '1', name: 'Иван', assignedDriverId: 'driver_A' },
    { id: '2', name: 'Георги', assignedDriverId: 'driver_B' },
  ];

  test('RBAC: Шофьорът вижда само своите клиенти', () => {
    const currentDriverId = 'driver_A';
    const filtered = mockClients.filter(c => c.assignedDriverId === currentDriverId);
    
    expect(filtered.length).toBe(1);
    expect(filtered[0].name).toBe('Иван');
    expect(filtered.every(c => c.assignedDriverId === 'driver_A')).toBe(true);
  });
});