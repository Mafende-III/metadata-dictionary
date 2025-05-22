import { useState, useEffect, useCallback } from 'react';
import { DHIS2AuthCredentials, DHIS2AuthResponse } from '../types/dhis2';
import { Session, SessionState } from '../types/auth';
import { DHIS2Client } from '../lib/dhis2';
import { generateUUID } from '../lib/utils';
import { API_ROUTES } from '../lib/constants';
import axios from 'axios';

// Local storage key for session
const SESSION_STORAGE_KEY = 'dhis2_session';

// Default session state
const defaultSessionState: SessionState = {
  isLoading: true,
  isAuthenticated: false,
  session: null,
  error: null,
};

// DHIS2 Authentication hook
export const useDHIS2Auth = () => {
  const [state, setState] = useState<SessionState>(defaultSessionState);
  
  // Initialize session from local storage
  useEffect(() => {
    const loadSession = () => {
      try {
        const storedSession = localStorage.getItem(SESSION_STORAGE_KEY);
        
        if (storedSession) {
          const session = JSON.parse(storedSession) as Session;
          const now = new Date();
          const expiresAt = new Date(session.expiresAt);
          
          // Check if session is expired
          if (now < expiresAt) {
            setState({
              isLoading: false,
              isAuthenticated: true,
              session,
              error: null,
            });
          } else {
            // Session expired, clear it
            localStorage.removeItem(SESSION_STORAGE_KEY);
            setState({
              isLoading: false,
              isAuthenticated: false,
              session: null,
              error: 'Session expired. Please log in again.',
            });
          }
        } else {
          setState({
            isLoading: false,
            isAuthenticated: false,
            session: null,
            error: null,
          });
        }
      } catch (error) {
        console.error('Error loading session:', error);
        setState({
          isLoading: false,
          isAuthenticated: false,
          session: null,
          error: 'Failed to load session. Please log in again.',
        });
      }
    };
    
    loadSession();
  }, []);
  
  // Save session to local storage
  const saveSession = useCallback((session: Session) => {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  }, []);
  
  // Log in to DHIS2
  const login = useCallback(async (credentials: DHIS2AuthCredentials): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // Call the API login endpoint
      const response = await axios.post<DHIS2AuthResponse>(API_ROUTES.AUTH.DHIS2, credentials);
      
      // Check if response has the required data
      if (!response.data) {
        throw new Error('No response data received');
      }

      if (response.data.authenticated && response.data.user) {
        // Create session
        const now = new Date();
        const expiresAt = new Date(now);
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration
        
        const token = btoa(`${credentials.username}:${credentials.password}`);
        
        const session: Session = {
          id: generateUUID(),
          userId: response.data.user.id,
          serverUrl: credentials.serverUrl,
          username: credentials.username,
          token,
          expiresAt: expiresAt.toISOString(),
          lastUsed: now.toISOString(),
        };
        
        // Save session to local storage
        saveSession(session);
        
        try {
          // Also store session in Supabase for cross-device usage
          await axios.post(API_ROUTES.SUPABASE.SESSIONS, {
            sessionId: session.id,
            userId: session.userId,
            serverUrl: session.serverUrl,
            username: session.username,
            expiresAt: session.expiresAt,
          });
        } catch (supabaseError) {
          console.error('Failed to store session in Supabase:', supabaseError);
          // Continue without throwing since local storage is still working
        }
        
        setState({
          isLoading: false,
          isAuthenticated: true,
          session,
          error: null,
        });
      } else {
        setState({
          isLoading: false,
          isAuthenticated: false,
          session: null,
          error: response.data.error || 'Authentication failed',
        });
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setState({
        isLoading: false,
        isAuthenticated: false,
        session: null,
        error: error.response?.data?.error || error.message || 'Authentication failed',
      });
    }
  }, [saveSession]);
  
  // Log out from DHIS2
  const logout = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      if (state.session) {
        // Delete session from Supabase
        await axios.delete(`${API_ROUTES.SUPABASE.SESSIONS}?sessionId=${state.session.id}`);
      }
      
      // Clear local storage
      localStorage.removeItem(SESSION_STORAGE_KEY);
      
      setState({
        isLoading: false,
        isAuthenticated: false,
        session: null,
        error: null,
      });
    } catch (error: any) {
      console.error('Logout error:', error);
      // Still clear local session even if API fails
      localStorage.removeItem(SESSION_STORAGE_KEY);
      
      setState({
        isLoading: false,
        isAuthenticated: false,
        session: null,
        error: null,
      });
    }
  }, [state.session]);
  
  // Test connection to DHIS2
  const testConnection = useCallback(async (credentials: DHIS2AuthCredentials): Promise<boolean> => {
    try {
      const response = await axios.post(API_ROUTES.DHIS2.TEST_CONNECTION, credentials);
      return response.data.connected;
    } catch (error) {
      console.error('Connection test error:', error);
      return false;
    }
  }, []);
  
  return {
    isLoading: state.isLoading,
    isAuthenticated: state.isAuthenticated,
    session: state.session,
    error: state.error,
    login,
    logout,
    testConnection,
  };
};