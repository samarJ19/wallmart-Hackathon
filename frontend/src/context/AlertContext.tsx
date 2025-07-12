import { createContext, useContext, useState, type ReactNode } from 'react';

export interface AlertData {
  id: string;
  title: string;
  description: string;
  variant?: 'default' | 'destructive' | null;
  duration?: number; // in milliseconds, 0 means no auto-dismiss
}

interface AlertContextType {
  alerts: AlertData[];
  showAlert: (alert: Omit<AlertData, 'id'>) => void;
  dismissAlert: (id: string) => void;
  clearAllAlerts: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider = ({ children }: { children: ReactNode }) => {
  const [alerts, setAlerts] = useState<AlertData[]>([]);

  const showAlert = (alertData: Omit<AlertData, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newAlert: AlertData = {
      id,
      ...alertData,
      duration: alertData.duration ?? 3000, // default 3 seconds
    };

    setAlerts(prev => [...prev, newAlert]);

    // Auto-dismiss after duration if specified
    if (newAlert.duration && newAlert.duration > 0) {
      setTimeout(() => {
        dismissAlert(id);
      }, newAlert.duration);
    }
  };

  const dismissAlert = (id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  const clearAllAlerts = () => {
    setAlerts([]);
  };

  return (
    <AlertContext.Provider value={{ alerts, showAlert, dismissAlert, clearAllAlerts }}>
      {children}
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};
