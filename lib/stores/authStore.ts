import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthStore {
  dhisBaseUrl: string;
  username: string;
  password: string;
  authToken: string;
  isAuthenticated: boolean;
  
  setCredentials: (baseUrl: string, username: string, password: string) => void;
  clearCredentials: () => void;
  getAuthToken: () => string;
  getDhisBaseUrl: () => string;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      dhisBaseUrl: '',
      username: '',
      password: '',
      authToken: '',
      isAuthenticated: false,
      
      setCredentials: (baseUrl, username, password) => {
        const authToken = btoa(`${username}:${password}`);
        set({
          dhisBaseUrl: baseUrl,
          username,
          password,
          authToken,
          isAuthenticated: true
        });
      },
      
      clearCredentials: () => {
        set({
          dhisBaseUrl: '',
          username: '',
          password: '',
          authToken: '',
          isAuthenticated: false
        });
      },
      
      getAuthToken: () => get().authToken,
      getDhisBaseUrl: () => get().dhisBaseUrl
    }),
    {
      name: 'dhis2-auth-store',
    }
  )
); 