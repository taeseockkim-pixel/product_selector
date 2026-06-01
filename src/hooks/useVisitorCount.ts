import { useState, useEffect } from 'react';

export function useVisitorCount(): number | null {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    // 세션 내 중복 카운트 방지
    const sessionKey = `visited-${today}`;
    const alreadyCounted = sessionStorage.getItem(sessionKey);

    const endpoint = alreadyCounted
      ? `https://counterapi.dev/api/cimon-selector/${today}/get`
      : `https://counterapi.dev/api/cimon-selector/${today}/hit`;

    fetch(endpoint)
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.value === 'number') {
          setCount(data.value);
          if (!alreadyCounted) sessionStorage.setItem(sessionKey, '1');
        }
      })
      .catch(() => setCount(null));
  }, []);

  return count;
}
