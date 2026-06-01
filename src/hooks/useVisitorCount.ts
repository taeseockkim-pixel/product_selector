import { useState, useEffect } from 'react';

export function useVisitorCount(): number | null {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const sessionKey = `visited-${today}`;
    const stored = sessionStorage.getItem(sessionKey);

    if (stored !== null) {
      setCount(Number(stored));
      return;
    }

    fetch(`https://api.counterapi.dev/v1/cimon-selector/${today}/up`)
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.count === 'number') {
          setCount(data.count);
          sessionStorage.setItem(sessionKey, String(data.count));
        }
      })
      .catch(() => setCount(null));
  }, []);

  return count;
}
