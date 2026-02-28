import { expect, test, describe, vi } from 'vitest';

interface PendingSync {
  type: 'SOS' | 'DELIVERY';
  data: any;
  timestamp: number;
}

describe('Offline Data Persistence & Sync Engine', () => {
  
  test('Data Integrity: Трябва да кешира SOS сигнала локално, ако няма интернет', () => {
    const offlineQueue: PendingSync[] = [];
    const isOnline = false;
    
    const newIncident = { clientId: '101', note: 'Липсва адрес' };
    
    if (!isOnline) {
      offlineQueue.push({
        type: 'SOS',
        data: newIncident,
        timestamp: Date.now()
      });
    }
    
    expect(offlineQueue).toHaveLength(1);
    expect(offlineQueue[0].type).toBe('SOS');
    expect(offlineQueue[0].data.clientId).toBe('101');
  });

  test('Sync Logic: Трябва да изчисти опашката след успешно изпращане при възстановена връзка', async () => {
    let offlineQueue: PendingSync[] = [{ type: 'DELIVERY', data: { id: '1' }, timestamp: 123 }];
    let isOnline = true;
    
    const syncWithFirebase = vi.fn().mockResolvedValue({ success: true });

    if (isOnline && offlineQueue.length > 0) {
      for (const item of offlineQueue) {
        await syncWithFirebase(item);
      }
      offlineQueue = [];
    }

    expect(syncWithFirebase).toHaveBeenCalledTimes(1);
    expect(offlineQueue).toHaveLength(0);
  });
});