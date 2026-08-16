// Course Chat hub — two destinations: AI Helper (live, built this pass) and Classmates &
// Teacher (visibly present but disabled — no teacher accounts or class/cohort model exist yet,
// see docs/product/course-chat-vision.md). Non-interactive by design: the explanation is
// already shown on the tile itself, so no extra tap/toast is needed on top of that.
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../AppText';
import { useRouter } from 'expo-router';
import { BotMessageSquare, ChevronRight, Users } from 'lucide-react-native';
import { radii, spacing, typography } from '@my-backpack/shared';
import { GlassCard } from '../GlassCard';
import { Menubar } from '../Menubar';
import { useTheme } from '../../theme/ThemeContext';
import { fonts } from '../../theme/fonts';

interface CourseChatHubScreenProps {
  subjectSlug: string;
  courseSlug: string;
  courseId: string;
  courseName: string;
}

export function CourseChatHubScreen({
  subjectSlug,
  courseSlug,
  courseId,
  courseName,
}: CourseChatHubScreenProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <Menubar label={courseName || 'Course'} onBackPress={() => router.back()} />

        <Text style={styles.heading}>Course Chat</Text>
        <Text style={styles.subheading}>Get help with {courseName || 'this course'}.</Text>

        <Pressable
          onPress={() =>
            router.push({
              pathname: '/(app)/subject/[subjectSlug]/course/[courseSlug]/chat/ai-helper',
              params: { subjectSlug, courseSlug, courseId, courseName },
            })
          }
        >
          <GlassCard intensity="default" style={styles.tileCard}>
            <View style={styles.tileRow}>
              <View style={[styles.tileIcon, { backgroundColor: colors.primary.DEFAULT }]}>
                <BotMessageSquare size={24} color="#fff" />
              </View>
              <View style={styles.tileTextGroup}>
                <Text style={styles.tileTitle}>AI Helper</Text>
                <Text style={styles.tileDescription}>
                  Ask questions and get help any time — a supportive AI study buddy for this
                  course.
                </Text>
              </View>
              <ChevronRight size={20} color={colors.text.muted} />
            </View>
          </GlassCard>
        </Pressable>

        <GlassCard intensity="soft" style={[styles.tileCard, styles.tileCardDisabled]}>
          <View style={styles.tileRow}>
            <View style={[styles.tileIcon, { backgroundColor: colors.text.faint }]}>
              <Users size={24} color={colors.text.secondary} />
            </View>
            <View style={styles.tileTextGroup}>
              <View style={styles.tileTitleRow}>
                <Text style={styles.tileTitle}>Classmates & Teacher</Text>
                <View style={styles.comingSoonBadge}>
                  <Text style={styles.comingSoonBadgeText}>🔜 Coming soon</Text>
                </View>
              </View>
              <Text style={styles.tileDescription}>
                Chatting with classmates and your teacher will live here once teacher accounts and
                classes exist.
              </Text>
            </View>
          </View>
        </GlassCard>
      </View>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    screen: { flex: 1 },
    content: { padding: spacing.md, gap: spacing.md },
    heading: {
      fontFamily: fonts.display.bold,
      fontSize: typography.headingLg,
      color: colors.text.primary,
    },
    subheading: {
      fontSize: typography.small,
      color: colors.text.secondary,
      marginTop: -spacing.xs,
    },
    tileCard: {},
    tileCardDisabled: {
      opacity: 0.65,
    },
    tileRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
    },
    tileIcon: {
      width: 44,
      height: 44,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tileTextGroup: {
      flex: 1,
      gap: 2,
    },
    tileTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: spacing.xs,
    },
    tileTitle: {
      fontSize: typography.body,
      fontWeight: '700',
      color: colors.text.primary,
    },
    tileDescription: {
      fontSize: typography.small,
      color: colors.text.secondary,
    },
    comingSoonBadge: {
      paddingHorizontal: spacing.xs,
      paddingVertical: 2,
      borderRadius: radii.full,
      backgroundColor: colors.surface.glassSoft,
    },
    comingSoonBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.text.secondary,
    },
  });
}
