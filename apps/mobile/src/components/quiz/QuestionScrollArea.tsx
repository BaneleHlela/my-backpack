import { createContext, useContext, useRef, type ReactNode, type RefObject } from 'react';
import { StyleSheet } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { spacing } from '@my-backpack/shared';
import { useTheme } from '../../theme/ThemeContext';

const QuestionScrollContext = createContext<RefObject<ScrollView | null> | null>(null);

// Tile pans block this native scroll gesture; swiping the question background still scrolls.
export const useQuestionScrollRef = () => useContext(QuestionScrollContext);

export function QuestionScrollArea({ children }: { children: ReactNode }) {
  const scrollRef = useRef<ScrollView>(null);
  const { theme } = useTheme();

  return (
    <QuestionScrollContext.Provider value={scrollRef}>
      <ScrollView
        ref={scrollRef}
        style={styles.viewport}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentInsetAdjustmentBehavior="never"
        indicatorStyle={theme === 'dark' ? 'white' : 'black'}
        showsVerticalScrollIndicator
        removeClippedSubviews={false}
      >
        {children}
      </ScrollView>
    </QuestionScrollContext.Provider>
  );
}

const styles = StyleSheet.create({
  viewport: { flex: 1, minHeight: 0 },
  // Do not use flex: 1 here: it constrains the content instead of allowing it to overflow.
  content: { flexGrow: 1, paddingVertical: spacing.md },
});
