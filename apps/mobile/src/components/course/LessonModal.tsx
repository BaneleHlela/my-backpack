// Full-height modal for a single lesson's study material — Course & Topic redesign, Phase C.
// Replaces the old dedicated lesson/[lessonId].tsx route + auto-advance flow: the whole path is
// visible on the Course screen now, so completing a lesson just closes this modal and returns to
// the path rather than auto-navigating to the next item. Ports the Figma "Lesson Modal" frame
// (file OaE5PxSOT5p8Fby7SUpoP7, node 54:1739/54:1763): drag handle, Videos/Notes tab switcher,
// heading, video card(s), "Mark As Completed" button (violet/dark, exact Figma colour).
//
// Notes tab (August 2026 addendum — book-to-course pipeline): renders any 'notes'/'steps'
// resources the lesson actually has (react-native-markdown-display, same renderer
// SteppedNotesViewer already used pre-Phase-C) — most importantly the book-to-course pipeline's
// draft "Read pages X–Y: *Title*" notes resource, which this tab was previously discarding
// entirely regardless of content. Figma never designed a Notes state, so there's still no
// authoring UI reachable from here (that stays a Content Studio-only edit) — but a lesson that
// actually has notes content now shows it instead of the "No available notes" placeholder,
// which is now reserved for lessons that truly have none.
//
// Video-watch tracking (August 2026): a lesson with at least one video resource is, by default,
// no longer completed by an unconditional tap — the learner must watch every video (LessonVideo's
// onWatched, ~90% played or reaching the natural end) before "Mark As Completed" appears, at
// which point it fires automatically (no tap required). This is teacher-configurable per lesson
// via `Lesson.requireVideoWatch` (opt-out, default true, edited from Content Studio's
// LessonEditorPage.tsx) — `gatingActive` below folds that setting in alongside "does this lesson
// even have a video." A lesson with no video resources, or one with gating explicitly disabled,
// keeps the original always-tappable behavior. A flat 90s fallback timer reveals a manual
// "Continue anyway" escape hatch when gating is active, in case a watched-event never resolves
// (flaky connection, device-specific playback bug) — this stays even for teacher-enabled gating,
// it's not a way to skip watching, just a stuck-state safety valve. Each video's watched state is
// tracked (and shown via a small badge on `LessonVideo`) independently of whether gating is
// active, so the badge still reflects real progress even on a lesson where the teacher has
// disabled the completion gate. Re-visiting an already-`completed` lesson (currentLessonProgress,
// threaded from GET /roadmap/lesson/:lessonId via roadmapSlice's fetchLesson) skips all of this —
// free playback/review, no button, nothing to re-watch. The parent Course screen
// (app/(app)/subject/[subjectSlug]/course/[courseSlug]/index.tsx) only ever mounts this component
// when `activeLessonId` transitions from null to a value, so every open is a fresh mount — this
// component's own state never needs a lessonId-keyed reset effect.
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../AppText';
import { useDispatch, useSelector } from 'react-redux';
import { BlurView } from 'expo-blur';
import Markdown from 'react-native-markdown-display';
import { BookOpen, Video, X } from 'lucide-react-native';
import { radii, spacing, typography } from '@my-backpack/shared';
import type { ApiResponse, ItemCompletionResult } from '@my-backpack/shared';
import api from '../../lib/api';
import { fetchLesson, clearLesson } from '../../features/roadmap/roadmapSlice';
import { LessonVideo } from '../lesson/LessonVideo';
import { SteppedNotesViewer } from '../lesson/SteppedNotesViewer';
import { createMarkdownStyles } from '../lesson/markdownStyles';
import { PrimaryButton } from '../PrimaryButton';
import type { AppDispatch, RootState } from '../../store/store';
import { useTheme } from '../../theme/ThemeContext';

interface LessonModalProps {
  lessonId: string;
  onClose: () => void;
  onCompleted: () => void;
}

type Tab = 'videos' | 'notes';

type ThemeColors = ReturnType<typeof useTheme>['colors'];

// How long to wait for every video's watched-event before offering a manual escape hatch.
const CONTINUE_ANYWAY_TIMEOUT_MS = 90000;

export default function LessonModal({ lessonId, onClose, onCompleted }: LessonModalProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  // Only used by the notes markdown below — content sits inside its own glass-styled card
  // (styles.notesCard), so glassText (not text) is the correct token set here, same reasoning
  // as SteppedNotesViewer's own use of it.
  const markdownStyles = createMarkdownStyles(colors);
  const dispatch = useDispatch<AppDispatch>();
  const { currentLesson, currentLessonProgress, isLoading } = useSelector(
    (state: RootState) => state.roadmap
  );
  const [tab, setTab] = useState<Tab>('videos');
  const [completing, setCompleting] = useState(false);
  const [watchedPositions, setWatchedPositions] = useState<Set<number>>(new Set());
  const [showContinueAnyway, setShowContinueAnyway] = useState(false);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    dispatch(fetchLesson(lessonId));
    return () => {
      dispatch(clearLesson());
    };
  }, [dispatch, lessonId]);

  const handleMarkCompleted = async () => {
    setCompleting(true);
    try {
      await api.post<ApiResponse<ItemCompletionResult>>(`/roadmap/lesson/${lessonId}/study`);
      onCompleted();
      onClose();
    } catch {
      // ignore — let the learner retry
    } finally {
      setCompleting(false);
    }
  };

  const alreadyCompleted = currentLessonProgress?.status === 'completed';

  const videoResources = currentLesson
    ? [...currentLesson.resources].filter((r) => r.type === 'video').sort((a, b) => a.position - b.position)
    : [];
  const notesResources = currentLesson
    ? [...currentLesson.resources].filter((r) => r.type === 'notes').sort((a, b) => a.position - b.position)
    : [];
  const stepsResources = currentLesson
    ? [...currentLesson.resources].filter((r) => r.type === 'steps').sort((a, b) => a.position - b.position)
    : [];

  const allVideosWatched =
    videoResources.length === 0 || videoResources.every((r) => watchedPositions.has(r.position));

  // Teacher-configurable opt-out (default true — see Lesson.requireVideoWatch). Gating only
  // ever applies to a lesson that both has a video and hasn't had it disabled; everything else
  // (badge display via `watchedPositions`, `onWatched` tracking below) stays unconditional.
  const gatingActive = videoResources.length > 0 && (currentLesson?.requireVideoWatch ?? true);

  // 90s fallback timer — starts on mount (i.e. whenever this lesson's modal opens), cleared on
  // unmount or as soon as every video is confirmed watched.
  useEffect(() => {
    fallbackTimerRef.current = setTimeout(() => setShowContinueAnyway(true), CONTINUE_ANYWAY_TIMEOUT_MS);
    return () => {
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (allVideosWatched && fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, [allVideosWatched]);

  // Once every video is watched, complete automatically — no tap required. Skipped entirely for
  // a lesson with no video, one whose teacher has disabled gating, and one already completed on
  // a revisit (nothing left to mark).
  useEffect(() => {
    if (alreadyCompleted || !gatingActive || !allVideosWatched || completing) return;
    void handleMarkCompleted();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allVideosWatched, alreadyCompleted, gatingActive, completing]);

  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.dragHandle} />
          <Pressable onPress={onClose} style={styles.closeButton} hitSlop={8}>
            <X size={20} color={colors.text.muted} />
          </Pressable>

          <View style={styles.tabBar}>
            <Pressable style={styles.tabButton} onPress={() => setTab('videos')}>
              <Video size={22} color={tab === 'videos' ? colors.primary.DEFAULT : colors.text.muted} />
              <Text style={[styles.tabLabel, tab === 'videos' && { color: colors.primary.DEFAULT }]}>Videos</Text>
            </Pressable>
            <View style={styles.tabDivider} />
            <Pressable style={styles.tabButton} onPress={() => setTab('notes')}>
              <BookOpen size={22} color={tab === 'notes' ? colors.primary.DEFAULT : colors.text.muted} />
              <Text style={[styles.tabLabel, tab === 'notes' && { color: colors.primary.DEFAULT }]}>Notes</Text>
            </Pressable>
          </View>

          {currentLesson ? (
            <Text style={styles.heading} numberOfLines={1}>
              {currentLesson.title}
            </Text>
          ) : null}

          {isLoading || !currentLesson ? (
            <ActivityIndicator color={colors.primary.DEFAULT} style={styles.loading} />
          ) : (
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
              {tab === 'videos' ? (
                videoResources.length === 0 ? (
                  <Text style={styles.emptyText}>No videos available for this lesson.</Text>
                ) : (
                  videoResources.map((resource, i) =>
                    resource.url ? (
                      <LessonVideo
                        key={i}
                        url={resource.url}
                        caption={resource.caption}
                        thumbnailUrl={resource.thumbnailUrl}
                        description={resource.description}
                        watched={alreadyCompleted || watchedPositions.has(resource.position)}
                        onWatched={
                          alreadyCompleted
                            ? undefined
                            : () =>
                                setWatchedPositions((prev) =>
                                  prev.has(resource.position) ? prev : new Set(prev).add(resource.position)
                                )
                        }
                      />
                    ) : null
                  )
                )
              ) : notesResources.length === 0 && stepsResources.length === 0 ? (
                <View style={styles.notesEmpty}>
                  <Text style={styles.emptyText}>No available notes for this lesson.</Text>
                  <PrimaryButton title="Add notes" onPress={() => {}} disabled />
                </View>
              ) : (
                <>
                  {notesResources.map((resource, i) =>
                    resource.markdown ? (
                      <View key={`notes-${i}`} style={styles.notesCard}>
                        <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
                        <Markdown style={markdownStyles}>{resource.markdown}</Markdown>
                      </View>
                    ) : null
                  )}
                  {stepsResources.map((resource, i) =>
                    resource.steps?.length ? (
                      <SteppedNotesViewer key={`steps-${i}`} steps={resource.steps} />
                    ) : null
                  )}
                </>
              )}
            </ScrollView>
          )}

          {currentLesson && !alreadyCompleted ? (
            !gatingActive || allVideosWatched ? (
              <PrimaryButton
                title="Mark As Completed"
                onPress={() => void handleMarkCompleted()}
                loading={completing}
                style={styles.completeButton}
              />
            ) : (
              <View style={styles.watchHintRow}>
                <Text style={styles.emptyText}>Watch the video to continue</Text>
                {showContinueAnyway ? (
                  <Pressable onPress={() => void handleMarkCompleted()} hitSlop={8}>
                    <Text style={styles.continueAnywayText}>Continue anyway</Text>
                  </Pressable>
                ) : null}
              </View>
            )
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sheet: {
      height: '90%',
      backgroundColor: colors.background,
      borderTopLeftRadius: radii.lg,
      borderTopRightRadius: radii.lg,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.lg,
      gap: spacing.md,
    },
    dragHandle: {
      alignSelf: 'center',
      width: 80,
      height: 5,
      borderRadius: radii.sm,
      backgroundColor: colors.text.secondary,
    },
    closeButton: {
      position: 'absolute',
      right: spacing.lg,
      top: spacing.md,
    },
    tabBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.lg,
    },
    tabButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.xs,
      paddingVertical: spacing.xs,
    },
    tabDivider: {
      width: 1.5,
      height: 30,
      borderRadius: radii.sm,
      backgroundColor: colors.surface.border,
    },
    tabLabel: {
      fontSize: typography.body,
      fontWeight: '600',
      color: colors.text.muted,
    },
    heading: {
      fontSize: typography.body,
      fontWeight: '700',
      color: colors.text.primary,
      textAlign: 'center',
    },
    loading: {
      paddingVertical: spacing.xl,
    },
    scrollView: {
      flex: 1,
    },
    content: {
      gap: spacing.md,
      paddingBottom: spacing.md,
    },
    emptyText: {
      textAlign: 'center',
      fontSize: typography.small,
      color: colors.text.muted,
      paddingVertical: spacing.lg,
    },
    notesEmpty: {
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.lg,
    },
    notesCard: {
      padding: spacing.md,
      borderRadius: radii.md,
      backgroundColor: colors.surface.glassSoft,
      // Clips the BlurView's absoluteFill to the rounded corners — matching GlassCard.tsx's own
      // wrapper recipe. Without the BlurView here, this translucent white fill (surface.glass* is
      // unchanged between themes — see theme.ts) composites against LessonModal's flat solid
      // colors.background sheet into a dark, muddy fill in dark mode, making glassText.primary
      // (near-black) illegible on top of it — the exact "grey text invisible in dark mode" bug
      // class documented on IThemeColors.glassText.
      overflow: 'hidden',
    },
    completeButton: {
      backgroundColor: colors.primary.dark,
    },
    watchHintRow: {
      alignItems: 'center',
      gap: spacing.xs,
    },
    continueAnywayText: {
      fontSize: typography.small,
      fontWeight: '600',
      color: colors.primary.DEFAULT,
      textDecorationLine: 'underline',
    },
  });
}
