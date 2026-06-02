import React from 'react';
import { Text, View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider, useAuth } from './hooks/useAuth';

// Screens
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import GameShowScreen from './screens/GameShowScreen';
import ProfileScreen from './screens/ProfileScreen';
import StatisticsScreen from './screens/StatisticsScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return (
    <View style={{
      alignItems: 'center', justifyContent: 'center',
      width: 46, height: 32,
      backgroundColor: focused ? '#FFE5D9' : 'transparent',
      borderRadius: 12,
    }}>
      <Text style={{ fontSize: focused ? 22 : 20 }}>{icon}</Text>
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 0,
          height: 72,
          paddingBottom: 10,
          paddingTop: 8,
          shadowColor: '#FF6B35',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.12,
          shadowRadius: 16,
          elevation: 12,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '800', marginTop: 2 },
        tabBarActiveTintColor: '#FF6B35',
        tabBarInactiveTintColor: '#C9B8AF',
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Trang Chủ',
          tabBarIcon: ({ focused }) => <TabIcon icon="🏡" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="GameShowTab"
        component={GameShowScreen}
        options={{
          tabBarLabel: 'Đấu',
          tabBarIcon: ({ focused }) => <TabIcon icon="🎮" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="LeaderboardTab"
        component={LeaderboardScreen}
        options={{
          tabBarLabel: 'Xếp Hạng',
          tabBarIcon: ({ focused }) => <TabIcon icon="🏆" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="StatsTab"
        component={StatisticsScreen}
        options={{
          tabBarLabel: 'Thống Kê',
          tabBarIcon: ({ focused }) => <TabIcon icon="📈" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Hồ Sơ',
          tabBarIcon: ({ focused }) => <TabIcon icon="😊" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {user ? (
        <Stack.Screen name="MainApp" component={MainTabs} />
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
