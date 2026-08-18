import React, { createContext, useState, useEffect, useCallback, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { getToken, saveToken, clearToken, saveUser, clearUser, getUser as getLocalUser } from '../services/auth';

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/** Decode the exp claim from a JWT without verifying signature.
 *  Used ONLY for proactive UI logout — backend still enforces actual expiry on every request. */
function getTokenExpMs(token) {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=')
    const payload = JSON.parse(atob(padded));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const performLogout = useCallback(() => {
    clearToken();
    clearUser();
    setUser(null);
    sessionStorage.clear();
    // Clear all cookies for this origin
    document.cookie.split(';').forEach((c) => {
      document.cookie = c.replace(/^ +/, '').replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
    });
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

    // 1. Axios Interceptor for 401
    const interceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response && error.response.status === 401) {
          if (error.response.data?.error === "TokenExpiredError" && !originalRequest._retry) {
            if (isRefreshing) {
              return new Promise(function(resolve, reject) {
                failedQueue.push({ resolve, reject });
              }).then(token => {
                originalRequest.headers['Authorization'] = 'Bearer ' + token;
                return api(originalRequest);
              }).catch(err => {
                return Promise.reject(err);
              });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
              const res = await api.post('/auth/refresh', {}, { withCredentials: true });
              const newAccessToken = res.data.accessToken;
              saveToken(newAccessToken);
              api.defaults.headers.common['Authorization'] = 'Bearer ' + newAccessToken;
              originalRequest.headers['Authorization'] = 'Bearer ' + newAccessToken;
              processQueue(null, newAccessToken);
              return api(originalRequest);
            } catch (err) {
              processQueue(err, null);
              if (isMounted) {
                window.toast?.('Session expired. Please log in again.', 'error');
                performLogout();
                navigate('/login', { replace: true });
              }
              return Promise.reject(err);
            } finally {
              isRefreshing = false;
            }
          } else {
            if (isMounted) {
              window.toast?.('Session expired. Please log in again.', 'error');
              performLogout();
              navigate('/login', { replace: true });
            }
          }
        }
        return Promise.reject(error);
      }
    );

    // 2. Initial verification — validates token against backend on every page load / refresh
    const initAuth = async () => {
      const token = getToken();
      if (!token) {
        if (isMounted) {
          performLogout();
          setLoading(false);
        }
        return;
      }

      // Fast-path: check exp claim before making a network call
      const expMs = getTokenExpMs(token);
      if (expMs && expMs <= Date.now()) {
        if (isMounted) {
          performLogout();
          navigate('/login', { replace: true });
          setLoading(false);
        }
        return;
      }
      
      try {
        const res = await api.get('/auth/profile');
        if (res.data && res.data.user) {
          if (isMounted) {
            const userData = res.data.user;
            saveUser(userData);
            setUser(userData);
          }
        } else {
          if (isMounted) performLogout();
        }
      } catch (error) {
        // Clear auth state if token validation fails for ANY reason on startup
        if (isMounted) {
          performLogout();
          navigate('/login', { replace: true });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    // 3. Proactive expiry polling — checks the exp claim embedded by the backend every 30s.
    // This ensures idle users are logged out without requiring an API call.
    // The backend remains the sole authority; this is just a UI-layer enforcement.
    const intervalId = setInterval(() => {
      if (!isMounted) return;
      const token = getToken();
      if (!token) return;
      const expMs = getTokenExpMs(token);
      if (expMs && expMs <= Date.now()) {
        window.toast?.('Session expired. Please log in again.', 'error');
        performLogout();
        navigate('/login', { replace: true });
      }
    }, 30_000);

    return () => {
      isMounted = false;
      api.interceptors.response.eject(interceptor);
      clearInterval(intervalId);
    };
  }, [navigate, performLogout]); // stable dependencies

  const login = (userData, token) => {
    saveToken(token);
    saveUser(userData);
    setUser(userData);
  };

  const updateUser = (updatedFields) => {
    setUser(prevUser => {
      const updatedUser = { ...prevUser, ...updatedFields };
      saveUser(updatedUser);
      return updatedUser;
    });
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout API failed', err);
    } finally {
      performLogout();
      navigate('/login', { replace: true });
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}
