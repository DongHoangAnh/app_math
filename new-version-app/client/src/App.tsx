import React, { useEffect } from 'react';
import { Text, View, ActivityIndicator, Linking, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { supabase } from './services/supabase';

// Screens
import LoginScreen         from './screens/LoginScreen';
import RegisterScreen      from './screens/RegisterScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import ResetPasswordScreen  from './screens/ResetPasswordScreen';
import HomeScreen          from './screens/HomeScreen';
import GameShowScreen      from './screens/GameShowScreen';
import ProfileScreen       from './screens/ProfileScreen';
import StatisticsScreen    from './screens/StatisticsScreen';
import LeaderboardScreen   from './screens/LeaderboardScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

// Deep-link handler chỉ cần thiết trên native.
// Trên web, Supabase tự xử lý callback qua detectSessionInUrl: true.
function useDeepLinkHandler() {
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const handle = async (url: string) => {
      if (!url) return;
      if (url.includes('auth/callback') || url.includes('auth/reset-password')) {
        await supabase.auth.exchangeCodeForSession(url).catch(() => {});
      }
    };

    Linking.getInitialURL().then((url) => { if (url) handle(url); });
    const sub = Linking.addEventListener('url', ({ url }) => handle(url));
    return () => sub.remove();
  }, []);
}

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
      <Tab.Screen name="HomeTab"      component={HomeScreen}       options={{ tabBarLabel: 'Trang Chủ', tabBarIcon: ({ focused }) => <TabIcon icon="🏡" focused={focused} /> }} />
      <Tab.Screen name="GameShowTab"  component={GameShowScreen}   options={{ tabBarLabel: 'Đấu',      tabBarIcon: ({ focused }) => <TabIcon icon="🎮" focused={focused} /> }} />
      <Tab.Screen name="LeaderboardTab" component={LeaderboardScreen} options={{ tabBarLabel: 'Xếp Hạng', tabBarIcon: ({ focused }) => <TabIcon icon="🏆" focused={focused} /> }} />
      <Tab.Screen name="StatsTab"     component={StatisticsScreen} options={{ tabBarLabel: 'Thống Kê', tabBarIcon: ({ focused }) => <TabIcon icon="📈" focused={focused} /> }} />
      <Tab.Screen name="ProfileTab"   component={ProfileScreen}    options={{ tabBarLabel: 'Hồ Sơ',   tabBarIcon: ({ focused }) => <TabIcon icon="😊" focused={focused} /> }} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { user, loading, passwordRecovery } = useAuth();
  useDeepLinkHandler();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        // Khi đang trong chế độ khôi phục mật khẩu (từ email link), ưu tiên màn hình đặt lại
        passwordRecovery ? (
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        ) : (
          <Stack.Screen name="MainApp" component={MainTabs} />
        )
      ) : (
        <>
          <Stack.Screen name="Login"          component={LoginScreen} />
          <Stack.Screen name="Register"       component={RegisterScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
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
