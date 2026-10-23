import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useTranslation } from 'react-i18next';

import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeProvider';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export default function TabsLayout() {
  const theme = useTheme();
  const { t } = useTranslation();
  const onboarded = useSettings((s) => s.onboarded);
  if (!onboarded) return <Redirect href="/onboarding" />;

  const icon = (outline: IconName, filled: IconName) =>
    function TabIcon({ focused, color }: { focused: boolean; color: unknown }) {
      return <Ionicons name={focused ? filled : outline} size={23} color={color as string} />;
    };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: { backgroundColor: theme.colors.tabBar, borderTopColor: theme.colors.border },
        tabBarLabelStyle: { fontFamily: theme.fonts.uiMedium, fontSize: 11 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.home'), tabBarIcon: icon('home-outline', 'home') }} />
      <Tabs.Screen name="quran" options={{ title: t('tabs.quran'), tabBarIcon: icon('book-outline', 'book') }} />
      <Tabs.Screen name="prayer" options={{ title: t('tabs.prayer'), tabBarIcon: icon('time-outline', 'time') }} />
      <Tabs.Screen name="dhikr" options={{ title: t('tabs.dhikr'), tabBarIcon: icon('ellipse-outline', 'ellipse') }} />
      <Tabs.Screen name="more" options={{ title: t('tabs.more'), tabBarIcon: icon('grid-outline', 'grid') }} />
    </Tabs>
  );
}
