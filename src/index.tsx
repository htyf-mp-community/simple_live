import { CardStyleInterpolators, createStackNavigator } from '@react-navigation/stack';
import React, { memo } from 'react'
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
  return (
    <SafeAreaProvider>
    <NavigationContainer>
      <RootFix />
    </NavigationContainer>
    </SafeAreaProvider>
  );
};


export default memo(MiniApp);

