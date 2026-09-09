// Each meaning can be saved to several buckets through the shared picker.
import { useState } from 'react';
import { BucketPickerSheet } from '../buckets/BucketPickerSheet';
import { StyleSheet, View } from 'react-native';
import { Text } from '../AppText';
import { Check, Plus } from 'lucide-react-native';
import { useDispatch, useSelector } from 'react-redux';
import { spacing, typography } from '@my-backpack/shared';
import { GlassCard } from '../GlassCard';
import { PrimaryButton } from '../PrimaryButton';
import { fetchTermDetail } from '../../features/vocab/vocabSlice';
import type { DefinitionWithStatus } from '../../features/vocab/vocabSlice';
import type { AppDispatch, RootState } from '../../store/store';
import { useTheme } from '../../theme/ThemeContext';

interface DefinitionCardProps {
  termId: string;
  miniAppId: string;
  index: number;
  entry: DefinitionWithStatus;
}

export function DefinitionCard({ termId, miniAppId, index, entry }: DefinitionCardProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const dispatch = useDispatch<AppDispatch>();
  const profileId = useSelector((s: RootState) => s.auth.activeProfile?._id);
  const { definition, inBucket } = entry;
  const [picking, setPicking] = useState(false);

  return (
    <GlassCard intensity="soft">
      <View style={styles.header}>
        <Text style={styles.partOfSpeech}>
          {index + 1}. {definition.partOfSpeech}
        </Text>

        <PrimaryButton
          title={inBucket ? 'Saved · manage' : 'Add to buckets'}
          icon={inBucket ? <Check size={14} color={colors.success.dark} /> : <Plus size={14} color="#fff" />}
          variant={inBucket ? 'success' : 'primary'}
          onPress={() => setPicking(true)}
          style={styles.button}
        />
      </View>

      <Text style={styles.definition}>{definition.definition}</Text>

      {definition.examples.length > 0 ? (
        <Text style={styles.example}>"{definition.examples[0]}"</Text>
      ) : null}

      {definition.synonyms.length > 0 || definition.antonyms.length > 0 ? (
        <View style={styles.wordLists}>
          {definition.synonyms.length > 0 ? (
            <Text style={styles.wordListText}>Synonyms: {definition.synonyms.join(', ')}</Text>
          ) : null}
          {definition.antonyms.length > 0 ? (
            <Text style={styles.wordListText}>Antonyms: {definition.antonyms.join(', ')}</Text>
          ) : null}
        </View>
      ) : null}
      {picking && <BucketPickerSheet key={profileId} miniAppId={miniAppId} definitionId={definition._id} onClose={() => setPicking(false)} onSaved={() => { void dispatch(fetchTermDetail(termId)); }} />}
    </GlassCard>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    partOfSpeech: {
      flex: 1,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      color: colors.primary.DEFAULT,
    },
    definition: {
      fontSize: typography.body,
      color: colors.glassText.primary,
      marginTop: spacing.sm,
      width: '100%',
    },
    example: {
      fontSize: typography.small,
      fontStyle: 'italic',
      color: colors.glassText.muted,
      marginTop: spacing.xs,
    },
    wordLists: {
      marginTop: spacing.xs,
      gap: 2,
    },
    wordListText: {
      fontSize: 12,
      color: colors.glassText.muted,
    },
    button: {
      flexShrink: 0,
    },
  });
}
