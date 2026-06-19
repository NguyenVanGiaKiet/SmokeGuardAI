import { useEffect, useState } from 'react';
import { useTheme } from '@/context/theme-context';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const { activeScheme } = useTheme();

  if (hasHydrated) {
    return activeScheme;
  }

  return 'light';
}
