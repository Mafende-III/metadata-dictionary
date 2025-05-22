// DHIS2 API base response type
export interface DHIS2Response<T> {
  pager?: {
    page: number;
    pageCount: number;
    total: number;
    pageSize: number;
  };
  [key: string]: any; // The actual object is wrapped in a key that varies by endpoint
}

// DHIS2 API authentication type
export interface DHIS2AuthCredentials {
  serverUrl: string;
  username: string;
  password: string;
}

// DHIS2 API authentication response
export interface DHIS2AuthResponse {
  authenticated: boolean;
  user?: {
    id: string;
    name: string;
    username: string;
    authorities: string[];
  };
  error?: string;
}

// DHIS2 API connection response
export interface DHIS2ConnectionResponse {
  connected: boolean;
  version?: string;
  name?: string;
  serverInfo?: {
    version: string;
    revision: string;
    build: string;
    serverDate: string;
  };
  error?: string;
}

// DHIS2 API error
export interface DHIS2Error {
  httpStatusCode: number;
  message: string;
  status: string;
  error?: string;
  details?: string;
} 