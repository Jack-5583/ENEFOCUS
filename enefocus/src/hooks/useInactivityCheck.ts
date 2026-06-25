'use client';
import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/lib/store';

const INACTIVITY_THRESHOLD = 30 * 60 * 1000; // 30 minutes
const CHECK_INTERVAL = 60 * 1000; // check every minute

export function useInactivityCheck(onInactiveDetected: () => void) {
  const { activeTodoId, activeZoomSession, timerStartedAt } = useStore();
  const lastActivityRef = useRef(Date.now());
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const recordActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', recordActivity);
    window.addEventListener('keydown', recordActivity);
    window.addEventListener('touchstart', recordActivity);
    window.addEventListener('click', recordActivity);
    return () => {
      window.removeEventListener('mousemove', recordActivity);
      window.removeEventListener('keydown', recordActivity);
      window.removeEventListener('touchstart', recordActivity);
      window.removeEventListener('click', recordActivity);
    };
  }, [recordActivity]);

  useEffect(() => {
    // Only run inactivity check when timer is active and no camstudy
    if (!activeTodoId || !timerStartedAt || activeZoomSession) {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      return;
    }

    checkIntervalRef.current = setInterval(() => {
      const idle = Date.now() - lastActivityRef.current;
      if (idle >= INACTIVITY_THRESHOLD) {
        onInactiveDetected();
      }
    }, CHECK_INTERVAL);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    };
  }, [activeTodoId, timerStartedAt, activeZoomSession, onInactiveDetected]);
}
