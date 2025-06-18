import { cookies } from 'next/headers';
import { Session } from '../../types/auth';

// Get session from cookies (for server-side)
export async function getSession(): Promise<Session | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('dhis2_session');
    
    if (!sessionCookie) {
      console.log('No session cookie found');
      return null;
    }
    
    // Parse the session from cookie
    const session = JSON.parse(sessionCookie.value) as Session;
    console.log('Session retrieved from cookie:', { id: session.id, serverUrl: session.serverUrl });
    
    // Check if session is expired
    if (session.expiresAt) {
      const expiryDate = new Date(session.expiresAt);
      const now = new Date();
      
      if (now > expiryDate) {
        console.log('Session expired');
        return null;
      }
    }
    
    return session;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

// Store session in cookies (for server-side)
export async function storeSession(session: Session): Promise<void> {
  try {
    const cookieStore = await cookies();
    
    // Set session cookie with expiration
    cookieStore.set('dhis2_session', JSON.stringify(session), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: new Date(session.expiresAt),
      path: '/'
    });
    console.log('Session stored successfully:', { id: session.id, serverUrl: session.serverUrl });
  } catch (error) {
    console.error('Error storing session:', error);
    throw new Error('Failed to store session');
  }
}

// Clear session from cookies
export async function clearSession(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('dhis2_session');
    console.log('Session cleared successfully');
  } catch (error) {
    console.error('Error clearing session:', error);
  }
} 