import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, TextInput, View } from 'react-native';

import { AppText, Button, Icon, Notice } from '@/components/ui';
import { getContentDb } from '@/db';
import { useTheme } from '@/theme/ThemeProvider';
import { cityToLocation, locateWithGps, searchCities } from './locationService';
import type { SavedLocation } from './types';

/** GPS button + offline city search over the bundled city database. */
export function LocationPicker({ onPick }: { onPick: (loc: SavedLocation) => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [locating, setLocating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setQuery(text), 200);
    return () => clearTimeout(id);
  }, [text]);

  const cities = useQuery({
    queryKey: ['cities', query],
    queryFn: () => searchCities(getContentDb(), query),
    enabled: query.trim().length >= 2,
    staleTime: Infinity,
  });

  const useGps = async () => {
    setLocating(true);
    setGpsError(null);
    const r = await locateWithGps();
    setLocating(false);
    if (r.ok) onPick(r.location);
    else setGpsError(r.reason === 'denied' ? t('location.permissionDenied') : r.reason === 'services-off' ? t('location.servicesOff') : t('location.failed'));
  };

  return (
    <View style={{ gap: 12 }}>
      <Button icon="navigate" title={locating ? t('onboarding.locating') : t('onboarding.useMyLocation')} loading={locating} onPress={useGps} />
      {gpsError ? <Notice tone="warning">{gpsError}</Notice> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, minHeight: 48, borderRadius: 24, backgroundColor: theme.colors.surface, borderWidth: 0.5, borderColor: theme.colors.border }}>
        <Icon name="search" size={18} color={theme.colors.textMuted} />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={t('location.searchCity')}
          placeholderTextColor={theme.colors.textMuted}
          autoCorrect={false}
          accessibilityLabel={t('location.searchCity')}
          style={{ flex: 1, color: theme.colors.text, fontFamily: theme.fonts.ui, fontSize: 16, paddingVertical: 10 }}
        />
      </View>
      {cities.data?.map((c) => (
        <Pressable
          key={c.id}
          onPress={() => onPick(cityToLocation(c))}
          accessibilityRole="button"
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, opacity: pressed ? 0.6 : 1 })}
        >
          <Icon name="location-outline" size={18} color={theme.colors.primary} />
          <View style={{ flex: 1 }}>
            <AppText variant="bodyStrong">{c.name}</AppText>
            <AppText variant="caption" tone="muted">
              {[c.province, c.country].filter(Boolean).join(', ')} · {c.timezone}
            </AppText>
          </View>
        </Pressable>
      ))}
      {query.trim().length >= 2 && cities.data && !cities.data.length ? (
        <AppText tone="muted" align="center">
          {t('location.noCities')}
        </AppText>
      ) : null}
    </View>
  );
}
