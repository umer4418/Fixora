import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Palette, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useMarketplace } from '../../context/MarketplaceContext';
import { Booking, BookingStatus } from '../../types';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';

export default function ProviderDashboardScreen() {
  const { user, logout } = useAuth();
  const { bookings, changeBookingStatus, setProviderAvailability, refreshAll } = useMarketplace();

  const [refreshing, setRefreshing] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  };

  const handleToggleAvailability = async (value: boolean) => {
    setIsAvailable(value);
    await setProviderAvailability(value ? 'available' : 'busy');
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out of Provider Portal?', [
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

  // Provider bookings (assigned to this provider or all for demo David Miller)
  const providerBookings = useMemo(() => {
    const providerId = user?.id === 'prov-1' || user?.role === 'provider' ? user.id : 'prov-1';
    return bookings.filter((b) => b.providerId === providerId || b.providerId === 'prov-1');
  }, [bookings, user?.id, user?.role]);

  const incomingRequests = useMemo(() => {
    return providerBookings.filter((b) => b.status === 'pending');
  }, [providerBookings]);

  const activeJobs = useMemo(() => {
    return providerBookings.filter(
      (b) => b.status === 'accepted' || b.status === 'on_the_way' || b.status === 'in_progress'
    );
  }, [providerBookings]);

  const completedJobs = useMemo(() => {
    return providerBookings.filter((b) => b.status === 'completed');
  }, [providerBookings]);

  const totalEarnings = useMemo(() => {
    return completedJobs.reduce((acc, curr) => acc + curr.totalPrice, 0) + (user?.earnings || 3420);
  }, [completedJobs, user?.earnings]);

  const handleAcceptBooking = async (b: Booking) => {
    await changeBookingStatus(b.id, 'accepted');
    Alert.alert('Booking Accepted', `You have accepted the booking for ${b.serviceTitle}.`);
  };

  const handleRejectBooking = async (b: Booking) => {
    Alert.alert('Decline Booking', 'Are you sure you want to decline this request?', [
      { text: 'Back', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: async () => {
          await changeBookingStatus(b.id, 'cancelled', 'Declined by provider');
        },
      },
    ]);
  };

  const handleAdvanceStatus = async (b: Booking) => {
    let nextStatus: BookingStatus = 'completed';
    if (b.status === 'accepted') nextStatus = 'on_the_way';
    else if (b.status === 'on_the_way') nextStatus = 'in_progress';
    else if (b.status === 'in_progress') nextStatus = 'completed';

    await changeBookingStatus(b.id, nextStatus);
    Alert.alert('Status Updated', `Booking status moved to ${nextStatus.replace(/_/g, ' ').toUpperCase()}`);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Provider Header Bar */}
      <View style={styles.navBar}>
        <View style={styles.navLeft}>
          <View style={styles.providerBadgeBox}>
            <Ionicons name="construct" size={20} color={Palette.white} />
          </View>
          <View>
            <Text style={styles.portalTitle}>Provider Portal</Text>
            <Text style={styles.providerName}>{user?.name || 'David Miller'}</Text>
          </View>
        </View>

        <View style={styles.navRight}>
          <View style={styles.availabilityToggle}>
            <Text style={[styles.availabilityText, { color: isAvailable ? Palette.accent : Palette.gray400 }]}>
              {isAvailable ? 'Online' : 'Busy'}
            </Text>
            <Switch
              value={isAvailable}
              onValueChange={handleToggleAvailability}
              trackColor={{ false: Palette.gray300, true: Palette.accentSoft }}
              thumbColor={isAvailable ? Palette.accent : Palette.gray400}
            />
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={18} color={Palette.danger} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Quick Navigation Cards */}
        <View style={styles.navRow}>
          <TouchableOpacity
            style={styles.navCard}
            onPress={() => router.push('/provider-portal/services')}
            activeOpacity={0.8}
          >
            <View style={[styles.navCardIcon, { backgroundColor: Palette.primarySoft }]}>
              <Ionicons name="construct" size={20} color={Palette.primary} />
            </View>
            <Text style={styles.navCardTitle}>My Services</Text>
            <Text style={styles.navCardSub}>Create & set prices</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navCard}
            onPress={() => router.push('/provider-portal/earnings')}
            activeOpacity={0.8}
          >
            <View style={[styles.navCardIcon, { backgroundColor: Palette.accentSoft }]}>
              <Ionicons name="wallet" size={20} color={Palette.accent} />
            </View>
            <Text style={styles.navCardTitle}>View Earnings</Text>
            <Text style={styles.navCardSub}>${totalEarnings} total</Text>
          </TouchableOpacity>
        </View>

        {/* KPI Metrics Grid */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricNumber}>{incomingRequests.length}</Text>
            <Text style={styles.metricLabel}>New Requests</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricNumber}>{activeJobs.length}</Text>
            <Text style={styles.metricLabel}>Active Jobs</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricNumber}>{completedJobs.length}</Text>
            <Text style={styles.metricLabel}>Completed</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={[styles.metricNumber, { color: Palette.star }]}>4.9 ★</Text>
            <Text style={styles.metricLabel}>Rating</Text>
          </View>
        </View>

        {/* Incoming Booking Requests */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Incoming Booking Requests ({incomingRequests.length})</Text>
        </View>

        {incomingRequests.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="mail-open-outline" size={32} color={Palette.gray400} />
            <Text style={styles.emptyText}>No pending requests right now</Text>
          </View>
        ) : (
          incomingRequests.map((b) => (
            <View key={b.id} style={styles.requestCard}>
              <View style={styles.requestTop}>
                <View>
                  <Text style={styles.serviceName}>{b.serviceTitle}</Text>
                  <Text style={styles.customerName}>Customer: {b.customerName}</Text>
                  <Text style={styles.bookingSchedule}>
                    📅 {b.date} • {b.timeSlot}
                  </Text>
                </View>
                <Text style={styles.requestPrice}>${b.totalPrice}</Text>
              </View>

              <View style={styles.addressBox}>
                <Ionicons name="location-outline" size={14} color={Palette.gray500} />
                <Text style={styles.addressText} numberOfLines={1}>
                  {b.address.street}, {b.address.city}
                </Text>
              </View>

              {b.notes ? <Text style={styles.notesText}>Notes: &ldquo;{b.notes}&rdquo;</Text> : null}

              <View style={styles.requestActions}>
                <Button
                  title="Decline"
                  variant="outline"
                  onPress={() => handleRejectBooking(b)}
                  style={{ flex: 1, borderColor: Palette.danger }}
                  textStyle={{ color: Palette.danger }}
                  size="sm"
                />
                <Button
                  title="Accept Booking"
                  onPress={() => handleAcceptBooking(b)}
                  style={{ flex: 2, marginLeft: 8 }}
                  size="sm"
                />
              </View>
            </View>
          ))
        )}

        {/* Active Jobs & Live Status Updater */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Jobs ({activeJobs.length})</Text>
        </View>

        {activeJobs.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="briefcase-outline" size={32} color={Palette.gray400} />
            <Text style={styles.emptyText}>No active jobs in progress</Text>
          </View>
        ) : (
          activeJobs.map((b) => {
            const nextButtonLabel =
              b.status === 'accepted'
                ? '🚗 Mark On The Way'
                : b.status === 'on_the_way'
                ? '🧰 Start Service'
                : '⭐ Complete Job';

            return (
              <View key={b.id} style={styles.activeJobCard}>
                <View style={styles.jobTopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.serviceName}>{b.serviceTitle}</Text>
                    <Text style={styles.customerName}>For: {b.customerName}</Text>
                    <Text style={styles.scheduleText}>
                      {b.date} • {b.timeSlot}
                    </Text>
                  </View>
                  <Badge status={b.status} />
                </View>

                <View style={styles.jobActionsRow}>
                  <TouchableOpacity
                    style={styles.chatCustomerBtn}
                    onPress={() =>
                      router.push({
                        pathname: '/chat/[id]',
                        params: { id: b.id },
                      })
                    }
                  >
                    <Ionicons name="chatbubbles" size={16} color={Palette.primary} />
                    <Text style={styles.chatCustomerText}>Chat</Text>
                  </TouchableOpacity>

                  <Button
                    title={nextButtonLabel}
                    onPress={() => handleAdvanceStatus(b)}
                    style={{ flex: 1, marginLeft: 8 }}
                    size="sm"
                  />
                </View>
              </View>
            );
          })
        )}
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
  scrollContent: {
    padding: Spacing.four,
    paddingBottom: Spacing.six,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    backgroundColor: Palette.white,
    borderBottomWidth: 1,
    borderBottomColor: Palette.gray200,
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  providerBadgeBox: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: Palette.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.purple,
  },
  providerName: {
    fontSize: 12,
    color: Palette.gray600,
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  availabilityToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  availabilityText: {
    fontSize: 12,
    fontWeight: '700',
  },
  logoutBtn: {
    padding: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: BorderRadius.sm,
  },
  navRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: Spacing.two,
  },
  navCard: {
    flex: 1,
    backgroundColor: Palette.white,
    padding: Spacing.three,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Palette.gray200,
    ...Shadows.sm,
  },
  navCardIcon: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  navCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.gray900,
  },
  navCardSub: {
    fontSize: 11,
    color: Palette.gray500,
    marginTop: 2,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: Spacing.three,
  },
  metricCard: {
    flex: 1,
    backgroundColor: Palette.white,
    padding: 10,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Palette.gray200,
    ...Shadows.sm,
  },
  metricNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.gray900,
  },
  metricLabel: {
    fontSize: 10,
    color: Palette.gray500,
    marginTop: 2,
    textAlign: 'center',
  },
  sectionHeader: {
    marginTop: Spacing.three,
    marginBottom: Spacing.two,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.gray900,
  },
  emptyBox: {
    backgroundColor: Palette.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.four,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Palette.gray200,
  },
  emptyText: {
    fontSize: 13,
    color: Palette.gray500,
    marginTop: 6,
  },
  requestCard: {
    backgroundColor: Palette.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: Palette.gray200,
    marginBottom: Spacing.two,
    ...Shadows.sm,
  },
  requestTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.gray900,
  },
  customerName: {
    fontSize: 12,
    color: Palette.gray600,
    marginTop: 2,
  },
  bookingSchedule: {
    fontSize: 11,
    color: Palette.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  requestPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.gray900,
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginVertical: 4,
  },
  addressText: {
    fontSize: 12,
    color: Palette.gray600,
    flex: 1,
  },
  notesText: {
    fontSize: 11,
    color: Palette.gray500,
    fontStyle: 'italic',
    marginVertical: 4,
  },
  requestActions: {
    flexDirection: 'row',
    marginTop: 8,
  },
  activeJobCard: {
    backgroundColor: Palette.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: Palette.gray200,
    marginBottom: Spacing.two,
    ...Shadows.sm,
  },
  jobTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  scheduleText: {
    fontSize: 11,
    color: Palette.gray500,
    marginTop: 2,
  },
  jobActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatCustomerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Palette.primarySoft,
    borderRadius: BorderRadius.md,
  },
  chatCustomerText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.primary,
  },
});
