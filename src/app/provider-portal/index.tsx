import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Switch,
  Platform,
  Modal,
  TextInput,
  Image,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Palette, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useMarketplace } from '../../context/MarketplaceContext';
import { Booking, BookingStatus } from '../../types';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { LiveChatPopupWidget } from '../../components/chat/LiveChatPopupWidget';

const DECLINE_REASONS = [
  'Schedule conflict / Already booked',
  'Location is outside my service area',
  'Required tools / parts currently unavailable',
  'Emergency / Unable to take new jobs today',
  'Other reason',
];

export default function ProviderDashboardScreen() {
  const { user, logout, activeRole } = useAuth();
  const { width: screenWidth } = useWindowDimensions();
  const isNarrowScreen = screenWidth < 390;
  const isTinyScreen = screenWidth < 340;

  const {
    bookings,
    changeBookingStatus,
    respondToOrder,
    setProviderAvailability,
    refreshAll,
    notifications,
    markNotificationRead,
    unreadNotificationsCount,
  } = useMarketplace();

  const [refreshing, setRefreshing] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);

  // Job Filter state: 'all' | 'requests' | 'active' | 'completed'
  const [selectedJobFilter, setSelectedJobFilter] = useState<'all' | 'requests' | 'active' | 'completed'>('all');

  // Decline Modal state
  const [declineBooking, setDeclineBooking] = useState<Booking | null>(null);
  const [selectedDeclineReason, setSelectedDeclineReason] = useState<string>(DECLINE_REASONS[0]);
  const [customDeclineNote, setCustomDeclineNote] = useState<string>('');
  const [isSubmittingDecline, setIsSubmittingDecline] = useState<boolean>(false);

  // Customer Chats Modal state & persistent viewed timestamp
  const [chatsModalVisible, setChatsModalVisible] = useState<boolean>(false);
  const [lastSeenChatTime, setLastSeenChatTime] = useState<number>(0);

  useEffect(() => {
    AsyncStorage.getItem('@fixora_provider_chats_last_seen').then((val) => {
      if (val) {
        setLastSeenChatTime(parseInt(val, 10));
      }
    });
  }, []);

  // Compute unread chat messages/notifications
  const unreadChatCount = useMemo(() => {
    const chatNotifs = notifications.filter(
      (n) =>
        n.type === 'chat' &&
        !n.read &&
        (!lastSeenChatTime || new Date(n.createdAt).getTime() > lastSeenChatTime)
    );
    return chatNotifs.length;
  }, [notifications, lastSeenChatTime]);

  const handleOpenChatsModal = async () => {
    setChatsModalVisible(true);
    const now = Date.now();
    setLastSeenChatTime(now);
    try {
      await AsyncStorage.setItem('@fixora_provider_chats_last_seen', now.toString());
      const chatNotifs = notifications.filter((n) => n.type === 'chat' && !n.read);
      for (const cn of chatNotifs) {
        await markNotificationRead(cn.id);
      }
    } catch {
      // ignore
    }
  };

  // Auto-refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refreshAll();
    }, [refreshAll])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshAll(true);
    setRefreshing(false);
  };

  const handleToggleAvailability = async (value: boolean) => {
    setIsAvailable(value);
    await setProviderAvailability(value ? 'available' : 'busy');
  };

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      const confirmed =
        typeof window !== 'undefined'
          ? window.confirm('Are you sure you want to log out of Provider Portal?')
          : true;
      if (confirmed) {
        await logout();
        router.replace('/auth/login');
      }
      return;
    }

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

  // Provider bookings (assigned to this authenticated provider, demo prov-1, unassigned, or created on device)
  const providerBookings = useMemo(() => {
    const effectiveUserId = user?.id || (activeRole === 'provider' ? 'prov-1' : '');
    const isProvRole = activeRole === 'provider' || user?.role === 'provider';
    return bookings.filter(
      (b) =>
        (effectiveUserId && b.providerId === effectiveUserId) ||
        b.providerId === 'prov-1' ||
        !b.providerId ||
        effectiveUserId === 'prov-1' ||
        isProvRole
    );
  }, [bookings, user, activeRole]);

  const incomingRequests = useMemo(() => {
    return providerBookings.filter((b) => {
      const s = (b.status || '').toLowerCase().trim();
      const os = (b.orderStatus || '').toLowerCase().trim();
      const bs = (b.bookingStatus || '').toLowerCase().trim();
      return (
        s === 'pending' ||
        s === 'placed' ||
        os === 'placed' ||
        os === 'pending' ||
        os === 'pending provider acceptance' ||
        bs === 'pending' ||
        bs === 'placed'
      );
    });
  }, [providerBookings]);

  const activeJobs = useMemo(() => {
    return providerBookings.filter((b) => {
      const s = (b.status || '').toLowerCase().trim();
      return s === 'accepted' || s === 'on_the_way' || s === 'in_progress';
    });
  }, [providerBookings]);

  const completedJobs = useMemo(() => {
    return providerBookings.filter((b) => (b.status || '').toLowerCase().trim() === 'completed');
  }, [providerBookings]);

  const totalEarnings = useMemo(() => {
    return completedJobs.reduce((acc, curr) => acc + curr.totalPrice, 0) + (user?.earnings || 0);
  }, [completedJobs, user?.earnings]);

  // Customer Chats list (all customer bookings for this provider)
  const customerChatsList = useMemo(() => {
    return providerBookings.filter((b) => (b.status || '').toLowerCase().trim() !== 'cancelled');
  }, [providerBookings]);

  const handleDirectCompleteOrder = async (b: Booking) => {
    try {
      await changeBookingStatus(b.id, 'completed');
      if (Platform.OS === 'web') {
        alert(`Order for ${b.serviceTitle} has been marked as Completed! Customer can now rate and review.`);
      } else {
        Alert.alert(
          'Order Completed',
          `Order for ${b.serviceTitle} has been marked as Completed! Customer can now rate and review.`
        );
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to complete order');
    }
  };

  const handleAcceptBooking = async (b: Booking) => {
    try {
      await respondToOrder(b.id, 'accept');
      if (Platform.OS === 'web') {
        alert(`You accepted the booking for ${b.serviceTitle}! You can now chat directly with ${b.customerName}.`);
      } else {
        Alert.alert(
          'Booking Accepted',
          `You have accepted the order for ${b.serviceTitle}. You can now communicate directly with ${b.customerName} via chat.`
        );
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to accept booking');
    }
  };

  const handleOpenDeclineModal = (b: Booking) => {
    setDeclineBooking(b);
    setSelectedDeclineReason(DECLINE_REASONS[0]);
    setCustomDeclineNote('');
  };

  const handleConfirmDecline = async () => {
    if (!declineBooking) return;
    setIsSubmittingDecline(true);
    const reason =
      selectedDeclineReason === 'Other reason' && customDeclineNote.trim()
        ? customDeclineNote.trim()
        : selectedDeclineReason;

    try {
      await respondToOrder(declineBooking.id, 'reject', reason);
      setDeclineBooking(null);
      if (Platform.OS === 'web') {
        alert('Booking request has been declined.');
      } else {
        Alert.alert('Declined', 'The booking request has been declined.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to decline booking');
    } finally {
      setIsSubmittingDecline(false);
    }
  };

  const handleAdvanceStatus = async (b: Booking) => {
    let nextStatus: BookingStatus = 'completed';
    if (b.status === 'accepted') nextStatus = 'on_the_way';
    else if (b.status === 'on_the_way') nextStatus = 'in_progress';
    else if (b.status === 'in_progress') nextStatus = 'completed';

    await changeBookingStatus(b.id, nextStatus);
    const label = nextStatus.replace(/_/g, ' ').toUpperCase();
    if (Platform.OS === 'web') {
      alert(`Booking status moved to ${label}`);
    } else {
      Alert.alert('Status Updated', `Booking status moved to ${label}`);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Provider Header Bar */}
      <View style={styles.navBar}>
        <View style={styles.navLeft}>
          <View style={styles.providerBadgeBox}>
            <Ionicons name="construct" size={20} color={Palette.white} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.portalTitle} numberOfLines={1}>
              Provider Portal
            </Text>
            <Text style={styles.providerName} numberOfLines={1}>
              {user?.name || 'David Miller'}
            </Text>
          </View>
        </View>

        <View style={[styles.navRight, isNarrowScreen && { gap: 6 }]}>
          {/* Notification Bell with live unread badge */}
          <TouchableOpacity
            style={styles.notifBtn}
            onPress={() => router.push('/notifications')}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={20} color={Palette.gray700} />
            {unreadNotificationsCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={[styles.availabilityToggle, isNarrowScreen && { gap: 4 }]}>
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

          <TouchableOpacity
            style={[styles.logoutBtn, isNarrowScreen && styles.logoutBtnCompact]}
            onPress={handleLogout}
            activeOpacity={0.8}
            accessibilityLabel="Sign Out"
          >
            <Ionicons name="log-out-outline" size={16} color={Palette.danger} />
            {!isTinyScreen && <Text style={styles.logoutBtnText}>Logout</Text>}
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
            style={[styles.navCard, isNarrowScreen && styles.navCardNarrow]}
            onPress={() => router.push('/provider-portal/services')}
            activeOpacity={0.8}
          >
            <View style={[styles.navCardIcon, { backgroundColor: Palette.primarySoft }]}>
              <Ionicons name="construct" size={20} color={Palette.primary} />
            </View>
            <Text style={styles.navCardTitle} numberOfLines={1}>My Services</Text>
            <Text style={styles.navCardSub} numberOfLines={1}>Create & set prices</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navCard, isNarrowScreen && styles.navCardNarrow]}
            onPress={handleOpenChatsModal}
            activeOpacity={0.8}
          >
            <View style={[styles.navCardIcon, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="chatbubbles" size={20} color={Palette.primary} />
            </View>
            <Text style={styles.navCardTitle} numberOfLines={1}>Customer Chats</Text>
            <Text style={styles.navCardSub} numberOfLines={1}>
              {customerChatsList.length} conversation{customerChatsList.length === 1 ? '' : 's'}
              {unreadChatCount > 0 ? ` (${unreadChatCount} new)` : ''}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navCard, isNarrowScreen && styles.navCardNarrow]}
            onPress={() => router.push('/provider-portal/earnings')}
            activeOpacity={0.8}
          >
            <View style={[styles.navCardIcon, { backgroundColor: Palette.accentSoft }]}>
              <Ionicons name="wallet" size={20} color={Palette.accent} />
            </View>
            <Text style={styles.navCardTitle} numberOfLines={1}>View Earnings</Text>
            <Text style={styles.navCardSub} numberOfLines={1}>${totalEarnings} total</Text>
          </TouchableOpacity>
        </View>

        {/* KPI Metrics Grid */}
        <View style={styles.metricsGrid}>
          <TouchableOpacity
            style={[
              styles.metricCard,
              isNarrowScreen && styles.metricCardNarrow,
              selectedJobFilter === 'requests' && styles.metricCardActive,
            ]}
            onPress={() => setSelectedJobFilter((prev) => (prev === 'requests' ? 'all' : 'requests'))}
            activeOpacity={0.8}
          >
            <View style={styles.metricIconHeader}>
              <Ionicons name="mail-unread-outline" size={18} color={Palette.warning} />
            </View>
            <Text style={styles.metricNumber}>{incomingRequests.length}</Text>
            <Text style={styles.metricLabel} numberOfLines={1}>New Requests</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.metricCard,
              isNarrowScreen && styles.metricCardNarrow,
              selectedJobFilter === 'active' && styles.metricCardActive,
            ]}
            onPress={() => setSelectedJobFilter((prev) => (prev === 'active' ? 'all' : 'active'))}
            activeOpacity={0.8}
          >
            <View style={styles.metricIconHeader}>
              <Ionicons name="construct-outline" size={18} color={Palette.primary} />
            </View>
            <Text style={styles.metricNumber}>{activeJobs.length}</Text>
            <Text style={styles.metricLabel} numberOfLines={1}>Active Jobs</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.metricCard,
              isNarrowScreen && styles.metricCardNarrow,
              styles.completedMetricCard,
              selectedJobFilter === 'completed' && styles.completedMetricCardActive,
            ]}
            onPress={() => setSelectedJobFilter((prev) => (prev === 'completed' ? 'all' : 'completed'))}
            activeOpacity={0.8}
          >
            <View style={styles.metricIconHeader}>
              <Ionicons name="checkmark-done-circle" size={20} color="#059669" />
            </View>
            <Text style={[styles.metricNumber, { color: '#059669' }]}>{completedJobs.length}</Text>
            <Text style={[styles.metricLabel, { color: '#047857', fontWeight: '700' }]} numberOfLines={1}>Completed</Text>
          </TouchableOpacity>

          <View style={[styles.metricCard, isNarrowScreen && styles.metricCardNarrow]}>
            <View style={styles.metricIconHeader}>
              <Ionicons name="star" size={18} color={Palette.star} />
            </View>
            <Text style={[styles.metricNumber, { color: Palette.star }]}>4.9 ★</Text>
            <Text style={styles.metricLabel} numberOfLines={1}>Rating</Text>
          </View>
        </View>

        {/* Filter Navigation Pills */}
        <View style={styles.filterPillsRow}>
          <TouchableOpacity
            style={[styles.filterPill, selectedJobFilter === 'all' && styles.filterPillActive]}
            onPress={() => setSelectedJobFilter('all')}
            activeOpacity={0.75}
          >
            <Text style={[styles.filterPillText, selectedJobFilter === 'all' && styles.filterPillTextActive]}>
              All ({providerBookings.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, selectedJobFilter === 'requests' && styles.filterPillActive]}
            onPress={() => setSelectedJobFilter('requests')}
            activeOpacity={0.75}
          >
            <Text style={[styles.filterPillText, selectedJobFilter === 'requests' && styles.filterPillTextActive]}>
              Requests ({incomingRequests.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, selectedJobFilter === 'active' && styles.filterPillActive]}
            onPress={() => setSelectedJobFilter('active')}
            activeOpacity={0.75}
          >
            <Text style={[styles.filterPillText, selectedJobFilter === 'active' && styles.filterPillTextActive]}>
              Active ({activeJobs.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterPill,
              styles.completedFilterPill,
              selectedJobFilter === 'completed' && styles.completedFilterPillActive,
            ]}
            onPress={() => setSelectedJobFilter('completed')}
            activeOpacity={0.75}
          >
            <Ionicons
              name="checkmark-done-circle"
              size={15}
              color={selectedJobFilter === 'completed' ? Palette.white : '#059669'}
            />
            <Text
              style={[
                styles.filterPillText,
                { color: selectedJobFilter === 'completed' ? Palette.white : '#059669', fontWeight: '700' },
              ]}
            >
              Completed ({completedJobs.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Incoming Requests Alert Banner */}
        {incomingRequests.length > 0 && selectedJobFilter !== 'completed' && (
          <View style={styles.alertBanner}>
            <Ionicons name="notifications" size={20} color="#B45309" />
            <View style={{ flex: 1 }}>
              <Text style={styles.alertBannerTitle}>
                Action Required: {incomingRequests.length} New Booking {incomingRequests.length === 1 ? 'Request' : 'Requests'}
              </Text>
              <Text style={styles.alertBannerSub}>
                Review details below to accept or decline before the requested time.
              </Text>
            </View>
          </View>
        )}

        {/* ===================== SECTION 1: INCOMING REQUESTS ===================== */}
        {(selectedJobFilter === 'all' || selectedJobFilter === 'requests') && (
          <View style={{ marginBottom: 12 }}>
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
                  <TouchableOpacity
                    style={styles.requestTop}
                    onPress={() =>
                      router.push({
                        pathname: '/booking/[id]',
                        params: { id: b.id },
                      })
                    }
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.serviceName}>{b.serviceTitle}</Text>
                      <Text style={styles.customerName}>Customer: {b.customerName}</Text>
                      <Text style={styles.bookingSchedule}>
                        📅 {b.date} • {b.timeSlot}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                      <Text style={styles.requestPrice}>${b.totalPrice}</Text>
                      <Text style={{ fontSize: 11, color: Palette.primary, fontWeight: '600', marginTop: 2 }}>
                        View Details ›
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <View style={styles.addressBox}>
                    <Ionicons name="location-outline" size={14} color={Palette.gray500} />
                    <Text style={styles.addressText} numberOfLines={1}>
                      {b.address?.street || 'Standard Address'}, {b.address?.city || ''}
                    </Text>
                  </View>

                  {b.notes ? <Text style={styles.notesText}>Notes: &ldquo;{b.notes}&rdquo;</Text> : null}

                  <View style={styles.requestActions}>
                    <TouchableOpacity
                      style={styles.chatCustomerBtn}
                      onPress={() =>
                        router.push({
                          pathname: '/chat/[id]',
                          params: { id: b.id },
                        })
                      }
                    >
                      <Ionicons name="chatbubbles" size={15} color={Palette.primary} />
                      <Text style={styles.chatCustomerText}>Chat</Text>
                    </TouchableOpacity>

                    <Button
                      title="Decline"
                      variant="outline"
                      onPress={() => handleOpenDeclineModal(b)}
                      style={styles.actionBtnSecondary}
                      textStyle={{ color: Palette.danger }}
                      size="sm"
                    />
                    <Button
                      title="Accept Booking"
                      onPress={() => handleAcceptBooking(b)}
                      style={styles.actionBtnPrimary}
                      size="sm"
                    />
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ===================== SECTION 2: ACTIVE JOBS ===================== */}
        {(selectedJobFilter === 'all' || selectedJobFilter === 'active') && (
          <View style={{ marginBottom: 12 }}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Jobs ({activeJobs.length})</Text>
            </View>

            {activeJobs.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="briefcase-outline" size={32} color={Palette.gray400} />
                <Text style={styles.emptyText}>No active jobs in progress</Text>
              </View>
            ) : (
              activeJobs.map((b) => (
                <View key={b.id} style={styles.activeJobCard}>
                  <TouchableOpacity
                    style={styles.jobTopRow}
                    onPress={() =>
                      router.push({
                        pathname: '/booking/[id]',
                        params: { id: b.id },
                      })
                    }
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.serviceName}>{b.serviceTitle}</Text>
                      <Text style={styles.customerName}>For: {b.customerName}</Text>
                      <Text style={styles.scheduleText}>
                        {b.date} • {b.timeSlot}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Badge status={b.status} />
                      <Text style={{ fontSize: 11, color: Palette.primary, fontWeight: '600' }}>
                        Details ›
                      </Text>
                    </View>
                  </TouchableOpacity>

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

                    {b.status === 'accepted' ? (
                      <>
                        <Button
                          title="Complete Order"
                          onPress={() => handleDirectCompleteOrder(b)}
                          style={[styles.actionBtnFlex, { backgroundColor: Palette.accent }]}
                          size="sm"
                        />
                        <Button
                          title="On The Way"
                          variant="outline"
                          onPress={() => handleAdvanceStatus(b)}
                          style={[styles.actionBtnFlex, { borderColor: Palette.primary }]}
                          textStyle={{ color: Palette.primary }}
                          size="sm"
                        />
                      </>
                    ) : b.status === 'on_the_way' ? (
                      <>
                        <Button
                          title="Complete Order"
                          onPress={() => handleDirectCompleteOrder(b)}
                          style={[styles.actionBtnFlex, { backgroundColor: Palette.accent }]}
                          size="sm"
                        />
                        <Button
                          title="Start Service"
                          onPress={() => handleAdvanceStatus(b)}
                          style={[styles.actionBtnFlex, { backgroundColor: Palette.purple }]}
                          size="sm"
                        />
                      </>
                    ) : (
                      <Button
                        title="⭐ Complete Job"
                        onPress={() => handleAdvanceStatus(b)}
                        style={[styles.actionBtnFlex, { backgroundColor: Palette.accent }]}
                        size="sm"
                      />
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ===================== SECTION 3: COMPLETED ORDERS ===================== */}
        {(selectedJobFilter === 'all' || selectedJobFilter === 'completed') && (
          <View style={{ marginBottom: 16 }}>
            <View style={styles.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="checkmark-done-circle" size={20} color="#059669" />
                <Text style={styles.sectionTitle}>Completed Orders ({completedJobs.length})</Text>
              </View>
            </View>

            {completedJobs.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="checkmark-done-circle-outline" size={36} color={Palette.gray400} />
                <Text style={styles.emptyText}>No completed jobs yet</Text>
                <Text style={{ fontSize: 12, color: Palette.gray500, marginTop: 4, textAlign: 'center' }}>
                  Orders you accept and finish will be permanently logged here.
                </Text>
              </View>
            ) : (
              completedJobs.map((b) => (
                <View key={b.id} style={styles.completedJobCard}>
                  <View style={styles.jobTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.serviceName}>{b.serviceTitle}</Text>
                      <Text style={styles.customerName}>Customer: {b.customerName}</Text>
                      <Text style={styles.scheduleText}>
                        Completed on {b.date} • {b.timeSlot}
                      </Text>
                    </View>
                    <View style={styles.completedBadgeContainer}>
                      <View style={styles.completedStatusBadge}>
                        <Ionicons name="checkmark-circle" size={13} color="#047857" />
                        <Text style={styles.completedStatusText}>COMPLETED</Text>
                      </View>
                      <Text style={styles.completedPriceText}>+${b.totalPrice}</Text>
                    </View>
                  </View>

                  <View style={styles.addressBox}>
                    <Ionicons name="location-outline" size={14} color={Palette.gray500} />
                    <Text style={styles.addressText} numberOfLines={1}>
                      {b.address?.street || 'Standard Address'}, {b.address?.city || ''}
                    </Text>
                  </View>

                  <View style={styles.completedActionsRow}>
                    <TouchableOpacity
                      style={styles.chatCustomerBtn}
                      onPress={() =>
                        router.push({
                          pathname: '/chat/[id]',
                          params: { id: b.id },
                        })
                      }
                    >
                      <Ionicons name="chatbubbles" size={15} color={Palette.primary} />
                      <Text style={styles.chatCustomerText}>Chat with Customer</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.viewOrderSummaryBtn}
                      onPress={() =>
                        router.push({
                          pathname: '/booking/[id]',
                          params: { id: b.id },
                        })
                      }
                    >
                      <Ionicons name="document-text-outline" size={15} color={Palette.gray700} />
                      <Text style={styles.viewOrderSummaryText}>Order Summary</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Provider Profile Summary & Sign Out Section */}
        <View style={styles.providerAccountCard}>
          <View style={styles.providerAccountTop}>
            <View style={styles.providerAvatarBox}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.providerAvatar} />
              ) : (
                <Ionicons name="person" size={24} color={Palette.gray600} />
              )}
            </View>
            <View style={styles.providerAccountDetails}>
              <Text style={styles.providerAccountName}>{user?.name || 'David Miller'}</Text>
              <Text style={styles.providerAccountEmail}>{user?.email || 'provider@fixora.com'}</Text>
              <View style={styles.providerAccountRoleBadge}>
                <Ionicons name="shield-checkmark" size={12} color={Palette.purple} />
                <Text style={styles.providerAccountRoleText}>Verified Provider Portal</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.fullLogoutBtn}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={18} color={Palette.danger} />
            <Text style={styles.fullLogoutText}>Sign Out / Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Decline Booking Reason Modal */}
      <Modal
        visible={!!declineBooking}
        transparent
        animationType="fade"
        onRequestClose={() => setDeclineBooking(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderLeft}>
                <Ionicons name="close-circle-outline" size={22} color={Palette.danger} />
                <Text style={styles.modalTitle}>Decline Booking Request</Text>
              </View>
              <TouchableOpacity onPress={() => setDeclineBooking(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={20} color={Palette.gray500} />
              </TouchableOpacity>
            </View>

            {declineBooking && (
              <View style={styles.modalBookingSnippet}>
                <Text style={styles.snippetService}>{declineBooking.serviceTitle}</Text>
                <Text style={styles.snippetCustomer}>
                  Customer: {declineBooking.customerName} • ${declineBooking.totalPrice}
                </Text>
                <Text style={styles.snippetDate}>
                  📅 {declineBooking.date} • {declineBooking.timeSlot}
                </Text>
              </View>
            )}

            <Text style={styles.modalSubtitle}>Please select a reason for declining:</Text>

            <View style={styles.reasonsList}>
              {DECLINE_REASONS.map((reason) => {
                const isSelected = selectedDeclineReason === reason;
                return (
                  <TouchableOpacity
                    key={reason}
                    style={[styles.reasonOption, isSelected && styles.reasonOptionSelected]}
                    onPress={() => setSelectedDeclineReason(reason)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                      size={16}
                      color={isSelected ? Palette.danger : Palette.gray400}
                    />
                    <Text style={[styles.reasonOptionText, isSelected && styles.reasonOptionTextSelected]}>
                      {reason}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {selectedDeclineReason === 'Other reason' && (
              <TextInput
                style={styles.customReasonInput}
                placeholder="Explain reason for customer..."
                placeholderTextColor={Palette.gray400}
                value={customDeclineNote}
                onChangeText={setCustomDeclineNote}
                multiline
                numberOfLines={2}
              />
            )}

            <View style={styles.modalActionsRow}>
              <Button
                title="Keep Request"
                variant="outline"
                onPress={() => setDeclineBooking(null)}
                style={{ flex: 1, marginRight: 8 }}
                size="sm"
              />
              <Button
                title={isSubmittingDecline ? 'Declining...' : 'Confirm Decline'}
                onPress={handleConfirmDecline}
                disabled={isSubmittingDecline}
                style={{ flex: 1.2, backgroundColor: Palette.danger }}
                size="sm"
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Live Chat & Support Popup Widget (matching exact screenshot design) */}
      <LiveChatPopupWidget
        isOpen={chatsModalVisible}
        onToggle={() => {
          if (chatsModalVisible) {
            setChatsModalVisible(false);
          } else {
            handleOpenChatsModal();
          }
        }}
        customerChatsList={customerChatsList}
        unreadCount={unreadChatCount}
        currentUserId={user?.id || 'prov-1'}
        currentUserName={user?.name || 'Service Provider'}
      />
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: BorderRadius.md,
  },
  logoutBtnCompact: {
    paddingHorizontal: 6,
    paddingVertical: 5,
    gap: 2,
  },
  logoutBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.danger,
  },
  providerAccountCard: {
    backgroundColor: Palette.white,
    padding: Spacing.four,
    borderRadius: BorderRadius.xl,
    marginTop: Spacing.four,
    marginBottom: Spacing.six,
    borderWidth: 1,
    borderColor: Palette.gray200,
    ...Shadows.sm,
  },
  providerAccountTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  providerAvatarBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Palette.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.three,
    overflow: 'hidden',
  },
  providerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  providerAccountDetails: {
    flex: 1,
  },
  providerAccountName: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.gray900,
  },
  providerAccountEmail: {
    fontSize: 13,
    color: Palette.gray500,
    marginTop: 2,
  },
  providerAccountRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  providerAccountRoleText: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.purple,
  },
  fullLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: Spacing.three,
    borderRadius: BorderRadius.lg,
  },
  fullLogoutText: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.danger,
  },
  navRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginVertical: Spacing.two,
  },
  navCard: {
    flex: 1,
    minWidth: 95,
    backgroundColor: Palette.white,
    padding: Spacing.three,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Palette.gray200,
    ...Shadows.sm,
  },
  navCardNarrow: {
    minWidth: '47%',
    flexBasis: '47%',
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
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: Spacing.three,
  },
  metricCard: {
    flex: 1,
    minWidth: 70,
    backgroundColor: Palette.white,
    padding: 10,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Palette.gray200,
    ...Shadows.sm,
  },
  metricCardNarrow: {
    flexBasis: '47%',
    flexGrow: 1,
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
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
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
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  actionBtnFlex: {
    flex: 1,
    minWidth: 105,
  },
  actionBtnSecondary: {
    flex: 1,
    minWidth: 80,
    borderColor: Palette.danger,
  },
  actionBtnPrimary: {
    flex: 1.3,
    minWidth: 115,
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
  notifBtn: {
    padding: 6,
    position: 'relative',
    marginRight: 4,
  },
  notifBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: Palette.danger,
    borderRadius: BorderRadius.full,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notifBadgeText: {
    color: Palette.white,
    fontSize: 9,
    fontWeight: '800',
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: BorderRadius.lg,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
  alertBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
  },
  alertBannerSub: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: Palette.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.four,
    ...Shadows.lg,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.gray900,
  },
  modalBookingSnippet: {
    backgroundColor: Palette.gray50,
    padding: Spacing.three,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: Palette.danger,
    marginBottom: Spacing.three,
  },
  snippetService: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.gray900,
  },
  snippetCustomer: {
    fontSize: 12,
    color: Palette.gray600,
    marginTop: 2,
  },
  snippetDate: {
    fontSize: 11,
    color: Palette.primary,
    marginTop: 2,
    fontWeight: '600',
  },
  modalSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.gray700,
    marginBottom: Spacing.two,
  },
  reasonsList: {
    gap: 6,
    marginBottom: Spacing.three,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.md,
    backgroundColor: Palette.gray50,
    borderWidth: 1,
    borderColor: Palette.gray200,
  },
  reasonOptionSelected: {
    borderColor: Palette.danger,
    backgroundColor: '#FEF2F2',
  },
  reasonOptionText: {
    fontSize: 12,
    color: Palette.gray700,
  },
  reasonOptionTextSelected: {
    color: Palette.danger,
    fontWeight: '600',
  },
  customReasonInput: {
    borderWidth: 1,
    borderColor: Palette.gray300,
    borderRadius: BorderRadius.md,
    padding: 10,
    fontSize: 12,
    color: Palette.gray800,
    marginBottom: Spacing.three,
    backgroundColor: Palette.white,
  },
  modalActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  chatListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: Palette.gray50,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Palette.gray200,
    marginBottom: 8,
    gap: 10,
  },
  chatListAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatListTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  chatListCustomer: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.gray900,
  },
  chatListService: {
    fontSize: 12,
    color: Palette.gray600,
    marginBottom: 2,
  },
  chatListDate: {
    fontSize: 10,
    color: Palette.gray500,
  },
  metricCardActive: {
    borderColor: Palette.primary,
    backgroundColor: '#EFF6FF',
  },
  completedMetricCard: {
    borderColor: '#A7F3D0',
    backgroundColor: '#F0FDF4',
  },
  completedMetricCardActive: {
    borderColor: '#059669',
    backgroundColor: '#DCFCE7',
  },
  metricIconHeader: {
    marginBottom: 4,
  },
  filterPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: Spacing.two,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Palette.white,
    borderWidth: 1,
    borderColor: Palette.gray200,
  },
  filterPillActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.gray700,
  },
  filterPillTextActive: {
    color: Palette.white,
  },
  completedFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderColor: '#A7F3D0',
    backgroundColor: '#F0FDF4',
  },
  completedFilterPillActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  completedJobCard: {
    backgroundColor: Palette.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: Spacing.two,
    ...Shadows.sm,
  },
  completedBadgeContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  completedStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DEF7EC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  completedStatusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#03543F',
  },
  completedPriceText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#047857',
  },
  completedActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  viewOrderSummaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Palette.gray100,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Palette.gray200,
  },
  viewOrderSummaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.gray700,
  },
  chatFab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.lg,
    elevation: 8,
    zIndex: 999,
  },
  fabBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: Palette.danger,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Palette.white,
  },
  fabBadgeText: {
    color: Palette.white,
    fontSize: 10,
    fontWeight: '800',
  },
});
