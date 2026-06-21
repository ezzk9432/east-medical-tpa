import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

const IDLE_LIMIT_MS = 30 * 60 * 1000; // 30 minutes, matches SRS SEC-9.1.4
const WARNING_BEFORE_MS = 60 * 1000; // show warning 60s before logout

const ACTIVITY_EVENTS = ["mousedown", "keydown", "scroll", "touchstart"] as const;

/**
 * Tracks user activity and auto-logs-out after IDLE_LIMIT_MS of inactivity,
 * showing a warning WARNING_BEFORE_MS before it happens so the user can
 * extend the session with one click.
 */
export function useIdleTimeout() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const accessToken = useAuthStore((s) => s.accessToken);

  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(Math.floor(WARNING_BEFORE_MS / 1000));

  const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearAllTimers = useCallback(() => {
    if (warningTimer.current) clearTimeout(warningTimer.current);
    if (logoutTimer.current) clearTimeout(logoutTimer.current);
    if (countdownInterval.current) clearInterval(countdownInterval.current);
  }, []);

  const handleLogout = useCallback(() => {
    clearAllTimers();
    logout();
    navigate("/login");
  }, [clearAllTimers, logout, navigate]);

  const resetTimers = useCallback(() => {
    if (!accessToken) return; // not logged in, nothing to track

    clearAllTimers();
    setShowWarning(false);

    warningTimer.current = setTimeout(() => {
      setShowWarning(true);
      setSecondsLeft(Math.floor(WARNING_BEFORE_MS / 1000));
      countdownInterval.current = setInterval(() => {
        setSecondsLeft((s) => (s <= 1 ? 0 : s - 1));
      }, 1000);
    }, IDLE_LIMIT_MS - WARNING_BEFORE_MS);

    logoutTimer.current = setTimeout(handleLogout, IDLE_LIMIT_MS);
  }, [accessToken, clearAllTimers, handleLogout]);

  // "Stay signed in" — called from the warning banner
  const extendSession = useCallback(() => {
    resetTimers();
  }, [resetTimers]);

  useEffect(() => {
    if (!accessToken) {
      clearAllTimers();
      setShowWarning(false);
      return;
    }

    resetTimers();

    const handleActivity = () => {
      // Only reset if the warning isn't showing — once the warning is up,
      // activity elsewhere (e.g. another tab) shouldn't silently dismiss it;
      // the user must explicitly click "Stay signed in".
      if (!showWarning) resetTimers();
    };

    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, handleActivity));

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, handleActivity));
      clearAllTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  return { showWarning, secondsLeft, extendSession, logoutNow: handleLogout };
}
