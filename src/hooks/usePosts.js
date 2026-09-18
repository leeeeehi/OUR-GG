import { useEffect, useState } from 'react';

/**
 * @param {function(): Promise<Array>} fetchFn - 게시물 목록을 가져오는 비동기 함수 [Required]
 * @param {Array} deps - fetchFn 재실행 조건이 되는 의존성 배열 [Required]
 */
export default function usePosts(fetchFn, deps) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchFn()
      .then((data) => {
        if (!active) return;
        setPosts(data ?? []);
        setError(null);
      })
      .catch((err) => {
        if (active) setError(err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { posts, setPosts, loading, error };
}
