export interface Client {
  id: string;
  egn?: string;
  name: string;
  address: string;
  phone: string;
  notes: string;
  assignedDriverId: string;
  mealType: string;
  mealCount: number;
  lastCheckIn: string;
  lastSignature?: string;
  driverSignature?: string;
  clientSignature?: string;
}

export interface ClientHistoryEntry extends Client {
  serviceDate?: string;
  createdAt?: string;
}

export interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  routeArea: string;
}

// НОВИ МОДЕЛИ, които липсваха:
export interface ScheduleItem {
    id: string;
    clientId: string;
    driverId: string;
    date: string; // ISO string for the date of service
    notes: string;
}

export interface Incident {
    id: string;
    driverId: string;
    clientId: string;
    date: string; // ISO string for when the incident was reported
    type: string; // e.g., 'Не отвори', 'Клиент в лошо състояние'
    description: string;
    status: 'Open' | 'Resolved' | 'Escalated';
}

export interface ClientRegistryEntry {
  id: string;
  egn: string;
  name: string;
  address: string;
  phone: string;
  defaultMealType: string;
  defaultMealCount: number;
}