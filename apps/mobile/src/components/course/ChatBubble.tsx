// A single message bubble in the AI Helper chat — aligned left (assistant) or right (user).
import { StyleSheet, Text, View } from 'react-native';
import { radii, spacing, typography } from '@my-backpack/shared';
import type { AiChatRole } from '@my-backpack/shared';
import { GlassCard } from '../GlassCard';
import { useTheme } from '../../theme/ThemeContext';

interface ChatBubbleProps {
  role: AiChatRole;
  content: string;
  isChild?: boolean;
  pending?: boolean;
}

export function ChatBubble({ role, content, isChild = false, pending = false }: ChatBubbleProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const isUser = role === 'user';

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      <GlassCard
        intensity={isUser ? 'strong' : 'soft'}
        style={[styles.bubble, isChild && styles.bubbleChild, pending && styles.bubblePending]}
      >
        <Text style={[styles.text, isChild && styles.textChild]}>{content}</Text>
      </GlassCard>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      width: '100%',
    },
    rowUser: {
      justifyContent: 'flex-end',
    },
    rowAssistant: {
      justifyContent: 'flex-start',
    },
    bubble: {
      maxWidth: '82%',
      borderRadius: radii.lg,
    },
    bubbleChild: {
      maxWidth: '90%',
    },
    bubblePending: {
      opacity: 0.6,
    },
    text: {
      fontSize: typography.body,
      color: colors.text.primary,
      lineHeight: typography.body * 1.4,
    },
    textChild: {
      fontSize: typography.bodyChild,
      lineHeight: typography.bodyChild * 1.4,
    },
  });
}
