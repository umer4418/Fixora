import { useCallback } from 'react';
import { Href, router, useNavigation } from 'expo-router';
import { useAuth } from '../context/AuthContext';

export function defaultBackHref(role?: string | null): Href {
  if (role === 'admin') return '/admin-portal';
  if (role === 'provider') return '/provider-portal';
  return '/(tabs)/home';
}

/** Go back only when the focused navigator can handle it; otherwise replace. */
export function useSafeBack(fallback?: Href) {
  const navigation = useNavigation();
  const { user, activeRole } = useAuth();
  const href = fallback ?? defaultBackHref(activeRole || user?.role);

  return useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    router.replace(href);
  }, [href, navigation]);
}
