import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { colors, radii, spacing, typography } from '@my-backpack/shared';
import type { EducationLevel } from '@my-backpack/shared';
import { GlassCard } from '../src/components/GlassCard';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { ScreenBackground } from '../src/components/ScreenBackground';
import { ProtectedRoute } from '../src/components/ProtectedRoute';
import { completeProfileSetup } from '../src/features/auth/authSlice';
import type { AppDispatch, RootState } from '../src/store/store';

const SCHOOL_LEVELS: EducationLevel[] = [
  'grade-r', 'grade-1', 'grade-2', 'grade-3', 'grade-4', 'grade-5', 'grade-6',
  'grade-7', 'grade-8', 'grade-9', 'grade-10', 'grade-11', 'grade-12',
];
const TERTIARY_LEVELS: EducationLevel[] = ['certificate', 'diploma', 'bachelors', 'honours', 'masters', 'phd'];
const OTHER_LEVELS: EducationLevel[] = ['professional', 'other'];

function formatLevel(level: EducationLevel): string {
  if (level.startsWith('grade-')) {
    const g = level.slice(6);
    return g === 'r' ? 'Grade R' : `Grade ${g}`;
  }
  return level.charAt(0).toUpperCase() + level.slice(1);
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => currentYear - i);

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected ? styles.chipSelected : null]}>
      <Text style={[styles.chipText, selected ? styles.chipTextSelected : null]}>{label}</Text>
    </Pressable>
  );
}

function ChipRow<T extends string | number>({
  items,
  value,
  onSelect,
  format,
}: {
  items: T[];
  value: T | '';
  onSelect: (item: T) => void;
  format?: (item: T) => string;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
      {items.map((item) => (
        <Chip
          key={item}
          label={format ? format(item) : String(item)}
          selected={value === item}
          onPress={() => onSelect(item)}
        />
      ))}
    </ScrollView>
  );
}

function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function ProfileSetupScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { activeProfile, isLoading, error } = useSelector((state: RootState) => state.auth);

  const [dobDay, setDobDay] = useState<number | ''>('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobYear, setDobYear] = useState<number | ''>('');
  const [currentLevel, setCurrentLevel] = useState<EducationLevel | ''>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const isChild = activeProfile?.ageGroup === 'child';

  useEffect(() => {
    if (activeProfile?.isSetupComplete) {
      router.replace('/(app)/home');
      return;
    }
    if (activeProfile?.education?.currentLevel) {
      setCurrentLevel(activeProfile.education.currentLevel);
    }
  }, [activeProfile, router]);

  const handleSubmit = async () => {
    setValidationError(null);
    if (!dobDay || !dobMonth || !dobYear) {
      setValidationError('Please enter your date of birth.');
      return;
    }
    if (!currentLevel) {
      setValidationError('Please select your current education level.');
      return;
    }

    const month = MONTHS.indexOf(dobMonth) + 1;
    const dateOfBirth = `${dobYear}-${String(month).padStart(2, '0')}-${String(dobDay).padStart(2, '0')}`;

    const result = await dispatch(
      completeProfileSetup({
        dateOfBirth,
        education: { currentLevel: currentLevel as EducationLevel },
      })
    );

    if (completeProfileSetup.fulfilled.match(result)) {
      router.replace('/(app)/home');
    }
  };

  if (!activeProfile) {
    return <ScreenBackground style={styles.center} />;
  }

  return (
    <ScreenBackground scroll style={styles.scrollContent}>
      <GlassCard style={styles.card}>
        <Text style={styles.heading}>{isChild ? '✏️ Tell us about you!' : 'Complete your profile'}</Text>
        <Text style={styles.subheading}>
          {isChild ? 'Just a few fun details to get started!' : 'A few more details to personalise your experience.'}
        </Text>

        <SectionLabel>{isChild ? 'When is your birthday? 🎂' : 'Date of birth'}</SectionLabel>
        <ChipRow items={DAYS} value={dobDay} onSelect={setDobDay} />
        <ChipRow items={MONTHS} value={dobMonth} onSelect={setDobMonth} />
        <ChipRow items={YEARS} value={dobYear} onSelect={setDobYear} />

        <SectionLabel>{isChild ? 'What grade are you in? 📚' : 'Current education level'}</SectionLabel>
        <ChipRow items={SCHOOL_LEVELS} value={currentLevel} onSelect={setCurrentLevel} format={formatLevel} />
        {!isChild && (
          <>
            <ChipRow items={TERTIARY_LEVELS} value={currentLevel} onSelect={setCurrentLevel} format={formatLevel} />
            <ChipRow items={OTHER_LEVELS} value={currentLevel} onSelect={setCurrentLevel} format={formatLevel} />
          </>
        )}

        {(validationError ?? error) ? <Text style={styles.error}>{validationError ?? error}</Text> : null}

        <PrimaryButton
          title={isChild ? "Let's go! 🚀" : "Let's go"}
          onPress={() => void handleSubmit()}
          loading={isLoading}
          style={styles.submit}
        />

        <Pressable onPress={() => router.replace('/(app)/home')} style={styles.skip}>
          <Text style={styles.skipText}>Set up later</Text>
        </Pressable>
      </GlassCard>
    </ScreenBackground>
  );
}

export default function ProfileSetupRoute() {
  return (
    <ProtectedRoute allowIncompleteProfile>
      <ProfileSetupScreen />
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 480,
  },
  heading: {
    fontSize: typography.headingLg,
    fontWeight: '700',
    color: colors.text.primary,
  },
  subheading: {
    fontSize: typography.body,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: typography.small,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colors.text.secondary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  chipRow: {
    gap: spacing.xs,
    paddingBottom: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    backgroundColor: colors.surface.glass,
    borderWidth: 1,
    borderColor: colors.surface.border,
  },
  chipSelected: {
    backgroundColor: colors.primary.DEFAULT,
    borderColor: colors.primary.DEFAULT,
  },
  chipText: {
    fontSize: typography.small,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  chipTextSelected: {
    color: '#fff',
  },
  error: {
    fontSize: typography.small,
    fontWeight: '600',
    color: colors.error.dark,
    marginTop: spacing.md,
  },
  submit: {
    marginTop: spacing.lg,
  },
  skip: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  skipText: {
    fontSize: typography.small,
    color: colors.text.muted,
    textDecorationLine: 'underline',
  },
});
