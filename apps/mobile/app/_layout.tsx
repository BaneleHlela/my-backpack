import { useCallback, useEffect, useState } from 'react';
import { Slot } from 'expo-router';
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

  return <Slot />;
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <AuthBootstrap />
    </Provider>
  );
}
