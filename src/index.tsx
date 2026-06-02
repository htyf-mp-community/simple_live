import { CardStyleInterpolators, createStackNavigator } from '@react-navigation/stack';
import React, { memo, useEffect } from 'react'
import jssdk from '@htyf-mp/js-sdk';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import createRouter from './router'
import { NavigationContainer } from '@react-navigation/native';

const RootStack = createStackNavigator();

const router = createRouter();

function RootFix() {
  return <RootStack.Navigator
    initialRouteName={'MainScreen'}
    screenOptions={{
      headerShown: false,
      presentation: 'modal',
    }}>
    <RootStack.Screen
      name={'MainScreen'}
      component={router}
      options={{
        cardStyleInterpolator:
          CardStyleInterpolators.forVerticalIOS,
      }}
    />
  </RootStack.Navigator>
}


const MiniApp = () => {
  useEffect(() => {
    const tryShowInterstitialAd = async () => {
      const INTERSTITIAL_AD_STORAGE_KEY = 'interstitial_ad_last_shown_at';
      /** 冷却时间（毫秒），此时间内只调用一次 showInterstitialAd */
      const INTERSTITIAL_AD_COOLDOWN_MS = 8 * 60 * 1000;
      const storage = jssdk.getStorage();
      const lastShownRaw = await storage.getItem(INTERSTITIAL_AD_STORAGE_KEY);
      const now = Date.now();
      const lastShown = lastShownRaw ? Number(lastShownRaw) : 0;

      if (lastShown && now - lastShown < INTERSTITIAL_AD_COOLDOWN_MS) {
        return;
      }

      await storage.setItem(INTERSTITIAL_AD_STORAGE_KEY, String(now));
      jssdk.showInterstitialAd({
        onOpen: () => {
          console.log('onOpen');
        },
        onClose: () => {
          console.log('onClose');
        },
      });
    };

    tryShowInterstitialAd();
  }, []);
  return (
    <SafeAreaProvider>
    <NavigationContainer>
      <RootFix />
    </NavigationContainer>
    </SafeAreaProvider>
  );
};


export default memo(MiniApp);

