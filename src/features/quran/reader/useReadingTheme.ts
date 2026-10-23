import { useMemo } from 'react';

import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { resolveReadingTheme, type ReadingTheme } from '@/theme/themes';

export function useReadingTheme(): ReadingTheme {
  const app = useTheme();
  const id = useSettings((s) => s.reading.theme);
  return useMemo(() => resolveReadingTheme(id, app), [id, app]);
}
