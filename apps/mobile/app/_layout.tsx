import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Provider, useDispatch, useSelector } from 'react-redux';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Chewy_400Regular } from '@expo-google-fonts/chewy';
import {
  Fredoka_400Regular,
  Fredoka_500Medium,
  Fredoka_600SemiBold,
  Fredoka_700Bold,
} from '@expo-google-fonts/fredoka';
import { store } from '../src/store/store';
import type { AppDispatch, RootState } from '../src/store/store';
import { injectStore } from '../src/lib/api';
import { bootstrapAuth, fetchActiveProfile } from '../src/features/auth/authSlice';
import { ThemeProvider, useTheme } from '../src/theme/ThemeContext';
import { LaunchScreen } from '../src/components/LaunchScreen';

injectStore(store);

void SplashScreen.preventAutoHideAsync();

function AuthBootstrap() {
  const dispatch = useDispatch<AppDispatch>();
  const isCheckingAuth = useSelector((state: RootState) => state.auth.isCheckingAuth);
  const { theme } = useTheme();
  // 'light' status bar content (white icons/text) reads correctly against this app's dark
  // wallpaper/background; flips to 'dark' automatically if/when a light theme ever ships (see
  // ThemeContext's ACTIVE_THEME note — no toggle exists yet, dark is the only active theme).
  const statusBarStyle = theme === 'dark' ? 'light' : 'dark';
  const [nativeSplashHidden, setNativeSplashHidden] = useState(false);
  // Chewy (display headings) + Fredoka (body/labels) — Quiz Modes screens only for now, see
  // docs/technical/mobile-architecture.md's "Fonts (Quiz Modes)" section. [loaded, error] mirrors
  // expo-font's useFonts contract; either outcome unblocks the splash hand-off below.
  const [fontsLoaded, fontError] = useFonts({
    Chewy_400Regular,
    Fredoka_400Regular,
    Fredoka_500Medium,
    Fredoka_600SemiBold,
    Fredoka_700Bold,
  });
  const fontsReady = fontsLoaded || !!fontError;

  useEffect(() => {
    const init = async () => {
      const result = await dispatch(bootstrapAuth());
      if (bootstrapAuth.fulfilled.match(result) && result.payload.authenticated) {
        dispatch(fetchActiveProfile());
      }
    };
    void init();
  }, [dispatch]);

  // Hands off from the static, spinner-less native splash image to
  // <LaunchScreen/> as soon as fonts have resolved (loaded or errored) —
  // bootstrapAuth's network round-trip can take a moment and the native splash
  // has no way to show it's still working. <LaunchScreen/> below then covers
  // the rest of the isCheckingAuth window with the logo + an animated spinner.
  useEffect(() => {
    if (!nativeSplashHidden && fontsReady) {
      setNativeSplashHidden(true);
      void SplashScreen.hideAsync();
    }
  }, [nativeSplashHidden, fontsReady]);

  if (isCheckingAuth || !fontsReady) {
    return (
      <>
        <StatusBar style={statusBarStyle} />
        <LaunchScreen />
      </>
    );
  }

  // headerShown: false on screenOptions preserves the zero-header look every route already
  // had under the previous bare <Slot/> — the only route with its own override is the
  // full-screen quiz-taking route (see docs/technical/mobile-architecture.md's "Root layout:
  // <Slot/> -> <Stack/>" section for why it has to live at the root, not nested in (app)).
  //
  // initialRouteName is required: React Navigation's Stack defaults initialRouteName to the
  // first registered screen when it isn't set explicitly, and quiz/[itemId] is the only
  // EXPLICITLY declared <Stack.Screen> child here (everything else is auto-discovered from
  // the file system) — without this, the app launches directly into the quiz screen on cold
  // start instead of index.tsx's auth redirect. This was the actual root cause behind a long
  // on-device debugging session that looked like a crash (see mobile-architecture.md).
  //
  // quiz/modes/[itemId] and quiz/modes/dictionary/[miniAppId] (Quiz Modes, added later) are new
  // sibling routes registered the same way — deliberately additive rather than a restructure of
  // the two routes above, to avoid touching this fragile initialRouteName/fullScreenModal setup.
  // See docs/technical/mobile-architecture.md's "Quiz Modes" section.
  return (
    <>
      <StatusBar style={statusBarStyle} />
      <Stack screenOptions={{ headerShown: false }} initialRouteName="index">
        <Stack.Screen name="quiz/[itemId]" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="quiz/dictionary/[miniAppId]" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="quiz/modes/[itemId]" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="quiz/modes/dictionary/[miniAppId]" options={{ presentation: 'fullScreenModal' }} />
      </Stack>
    </>
  );
}

// SafeAreaProvider sits outermost (alongside GestureHandlerRootView, both app-wide
// requirements) so every screen's useSafeAreaInsets()/SafeAreaView call below it resolves
// real device insets — see ScreenBackground.tsx (the shared per-screen wrapper) and
// QuizSessionScreen.tsx (the one screen that renders outside ScreenBackground, as a root-level
// fullScreenModal) for where those insets actually get applied as padding.
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Provider store={store}>
          <ThemeProvider>
            <AuthBootstrap />
          </ThemeProvider>
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
