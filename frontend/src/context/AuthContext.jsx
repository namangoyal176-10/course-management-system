import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

/**
 * AuthProvider Component
 * Manages user session, JWT storage in localStorage, and axios auth headers.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize session from localStorage on application mount
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setToken(storedToken);
          setUser(parsedUser);
          axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;

          // Verify token against backend /api/auth/me endpoint
          try {
            const res = await axios.get(`${API_BASE_URL}/auth/me`, {
              headers: { Authorization: `Bearer ${storedToken}` }
            });
            if (res.data?.success && res.data?.user) {
              setUser(res.data.user);
              localStorage.setItem('user', JSON.stringify(res.data.user));
            }
          } catch (verifyError) {
            // Token expired or invalid -> clear local storage
            if (verifyError.response && verifyError.response.status === 401) {
              console.warn('Session token expired or invalid. Logging out.');
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              delete axios.defaults.headers.common['Authorization'];
              setToken(null);
              setUser(null);
            }
          }
        } catch (parseError) {
          console.error('Failed to parse cached user:', parseError);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  // Set up Axios response interceptor to automatically catch 401s (expired tokens)
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          // If 401 occurs on a protected route (not a login attempt itself)
          if (!error.config.url.includes('/auth/login') && !error.config.url.includes('/auth/register')) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            delete axios.defaults.headers.common['Authorization'];
            setToken(null);
            setUser(null);
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  /**
   * Log in user with email and password
   */
  const login = async (email, password) => {
    const res = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: email.trim().toLowerCase(),
      password
    });

    if (res.data?.success && res.data?.token) {
      const authToken = res.data.token;
      const authUser = res.data.user;

      localStorage.setItem('token', authToken);
      localStorage.setItem('user', JSON.stringify(authUser));
      axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;

      setToken(authToken);
      setUser(authUser);
      return authUser;
    }

    throw new Error(res.data?.message || 'Login failed');
  };

  /**
   * Register new user (always creates role 'user') and automatically logs in
   */
  const register = async (name, email, password) => {
    const regRes = await axios.post(`${API_BASE_URL}/auth/register`, {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password
    });

    if (regRes.data?.success) {
      // Automatically log in newly registered user
      return await login(email, password);
    }

    throw new Error(regRes.data?.message || 'Registration failed');
  };

  /**
   * Log out current user and clear local storage
   */
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    isAuthenticated: Boolean(token && user),
    loading,
    login,
    register,
    logout,
    API_BASE_URL
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Custom hook to access authentication context
 */
// oxlint-disable-next-line react/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
