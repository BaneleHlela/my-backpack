import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { Text } from '../AppText';
import { useTheme } from '../../theme/ThemeContext';
import { fonts } from '../../theme/fonts';
import { spacing } from '@my-backpack/shared';

export function useBucketStyles() {
  const { colors } = useTheme();
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.md, gap: 16, paddingBottom: 40 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flexWrap: 'wrap',
    },
    between: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    title: {
      fontFamily: fonts.display.bold,
      fontSize: 28,
      color: colors.text.primary,
    },
    heading: {
      fontFamily: fonts.display.semibold,
      fontSize: 18,
      color: colors.text.primary,
    },
    text: { fontSize: 15, color: colors.text.primary },
    muted: { fontSize: 13, color: colors.text.muted },
    card: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.text.faint,
      padding: 18,
      gap: 10,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.text.faint,
      borderRadius: 14,
      padding: 12,
      color: colors.text.primary,
      fontSize: 16,
      minHeight: 48,
    },
    error: { color: colors.error.DEFAULT, fontSize: 14 },
    divider: {
      borderBottomWidth: 1,
      borderBottomColor: colors.text.faint,
      paddingVertical: 12,
      gap: 8,
    },
  });
}

export function BucketAction({
  children,
  onPress,
  disabled,
  tone = 'violet',
}: {
  children: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'violet' | 'lime' | 'neutral';
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 46,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 14,
        backgroundColor:
          tone === 'lime'
            ? '#A3E635'
            : tone === 'violet'
              ? '#A78BFA'
              : '#CBD5E1',
        opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
      })}
    >
      <Text
        style={{ color: '#172033', fontWeight: '700', textAlign: 'center' }}
      >
        {children}
      </Text>
    </Pressable>
  );
}

export function BucketSheet({
  title,
  onClose,
  children,
  footer,
  busy,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  busy?: boolean;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const s = useBucketStyles();
  return (
    <Modal
      transparent
      visible
      animationType="slide"
      onRequestClose={() => {
        if (!busy) onClose();
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'flex-end' }}
      >
        <Pressable
          accessibilityLabel="Close"
          disabled={busy}
          onPress={onClose}
          style={[StyleSheet.absoluteFill, { backgroundColor: '#0008' }]}
        />
        <View
          accessibilityViewIsModal
          style={{
            height: '88%',
            backgroundColor: colors.background,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            padding: 20,
            paddingBottom: Math.max(20, insets.bottom),
            gap: 16,
          }}
        >
          <View style={s.between}>
            <Text style={s.heading}>{title}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              disabled={busy}
              onPress={onClose}
              hitSlop={12}
            >
              <X color={colors.text.primary} />
            </Pressable>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            style={{ flex: 1 }}
            contentContainerStyle={{ gap: 16, paddingBottom: 16 }}
          >
            {children}
          </ScrollView>
          {busy && <ActivityIndicator color={colors.primary.DEFAULT} />}
          {footer}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
