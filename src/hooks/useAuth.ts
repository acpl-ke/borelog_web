import { useState, useCallback } from 'react';
import { authService } from '../services/authService';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    authService.isAuthenticated()
  );
  const [user, setUser] = useState(authService.getCurrentUser());

  const login = useCallback(async (loginId: string, password: string) => {
    const res = await authService.login({ loginId, password });
    setIsAuthenticated(res.isSucess);
    setUser(res.isSucess ? res : null);
    return res;
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setIsAuthenticated(false);
    setUser(null);
  }, []);

  return { isAuthenticated, user, login, logout };
}
