import { useCallback, useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider, useDispatch, useSelector } from 'react-redux';
import * as SplashScreen from 'expo-splash-screen';
import { store } from '../src/store/store';
import type { AppDispatch, RootState } from '../src/store/store';
import { injectStore } from '../src/lib/api';
import { bootstrapAuth, fetchActiveProfile } from '../src/features/auth/authSlice';

injectStore(store);

void SplashScreen.preventAutoHideAsync();

function AuthBootstrap() {
  const dispatch = useDispatch<AppDispatch>();
  const isCheckingAuth = useSelector((state: RootState) => state.auth.isCheckingAuth);
  const [splashHidden, setSplashHidden] = useState(false);

  useEffect(() => {
    const init = async () => {
      const result = await dispatch(bootstrapAuth());
      if (bootstrapAuth.fulfilled.match(result) && result.payload.authenticated) {
        dispatch(fetchActiveProfile());
      }
    };
    void init();
  }, [dispatch]);

  const hideSplash = useCallback(async () => {
    if (!isCheckingAuth && !splashHidden) {
      setSplashHidden(true);
      await SplashScreen.hideAsync();
    }
  }, [isCheckingAuth, splashHidden]);

  useEffect(() => {
    void hideSplash();
  }, [hideSplash]);

  // headerShown: false on screenOptions preserves the zero-header look every route already
  // had under the previous bare <Slot/> — the only route with its own override is the
  // full-screen quiz-taking route (see docs/technical/mobile-architecture.md's "Root layout:
  // <Slot/> -> <Stack/>" section for why it has to live at the root, not nested in (app)).
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="quiz/[itemId]" options={{ presentation: 'fullScreenModal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <AuthBootstrap />
      </Provider>
    </GestureHandlerRootView>
  );
}
