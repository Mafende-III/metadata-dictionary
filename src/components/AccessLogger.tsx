'use client';

import { useEffect } from 'react';

export default function AccessLogger() {
  useEffect(() => {
    // Log page access when component mounts
    const logAccess = async () => {
      try {
        await fetch('/api/log-access', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: window.location.href,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            referrer: document.referrer,
          }),
        });
      } catch (error) {
        console.error('Failed to log access:', error);
      }
    };

    logAccess();
  }, []);

  return null; // This component doesn't render anything
}