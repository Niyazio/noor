import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { AppText, Button, Card, Divider, HeroCard, Icon, Notice, Screen, Segmented } from '@/components/ui';
import brand from '@/config/brand.json';
import { LocationPicker } from '@/features/location/LocationPicker';
import { requestNotificationPermission } from '@/features/notifications/scheduler';
import { CALCULATION_METHODS, suggestMethodForCountry } from '@/features/prayer/methods';
import { applyLanguage, detectDeviceLanguage } from '@/i18n';
import { LANGUAGES } from '@/i18n/languages';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeProvider';

const STEPS = ['welcome', 'language', 'location', 'method', 'notifications'] as const;
type Step = (typeof STEPS)[number];

export default function Onboarding() {
  const { t } = useTranslation();
  const theme = useTheme();
  const s = useSettings();
  const [step, setStep] = useState<Step>('welcome');
  const index = STEPS.indexOf(step);
  const next = () => setStep(STEPS[Math.min(index + 1, STEPS.length - 1)]);
  const suggested = suggestMethodForCountry(s.location?.country);

  const finish = () => {
    if (!s.prayer.confirmed) s.update('prayer', { method: s.prayer.method, confirmed: true });
    s.set('onboarded', true);
    router.replace('/');
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ flexDirection: 'row', gap: 6 }} accessibilityLabel={`${index + 1} / ${STEPS.length}`}>
        {STEPS.map((x, i) => (
          <View key={x} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= index ? theme.colors.primary : theme.colors.border }} />
        ))}
      </View>

      {step === 'welcome' ? (
        <>
          <HeroCard style={{ minHeight: 260, justifyContent: 'flex-end' }}>
            <AppText style={{ fontFamily: 'AmiriQuran_400Regular', fontSize: 44, lineHeight: 80, color: theme.colors.onHero }}>نور</AppText>
            <AppText variant="display" tone="onHero">
              {t('onboarding.welcomeTitle', { app: brand.appName })}
            </AppText>
            <AppText tone="onHeroMuted">{brand.tagline}</AppText>
          </HeroCard>
          <AppText variant="body" tone="muted">
            {t('onboarding.welcomeBody')}
          </AppText>
          <Button
            title={t('common.continue')}
            onPress={() => {
              const lang = detectDeviceLanguage();
              s.set('language', lang);
              applyLanguage(lang);
              next();
            }}
          />
        </>
      ) : null}

      {step === 'language' ? (
        <>
          <AppText variant="title">{t('onboarding.languageTitle')}</AppText>
          <Card style={{ paddingVertical: 4 }}>
            {LANGUAGES.map((l, i) => (
              <View key={l.code}>
                {i > 0 ? <Divider /> : null}
                <Pressable
                  onPress={() => {
                    s.set('language', l.code);
                    applyLanguage(l.code);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: s.language === l.code }}
                  style={{ flexDirection: 'row', alignItems: 'center', minHeight: 52, gap: 12 }}
                >
                  <AppText style={{ flex: 1 }}>{l.native}</AppText>
                  <AppText variant="caption" tone="muted">{l.name}</AppText>
                  <Icon name={s.language === l.code ? 'radio-button-on' : 'radio-button-off'} size={20} color={s.language === l.code ? theme.colors.primary : theme.colors.textMuted} />
                </Pressable>
              </View>
            ))}
          </Card>
          <Notice>{t('onboarding.languageNote')}</Notice>
          <Button title={t('common.continue')} onPress={next} />
        </>
      ) : null}

      {step === 'location' ? (
        <>
          <AppText variant="title">{t('onboarding.locationTitle')}</AppText>
          <AppText tone="muted">{t('onboarding.locationBody')}</AppText>
          {s.location ? (
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Icon name="checkmark-circle" color={theme.colors.success} />
              <View style={{ flex: 1 }}>
                <AppText variant="bodyStrong">{s.location.name}</AppText>
                <AppText variant="caption" tone="muted">{s.location.timezone}</AppText>
              </View>
            </Card>
          ) : null}
          {s.location ? <Button title={t('common.continue')} onPress={next} /> : null}
          <LocationPicker
            onPick={(loc) => {
              s.set('location', loc);
              s.update('prayer', { method: suggestMethodForCountry(loc.country) });
            }}
          />
          {!s.location ? <Button variant="ghost" title={t('common.skip')} onPress={next} /> : null}
        </>
      ) : null}

      {step === 'method' ? (
        <>
          <AppText variant="title">{t('onboarding.methodTitle')}</AppText>
          <AppText tone="muted">{t('onboarding.methodBody')}</AppText>
          <Card style={{ paddingVertical: 4 }}>
            {CALCULATION_METHODS.map((m, i) => (
              <View key={m.id}>
                {i > 0 ? <Divider /> : null}
                <Pressable
                  onPress={() => s.update('prayer', { method: m.id, confirmed: true })}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: s.prayer.method === m.id }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}
                >
                  <Icon name={s.prayer.method === m.id ? 'radio-button-on' : 'radio-button-off'} size={20} color={s.prayer.method === m.id ? theme.colors.primary : theme.colors.textMuted} />
                  <View style={{ flex: 1 }}>
                    <AppText variant={s.prayer.method === m.id ? 'bodyStrong' : 'body'}>{m.label}</AppText>
                    <AppText variant="caption" tone="muted">
                      {m.id === suggested && s.location ? `${t('onboarding.suggested')} · ` : ''}
                      {m.region}
                    </AppText>
                  </View>
                </Pressable>
              </View>
            ))}
          </Card>
          <AppText variant="label" tone="muted">{t('onboarding.asrTitle')}</AppText>
          <Segmented
            value={s.prayer.asr}
            onChange={(v) => s.update('prayer', { asr: v })}
            options={[
              { value: 'standard', label: t('prayer.asrStandard') },
              { value: 'hanafi', label: t('prayer.asrHanafi') },
            ]}
          />
          <Button title={t('common.continue')} onPress={() => { s.update('prayer', { confirmed: true }); next(); }} />
        </>
      ) : null}

      {step === 'notifications' ? (
        <>
          <AppText variant="title">{t('onboarding.notificationsTitle')}</AppText>
          <AppText tone="muted">{t('onboarding.notificationsBody')}</AppText>
          <Notice tone="warning" icon="volume-high-outline">{t('notifications.adhanLimitation')}</Notice>
          <Button
            icon="notifications"
            title={t('onboarding.allowNotifications')}
            onPress={async () => {
              await requestNotificationPermission();
              finish();
            }}
          />
          <Button variant="ghost" title={t('common.skip')} onPress={finish} />
        </>
      ) : null}
    </Screen>
  );
}
