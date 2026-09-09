// Ports apps/web's DefinitionCard.tsx — same three "Add to bucket" states
// (default / adding / added) via PrimaryButton's variant/loading props. Header row (part of
// speech + Add-to-bucket button) sits above the definition text, which then runs the card's
// full width — the button no longer competes with the definition for horizontal space.
// Pressing "Added" removes the term from the bucket (removeFromBucket is term-scoped
// server-side, not per-definition — see apps/api's vocab.service.ts).
import { StyleSheet, View } from 'react-native';
import { Text } from '../AppText';
import { Check, Plus } from 'lucide-react-native';
import { useDispatch, useSelector } from 'react-redux';
import { spacing, typography } from '@my-backpack/shared';
import { GlassCard } from '../GlassCard';
import { PrimaryButton } from '../PrimaryButton';
import { addDefinitionToBucket, removeBucketEntry } from '../../features/vocab/vocabSlice';
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
  const { addingDefinitionIds, removingTermIds } = useSelector((state: RootState) => state.vocab);
  const { definition, inBucket } = entry;
  const isAdding = addingDefinitionIds.includes(definition._id);
  const isRemoving = removingTermIds.includes(termId);
  const isBusy = isAdding || isRemoving;

  const handlePress = () => {
    if (inBucket) {
      dispatch(removeBucketEntry({ termId, miniAppId }));
    } else {
      dispatch(addDefinitionToBucket({ termId, definitionId: definition._id, miniAppId }));
    }
  };

  return (
    <GlassCard intensity="soft">
      <View style={styles.header}>
        <Text style={styles.partOfSpeech}>
          {index + 1}. {definition.partOfSpeech}
        </Text>

        <PrimaryButton
          title={inBucket ? (isRemoving ? 'Removing...' : 'Added') : isAdding ? 'Adding...' : 'Add to bucket'}
          icon={inBucket ? <Check size={14} color={colors.success.dark} /> : !isAdding ? <Plus size={14} color="#fff" /> : undefined}
          variant={inBucket ? 'success' : 'primary'}
          loading={isBusy}
          onPress={handlePress}
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
