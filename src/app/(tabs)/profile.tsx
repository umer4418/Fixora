import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Palette, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useMarketplace } from '../../context/MarketplaceContext';
import { Header } from '../../components/common/Header';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { bookings, favorites, addresses } = useMarketplace();

  const userBookings = user ? bookings.filter((b) => b.customerId === user.id) : [];
  const activeCount = userBookings.filter(
    (b) => b.status === 'pending' || b.status === 'accepted' || b.status === 'in_progress' || b.status === 'on_the_way'
  ).length;
  const completedCount = userBookings.filter((b) => b.status === 'completed').length;
  const defaultAddress = addresses.find((a) => a.isDefault) || addresses[0];

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      const confirmed =
        typeof window !== 'undefined'
          ? window.confirm('Are you sure you want to sign out?')
          : true;
      if (confirmed) {
        await logout();
        router.replace('/auth/login');
      }
      return;
    }

    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/auth/login');
        },
      },
    ]);
  };

  const handleSwitchAccount = async () => {
    if (Platform.OS === 'web') {
      const confirmed =
        typeof window !== 'undefined'
          ? window.confirm('Sign out and switch to another account?')
          : true;
      if (confirmed) {
        await logout();
        router.replace('/auth/login');
      }
      return;
    }

    Alert.alert(
      'Switch Account',
      'Sign out and sign in with a different account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Switch Account',
          onPress: async () => {
            await logout();
            router.replace('/auth/login');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header title="My Profile" showLocation={false} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Customer Profile Card */}
        <View style={styles.userCard}>
          <View style={styles.avatarContainer}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Ionicons name="person" size={32} color={Palette.gray600} />
              </View>
            )}
            <View style={styles.roleBadgeContainer}>
              <View style={styles.customerRoleBadge}>
                <Text style={styles.customerRoleText}>Customer</Text>
              </View>
            </View>
          </View>

          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name || 'Customer'}</Text>
            <Text style={styles.userEmail}>{user?.email || 'No email'}</Text>
            {user?.phone ? (
              <Text style={styles.userPhone}>
                <Ionicons name="call-outline" size={11} color={Palette.gray400} /> {user.phone}
              </Text>
            ) : null}
            {defaultAddress ? (
              <Text style={styles.userAddress} numberOfLines={1}>
                <Ionicons name="location-outline" size={11} color={Palette.gray400} /> {defaultAddress.street}, {defaultAddress.city}
              </Text>
            ) : null}
          </View>

          {user ? (
            <TouchableOpacity
              style={styles.switchAccountBtn}
              onPress={handleSwitchAccount}
              activeOpacity={0.7}
            >
              <Ionicons name="log-in-outline" size={15} color={Palette.primary} />
              <Text style={styles.switchAccountText}>Switch</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.loginBtn}
              onPress={() => router.push('/auth/login')}
              activeOpacity={0.7}
            >
              <Text style={styles.loginBtnText}>Sign In</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Customer Order Statistics */}
        <View style={styles.statsRow}>
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push('/bookings')}
            activeOpacity={0.8}
          >
            <View style={[styles.statIconBox, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="calendar" size={18} color={Palette.primary} />
            </View>
            <Text style={styles.statNumber}>{userBookings.length}</Text>
            <Text style={styles.statLabel}>Total Orders</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push('/bookings')}
            activeOpacity={0.8}
          >
            <View style={[styles.statIconBox, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="checkmark-circle" size={18} color="#10B981" />
            </View>
            <Text style={[styles.statNumber, { color: '#10B981' }]}>{completedCount}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push('/favorites')}
            activeOpacity={0.8}
          >
            <View style={[styles.statIconBox, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="heart" size={18} color={Palette.danger} />
            </View>
            <Text style={[styles.statNumber, { color: Palette.danger }]}>{favorites.length}</Text>
            <Text style={styles.statLabel}>Saved</Text>
          </TouchableOpacity>
        </View>

        {/* Active Order In-Progress Tracker Banner */}
        {activeCount > 0 && (
          <TouchableOpacity
            style={styles.activeBanner}
            onPress={() => router.push('/bookings')}
            activeOpacity={0.85}
          >
            <View style={styles.pulseDot} />
            <View style={styles.activeBannerTextCol}>
              <Text style={styles.activeBannerTitle}>
                {activeCount} Service Order{activeCount > 1 ? 's' : ''} in Progress
              </Text>
              <Text style={styles.activeBannerSub}>Tap to view live order tracking & status</Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={Palette.white} />
          </TouchableOpacity>
        )}

        {/* Customer Account Settings & Services */}
        <View style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/bookings')}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconBox, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="calendar-outline" size={18} color={Palette.primary} />
            </View>
            <View style={styles.menuTextBox}>
              <Text style={styles.menuTitle}>My Bookings & Orders</Text>
              <Text style={styles.menuSub}>Track current and past service bookings</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Palette.gray400} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/favorites')}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconBox, { backgroundColor: '#FEF2F2' }]}>
              <Ionicons name="heart-outline" size={18} color={Palette.danger} />
            </View>
            <View style={styles.menuTextBox}>
              <Text style={styles.menuTitle}>Saved Favorite Services</Text>
              <Text style={styles.menuSub}>Quickly book your preferred home services</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Palette.gray400} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/addresses')}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconBox, { backgroundColor: Palette.primarySoft }]}>
              <Ionicons name="location-outline" size={18} color={Palette.primary} />
            </View>
            <View style={styles.menuTextBox}>
              <Text style={styles.menuTitle}>Saved Addresses</Text>
              <Text style={styles.menuSub}>Home, Office and custom delivery locations</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Palette.gray400} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/notifications')}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconBox, { backgroundColor: Palette.accentSoft }]}>
              <Ionicons name="notifications-outline" size={18} color={Palette.accent} />
            </View>
            <View style={styles.menuTextBox}>
              <Text style={styles.menuTitle}>Notifications</Text>
              <Text style={styles.menuSub}>Order updates, promo discounts and messages</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Palette.gray400} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/firebase-setup')}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconBox, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="logo-firebase" size={18} color="#D97706" />
            </View>
            <View style={styles.menuTextBox}>
              <Text style={styles.menuTitle}>Firebase Project Fixora</Text>
              <Text style={styles.menuSub}>Connected cloud database status</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Palette.gray400} />
          </TouchableOpacity>
        </View>

        {/* Customer Sign Out Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={18} color={Palette.danger} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.versionInfo}>
          <Text style={styles.versionText}>Fixora Home Services Marketplace</Text>
          <Text style={styles.copyrightText}>100% Verified Local Professionals</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.white,
  },
  container: {
    flex: 1,
    backgroundColor: Palette.gray50,
  },
  contentContainer: {
    padding: Spacing.four,
    paddingBottom: 96,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: Palette.gray200,
    marginBottom: Spacing.three,
    ...Shadows.sm,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: Spacing.three,
  },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: Palette.gray100,
  },
  avatarFallback: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: Palette.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleBadgeContainer: {
    position: 'absolute',
    bottom: -6,
    alignSelf: 'center',
  },
  customerRoleBadge: {
    backgroundColor: Palette.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  customerRoleText: {
    color: Palette.white,
    fontSize: 9,
    fontWeight: '800',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.gray900,
  },
  userEmail: {
    fontSize: 12,
    color: Palette.gray500,
    marginTop: 2,
  },
  userPhone: {
    fontSize: 11,
    color: Palette.gray500,
    marginTop: 2,
  },
  userAddress: {
    fontSize: 11,
    color: Palette.gray500,
    marginTop: 2,
  },
  switchAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Palette.primarySoft,
    borderRadius: BorderRadius.md,
  },
  switchAccountText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.primary,
  },
  loginBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Palette.primary,
    borderRadius: BorderRadius.md,
  },
  loginBtnText: {
    color: Palette.white,
    fontSize: 12,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: Spacing.three,
  },
  statCard: {
    flex: 1,
    backgroundColor: Palette.white,
    borderRadius: BorderRadius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    ...Shadows.sm,
  },
  statIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.gray900,
  },
  statLabel: {
    fontSize: 10.5,
    color: Palette.gray500,
    fontWeight: '600',
    marginTop: 2,
  },
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Palette.primaryDark,
    borderRadius: BorderRadius.lg,
    padding: 12,
    marginBottom: Spacing.three,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  activeBannerTextCol: {
    flex: 1,
  },
  activeBannerTitle: {
    color: Palette.white,
    fontSize: 13,
    fontWeight: '800',
  },
  activeBannerSub: {
    color: '#93C5FD',
    fontSize: 11,
    marginTop: 1,
  },
  menuCard: {
    backgroundColor: Palette.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Palette.gray200,
    marginBottom: Spacing.four,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.three,
  },
  menuTextBox: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.gray900,
  },
  menuSub: {
    fontSize: 11,
    color: Palette.gray500,
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: Palette.gray100,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: Palette.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Palette.dangerSoft,
    marginBottom: Spacing.four,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.danger,
  },
  versionInfo: {
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  versionText: {
    fontSize: 11,
    color: Palette.gray400,
    fontWeight: '600',
  },
  copyrightText: {
    fontSize: 10,
    color: Palette.gray400,
    marginTop: 2,
  },
});
