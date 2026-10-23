import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText, Button, Card, Notice, ToggleRow } from '@/components/ui';
import { useSettings } from '@/store/settings';
import { getCustomAzan, removeCustomAzan, saveCustomAzan } from './customAzan';
import { playAzan, stopAzan } from './webPlayback';

/** Web app: choose an Azan recording, preview it, allow browser notifications. */
export function WebAzanSettings() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const inApp = useSettings((s) => s.audio.inAppAdhan);
  const update = useSettings((s) => s.update);
  const azan = useQuery({ queryKey: ['customAzan'], queryFn: getCustomAzan });
  const [perm, setPerm] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported');
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choose = async () => {
    setError(null);
    const res = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: false });
    if (res.canceled) return;
    const asset = res.assets[0];
    try {
      const blob = asset.file ?? (await (await fetch(asset.uri)).blob());
      if (blob.size > 25 * 1024 * 1024) throw new Error(t('azan.tooLarge'));
      await saveCustomAzan(blob, asset.name);
      await qc.invalidateQueries({ queryKey: ['customAzan'] });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <>
      <Notice tone="warning" icon="information-circle-outline">
        {t('azan.webLimitation')}
      </Notice>
      <Card style={{ gap: 10 }}>
        <AppText variant="heading">{t('azan.sound')}</AppText>
        <AppText variant="caption" tone="muted">
          {azan.data ? t('azan.current', { name: azan.data.name }) : t('azan.noRecording')}
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button icon="musical-notes-outline" variant="secondary" title={azan.data ? t('azan.change') : t('azan.choose')} onPress={choose} />
          <Button
            icon={playing ? 'stop' : 'play'}
            variant="ghost"
            title={playing ? t('audio.stop') : t('azan.preview')}
            onPress={() => {
              if (playing) {
                stopAzan();
                setPlaying(false);
              } else {
                playAzan().then(() => setPlaying(true)).catch((e) => setError(String(e)));
              }
            }}
          />
          {azan.data ? (
            <Button
              icon="trash-outline"
              variant="ghost"
              title={t('common.delete')}
              onPress={async () => {
                await removeCustomAzan();
                await qc.invalidateQueries({ queryKey: ['customAzan'] });
              }}
            />
          ) : null}
        </View>
        {error ? <AppText tone="danger" variant="caption">{error}</AppText> : null}
        <AppText variant="caption" tone="muted">
          {t('azan.licenseNote')}
        </AppText>
      </Card>
      <Card style={{ paddingVertical: 4 }}>
        <ToggleRow title={t('azan.inApp')} subtitle={t('azan.inAppHint')} value={inApp} onValueChange={(v) => update('audio', { inAppAdhan: v })} />
      </Card>
      {perm !== 'unsupported' ? (
        <Card style={{ gap: 8 }}>
          <AppText variant="bodyStrong">{t('azan.browserNotifications')}</AppText>
          <AppText variant="caption" tone="muted">
            {perm === 'granted' ? t('azan.browserGranted') : perm === 'denied' ? t('azan.browserDenied') : t('azan.browserHint')}
          </AppText>
          {perm === 'default' ? (
            <Button icon="notifications" title={t('onboarding.allowNotifications')} onPress={() => Notification.requestPermission().then(setPerm)} />
          ) : null}
        </Card>
      ) : null}
    </>
  );
}
