import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { I18nProvider } from './i18n';
import HomeScreen from './app/index';
import ScanScreen from './app/scan';
import PreviewScreen from './app/preview';
import AnalyzingScreen from './app/analyzing';
import ResultScreen from './app/result';
import RecommendationScreen from './app/recommendation';
import MapScreen from './app/map';
import HistoryScreen from './app/history';
import AlertsScreen from './app/alerts';
import SettingsScreen from './app/settings';
import BoundaryScreen from './app/boundary';
import LoginScreen from './app/login';

const Stack = createNativeStackNavigator();

/**
 * A single stack with headers hidden: every screen renders its own header
 * (ScreenHeader) and, where relevant, the custom BottomTabBar. That keeps the
 * raised centre camera button possible without a tab navigator.
 */
export default function App() {
  return (
    <SafeAreaProvider>
      <I18nProvider>
        <StatusBar style="dark" />
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Login"
            screenOptions={{ headerShown: false, animation: 'fade' }}
          >
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Scan" component={ScanScreen} />
            <Stack.Screen name="Preview" component={PreviewScreen} />
            <Stack.Screen
              name="Analyzing"
              component={AnalyzingScreen}
              options={{ gestureEnabled: false }}
            />
            <Stack.Screen name="Result" component={ResultScreen} />
            <Stack.Screen name="Recommendation" component={RecommendationScreen} />
            <Stack.Screen name="Map" component={MapScreen} />
            <Stack.Screen name="Boundary" component={BoundaryScreen} />
            <Stack.Screen name="History" component={HistoryScreen} />
            <Stack.Screen name="Alerts" component={AlertsScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
