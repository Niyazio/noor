import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Icon } from '@/components/ui';
import { currentAndNext } from '@/features/prayer/engine';
import type { ObligatoryPrayer } from '@/features/prayer/types';
import { localDateKey } from '@/lib/time';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { playAzan, stopAzan } from './webPlayback';

const WINDOW_MS = 90_000;
const FIRED_KEY = 'noor.azan.fired';

function alreadyFired(id: string): boolean {
  try {
    return sessionStorage.getItem(FIRED_KEY) === id;
  } catch {
    return false;
  }
}
function markFired(id: string) {
  try {
    sessionStorage.setItem(FIRED_KEY, id);
  } catch {
    // ignore
  }
}

/**
 * Web app only: plays the Azan (or a chime) and shows a browser notification when a prayer time
 * arrives while the app is open. Native apps use scheduled notifications instead, which also work
 * when the app is closed.
 */
export function AzanWatcher() {
  if (Platform.OS !== 'web') return null;
  return <WebAzanWatcher />;
}

function WebAzanWatcher() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [banner, setBanner] = useState<{ prayer: string; blocked: boolean } | null>(null);
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  // Poll once per second (a timer callback, not render), reading the latest settings each time.
  useEffect(() => {
    let firing = false;
    const check = () => {
      const s = useSettings.getState();
      if (firing || !s.onboarded || !s.audio.inAppAdhan || !s.location) return;
      let current: { name: ObligatoryPrayer; time: Date } | null = null;
      let todayKey = '';
      try {
        const r = currentAndNext(s.location, s.prayer, new Date());
        current = r.current;
        todayKey = localDateKey(r.today.date);
      } catch {
        return;
      }
      if (!current) return;
      const elapsed = Date.now() - current.time.getTime();
      if (elapsed < 0 || elapsed > WINDOW_MS) return;
      const mode = s.notifications.prayers[current.name]?.mode ?? 'off';
      if (mode === 'off') return;
      const id = `${todayKey}.${current.name}`;
      if (alreadyFired(id)) return;
      markFired(id);
      const label = tRef.current(`prayer.names.${current.name}`);
      try {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification(tRef.current('notifications.prayerTitle', { prayer: label }), { body: s.location.name, tag: id });
        }
      } catch {
        // Notifications unavailable (e.g. iOS outside an installed web app).
      }
      if (mode === 'adhan' || mode === 'sound') {
        firing = true;
        playAzan()
          .then(() => setBanner({ prayer: label, blocked: false }))
          .catch(() => setBanner({ prayer: label, blocked: true }))
          .finally(() => {
            firing = false;
          });
      } else {
        setBanner({ prayer: label, blocked: false });
      }
    };
    const timer = setInterval(check, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!banner) return null;
  return (
    <View
      style={{
        position: 'absolute', top: insets.top + 8, left: 12, right: 12, zIndex: 50, borderRadius: 18, padding: 14,
        backgroundColor: theme.colors.primary, flexDirection: 'row', alignItems: 'center', gap: 12,
        shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, elevation: 8,
      }}
    >
      <Icon name="notifications" size={22} color={theme.colors.onPrimary} />
      <View style={{ flex: 1 }}>
        <AppText variant="bodyStrong" tone="onPrimary">
          {t('notifications.prayerTitle', { prayer: banner.prayer })}
        </AppText>
        {banner.blocked ? (
          <AppText variant="caption" tone="onPrimary">
            {t('azan.tapToPlay')}
          </AppText>
        ) : null}
      </View>
      {banner.blocked ? (
        <Pressable
          onPress={() => playAzan().then(() => setBanner({ ...banner, blocked: false })).catch(() => undefined)}
          accessibilityRole="button"
          style={{ paddingHorizontal: 12, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center' }}
        >
          <AppText variant="label" tone="onPrimary">
            {t('audio.play')}
          </AppText>
        </Pressable>
      ) : null}
      <Pressable
        onPress={() => {
          stopAzan();
          setBanner(null);
        }}
        accessibilityRole="button"
        accessibilityLabel={t('common.close')}
        hitSlop={10}
      >
        <Icon name="close" size={22} color={theme.colors.onPrimary} />
      </Pressable>
    </View>
  );
}
