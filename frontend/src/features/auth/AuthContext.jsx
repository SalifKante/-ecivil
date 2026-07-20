import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '../../lib/apiClient';

const AuthContext = createContext(null);

/**
 * PROTOTYPE TRADE-OFF: the session token lives in localStorage, which is readable
 * by any script running on the page (XSS). A production build of a government
 * identity service should move to an httpOnly, Secure, SameSite cookie with a
 * short-lived access token plus refresh rotation. Tracked in CLAUDE.md §6 "Later".
 */
const TOKEN_KEY = 'ecivil.token';
const CITIZEN_KEY = 'ecivil.citizen';

function readStoredCitizen() {
  try {
    const raw = localStorage.getItem(CITIZEN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [citizen, setCitizen] = useState(readStoredCitizen);

  // Keep the Authorization header in step with the token.
  useEffect(() => {
    if (token) apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
    else delete apiClient.defaults.headers.common.Authorization;
  }, [token]);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(CITIZEN_KEY);
    setToken(null);
    setCitizen(null);
  }, []);

  const login = useCallback(({ token: nextToken, citizen: nextCitizen }) => {
    localStorage.setItem(TOKEN_KEY, nextToken);
    localStorage.setItem(CITIZEN_KEY, JSON.stringify(nextCitizen));
    setToken(nextToken);
    setCitizen(nextCitizen);
  }, []);

  // A rejected token means the session is over — drop it rather than loop on 401s.
  useEffect(() => {
    const interceptor = apiClient.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error?.status === 401) logout();
        return Promise.reject(error);
      },
    );
    return () => apiClient.interceptors.response.eject(interceptor);
  }, [logout]);

  const value = useMemo(
    () => ({ token, citizen, isAuthenticated: Boolean(token), login, logout }),
    [token, citizen, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
