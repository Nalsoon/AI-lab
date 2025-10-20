import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

export const useSessionManager = () => {
  const [isSessionValid, setIsSessionValid] = useState(true);
  const [sessionError, setSessionError] = useState(null);
  const sessionCheckRef = useRef(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  const checkSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Session check error:', error);
        setSessionError(error.message);
        setIsSessionValid(false);
        return false;
      }

      if (!session) {
        console.log('No active session found');
        setIsSessionValid(false);
        setSessionError('No active session');
        return false;
      }

      // Check if session is expired
      const now = new Date().getTime() / 1000;
      if (session.expires_at && session.expires_at < now) {
        console.log('Session expired, attempting refresh...');
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshedSession) {
          console.error('Session refresh failed:', refreshError);
          setIsSessionValid(false);
          setSessionError('Session refresh failed');
          return false;
        }
        
        console.log('Session refreshed successfully');
        setIsSessionValid(true);
        setSessionError(null);
        retryCountRef.current = 0;
        return true;
      }

      // Session is valid
      setIsSessionValid(true);
      setSessionError(null);
      retryCountRef.current = 0;
      return true;
    } catch (error) {
      console.error('Session check exception:', error);
      setSessionError(error.message);
      setIsSessionValid(false);
      return false;
    }
  };

  const startSessionMonitoring = () => {
    if (sessionCheckRef.current) {
      clearInterval(sessionCheckRef.current);
    }

    // Check session immediately
    checkSession();

    // Then check every 30 seconds
    sessionCheckRef.current = setInterval(async () => {
      const isValid = await checkSession();
      
      if (!isValid && retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        console.log(`Session check failed, retry ${retryCountRef.current}/${maxRetries}`);
        
        // Wait before retrying
        setTimeout(() => {
          checkSession();
        }, 2000 * retryCountRef.current); // Exponential backoff
      } else if (!isValid && retryCountRef.current >= maxRetries) {
        console.log('Max retries reached, session is invalid');
        setIsSessionValid(false);
        setSessionError('Session validation failed after multiple attempts');
      }
    }, 30000);
  };

  const stopSessionMonitoring = () => {
    if (sessionCheckRef.current) {
      clearInterval(sessionCheckRef.current);
      sessionCheckRef.current = null;
    }
  };

  const resetSession = () => {
    retryCountRef.current = 0;
    setSessionError(null);
    setIsSessionValid(true);
  };

  useEffect(() => {
    return () => {
      stopSessionMonitoring();
    };
  }, []);

  return {
    isSessionValid,
    sessionError,
    checkSession,
    startSessionMonitoring,
    stopSessionMonitoring,
    resetSession
  };
};
