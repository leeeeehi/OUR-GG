import { useEffect, useState } from 'react';
import { getUserMatches } from '../lib/riotApi';

/**
 * 우리 앱 유저의 프로필과 최근 매치를 불러온다. userId가 바뀌면 다시 불러온다.
 * @param {string} userId - 조회할 유저 id [Required]
 *
 * Example usage:
 * const { data, loading, error } = useUserMatches(userId);
 */
export default function useUserMatches(userId) {
  const [state, setState] = useState({ data: null, loading: true, error: null });

  useEffect(() => {
    let active = true;
    setState({ data: null, loading: true, error: null });
    getUserMatches(userId)
      .then((data) => {
        if (active) setState({ data, loading: false, error: null });
      })
      .catch((error) => {
        if (active) setState({ data: null, loading: false, error });
      });
    return () => {
      active = false;
    };
  }, [userId]);

  return state;
}
