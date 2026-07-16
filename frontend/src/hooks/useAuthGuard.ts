import { useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';

export function useAuthGuard() {
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();

  const requireAuth = (action: () => Promise<void> | void) => {
    return async () => {
      if (!isSignedIn) {
        navigate('/sign-in', { state: { returnUrl: window.location.pathname } });
        return;
      }
      await action();
    };
  };

  return { isSignedIn, requireAuth };
}
