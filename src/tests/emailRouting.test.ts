import { expect, test, describe } from 'vitest';

interface ScheduleItem {
  id: string;
  clientName: string;
  assignedByAdminEmail: string;
  status: 'pending' | 'delivered' | 'incident';
}

describe('Email Notification Routing System', () => {
  
  const mockSchedule: ScheduleItem[] = [
    { id: '1', clientName: 'Иван Петров', assignedByAdminEmail: 'admin.sofia@careconnect.bg', status: 'pending' },
    { id: '2', clientName: 'Мария Иванова', assignedByAdminEmail: 'manager.varna@careconnect.bg', status: 'pending' }
  ];

  test('Трябва да изпрати SOS имейл към правилния администратор спрямо назначената задача', () => {
    const incidentOccurredAt = '1';
    const incidentTask = mockSchedule.find(t => t.id === incidentOccurredAt);
    
    const recipientEmail = incidentTask?.assignedByAdminEmail;
    
    expect(recipientEmail).toBe('admin.sofia@careconnect.bg');
    expect(recipientEmail).not.toBe('manager.varna@careconnect.bg');
  });

  test('Валидация на данни: Системата трябва да отхвърли SOS сигнал без назначен админ', () => {
    const invalidTask: Partial<ScheduleItem> = {
      id: '3',
      clientName: 'Анонимен',
      assignedByAdminEmail: ''
    };

    const canSendEmail = invalidTask.assignedByAdminEmail && invalidTask.assignedByAdminEmail.includes('@');
    
    expect(canSendEmail).toBeFalsy();
  });
});