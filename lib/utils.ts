import { Session } from '../types/auth';

// Generate a UUID
export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Format date for display
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Format time difference for "last updated"
export const timeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);
  const diffMonth = Math.round(diffDay / 30);
  const diffYear = Math.round(diffMonth / 12);
  
  if (diffSec < 60) {
    return `${diffSec} second${diffSec === 1 ? '' : 's'} ago`;
  } else if (diffMin < 60) {
    return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  } else if (diffHour < 24) {
    return `${diffHour} hour${diffHour === 1 ? '' : 's'} ago`;
  } else if (diffDay < 30) {
    return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
  } else if (diffMonth < 12) {
    return `${diffMonth} month${diffMonth === 1 ? '' : 's'} ago`;
  } else {
    return `${diffYear} year${diffYear === 1 ? '' : 's'} ago`;
  }
};

// Truncate text with ellipsis
export const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) {
    return text;
  }
  
  return `${text.slice(0, maxLength)}...`;
};

// Cookie handling functions
export const setCookie = (name: string, value: string, days: number): void => {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Strict`;
};

export const getCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  
  return null;
};

export const deleteCookie = (name: string): void => {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Strict`;
};

// Local storage session management
export const storeSession = (session: Session): void => {
  localStorage.setItem('dhis2_session', JSON.stringify(session));
  setCookie('dhis2_session_id', session.id, 7); // Store session ID in cookie for 7 days
};

export const getSession = (): Session | null => {
  const sessionStr = localStorage.getItem('dhis2_session');
  
  if (!sessionStr) {
    return null;
  }
  
  try {
    return JSON.parse(sessionStr) as Session;
  } catch {
    return null;
  }
};

export const clearSession = (): void => {
  localStorage.removeItem('dhis2_session');
  deleteCookie('dhis2_session_id');
};

// Check if session is expired
export const isSessionExpired = (session: Session): boolean => {
  if (!session.expiresAt) {
    return false;
  }
  
  const expiryDate = new Date(session.expiresAt);
  const now = new Date();
  
  return now > expiryDate;
};

// Get metadata type display name
export const getMetadataTypeLabel = (type: string): string => {
  switch (type.toUpperCase()) {
    case 'DATA_ELEMENT':
      return 'Data Element';
    case 'INDICATOR':
      return 'Indicator';
    case 'DASHBOARD':
      return 'Dashboard';
    case 'SQL_VIEW':
      return 'SQL View';
    default:
      return type;
  }
}; 