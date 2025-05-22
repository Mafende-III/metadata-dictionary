import { DHIS2AuthCredentials } from './dhis2';

// Session type stored in localStorage and cookies
export interface Session {
  id: string;
  userId: string;
  serverUrl: string;
  username: string;
  token: string; // Base64 encoded username:password for Basic Auth
  expiresAt: string;
  lastUsed: string;
}

// Session state for the auth hook
export interface SessionState {
  isLoading: boolean;
  isAuthenticated: boolean;
  session: Session | null;
  error: string | null;
}

// Auth context type
export interface AuthContextType {
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: (credentials: DHIS2AuthCredentials) => Promise<void>;
  logout: () => Promise<void>;
  testConnection: (credentials: DHIS2AuthCredentials) => Promise<boolean>;
}

// Supabase auth session record
export interface SupabaseSession {
  id: string;
  user_id: string;
  server_url: string;
  username: string;
  token: string; // Encrypted token
  created_at: string;
  expires_at: string;
  last_used: string;
} 