import { useCallback, useEffect, useRef, useState } from 'react';
import useAuth from './useAuth';
import { getFriendsFeed } from '../lib/riotApi';

const POLL_INTERVAL_MS = 90 * 1000;
const MIN_REFRESH_GAP_MS = 30 * 1000;

/**
 * 친구들의 최근 전적을 불러오고, 화면이 보이는 동안 주기적으로(약 90초) 다시 조회한다.
 * Riot에는 푸시가 없으므로 "실시간"은 이 주기적 재조회로 구현한다. 탭이 숨겨져 있으면 조회하지 않는다.
 *
 * Example usage:
 * const { cards, followingCount, hiddenCount, loading, error, updatedAt, isRefreshing, refresh } = useFriendsFeed();
 */
export default function useFriendsFeed() {
  const { user } = useAuth();
  const userId = user?.id;
  const [feed, setFeed] = useState({ cards: [], followingCount: 0, hiddenCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const inFlightRef = useRef(false);
  const lastFetchRef = useRef(0);

  const refresh = useCallback(async () => {
    if (!userId || inFlightRef.current) return;
    inFlightRef.current = true;
    lastFetchRef.current = Date.now();
    setIsRefreshing(true);
    try {
      const data = await getFriendsFeed();
      setFeed(data);
      setError(null);
      setUpdatedAt(new Date());
    } catch (err) {
      setError(err);
    } finally {
      inFlightRef.current = false;
      setIsRefreshing(false);
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return undefined;
    }

    refresh();

    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, POLL_INTERVAL_MS);

    // 다른 탭에 있다가 돌아오면, 마지막 조회 이후 충분히 지났을 때 바로 갱신한다
    function handleVisibility() {
      if (document.visibilityState === 'visible' && Date.now() - lastFetchRef.current > MIN_REFRESH_GAP_MS) {
        refresh();
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [userId, refresh]);

  return { ...feed, loading, error, updatedAt, isRefreshing, refresh };
}
