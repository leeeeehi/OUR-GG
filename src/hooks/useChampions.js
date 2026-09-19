import { useEffect, useState } from 'react';
import { getChampionById, loadChampions } from '../lib/ddragon';

/**
 * 전체 챔피언 목록(Data Dragon)을 불러오고, 로딩이 끝나면 화면을 다시 그리게 한다.
 * 로딩 전에는 getChampionById가 '알 수 없음'을 반환한다.
 *
 * Example usage:
 * const { getChampionById } = useChampions();
 * const champion = getChampionById(post.champion_id);
 */
export default function useChampions() {
  const [, setLoadedCount] = useState(0);

  useEffect(() => {
    let active = true;
    loadChampions().then(() => {
      if (active) setLoadedCount((count) => count + 1);
    });
    return () => {
      active = false;
    };
  }, []);

  return { getChampionById };
}
