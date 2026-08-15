// AI Helper chat — 1:1 chat between the learner and an AI tutor, scoped to one course.
// Optimistic UI: the user's bubble appears immediately from local state (`pendingText`); once
// the server confirms (both messages persisted server-side, see aiChatSlice.ts's
// sendChatMessage), the pending bubble is cleared and the real pair renders from Redux instead.
// On failure the pending bubble stays with an inline "tap to retry" chip.
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '../AppText';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Send } from 'lucide-react-native';
import { radii, spacing, typography } from '@my-backpack/shared';
import type { AgeGroup } from '@my-backpack/shared';
import { fetchChatHistory, sendChatMessage } from '../../features/aiChat/aiChatSlice';
import type { AppDispatch, RootState } from '../../store/store';
import { useTheme } from '../../theme/ThemeContext';
import { Menubar } from '../Menubar';
import { ChatBubble } from './ChatBubble';

interface AiHelperChatScreenProps {
  courseId: string;
  courseName: string;
}

export function AiHelperChatScreen({ courseId, courseName }: AiHelperChatScreenProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const scrollRef = useRef<ScrollView>(null);

  const messages = useSelector(
    (state: RootState) => state.aiChat.messagesByCourseId[courseId] ?? []
  );
  const historyStatus = useSelector((state: RootState) => state.aiChat.historyStatus);
  const sendStatus = useSelector((state: RootState) => state.aiChat.sendStatus);
  const error = useSelector((state: RootState) => state.aiChat.error);
  const activeProfile = useSelector((state: RootState) => state.auth.activeProfile);
  const ageGroup: AgeGroup = activeProfile?.ageGroup ?? 'adult';
  const isChild = ageGroup === 'child';

  const styles = createStyles(colors, isChild);

  const [inputText, setInputText] = useState('');
  const [pendingText, setPendingText] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchChatHistory(courseId));
  }, [dispatch, courseId]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages.length, pendingText]);

  const isSending = sendStatus === 'sending';

  const sendText = (text: string) => {
    setPendingText(text);
    dispatch(sendChatMessage({ courseId, message: text }))
      .unwrap()
      .then(() => setPendingText(null))
      .catch(() => {
        // Leave pendingText set — the bubble stays with a retry affordance.
      });
  };

  const handleSend = () => {
    const text = inputText.trim();
    if (!text || isSending) return;
    setInputText('');
    sendText(text);
  };

  const handleRetry = () => {
    if (!pendingText || isSending) return;
    sendText(pendingText);
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
        keyboardShouldPersistTaps="handled"
        stickyHeaderIndices={[0]}
      >
        <Menubar
          label={courseName || 'AI Helper'}
          onBackPress={() => router.back()}
          style={styles.menubar}
        />

        {historyStatus === 'loading' && messages.length === 0 ? (
          <ActivityIndicator color={colors.primary.DEFAULT} style={styles.loading} />
        ) : messages.length === 0 && !pendingText ? (
          <Text style={styles.emptyText}>
            Say hello! Ask the AI Helper anything about {courseName || 'this course'}.
          </Text>
        ) : null}

        {messages.map((m) => (
          <ChatBubble key={m._id} role={m.role} content={m.content} isChild={isChild} />
        ))}

        {pendingText && (
          <>
            <ChatBubble role="user" content={pendingText} isChild={isChild} pending={isSending} />
            {isSending && (
              <View style={styles.typingRow}>
                <ActivityIndicator size="small" color={colors.text.muted} />
                <Text style={styles.typingText}>AI Helper is typing…</Text>
              </View>
            )}
            {!isSending && error && (
              <Pressable onPress={handleRetry} style={styles.retryChip}>
                <Text style={styles.retryText}>{error} — tap to retry</Text>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Ask a question…"
          placeholderTextColor={colors.glassText.muted}
          value={inputText}
          onChangeText={setInputText}
          multiline
          editable={!isSending}
        />
        <Pressable
          onPress={handleSend}
          disabled={!inputText.trim() || isSending}
          style={[
            styles.sendButton,
            (!inputText.trim() || isSending) && styles.sendButtonDisabled,
          ]}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Send size={isChild ? 22 : 18} color="#fff" />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors'], isChild: boolean) {
  return StyleSheet.create({
    screen: { flex: 1 },
    menubar: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
    messageList: { flex: 1 },
    messageListContent: {
      padding: spacing.md,
      gap: spacing.sm,
      flexGrow: 1,
    },
    loading: { paddingVertical: spacing.xl },
    emptyText: {
      textAlign: 'center',
      fontSize: typography.small,
      color: colors.text.muted,
      paddingVertical: spacing.xl,
    },
    typingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.xs,
    },
    typingText: {
      fontSize: typography.small,
      color: colors.text.muted,
    },
    retryChip: {
      alignSelf: 'flex-end',
      paddingHorizontal: spacing.xs,
      paddingVertical: spacing.xs,
      borderRadius: radii.full,
      backgroundColor: colors.error.light,
    },
    retryText: {
      fontSize: typography.small,
      fontWeight: '600',
      color: colors.error.dark,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.sm,
      padding: spacing.md,
      paddingTop: spacing.sm,
    },
    input: {
      flex: 1,
      backgroundColor: colors.surface.glass,
      borderWidth: 1,
      borderColor: colors.surface.border,
      borderRadius: radii.lg,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      fontSize: isChild ? typography.bodyChild : typography.body,
      color: colors.glassText.primary,
      maxHeight: 120,
    },
    sendButton: {
      width: isChild ? 52 : 44,
      height: isChild ? 52 : 44,
      borderRadius: radii.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary.DEFAULT,
    },
    sendButtonDisabled: {
      backgroundColor: colors.text.faint,
    },
  });
}
