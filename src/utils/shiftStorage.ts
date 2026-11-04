// Persists the driver's running shift locally so a page reload or a lost
// connection does not reset the timer.
export type ShiftData = {
  isActive: boolean;
  startTime: string | null;
  deliveredCount: number;
};

const SHIFT_STORAGE_KEY = 'careconnect_driver_shift';

export const getStoredShift = (): ShiftData | null => {
  try {
    const stored = localStorage.getItem(SHIFT_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export const saveShiftToStorage = (data: ShiftData) => {
  try {
    localStorage.setItem(SHIFT_STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Грешка при запис на данните за смяната в локалното хранилище:', err);
  }
};

export const clearShiftFromStorage = () => {
  try {
    localStorage.removeItem(SHIFT_STORAGE_KEY);
  } catch (err) {
    console.error('Грешка при изчистване на данните за смяната от локалното хранилище:', err);
  }
};

