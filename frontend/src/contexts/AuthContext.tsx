import React, { useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { AuthContext, AuthContextType, User } from './AuthContextDefinition';
import { io, Socket } from 'socket.io-client';

export { AuthContext };
export type { AuthContextType };

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [socket, setSocket] = useState<Socket | null>(null);

  // Apply token to axios defaults and attempt to fetch current user when token exists
  useEffect(() => {
    // Set axios base URL from environment (Vite) if provided so deployed frontend
    // can talk to a separate backend host. If VITE_API_URL is unset, axios
    // will use relative URLs (same origin).
  const apiBase = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_URL;
    if (apiBase) axios.defaults.baseURL = apiBase;

    const applyTokenAndFetch = async () => {
      if (!token) return;
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      try {
        const res = await axios.get('/api/auth/me');
        setUser(res.data);
      } catch (err) {
        // If token invalid or request fails, clear token
        console.error('Failed to fetch current user', err);
        setUser(null);
        setToken(null);
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
      }
    };
    applyTokenAndFetch();
  }, [token]);

  // Create socket when we have a token and a user
  useEffect(() => {
    if (!token || !user) return;

    // Determine socket URL: if VITE_API_URL is set, strip trailing /api to get socket host
    const apiBase = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_URL;
    const socketUrl = apiBase ? apiBase.replace(/\/(?:api)?\/?$/, '') : 'http://localhost:3000';

    const s = io(socketUrl, { auth: { token }, transports: ['websocket'] });
    s.on('connect', () => {
      console.log('socket connected', s.id);
    });
    s.on('connect_error', (err) => {
      console.error('socket connect_error', err);
    });
    setSocket(s);

    return () => {
      try {
        s.disconnect();
      } catch {
        // ignore
      }
      setSocket(null);
    };
  }, [token, user]);

  const login = async (email: string, password: string) => {
    const res = await axios.post('/api/auth/login', { email, password });
    setUser(res.data.user);
    setToken(res.data.token);
    localStorage.setItem('token', res.data.token);
  };

  const signup = async (name: string, email: string, password: string) => {
    const res = await axios.post('/api/auth/signup', { name, email, password });
    setUser(res.data.user);
    setToken(res.data.token);
    localStorage.setItem('token', res.data.token);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    if (socket) {
      try {
        socket.disconnect();
      } catch {
        // ignore
      }
      setSocket(null);
    }
  };

  const value: AuthContextType = { user, token, socket, login, signup, logout } as AuthContextType;

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};