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
const PRINCIPAL_KEY = 'ecivil.principal';

const CITIZEN = 'CITIZEN';
const STAFF_ROLES = ['AGENT', 'ADMIN', 'SUPER_ADMIN'];

function readStoredPrincipal() {
  try {
    const raw = localStorage.getItem(PRINCIPAL_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * One session at a time, for either kind of principal: a citizen (NINA + OTP) or a
 * back-office user (email + password). `role` is what the UI gates on — and only
 * the UI. Every route re-authorizes server-side; this hides screens, nothing more.
 */
export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [principal, setPrincipal] = useState(readStoredPrincipal);

  // Keep the Authorization header in step with the token.
  useEffect(() => {
    if (token) apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
    else delete apiClient.defaults.headers.common.Authorization;
  }, [token]);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(PRINCIPAL_KEY);
    setToken(null);
    setPrincipal(null);
  }, []);

  const startSession = useCallback((nextToken, nextPrincipal) => {
    localStorage.setItem(TOKEN_KEY, nextToken);
    localStorage.setItem(PRINCIPAL_KEY, JSON.stringify(nextPrincipal));
    setToken(nextToken);
    setPrincipal(nextPrincipal);
  }, []);

  /** Citizen session, from NINA + OTP verification. */
  const login = useCallback(
    ({ token: nextToken, citizen }) => startSession(nextToken, { ...citizen, role: CITIZEN }),
    [startSession],
  );

  /** Back-office session. The role comes from the server, never from the client. */
  const loginStaff = useCallback(
    ({ token: nextToken, user }) => startSession(nextToken, user),
    [startSession],
  );

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

  const value = useMemo(() => {
    const role = principal?.role ?? null;
    const isStaff = STAFF_ROLES.includes(role);

    return {
      token,
      role,
      principal,
      isAuthenticated: Boolean(token),
      isStaff,
      isCitizen: role === CITIZEN,
      // Narrowed views, so a component cannot accidentally read a staff record
      // where it expects a citizen.
      citizen: role === CITIZEN ? principal : null,
      staff: isStaff ? principal : null,
      login,
      loginStaff,
      logout,
    };
  }, [token, principal, login, loginStaff, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
