import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Palette, BorderRadius, Shadows } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

export default function SplashScreen() {
  const { user, isLoading: authLoading } = useAuth();
  const [checkingState, setCheckingState] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const routeUser = async () => {
      // Allow moment for smooth splash branding display
      await new Promise((resolve) => setTimeout(resolve, 1600));

      if (!isMounted) return;

      try {
        if (user) {
          // Logged in user: direct access to their assigned portal
          if (user.role === 'admin') {
            router.replace('/admin-portal');
          } else {
            router.replace('/(tabs)/home');
          }
          return;
        }

        // Unauthenticated: strict flow Splash -> Onboarding (1, 2, 3) -> Login
        router.replace('/onboarding');
      } catch (e) {
        console.warn('Navigation error from splash', e);
        router.replace('/onboarding');
      } finally {
        if (isMounted) setCheckingState(false);
      }
    };

    if (!authLoading) {
      routeUser();
    }

    return () => {
      isMounted = false;
    };
  }, [user, authLoading]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Animated Brand Emblem */}
        <View style={styles.logoBadge}>
          <Ionicons name="sparkles" size={48} color={Palette.white} />
        </View>

        <Text style={styles.brandTitle}>Fixora</Text>
        <Text style={styles.brandTagline}>HOME SERVICES MARKETPLACE</Text>

        <View style={styles.separator} />

        <Text style={styles.description}>
          Professional, Reliable & Verified Services{'\n'}Right at Your Doorstep
        </Text>

        {checkingState ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="small" color={Palette.primary} />
            <Text style={styles.loaderText}>Connecting to Fixora...</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.manualBtn}
            onPress={() => router.replace('/onboarding')}
          >
            <Text style={styles.manualBtnText}>Continue to Onboarding</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.firebaseStatusRow}>
          <View style={styles.statusDot} />
          <Text style={styles.footerText}>Firebase Connected • Project Fixora</Text>
        </View>
        <Text style={styles.versionText}>Version 1.0.0 • Mobile & Web Ready</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
    paddingVertical: 50,
    paddingHorizontal: 24,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoBadge: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    ...Shadows.lg,
  },
  brandTitle: {
    fontSize: 38,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -1,
  },
  brandTagline: {
    fontSize: 12,
    fontWeight: '800',
    color: Palette.primary,
    letterSpacing: 2,
    marginTop: 4,
  },
  separator: {
    width: 48,
    height: 3,
    backgroundColor: Palette.primary,
    borderRadius: 2,
    marginVertical: 18,
  },
  description: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  loaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  loaderText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  manualBtn: {
    backgroundColor: Palette.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
    marginTop: 10,
  },
  manualBtnText: {
    color: Palette.white,
    fontWeight: '700',
    fontSize: 14,
  },
  footer: {
    alignItems: 'center',
    gap: 4,
  },
  firebaseStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  footerText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  versionText: {
    fontSize: 10,
    color: '#94A3B8',
  },
});
