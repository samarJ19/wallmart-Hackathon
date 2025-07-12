import { useAlert } from '../context/AlertContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { X, CheckCircle, AlertCircle, XCircle } from 'lucide-react';

export const AlertContainer = () => {
  const { alerts, dismissAlert } = useAlert();

  const getAlertIcon = (variant: string) => {
    switch (variant) {
      case 'default':
        return <CheckCircle className="h-4 w-4" />;
      case 'destructive':
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {alerts.map((alert) => (
        <Alert
          key={alert.id}
          variant={alert.variant}
          className="relative animate-in slide-in-from-right-full"
        >
          {getAlertIcon(alert.variant || 'default')}
          <AlertTitle className="pr-8">{alert.title}</AlertTitle>
          <AlertDescription>{alert.description}</AlertDescription>
          <button
            onClick={() => dismissAlert(alert.id)}
            className="absolute top-2 right-2 p-1 hover:bg-gray-100 rounded-full"
          >
            <X className="h-3 w-3" />
          </button>
        </Alert>
      ))}
    </div>
  );
};
