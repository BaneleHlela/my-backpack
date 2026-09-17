import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { X } from 'lucide-react-native';
import { radii, spacing, typography, type XpContext } from '@my-backpack/shared';
import { Text } from './AppText';
import XPIcon from '../../assets/icons/xp.svg';
import { useTheme } from '../theme/ThemeContext';
import { fonts } from '../theme/fonts';
import { fetchXpSummary } from '../features/xp/xpSlice';
import { formatXp, resolveXpScope, scopeXp } from '../features/xp/xpScope';
import type { AppDispatch, RootState } from '../store/store';

export function XpChip({ context }: { context?: XpContext | null }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const dispatch = useDispatch<AppDispatch>();
  const profileId = useSelector((state: RootState) => state.auth.activeProfile?._id);
  const xp = useSelector((state: RootState) => state.xp);
  const content = useSelector((state: RootState) => state.content);
  const params = useLocalSearchParams<{ subjectSlug?: string; courseSlug?: string; miniAppId?: string; name?: string; courseId?: string; courseName?: string }>();
  const summary = xp.profileId === profileId ? xp.summary : null;
  const scope = resolveXpScope(params, content, summary, context);
  const total = scopeXp(summary, scope);
  const [open, setOpen] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;
  const previous = useRef<{ key: string; value: number | null }>({ key: '', value: null });
  const scopeKey = `${profileId}:${scope.type}:${scope.id}`;

  useFocusEffect(useCallback(() => {
    if (!profileId) return;
    dispatch(fetchXpSummary(profileId));
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') dispatch(fetchXpSummary(profileId));
    });
    return () => listener.remove();
  }, [dispatch, profileId, xp.revision]));

  useEffect(() => { setOpen(false); }, [profileId]);
  useEffect(() => {
    let active = true;
    const last = previous.current;
    previous.current = { key: scopeKey, value: total };
    if (last.key === scopeKey && last.value !== null && total !== null && total > last.value) {
      AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
        if (!active || reduce) return;
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.08, duration: 140, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();
      });
    }
    return () => { active = false; scale.stopAnimation(); scale.setValue(1); };
  }, [total, scopeKey, scale]);

  const showBreakdown = () => {
    setOpen(true);
    if (profileId) dispatch(fetchXpSummary(profileId));
  };
  return <>
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable onPress={showBreakdown} style={styles.chip} accessibilityRole="button"
        accessibilityLabel={`${scope.name} XP, ${total === null ? 'loading' : formatXp(total)}. Show XP breakdown`}>
        <XPIcon width={22} height={22} />
        <View style={styles.chipText}>
          <Text style={styles.scope} numberOfLines={1}>{scope.name} XP</Text>
          <Text style={styles.value}>{total === null ? '—' : formatXp(total)}</Text>
        </View>
      </Pressable>
    </Animated.View>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessibilityRole="button" accessibilityLabel="Close XP breakdown" />
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.row}>
            <Text style={styles.heading}>Your XP</Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
              <X size={24} color={colors.text.primary} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.body}>
            <Text style={styles.hero}>{summary ? formatXp(summary.total) : '—'} XP</Text>
            <Text style={styles.description}>Total earned by this profile</Text>
            {scope.type !== 'total' && <View style={styles.highlight}>
              <Text style={styles.label}>{scope.name}</Text>
              <Text style={styles.value}>{total === null ? '—' : formatXp(total)} XP</Text>
            </View>}
            {xp.error ? <Pressable accessibilityRole="button" onPress={() => profileId && dispatch(fetchXpSummary(profileId))}>
              <Text style={styles.description}>{xp.error}</Text>
            </Pressable> : !summary ? <Text style={styles.description}>Loading XP…</Text> : null}
            {summary && summary.total === 0 && <Text style={styles.description}>Complete a quiz to start earning XP.</Text>}
            {summary && ([['Subjects', summary.subjects], ['Courses', summary.courses], ['Mini-apps', summary.miniApps]] as const).map(([label, items]) => items.length > 0 && (
              <View key={label} style={styles.section}>
                <Text style={styles.label}>{label}</Text>
                {items.map((item) => <View key={item.id} style={styles.row}>
                  <Text style={styles.itemName}>{item.name}</Text><Text style={styles.value}>{formatXp(item.total)} XP</Text>
                </View>)}
              </View>
            ))}
            {!!summary?.recent.length && <View style={styles.section}>
              <Text style={styles.label}>Recent earnings</Text>
              {summary.recent.map((award) => <View key={award.sessionId} style={styles.recent}>
                <View style={styles.row}><Text style={styles.itemName}>{award.title}</Text><Text style={styles.value}>+{formatXp(award.total)}</Text></View>
                <Text style={styles.description}>{award.contextName} · {formatXp(award.base)} marks + {formatXp(award.bonus)} bonus</Text>
              </View>)}
            </View>}
            <Text style={styles.description}>1 mark = 1 XP. Scores of 75%, 90%, and 100% earn 10%, 20%, and 25% bonuses on completed Classic quizzes with at least 10 answered or skipped questions. One bonus per quiz each day (UTC). Practice always earns base XP.</Text>
            <Text style={styles.description}>Subject, course, and mini-app figures show where your total was earned. They are not extra awards.</Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  </>;
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    chip: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4, borderRadius: radii.md },
    chipText: { maxWidth: 115 },
    scope: { fontSize: 10, color: colors.text.secondary },
    value: { fontFamily: fonts.display.medium, color: colors.text.primary, fontSize: typography.body },
    overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg, backgroundColor: 'rgba(0,0,0,0.55)' },
    sheet: { width: '100%', maxWidth: 480, maxHeight: '80%', borderRadius: radii.lg, backgroundColor: colors.background, padding: spacing.lg },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    heading: { fontFamily: fonts.display.bold, fontSize: typography.headingLg, color: colors.text.primary },
    body: { gap: spacing.sm, paddingTop: spacing.md, paddingBottom: spacing.md },
    hero: { fontFamily: fonts.display.bold, fontSize: 36, color: colors.primary.DEFAULT },
    description: { fontSize: typography.small, color: colors.text.secondary },
    highlight: { padding: spacing.md, backgroundColor: colors.surface.glassSoft, borderRadius: radii.md, gap: spacing.xs },
    label: { fontFamily: fonts.display.medium, fontSize: typography.body, color: colors.text.primary },
    itemName: { flex: 1, color: colors.text.secondary, fontSize: typography.body },
    section: { gap: spacing.sm, marginTop: spacing.md },
    recent: { gap: spacing.xs, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.surface.border },
  });
}
