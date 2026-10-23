import { AmiriQuran_400Regular } from '@expo-google-fonts/amiri-quran';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { ScheherazadeNew_400Regular } from '@expo-google-fonts/scheherazade-new';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppText, Button } from '@/components/ui';
import { queryClient } from '@/data/queries';
import { ContentIntegrityError, openDatabases } from '@/db';
import { AzanWatcher } from '@/features/azan/AzanWatcher';
import { NotificationSync } from '@/features/notifications/NotificationSync';
import '@/features/notifications/backgroundTask';
import i18n, { applyLanguage } from '@/i18n';
import { useSettings, waitForSettingsHydration } from '@/store/settings';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

type Boot = { state: 'loading' } | { state: 'ready' } | { state: 'error'; integrity: boolean; message: string };

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    AmiriQuran_400Regular,
    ScheherazadeNew_400Regular,
  });
  const [boot, setBoot] = useState<Boot>({ state: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await waitForSettingsHydration();
        applyLanguage(useSettings.getState().language);
        await openDatabases();
        if (!cancelled) setBoot({ state: 'ready' });
      } catch (e) {
        if (!cancelled) {
          setBoot({ state: 'error', integrity: e instanceof ContentIntegrityError, message: e instanceof Error ? e.message : String(e) });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const ready = (fontsLoaded || !!fontError) && boot.state !== 'loading';
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            {boot.state === 'error' ? (
              <BootError integrity={boot.integrity} message={boot.message} onRetry={() => setAttempt((a) => a + 1)} />
            ) : (
              <AppNavigator />
            )}
          </QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppNavigator() {
  const theme = useTheme();
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.colors.background).catch(() => undefined);
  }, [theme.colors.background]);
  return (
    <>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <NotificationSync />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.primary,
          headerTitleStyle: { fontFamily: theme.fonts.uiSemiBold, color: theme.colors.text },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.colors.background },
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="quran/[surah]" options={{ headerShown: false }} />
        <Stack.Screen name="dhikr/focus" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
      </Stack>
      <AzanWatcher />
    </>
  );
}

function BootError({ integrity, message, onRetry }: { integrity: boolean; message: string; onRetry: () => void }) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
      <AppText variant="title" align="center">
        {i18n.t('common.error')}
      </AppText>
      <AppText tone="muted" align="center">
        {integrity ? i18n.t('quran.integrityFailed') : message}
      </AppText>
      <Button title={i18n.t('common.retry')} onPress={onRetry} />
    </View>
  );
}
