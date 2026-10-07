import React, { useState, useMemo, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Palette, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useMarketplace } from '../../context/MarketplaceContext';
import { Booking, BookingStatus } from '../../types';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';

const DECLINE_REASONS = [
  'Schedule conflict / Already booked',
  'Location is outside my service area',
  'Required tools / parts currently unavailable',
  'Emergency / Unable to take new jobs today',
  'Other reason',
];

export default function ProviderDashboardScreen() {
  const { user, logout } = useAuth();
  const {
    bookings,
    changeBookingStatus,
    respondToOrder,
    setProviderAvailability,
    refreshAll,
    unreadNotificationsCount,
  } = useMarketplace();

  const [refreshing, setRefreshing] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);

  // Decline Modal state
  const [declineBooking, setDeclineBooking] = useState<Booking | null>(null);
  const [selectedDeclineReason, setSelectedDeclineReason] = useState<string>(DECLINE_REASONS[0]);
  const [customDeclineNote, setCustomDeclineNote] = useState<string>('');
  const [isSubmittingDecline, setIsSubmittingDecline] = useState<boolean>(false);

  // Customer Chats Modal state
  const [chatsModalVisible, setChatsModalVisible] = useState<boolean>(false);

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

  // Provider bookings (assigned to this authenticated provider or demo prov-1)
  const providerBookings = useMemo(() => {
    if (!user) return [];
    return bookings.filter(
      (b) =>
        b.providerId === user.id ||
        (user.role === 'provider' && (b.providerId === 'prov-1' || user.id === 'prov-1')) ||
        (b.providerEmail && user.email && b.providerEmail.toLowerCase() === user.email.toLowerCase()) ||
        (b.providerName && user.name && b.providerName.toLowerCase() === user.name.toLowerCase()) ||
        user.role === 'provider'
    );
  }, [bookings, user]);

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
    return completedJobs.reduce((acc, curr) => acc + curr.totalPrice, 0) + (user?.earnings || 0);
  }, [completedJobs, user?.earnings]);

  // Customer Chats list (all customer bookings for this provider)
  const customerChatsList = useMemo(() => {
    return providerBookings.filter((b) => b.status !== 'cancelled');
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
          <View>
            <Text style={styles.portalTitle}>Provider Portal</Text>
            <Text style={styles.providerName}>{user?.name || 'David Miller'}</Text>
          </View>
        </View>

        <View style={styles.navRight}>
          {/* Customer Chats button with live count */}
          <TouchableOpacity
            style={styles.notifBtn}
            onPress={() => setChatsModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubbles-outline" size={20} color={Palette.primary} />
            {customerChatsList.length > 0 && (
              <View style={[styles.notifBadge, { backgroundColor: Palette.primary }]}>
                <Text style={styles.notifBadgeText}>
                  {customerChatsList.length > 9 ? '9+' : customerChatsList.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>

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

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
            activeOpacity={0.8}
            accessibilityLabel="Sign Out"
          >
            <Ionicons name="log-out-outline" size={16} color={Palette.danger} />
            <Text style={styles.logoutBtnText}>Logout</Text>
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
            onPress={() => setChatsModalVisible(true)}
            activeOpacity={0.8}
          >
            <View style={[styles.navCardIcon, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="chatbubbles" size={20} color={Palette.primary} />
            </View>
            <Text style={styles.navCardTitle}>Customer Chats</Text>
            <Text style={styles.navCardSub}>{customerChatsList.length} conversation{customerChatsList.length === 1 ? '' : 's'}</Text>
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

        {/* Incoming Requests Alert Banner */}
        {incomingRequests.length > 0 && (
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
                  style={{ flex: 1, borderColor: Palette.danger, marginLeft: 8 }}
                  textStyle={{ color: Palette.danger }}
                  size="sm"
                />
                <Button
                  title="Accept Booking"
                  onPress={() => handleAcceptBooking(b)}
                  style={{ flex: 1.5, marginLeft: 8 }}
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
          activeJobs.map((b) => (
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

                  {b.status === 'accepted' ? (
                    <>
                      <Button
                        title="Complete Order"
                        onPress={() => handleDirectCompleteOrder(b)}
                        style={{ flex: 1.2, marginLeft: 8, backgroundColor: Palette.accent }}
                        size="sm"
                      />
                      <Button
                        title="On The Way"
                        variant="outline"
                        onPress={() => handleAdvanceStatus(b)}
                        style={{ flex: 1, marginLeft: 6, borderColor: Palette.primary }}
                        textStyle={{ color: Palette.primary }}
                        size="sm"
                      />
                    </>
                  ) : b.status === 'on_the_way' ? (
                    <>
                      <Button
                        title="Complete Order"
                        onPress={() => handleDirectCompleteOrder(b)}
                        style={{ flex: 1.2, marginLeft: 8, backgroundColor: Palette.accent }}
                        size="sm"
                      />
                      <Button
                        title="Start Service"
                        onPress={() => handleAdvanceStatus(b)}
                        style={{ flex: 1, marginLeft: 6, backgroundColor: Palette.purple }}
                        size="sm"
                      />
                    </>
                  ) : (
                    <Button
                      title="⭐ Complete Job"
                      onPress={() => handleAdvanceStatus(b)}
                      style={{ flex: 1, marginLeft: 8, backgroundColor: Palette.accent }}
                      size="sm"
                    />
                  )}
                </View>
              </View>
            ))
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

      {/* Customer Chats Modal */}
      <Modal
        visible={chatsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setChatsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '82%' }]}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderLeft}>
                <Ionicons name="chatbubbles" size={22} color={Palette.primary} />
                <Text style={styles.modalTitle}>Customer Chats ({customerChatsList.length})</Text>
              </View>
              <TouchableOpacity
                onPress={() => setChatsModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color={Palette.gray500} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginVertical: 10 }}>
              {customerChatsList.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons name="chatbubbles-outline" size={36} color={Palette.gray400} />
                  <Text style={styles.emptyText}>No customer conversations yet</Text>
                </View>
              ) : (
                customerChatsList.map((chatBooking) => (
                  <TouchableOpacity
                    key={chatBooking.id}
                    style={styles.chatListItem}
                    onPress={() => {
                      setChatsModalVisible(false);
                      router.push({
                        pathname: '/chat/[id]',
                        params: { id: chatBooking.id },
                      });
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.chatListAvatar}>
                      <Ionicons name="person" size={18} color={Palette.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.chatListTopRow}>
                        <Text style={styles.chatListCustomer}>{chatBooking.customerName}</Text>
                        <Badge status={chatBooking.status} />
                      </View>
                      <Text style={styles.chatListService} numberOfLines={1}>
                        {chatBooking.serviceTitle}
                      </Text>
                      <Text style={styles.chatListDate}>
                        📅 {chatBooking.date} • {chatBooking.timeSlot}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={Palette.gray400} />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <Button
              title="Close"
              variant="outline"
              onPress={() => setChatsModalVisible(false)}
              size="sm"
            />
          </View>
        </View>
      </Modal>
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
    minWidth: 100,
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
});
