import { useEffect, useRef, useState } from 'react';

interface UseAutoRefreshOptions {
  interval?: number; // in milliseconds
  enabled?: boolean;
  onRefresh?: () => void | Promise<void>;
}

export function useAutoRefresh({
  interval = 30000, // default 30 seconds
  enabled = true,
  onRefresh,
}: UseAutoRefreshOptions) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const refresh = async () => {
    if (isRefreshing) return;
    
    try {
      setIsRefreshing(true);
      await onRefresh?.();
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Auto-refresh error:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!enabled || !onRefresh) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(refresh, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, interval, onRefresh]);

  return {
    isRefreshing,
    lastRefresh,
    refresh,
  };
}
