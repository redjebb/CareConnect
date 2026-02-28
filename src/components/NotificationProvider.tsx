import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface Notification {
  id: string;
  message: string;
  type: NotificationType;
}

interface NotificationContextType {
  showNotification: (message: string, type: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification трябва да се използва вътре в NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = useCallback((message: string, type: NotificationType) => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications((prev) => [...prev, { id, message, type }]);

    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter((notification) => notification.id !== id));
    }, 4000);
  }, []);

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'info': return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBorderColor = (type: NotificationType) => {
    switch (type) {
      case 'success': return 'border-emerald-200 bg-emerald-50/50';
      case 'error': return 'border-red-200 bg-red-50/50';
      case 'warning': return 'border-amber-200 bg-amber-50/50';
      case 'info': return 'border-blue-200 bg-blue-50/50';
    }
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      
      
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        {notifications.map((note) => (
          <div
            key={note.id}
            className={`pointer-events-auto flex items-center gap-3 w-80 p-4 rounded-2xl border bg-white shadow-xl shadow-slate-200/50 transition-all animate-in slide-in-from-right-8 fade-in duration-300 ${getBorderColor(note.type)}`}
          >
            <div className="flex-shrink-0 bg-white rounded-full p-0.5 shadow-sm">
              {getIcon(note.type)}
            </div>
            <p className="flex-1 text-sm font-bold text-slate-700 leading-tight">
              {note.message}
            </p>
            <button 
              onClick={() => removeNotification(note.id)}
              className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};