import { useTheme } from '@/context/theme-context';

export function useColorScheme() {
  const { activeScheme } = useTheme();
  return activeScheme;
}
