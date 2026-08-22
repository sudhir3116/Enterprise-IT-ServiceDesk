import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import api, { setAccessToken } from '../services/api';
import { refreshToken as refreshTokenApi, getMe as getMeApi, logout as logoutApi } from '../services/authApi';

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  // Initial state MUST be: user = null, isAuthenticated = false, isLoading = true
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Memory/SessionStorage state for pending onboarding users who do not have JWTs by design
  const [pendingUser, setPendingUserState] = useState(() => {
    try {
      const stored = sessionStorage.getItem('pendingUser');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });

  const navigate = useNavigate();

  const setPendingUser = useCallback((userData) => {
    setPendingUserState(userData);
    if (userData) {
      sessionStorage.setItem('pendingUser', JSON.stringify(userData));
    } else {
      sessionStorage.removeItem('pendingUser');
    }
  }, []);

  const clearPendingUser = useCallback(() => {
    setPendingUserState(null);
    sessionStorage.removeItem('pendingUser');
  }, []);

  const clearAuthState = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setOrganization(null);
    setPermissions([]);
    setIsAuthenticated(false);
    clearPendingUser();
    try {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('refreshToken');
    } catch (e) {}
  }, [clearPendingUser]);

  const refreshSession = useCallback(async () => {
    try {
      const data = await refreshTokenApi();
      if (data && data.accessToken) {
        setAccessToken(data.accessToken);
        return data.accessToken;
      }
      clearAuthState();
      return null;
    } catch (err) {
      clearAuthState();
      return null;
    }
  }, [clearAuthState]);

  const login = useCallback((userData, token, orgData = null, perms = []) => {
    console.log('[AuthContext] login() called for:', userData?.email);
    clearPendingUser();
    setAccessToken(token);
    flushSync(() => {
      setUser(userData);
      setOrganization(orgData || userData?.organization || null);
      setPermissions(perms || []);
      setIsAuthenticated(true);
    });
  }, [clearPendingUser]);

  const logout = useCallback(async () => {
    try {
      await logoutApi();
    } catch (err) {
      console.error('[AuthContext] Logout API call error:', err);
    } finally {
      clearAuthState();
      navigate('/login', { replace: true });
    }
  }, [navigate, clearAuthState]);

  const updateUser = useCallback((updatedFields) => {
    setUser(prevUser => (prevUser ? { ...prevUser, ...updatedFields } : null));
  }, []);

  const updateOrganization = useCallback((updatedFields) => {
    setOrganization(prev => (prev ? { ...prev, ...updatedFields } : updatedFields));
  }, []);

  useEffect(() => {
    let isMounted = true;
    let isRefreshing = false;
    let failedQueue = [];

    const processQueue = (error, token = null) => {
      failedQueue.forEach(prom => {
        if (error) {
          prom.reject(error);
        } else {
          prom.resolve(token);
        }
      });
      failedQueue = [];
    };

    // Axios Interceptor for 401 handling
    const interceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        const isAuthEndpoint =
          originalRequest.url?.includes('/auth/login') ||
          originalRequest.url?.includes('/auth/refresh') ||
          originalRequest.url?.includes('/auth/register') ||
          originalRequest.url?.includes('/auth/me');

        if (error.response && error.response.status === 401 && !isAuthEndpoint && !originalRequest._retry) {
          if (isRefreshing) {
            return new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject });
            })
              .then(token => {
                originalRequest.headers['Authorization'] = 'Bearer ' + token;
                return api(originalRequest);
              })
              .catch(err => Promise.reject(err));
          }

          originalRequest._retry = true;
          isRefreshing = true;

          try {
            const data = await refreshTokenApi();
            const newAccessToken = data.accessToken;
            setAccessToken(newAccessToken);
            originalRequest.headers['Authorization'] = 'Bearer ' + newAccessToken;
            processQueue(null, newAccessToken);
            return api(originalRequest);
          } catch (err) {
            processQueue(err, null);
            if (isMounted) {
              clearAuthState();
              navigate('/login', { replace: true });
            }
            return Promise.reject(err);
          } finally {
            isRefreshing = false;
          }
        }
        return Promise.reject(error);
      }
    );

    // Initial session initialization flow on application load
    const initAuth = async () => {
      if (window.location.pathname.includes('/oauth-callback')) {
        console.log('[AuthInit] OAuth callback route detected, postponing initAuth...');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // Step 1: Immediately call GET /api/auth/me
        let meSuccess = false;
        try {
          const response = await getMeApi();
          console.log("AUTH CHECK", response);
          if (response && response.user && isMounted) {
            setUser(response.user);
            setOrganization(response.organization || null);
            setPermissions(response.permissions || []);
            setIsAuthenticated(true);
            meSuccess = true;
          }
        } catch (meErr) {
          console.log("AUTH CHECK (Initial /me failed)", meErr.message || meErr);
        }

        // Step 2: If /me failed, attempt refresh token recovery via HttpOnly cookie
        if (!meSuccess) {
          try {
            const refreshRes = await refreshTokenApi();
            if (refreshRes && refreshRes.accessToken) {
              setAccessToken(refreshRes.accessToken);
              const retriedMe = await getMeApi();
              console.log("AUTH CHECK (Retried /me after refresh)", retriedMe);
              if (retriedMe && retriedMe.user && isMounted) {
                setUser(retriedMe.user);
                setOrganization(retriedMe.organization || null);
                setPermissions(retriedMe.permissions || []);
                setIsAuthenticated(true);
                meSuccess = true;
              }
            }
          } catch (refreshErr) {
            console.log("AUTH CHECK (Refresh recovery failed)", refreshErr.message || refreshErr);
          }
        }

        if (!meSuccess && isMounted) {
          // If no active session, retain pendingUser if visiting /pending-approval
          if (!window.location.pathname.includes('/pending-approval')) {
            clearAuthState();
          } else {
            setAccessToken(null);
            setUser(null);
            setIsAuthenticated(false);
          }
        }
      } catch (err) {
        console.log("AUTH CHECK (Error in initAuth)", err);
        if (isMounted) {
          clearAuthState();
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      isMounted = false;
      api.interceptors.response.eject(interceptor);
    };
  }, [navigate, clearAuthState]);

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        organization, 
        permissions,
        isAuthenticated, 
        isLoading, 
        loading: isLoading, 
        pendingUser,
        setPendingUser,
        clearPendingUser,
        login, 
        logout, 
        refreshSession, 
        updateUser, 
        updateOrganization 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
