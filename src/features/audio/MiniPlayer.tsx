import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Icon, type IconName } from '@/components/ui';
import { SURAHS } from '@/content/generated/surahs';
import { useSettings } from '@/store/settings';
import type { ReadingTheme } from '@/theme/themes';
import { useAudio } from './player';
import { RECITERS, findReciter } from './reciters';

const REPEATS = [1, 2, 3, 5, 0];
const SPEEDS = [0.75, 1, 1.25, 1.5];

/**
 * Recitation controls shown at the bottom of the reader. `startAt` is where "Play" begins
 * when nothing is playing (the ayah or page currently on screen).
 */
export function MiniPlayer({ rt, startAt }: { rt: ReadingTheme; startAt: { surah: number; ayah: number } }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { status, queue, error, playFrom, toggle, next, prev, stop, setRate } = useAudio();
  const audio = useSettings((s) => s.audio);
  const update = useSettings((s) => s.update);
  const [picker, setPicker] = useState(false);
  const reciter = findReciter(audio.reciterId);
  const active = status !== 'idle' && queue;

  const btn = (icon: IconName, label: string, onPress: () => void, big = false, disabled = false) => (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => ({
        width: big ? 48 : 38, height: big ? 48 : 38, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
        backgroundColor: big ? rt.ornament : 'transparent', opacity: disabled ? 0.35 : pressed ? 0.6 : 1,
      })}
    >
      <Icon name={icon} size={big ? 24 : 22} color={big ? rt.page : rt.ink} />
    </Pressable>
  );

  const label = active
    ? queue.basmala
      ? `${SURAHS[queue.surah - 1].nameTranslit} · ${t('audio.basmala')}`
      : queue.kind === 'surah'
        ? `${SURAHS[queue.surah - 1].nameTranslit} (${queue.surah})`
        : `${SURAHS[queue.surah - 1].nameTranslit} ${queue.surah}:${queue.ayah}`
    : `${SURAHS[startAt.surah - 1].nameTranslit} ${startAt.surah}:${startAt.ayah}`;

  return (
    <>
      <View
        style={{
          position: 'absolute', left: 10, right: 10, bottom: insets.bottom + 10, borderRadius: 22, padding: 8, paddingLeft: 14,
          backgroundColor: rt.page, borderWidth: 1, borderColor: rt.frameInner,
          shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Pressable onPress={() => setPicker(true)} accessibilityRole="button" accessibilityLabel={t('audio.chooseReciter')} style={{ flex: 1, paddingRight: 6 }}>
            <AppText variant="label" numberOfLines={1} style={{ color: rt.ink }}>
              {status === 'error' ? t('audio.error') : label}
            </AppText>
            <AppText variant="caption" numberOfLines={1} style={{ color: rt.inkMuted }}>
              {reciter.name} ▾
            </AppText>
          </Pressable>
          {active ? btn('play-skip-back', t('audio.previous'), prev) : null}
          {status === 'loading' ? (
            <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: rt.ornament }}>
              <ActivityIndicator color={rt.page} />
            </View>
          ) : active ? (
            btn(status === 'playing' ? 'pause' : status === 'error' ? 'refresh' : 'play', status === 'playing' ? t('audio.pause') : t('audio.play'), toggle, true)
          ) : (
            btn('play', t('audio.play'), () => playFrom(startAt.surah, startAt.ayah), true)
          )}
          {active ? btn('play-skip-forward', t('audio.next'), next) : null}
          {active ? btn('close', t('audio.stop'), stop) : null}
        </View>
        {active ? (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, paddingRight: 6 }}>
            {reciter.kind === 'ayah' ? (
              <Chip
                rt={rt}
                icon="repeat"
                label={audio.repeatAyah === 0 ? '∞' : `×${audio.repeatAyah}`}
                onPress={() => update('audio', { repeatAyah: REPEATS[(REPEATS.indexOf(audio.repeatAyah) + 1) % REPEATS.length] })}
                a11y={t('audio.repeat')}
              />
            ) : null}
            <Chip rt={rt} icon="speedometer-outline" label={`${audio.speed}×`} onPress={() => setRate(SPEEDS[(SPEEDS.indexOf(audio.speed) + 1) % SPEEDS.length] ?? 1)} a11y={t('audio.speed')} />
            <Chip
              rt={rt}
              icon={audio.continuous ? 'infinite' : 'stop-circle-outline'}
              label={audio.continuous ? t('audio.continuous') : t('audio.stopAtEnd')}
              onPress={() => update('audio', { continuous: !audio.continuous })}
              a11y={t('audio.continuous')}
            />
          </View>
        ) : null}
        {status === 'error' ? (
          <AppText variant="caption" style={{ color: rt.inkMuted, marginTop: 4 }}>
            {error === 'network' ? t('audio.errorNetwork') : t('audio.errorPlayback')}
          </AppText>
        ) : null}
      </View>
      <ReciterSheet rt={rt} visible={picker} onClose={() => setPicker(false)} />
    </>
  );
}

function Chip({ rt, icon, label, onPress, a11y }: { rt: ReadingTheme; icon: IconName; label: string; onPress: () => void; a11y: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 28, borderRadius: 14, backgroundColor: rt.chipBg }}>
      <Icon name={icon} size={14} color={rt.chipInk} />
      <AppText variant="caption" style={{ color: rt.chipInk }}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function ReciterSheet({ rt, visible, onClose }: { rt: ReadingTheme; visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const current = useSettings((s) => s.audio.reciterId);
  const update = useSettings((s) => s.update);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }} onPress={onClose} accessibilityLabel={t('common.close')} />
      <View style={{ backgroundColor: rt.page, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: insets.bottom + 16, maxHeight: '75%' }}>
        <AppText variant="heading" style={{ color: rt.ink, marginBottom: 4 }}>
          {t('audio.chooseReciter')}
        </AppText>
        <AppText variant="caption" style={{ color: rt.inkMuted, marginBottom: 10 }}>
          {t('audio.streamingNote')}
        </AppText>
        <ScrollView>
          {RECITERS.map((r) => {
            const selected = r.id === current;
            return (
              <Pressable
                key={r.id}
                onPress={() => {
                  update('audio', { reciterId: r.id });
                  onClose();
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: rt.frameInner }}
              >
                <Icon name={selected ? 'radio-button-on' : 'radio-button-off'} size={20} color={rt.ornament} />
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyStrong" style={{ color: rt.ink }}>
                    {r.name}
                  </AppText>
                  <AppText variant="caption" style={{ color: rt.inkMuted }}>
                    {r.style} · {r.kind === 'ayah' ? t('audio.verseByVerse') : t('audio.wholeSurah')}
                  </AppText>
                </View>
                <AppText style={{ fontFamily: 'AmiriQuran_400Regular', fontSize: 18, lineHeight: 30, color: rt.ornament }}>{r.nameAr}</AppText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}
