// Ports apps/web's DefinitionCard.tsx — same three "Add to bucket" states
// (default / adding / added) via PrimaryButton's variant/loading props.
import { StyleSheet, Text, View } from 'react-native';
import { Check, Plus } from 'lucide-react-native';
import { useDispatch, useSelector } from 'react-redux';
import { colors, spacing, typography } from '@my-backpack/shared';
import { GlassCard } from '../GlassCard';
import { PrimaryButton } from '../PrimaryButton';
import { addDefinitionToBucket } from '../../features/vocab/vocabSlice';
import type { DefinitionWithStatus } from '../../features/vocab/vocabSlice';
import type { AppDispatch, RootState } from '../../store/store';

interface DefinitionCardProps {
  termId: string;
  miniAppId: string;
  index: number;
  entry: DefinitionWithStatus;
}

export function DefinitionCard({ termId, miniAppId, index, entry }: DefinitionCardProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { addingDefinitionIds } = useSelector((state: RootState) => state.vocab);
  const { definition, inBucket } = entry;
  const isAdding = addingDefinitionIds.includes(definition._id);

  return (
    <GlassCard intensity="soft">
      <View style={styles.row}>
        <View style={styles.textColumn}>
          <Text style={styles.partOfSpeech}>
            {index + 1}. {definition.partOfSpeech}
          </Text>
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
        </View>

        <PrimaryButton
          title={inBucket ? 'Added' : isAdding ? 'Adding...' : 'Add to bucket'}
          icon={inBucket ? <Check size={14} color={colors.success.dark} /> : !isAdding ? <Plus size={14} color="#fff" /> : undefined}
          variant={inBucket ? 'success' : 'primary'}
          loading={isAdding}
          disabled={inBucket}
          onPress={() => dispatch(addDefinitionToBucket({ termId, definitionId: definition._id, miniAppId }))}
          style={styles.button}
        />
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  textColumn: {
    flex: 1,
  },
  partOfSpeech: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colors.primary.DEFAULT,
  },
  definition: {
    fontSize: typography.body,
    color: colors.text.primary,
    marginTop: spacing.xs,
  },
  example: {
    fontSize: typography.small,
    fontStyle: 'italic',
    color: colors.text.muted,
    marginTop: spacing.xs,
  },
  wordLists: {
    marginTop: spacing.xs,
    gap: 2,
  },
  wordListText: {
    fontSize: 12,
    color: colors.text.muted,
  },
  button: {
    flexShrink: 0,
  },
});
