import React, { useEffect } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { MarketplaceProvider } from '../context/MarketplaceContext';

SplashScreen.preventAutoHideAsync().catch(() => {});

function NavigationGuard({ children }: { children: React.ReactNode }) {
  const { user, activeRole, isLoading } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const firstSegment = segments[0] as string | undefined;
    const isPublicRoute =
      !firstSegment ||
      firstSegment === 'index' ||
      firstSegment === 'onboarding' ||
      firstSegment === 'auth';

    // 1. Unauthenticated users: strictly block access to protected screens
    if (!user && !isPublicRoute) {
      router.replace('/auth/login');
      return;
    }

    const effectiveRole = activeRole || user?.role;

    // 2. Authenticated users attempting to visit auth screens: redirect to their assigned portal
    if (user && firstSegment === 'auth') {
      if (effectiveRole === 'admin') {
        router.replace('/admin-portal');
      } else if (effectiveRole === 'provider') {
        router.replace('/provider-portal');
      } else {
        router.replace('/(tabs)/home');
      }
      return;
    }

    // 3. Customer trying to access admin portal or provider portal: redirect to customer home
    if (effectiveRole === 'customer' && (firstSegment === 'admin-portal' || firstSegment === 'provider-portal')) {
      router.replace('/(tabs)/home');
      return;
    }

    // 4. Provider trying to access admin portal: redirect to provider portal
    if (effectiveRole === 'provider' && firstSegment === 'admin-portal') {
      router.replace('/provider-portal');
      return;
    }

    // 5. Admin trying to access provider portal: redirect to admin portal
    if (effectiveRole === 'admin' && firstSegment === 'provider-portal') {
      router.replace('/admin-portal');
      return;
    }
  }, [user, activeRole, isLoading, segments]);

  return <>{children}</>;
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <AuthProvider>
      <MarketplaceProvider>
        <NavigationGuard>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#F8FAFC' },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="service/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="provider/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="book/[serviceId]" options={{ headerShown: false }} />
            <Stack.Screen name="booking/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="notifications" options={{ headerShown: false }} />
            <Stack.Screen name="addresses" options={{ headerShown: false }} />
            <Stack.Screen name="auth/login" options={{ headerShown: false }} />
            <Stack.Screen name="auth/register" options={{ headerShown: false }} />
            <Stack.Screen name="provider-portal/index" options={{ headerShown: false }} />
            <Stack.Screen name="provider-portal/services" options={{ headerShown: false }} />
            <Stack.Screen name="provider-portal/earnings" options={{ headerShown: false }} />
            <Stack.Screen name="admin-portal/index" options={{ headerShown: false }} />
            <Stack.Screen name="admin-portal/users" options={{ headerShown: false }} />
            <Stack.Screen name="admin-portal/categories" options={{ headerShown: false }} />
            <Stack.Screen name="admin-portal/services" options={{ headerShown: false }} />
            <Stack.Screen name="admin-portal/bookings" options={{ headerShown: false }} />
            <Stack.Screen name="admin-portal/reviews" options={{ headerShown: false }} />
            <Stack.Screen name="firebase-setup" options={{ headerShown: false }} />
          </Stack>
        </NavigationGuard>
      </MarketplaceProvider>
    </AuthProvider>
  );
}
