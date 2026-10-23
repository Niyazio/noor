import { useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Linking, View } from 'react-native';

import { AppText, Card, Divider, ListRow, Notice, Screen, SectionHeader } from '@/components/ui';
import { CONTENT_MANIFEST } from '@/content/generated/contentManifest';
import { useContentMeta } from '@/data/queries';
import { getContentDb } from '@/db';
import { sha256Hex } from '@/lib/hash';

/** Recomputes the canonical text checksum on the device (on demand, off the startup path). */
async function verifyFullText(): Promise<{ ok: boolean; count: number }> {
  const rows = await getContentDb().getAllAsync<{ surah: number; ayah: number; text: string }>('SELECT surah, ayah, text FROM ayahs ORDER BY id');
  const hash = await sha256Hex(rows.map((r) => `${r.surah}:${r.ayah}\t${r.text}\n`).join(''));
  return { ok: hash === CONTENT_MANIFEST.quran.textSha256, count: rows.length };
}

export default function SourcesScreen() {
  const { t } = useTranslation();
  const meta = useContentMeta();
  const integrity = useQuery({ queryKey: ['integrity'], queryFn: verifyFullText, staleTime: Infinity });
  const q = CONTENT_MANIFEST.quran;
  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: t('more.sources') }} />
      <Notice>{t('sources.intro')}</Notice>

      <SectionHeader title={t('sources.quranText')} />
      <Card style={{ gap: 6 }}>
        <AppText variant="bodyStrong">
          {q.name} — v{q.version}
        </AppText>
        <AppText variant="caption" tone="muted">
          {q.riwaya} · {q.license}
        </AppText>
        <ListRow icon="open-outline" title="tanzil.net" onPress={() => Linking.openURL(q.sourceUrl)} />
        <AppText variant="caption" tone={integrity.data && !integrity.data.ok ? 'danger' : 'muted'}>
          {t('sources.integrity')}:{' '}
          {integrity.isLoading
            ? t('sources.integrityChecking')
            : integrity.data?.ok
              ? t('sources.integrityOk', { count: integrity.data.count })
              : t('quran.integrityFailed')}
        </AppText>
        {meta.data?.quran_copyright_block ? (
          <AppText variant="caption" tone="muted" style={{ fontFamily: undefined, marginTop: 6 }}>
            {meta.data.quran_copyright_block.replace(/^#\s?/gm, '').trim()}
          </AppText>
        ) : null}
      </Card>

      <SectionHeader title={t('sources.translations')} />
      <Card style={{ paddingVertical: 4 }}>
        {CONTENT_MANIFEST.translations.map((tr, i) => (
          <View key={tr.id} style={{ paddingVertical: 10, gap: 2 }}>
            {i > 0 ? <Divider /> : null}
            <AppText variant="bodyStrong">
              {tr.name} ({tr.language})
            </AppText>
            <AppText variant="caption" tone="muted">
              {tr.translator} · {tr.source}
            </AppText>
            <AppText variant="caption" tone="muted">
              {tr.license}
            </AppText>
            {!tr.commercialUseCleared ? (
              <AppText variant="caption" tone="gold">
                {t('sources.licenseReview')}
              </AppText>
            ) : null}
          </View>
        ))}
      </Card>

      <SectionHeader title={t('sources.prayerLibrary')} />
      <Card>
        <AppText variant="caption">{t('sources.prayerLibraryBody')}</AppText>
      </Card>
      <SectionHeader title={t('sources.hijriLibrary')} />
      <Card>
        <AppText variant="caption">{t('sources.hijriLibraryBody')}</AppText>
      </Card>
      <SectionHeader title={t('sources.cities')} />
      <Card>
        <AppText variant="caption">
          {CONTENT_MANIFEST.cities.source} — {CONTENT_MANIFEST.cities.license}
        </AppText>
      </Card>
    </Screen>
  );
}
