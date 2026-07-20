// Ports apps/web's DictionaryPage/components/SearchBar.tsx — same 400ms
// debounce pattern (setTimeout/clearTimeout work identically in RN).
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Search, Volume2 } from 'lucide-react-native';
import { useDispatch, useSelector } from 'react-redux';
import { colors, radii, spacing, typography } from '@my-backpack/shared';
import { GlassCard } from '../GlassCard';
import { searchVocab, clearSearch } from '../../features/vocab/vocabSlice';
import type { AppDispatch, RootState } from '../../store/store';

const DEBOUNCE_MS = 400;

interface SearchInputProps {
  miniAppId: string;
  onSelectTerm: (termId: string) => void;
}

export function SearchInput({ miniAppId, onSelectTerm }: SearchInputProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { searchResult, searchStatus, searchError } = useSelector((state: RootState) => state.vocab);
  const [query, setQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (!trimmed) {
      dispatch(clearSearch());
      return;
    }

    debounceRef.current = setTimeout(() => {
      dispatch(searchVocab({ word: trimmed, miniAppId }));
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, miniAppId, dispatch]);

  return (
    <View>
      <View style={styles.inputWrapper}>
        <Search size={18} color={colors.text.muted} style={styles.searchIcon} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search for a word..."
          placeholderTextColor={colors.text.muted}
          autoCapitalize="none"
          style={styles.input}
        />
        {searchStatus === 'loading' ? (
          <ActivityIndicator size="small" color={colors.primary.light} style={styles.spinner} />
        ) : null}
      </View>

      {query.trim() && searchStatus !== 'idle' ? (
        <View style={styles.resultWrapper}>
          {searchStatus === 'loading' ? (
            <GlassCard intensity="soft">
              <Text style={styles.hintText}>Looking that word up — this can take a moment the first time...</Text>
            </GlassCard>
          ) : null}

          {searchStatus === 'not_found' ? (
            <GlassCard intensity="soft">
              <Text style={styles.hintText}>No word found for "{query.trim()}".</Text>
            </GlassCard>
          ) : null}

          {searchStatus === 'error' ? (
            <GlassCard intensity="soft">
              <Text style={styles.errorText}>{searchError ?? 'Something went wrong searching for that word.'}</Text>
            </GlassCard>
          ) : null}

          {searchStatus === 'success' && searchResult ? (
            <Pressable onPress={() => onSelectTerm(searchResult.term._id)}>
              <GlassCard>
                <View style={styles.resultHeader}>
                  <Text style={styles.resultWord}>{searchResult.term.word}</Text>
                  {searchResult.term.phonetic ? (
                    <Text style={styles.resultPhonetic}>{searchResult.term.phonetic}</Text>
                  ) : null}
                  {searchResult.term.audioUrl ? <Volume2 size={14} color={colors.text.muted} /> : null}
                </View>
                {searchResult.definitions[0] ? (
                  <Text style={styles.resultDefinition} numberOfLines={2}>
                    {searchResult.definitions[0].definition}
                  </Text>
                ) : null}
              </GlassCard>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.glass,
    borderWidth: 1,
    borderColor: colors.surface.border,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: typography.body,
    color: colors.text.primary,
  },
  spinner: {
    marginLeft: spacing.sm,
  },
  resultWrapper: {
    marginTop: spacing.sm,
  },
  hintText: {
    fontSize: typography.small,
    color: colors.text.secondary,
  },
  errorText: {
    fontSize: typography.small,
    color: colors.error.dark,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  resultWord: {
    fontSize: typography.body,
    fontWeight: '700',
    color: colors.text.primary,
  },
  resultPhonetic: {
    fontSize: typography.small,
    color: colors.text.muted,
  },
  resultDefinition: {
    fontSize: typography.small,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
});
