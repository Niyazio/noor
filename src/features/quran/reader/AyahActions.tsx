import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Modal, Platform, Pressable, Share, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Button, Icon, type IconName } from '@/components/ui';
import { CONTENT_MANIFEST } from '@/content/generated/contentManifest';
import { SURAHS } from '@/content/generated/surahs';
import { useAyah, useBookmarkedIds, useEditions, useNote, useSaveNote, useToggleBookmark } from '@/data/queries';
import { useAudio } from '@/features/audio/player';
import { formatAyahForSharing } from '@/features/quran/repository';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeProvider';

export interface AyahRef {
  id: number;
  surah: number;
  ayah: number;
}

/** Bottom sheet for one ayah: play, bookmark, note, copy, share. Remount (key) per ayah. */
export function AyahActions({ target, onClose }: { target: AyahRef | null; onClose: () => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const editionIds = useSettings((s) => s.reading.translationIds);
  const full = useAyah(target?.id ?? null, editionIds);
  const editions = useEditions();
  const bookmarkedIds = useBookmarkedIds();
  const toggle = useToggleBookmark(target?.surah ?? 1);
  const note = useNote(target?.id ?? null);
  const saveNote = useSaveNote(target?.surah ?? 1);
  const playFrom = useAudio((s) => s.playFrom);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [copied, setCopied] = useState(false);

  if (!target) return null;
  const bookmarked = bookmarkedIds.has(target.id);
  const shareText = () =>
    full.data ? formatAyahForSharing(full.data, editions.data ?? [], `${CONTENT_MANIFEST.quran.name} ${CONTENT_MANIFEST.quran.version}`) : '';

  const action = (icon: IconName, label: string, onPress: () => void, disabled = false) => (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 52, opacity: disabled ? 0.4 : pressed ? 0.6 : 1 })}
    >
      <Icon name={icon} size={22} color={theme.colors.primary} />
      <AppText variant="body">{label}</AppText>
    </Pressable>
  );

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }} onPress={onClose} accessibilityLabel={t('common.close')} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ backgroundColor: theme.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: insets.bottom + 16, gap: 4 }}>
          <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.border, marginBottom: 8 }} />
          <AppText variant="heading">
            {SURAHS[target.surah - 1].nameTranslit} {target.surah}:{target.ayah}
          </AppText>
          {full.data ? (
            <AppText variant="caption" tone="muted">
              {t('quran.juzN', { n: full.data.juz })} · {t('quran.page', { n: full.data.page })}
            </AppText>
          ) : null}
          {editing ? (
            <View style={{ gap: 10, marginTop: 10 }}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder={t('quran.notePlaceholder')}
                placeholderTextColor={theme.colors.textMuted}
                multiline
                autoFocus
                style={{ minHeight: 100, borderRadius: 12, padding: 12, backgroundColor: theme.colors.surfaceAlt, color: theme.colors.text, fontFamily: theme.fonts.ui, fontSize: 15, textAlignVertical: 'top' }}
              />
              <Button
                title={t('common.save')}
                loading={saveNote.isPending}
                onPress={() => saveNote.mutate({ ayahId: target.id, ayah: target.ayah, body: draft }, { onSuccess: () => setEditing(false) })}
              />
            </View>
          ) : (
            <View style={{ marginTop: 6 }}>
              {note.data ? (
                <View style={{ padding: 12, borderRadius: 12, backgroundColor: theme.colors.goldSoft, marginBottom: 6 }}>
                  <AppText variant="body">{note.data.body}</AppText>
                </View>
              ) : null}
              {action('play-circle-outline', t('quran.playFrom'), () => {
                playFrom(target.surah, target.ayah);
                onClose();
              })}
              {action(bookmarked ? 'bookmark' : 'bookmark-outline', bookmarked ? t('quran.removeBookmark') : t('quran.bookmark'), () =>
                toggle.mutate({ ayahId: target.id, ayah: target.ayah, bookmarked }, { onSuccess: onClose }),
              )}
              {action('create-outline', note.data ? t('quran.editNote') : t('quran.addNote'), () => {
                setDraft(note.data?.body ?? '');
                setEditing(true);
              })}
              {action(copied ? 'checkmark' : 'copy-outline', copied ? t('common.copied') : t('quran.copyAyah'), async () => {
                await Clipboard.setStringAsync(shareText());
                setCopied(true);
              }, !full.data)}
              {action('share-outline', t('quran.shareAyah'), () => {
                Share.share({ message: shareText() }).catch(() => undefined);
              }, !full.data)}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
