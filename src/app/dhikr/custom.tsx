import { useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, TextInput, View } from 'react-native';

import { AppText, Button, Card, Screen, ToggleRow } from '@/components/ui';
import { keys, useCustomDhikr } from '@/data/queries';
import { getUserDb } from '@/db';
import { deleteCustomDhikr, saveCustomDhikr, type CustomDhikr } from '@/features/dhikr/repository';
import { useTheme } from '@/theme/ThemeProvider';

export default function CustomDhikrScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useCustomDhikr().data?.find((d) => d.id === id);
  // Remount the form once the record loads so its fields start from saved values.
  return <CustomDhikrForm key={existing?.id ?? 'new'} existing={existing} />;
}

function CustomDhikrForm({ existing }: { existing: CustomDhikr | undefined }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const qc = useQueryClient();
  const [title, setTitle] = useState(existing?.title ?? '');
  const [arabic, setArabic] = useState(existing?.arabic ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [target, setTarget] = useState(existing?.target ? String(existing.target) : '');
  const [favorite, setFavorite] = useState(existing?.favorite ?? false);
  const [error, setError] = useState<string | null>(null);

  const input = (value: string, onChange: (v: string) => void, label: string, opts: { rtl?: boolean; numeric?: boolean; multiline?: boolean } = {}) => (
    <View style={{ gap: 6 }}>
      <AppText variant="label" tone="muted">
        {label}
      </AppText>
      <TextInput
        value={value}
        onChangeText={onChange}
        accessibilityLabel={label}
        keyboardType={opts.numeric ? 'number-pad' : 'default'}
        multiline={opts.multiline}
        style={{
          minHeight: opts.multiline ? 80 : 48, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
          backgroundColor: theme.colors.surfaceAlt, color: theme.colors.text, fontSize: opts.rtl ? 22 : 16,
          fontFamily: opts.rtl ? 'AmiriQuran_400Regular' : theme.fonts.ui, textAlign: opts.rtl ? 'right' : 'auto', writingDirection: opts.rtl ? 'rtl' : 'auto',
        }}
      />
    </View>
  );

  const save = async () => {
    try {
      await saveCustomDhikr(getUserDb(), {
        id: existing?.id ?? `custom-${Date.now().toString(36)}`,
        title, arabic, notes, target: Number(target) || null, favorite, createdAt: existing?.createdAt,
      });
      await qc.invalidateQueries({ queryKey: keys.customDhikr });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: existing ? existing.title : t('dhikr.addCustom') }} />
      <Card style={{ gap: 14 }}>
        {input(title, setTitle, t('dhikr.customTitle'))}
        {input(arabic, setArabic, t('dhikr.customArabic'), { rtl: true })}
        {input(notes, setNotes, t('dhikr.customNotes'), { multiline: true })}
        {input(target, (v) => setTarget(v.replace(/\D/g, '')), t('dhikr.target'), { numeric: true })}
        <ToggleRow title={t('dhikr.favorite')} value={favorite} onValueChange={setFavorite} icon="star-outline" />
        {error ? <AppText tone="danger">{error}</AppText> : null}
      </Card>
      <Button title={t('common.save')} onPress={save} disabled={!title.trim()} />
      {existing ? (
        <Button
          variant="danger"
          title={t('common.delete')}
          onPress={() =>
            Alert.alert(t('dhikr.deleteCustom'), existing.title, [
              { text: t('common.cancel'), style: 'cancel' },
              {
                text: t('common.delete'),
                style: 'destructive',
                onPress: async () => {
                  await deleteCustomDhikr(getUserDb(), existing.id);
                  await qc.invalidateQueries({ queryKey: keys.customDhikr });
                  router.back();
                },
              },
            ])
          }
        />
      ) : null}
    </Screen>
  );
}
