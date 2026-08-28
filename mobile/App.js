import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './app/index';
import ScanScreen from './app/scan';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Smart Agriculture' }} />
        <Stack.Screen name="Scan" component={ScanScreen} options={{ title: 'Analyze Crop' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
