import React, { useEffect } from 'react';
import { Text, View, ActivityIndicator, Linking, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  useFonts as useJakarta,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  BeVietnamPro_400Regular,
  BeVietnamPro_500Medium,
  BeVietnamPro_700Bold,
} from '@expo-google-fonts/be-vietnam-pro';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { SettingsProvider } from './hooks/useSettings';
import { createSessionFromUrl } from './services/supabase';
import { C, R, F } from './theme';
import { ASSETS } from './assets';

// Screens
import LoginScreen         from './screens/LoginScreen';
import RegisterScreen      from './screens/RegisterScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import ResetPasswordScreen  from './screens/ResetPasswordScreen';
import ConsentScreen       from './screens/ConsentScreen';
import HomeScreen          from './screens/HomeScreen';
import GameShowScreen      from './screens/GameShowScreen';
import ProfileScreen       from './screens/ProfileScreen';
import StatisticsScreen    from './screens/StatisticsScreen';
import LeaderboardScreen   from './screens/LeaderboardScreen';
import MatchHistoryScreen  from './screens/MatchHistoryScreen';

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
        await createSessionFromUrl(url).catch(() => {});
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
      width: 52, height: 34,
      backgroundColor: focused ? C.peachBg : 'transparent',
      borderRadius: R.squircle,
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
          backgroundColor: C.bg,
          borderTopWidth: 1,
          borderTopColor: C.peachBorder,
          borderTopLeftRadius: R.sheet,
          borderTopRightRadius: R.sheet,
          height: 81,
          paddingBottom: 12,
          paddingTop: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 12,
          elevation: 12,
        },
        tabBarLabelStyle: { fontSize: 11, fontFamily: F.bodyMedium, marginTop: 2 },
        tabBarActiveTintColor: C.orange,
        tabBarInactiveTintColor: C.inkSlate2,
        headerShown: false,
      }}
    >
      <Tab.Screen name="HomeTab"      component={HomeScreen}       options={{ tabBarLabel: 'Trang Chủ', tabBarIcon: ({ focused }) => <TabIcon icon={ASSETS.tabs.home} focused={focused} /> }} />
      <Tab.Screen name="GameShowTab"  component={GameShowScreen}   options={{ tabBarLabel: 'Đấu',      tabBarIcon: ({ focused }) => <TabIcon icon={ASSETS.tabs.gameshow} focused={focused} /> }} />
      <Tab.Screen name="LeaderboardTab" component={LeaderboardScreen} options={{ tabBarLabel: 'Xếp Hạng', tabBarIcon: ({ focused }) => <TabIcon icon={ASSETS.tabs.leaderboard} focused={focused} /> }} />
      <Tab.Screen name="StatsTab"     component={StatisticsScreen} options={{ tabBarLabel: 'Thống Kê', tabBarButton: () => null, tabBarIcon: ({ focused }) => <TabIcon icon={ASSETS.tabs.stats} focused={focused} /> }} />
      <Tab.Screen name="MatchHistoryTab" component={MatchHistoryScreen} options={{ tabBarLabel: 'Lịch Sử', tabBarButton: () => null, tabBarIcon: ({ focused }) => <TabIcon icon={ASSETS.tabs.matchHistory} focused={focused} /> }} />
      <Tab.Screen name="ProfileTab"   component={ProfileScreen}    options={{ tabBarLabel: 'Hồ Sơ',   tabBarIcon: ({ focused }) => <TabIcon icon={ASSETS.tabs.profile} focused={focused} /> }} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { user, loading, passwordRecovery, termsAccepted } = useAuth();
  useDeepLinkHandler();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        // Khi đang trong chế độ khôi phục mật khẩu (từ email link), ưu tiên màn hình đặt lại
        passwordRecovery ? (
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        ) : !termsAccepted ? (
          // Lần đầu đăng nhập / sau khi đăng ký: bắt buộc đồng ý điều khoản trước khi vào app
          <Stack.Screen name="Consent" component={ConsentScreen} />
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
  // Load the MathUp brand fonts. Render a warm splash until they're ready;
  // if loading errors, fall back to system fonts rather than blocking the app.
  const [fontsLoaded, fontError] = useJakarta({
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    BeVietnamPro_400Regular,
    BeVietnamPro_500Medium,
    BeVietnamPro_700Bold,
  });

  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg }}>
        <ActivityIndicator size="large" color={C.orange} />
      </View>
    );
  }

  return (
    <SettingsProvider>
      <AuthProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SettingsProvider>
  );
}
