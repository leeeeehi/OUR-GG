import { useEffect, useState } from 'react';
import { getDdragonVersion } from '../lib/ddragon';

/** 챔피언 아이콘 등에 쓸 Data Dragon 최신 버전 문자열을 반환한다 (초기엔 고정 버전, 이후 최신값으로 갱신). */
export default function useDdragonVersion() {
  const [version, setVersion] = useState('14.24.1');

  useEffect(() => {
    let active = true;
    getDdragonVersion().then((v) => {
      if (active) setVersion(v);
    });
    return () => {
      active = false;
    };
  }, []);

  return version;
}
