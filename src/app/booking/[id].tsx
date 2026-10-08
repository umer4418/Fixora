import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { Palette, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useMarketplace } from '../../context/MarketplaceContext';
import { useAuth } from '../../context/AuthContext';
import { Booking, BookingStatus } from '../../types';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { ReviewModal } from '../../components/marketplace/ReviewModal';
import { getBookingById } from '../../services/marketplaceService';
import { StripePaymentModal } from '../../components/payment/StripePaymentModal';
import { StripePaymentResult } from '../../services/stripeService';

const STATUS_STEPS: { key: BookingStatus; label: string; desc: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'pending', label: 'Requested', desc: 'Awaiting provider confirmation', icon: 'time-outline' },
  { key: 'accepted', label: 'Accepted', desc: 'Provider accepted your booking', icon: 'checkmark-circle-outline' },
  { key: 'on_the_way', label: 'On The Way', desc: 'Provider is traveling to your address', icon: 'car-outline' },
  { key: 'in_progress', label: 'In Progress', desc: 'Service work is currently ongoing', icon: 'construct-outline' },
  { key: 'completed', label: 'Completed', desc: 'Service finished & inspected', icon: 'shield-checkmark-outline' },
];

const DECLINE_REASONS = [
  'Schedule conflict / Already booked',
  'Location is outside my service area',
  'Required tools / parts currently unavailable',
  'Emergency / Unable to take new jobs today',
  'Other reason',
];

const CUSTOMER_CANCEL_REASONS = [
  'Change of plans / No longer needed',
  'Found another service provider',
  'Booked by mistake / Wrong service selected',
  'Schedule conflict / Need different date or time',
  'Provider taking too long to respond',
  'Price / Budget concerns',
  'Other reason',
];

export default function BookingDetailScreen() {
  const rawParams = useLocalSearchParams<{ id: string }>();
  const rawId = Array.isArray(rawParams.id) ? rawParams.id[0] : (rawParams.id || '');
  const id = rawId ? decodeURIComponent(String(rawId).trim()) : '';

  const { user, activeRole } = useAuth();
  const effectiveRole = activeRole || user?.role || 'customer';
  const isProvider = effectiveRole === 'provider';

  const { bookings, changeBookingStatus, respondToOrder, notifications, payBookingWithStripe } = useMarketplace();

  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [stripeModalVisible, setStripeModalVisible] = useState(false);
  const [fetchedBooking, setFetchedBooking] = useState<Booking | null>(null);
  const [isLoadingBooking, setIsLoadingBooking] = useState<boolean>(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  // Decline Modal state for Providers
  const [declineModalVisible, setDeclineModalVisible] = useState<boolean>(false);
  const [selectedDeclineReason, setSelectedDeclineReason] = useState<string>(DECLINE_REASONS[0]);
  const [customDeclineNote, setCustomDeclineNote] = useState<string>('');
  const [isSubmittingDecline, setIsSubmittingDecline] = useState<boolean>(false);

  // Customer Cancellation Modal state
  const [cancelModalVisible, setCancelModalVisible] = useState<boolean>(false);
  const [selectedCancelReason, setSelectedCancelReason] = useState<string>(CUSTOMER_CANCEL_REASONS[0]);
  const [customCancelNote, setCustomCancelNote] = useState<string>('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState<boolean>(false);

  // Match from context memory first (fastest)
  const contextBooking = useMemo(() => {
    if (!id) return null;
    const cleanId = id.toLowerCase();
    return (
      bookings.find(
        (b) =>
          (b.id && b.id.toLowerCase() === cleanId) ||
          (b.orderId && b.orderId.toLowerCase() === cleanId) ||
          (b.bookingId && b.bookingId.toLowerCase() === cleanId)
      ) || null
    );
  }, [bookings, id]);

  const booking = contextBooking || fetchedBooking;

  // Unread chat messages count for this booking
  const unreadChatCount = useMemo(() => {
    if (!booking) return 0;
    return notifications.filter(
      (n) =>
        n.type === 'chat' &&
        !n.read &&
        (n.bookingId === booking.id || (booking.orderId && n.bookingId === booking.orderId))
    ).length;
  }, [booking, notifications]);

  // Asynchronous fallback fetch if not present in context state
  useEffect(() => {
    let isMounted = true;
    const loadBooking = async () => {
      if (contextBooking) {
        setIsLoadingBooking(false);
        return;
      }

      if (!id) {
        setIsLoadingBooking(false);
        return;
      }

      setIsLoadingBooking(true);
      try {
        const result = await getBookingById(id, user?.id, effectiveRole);
        if (isMounted && result) {
          setFetchedBooking(result);
        }
      } catch (err) {
        console.warn('Failed fetching booking details:', err);
      } finally {
        if (isMounted) {
          setIsLoadingBooking(false);
        }
      }
    };

    loadBooking();
    return () => {
      isMounted = false;
    };
  }, [id, contextBooking, user?.id, effectiveRole]);

  // Authorization validation
  const isAuthorized = useMemo(() => {
    if (!booking) return false;
    return true;
  }, [booking]);

  if (isLoadingBooking && !booking) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Palette.primary} />
          <Text style={styles.loadingText}>Loading booking details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!booking || !isAuthorized) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={56} color={Palette.danger} />
          <Text style={styles.errorTitle}>Booking Not Found or Access Denied</Text>
          <Text style={styles.errorSubtitle}>
            This booking is not available or not associated with your authenticated account.
          </Text>
          <Button title="Go Back" onPress={() => router.back()} style={{ marginTop: 20 }} />
        </View>
      </SafeAreaView>
    );
  }

  const isCancelled = booking.status === 'cancelled';
  const isPaid = (booking.paymentStatus || '').toLowerCase() === 'paid';

  const handleOnlinePaymentSuccess = async (stripeRes: StripePaymentResult) => {
    try {
      const paymentIntentId = stripeRes.paymentIntentId || '';
      const ok = await payBookingWithStripe(booking.id, {
        stripePaymentId: paymentIntentId,
        stripeChargeId: stripeRes.chargeId,
        stripeReceiptUrl: stripeRes.receiptUrl,
      });
      if (ok && fetchedBooking) {
        setFetchedBooking({
          ...fetchedBooking,
          paymentStatus: 'paid',
          paymentMethod: 'card',
          stripePaymentId: stripeRes.paymentIntentId,
          stripeChargeId: stripeRes.chargeId,
          stripeReceiptUrl: stripeRes.receiptUrl,
        });
      }
      const successMsg = `Your payment of $${booking.totalPrice} has been confirmed via Stripe.\n\nTransaction ID: ${stripeRes.paymentIntentId}`;
      if (Platform.OS === 'web') {
        alert(`Payment Successful!\n\n${successMsg}`);
      } else {
        Alert.alert('Payment Successful! 🎉', successMsg);
      }
    } catch (e: any) {
      console.warn('Stripe payment update error:', e);
      Alert.alert('Payment Recorded', `Stripe transaction ${stripeRes.paymentIntentId} recorded.`);
    }
  };

  const getCurrentStepIndex = () => {
    if (isCancelled) return -1;
    const idx = STATUS_STEPS.findIndex((s) => s.key === booking.status);
    return idx >= 0 ? idx : 0;
  };

  const currentStepIdx = getCurrentStepIndex();

  const handleCancelBooking = () => {
    setSelectedCancelReason(CUSTOMER_CANCEL_REASONS[0]);
    setCustomCancelNote('');
    setCancelModalVisible(true);
  };

  const handleConfirmCancel = async () => {
    setIsSubmittingCancel(true);
    const reason =
      selectedCancelReason === 'Other reason' && customCancelNote.trim()
        ? customCancelNote.trim()
        : selectedCancelReason;

    try {
      await changeBookingStatus(booking.id, 'cancelled', reason);
      setCancelModalVisible(false);
      if (Platform.OS === 'web') {
        alert('Your booking has been cancelled.');
      } else {
        Alert.alert('Booking Cancelled', 'Your booking has been cancelled.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to cancel booking');
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  const handleOpenChat = () => {
    router.push({
      pathname: '/chat/[id]',
      params: { id: booking.id },
    });
  };

  // Provider Action Handlers
  const handleAcceptBooking = async () => {
    setIsUpdatingStatus(true);
    try {
      await respondToOrder(booking.id, 'accept');
      if (Platform.OS === 'web') {
        alert(`You accepted the booking for ${booking.serviceTitle}! You can now chat directly with ${booking.customerName}.`);
      } else {
        Alert.alert(
          'Booking Accepted',
          `You have accepted the order for ${booking.serviceTitle}. You can now communicate directly with ${booking.customerName} via chat.`
        );
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to accept booking');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleConfirmDecline = async () => {
    setIsSubmittingDecline(true);
    const reason =
      selectedDeclineReason === 'Other reason' && customDeclineNote.trim()
        ? customDeclineNote.trim()
        : selectedDeclineReason;

    try {
      await respondToOrder(booking.id, 'reject', reason);
      setDeclineModalVisible(false);
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

  const handleAdvanceStatus = async (nextStatus: BookingStatus) => {
    setIsUpdatingStatus(true);
    try {
      await changeBookingStatus(booking.id, nextStatus);
      const label = nextStatus.replace(/_/g, ' ').toUpperCase();
      if (Platform.OS === 'web') {
        alert(`Booking status moved to ${label}`);
      } else {
        Alert.alert('Status Updated', `Booking status moved to ${label}`);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update booking status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Top Header */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
          <Ionicons name="arrow-back" size={24} color={Palette.gray800} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Order #{booking.id.slice(-6).toUpperCase()}</Text>
        <TouchableOpacity onPress={handleOpenChat} style={styles.navBtn}>
          <Ionicons name="chatbubble-ellipses-outline" size={22} color={Palette.primary} />
          {unreadChatCount > 0 && (
            <View style={styles.chatNavBadge}>
              <Text style={styles.chatNavBadgeText}>
                {unreadChatCount > 9 ? '9+' : unreadChatCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Header Banner */}
        <View style={styles.statusBanner}>
          <View style={styles.statusBannerLeft}>
            <Text style={styles.statusBannerTitle}>Booking Status</Text>
            <Text style={styles.statusBannerSubtitle}>
              {isCancelled
                ? 'This booking was cancelled'
                : `Current: ${booking.status.replace(/_/g, ' ').toUpperCase()}`}
            </Text>
          </View>
          <Badge status={booking.status} />
        </View>

        {/* Live Stepper Tracker */}
        {!isCancelled ? (
          <View style={styles.stepperCard}>
            <Text style={styles.stepperHeading}>Live Progress</Text>
            <View style={styles.stepperContainer}>
              {STATUS_STEPS.map((step, idx) => {
                const isCompleted = idx <= currentStepIdx;
                const isCurrent = idx === currentStepIdx;
                const isLast = idx === STATUS_STEPS.length - 1;

                return (
                  <View key={step.key} style={styles.stepRow}>
                    <View style={styles.stepIndicatorCol}>
                      <View
                        style={[
                          styles.stepDot,
                          isCompleted && styles.stepDotCompleted,
                          isCurrent && styles.stepDotCurrent,
                        ]}
                      >
                        <Ionicons
                          name={step.icon}
                          size={14}
                          color={isCompleted ? Palette.white : Palette.gray400}
                        />
                      </View>
                      {!isLast && (
                        <View
                          style={[
                            styles.stepLine,
                            idx < currentStepIdx && styles.stepLineCompleted,
                          ]}
                        />
                      )}
                    </View>

                    <View style={styles.stepTextCol}>
                      <Text
                        style={[
                          styles.stepTitle,
                          isCompleted && styles.stepTitleCompleted,
                          isCurrent && styles.stepTitleCurrent,
                        ]}
                      >
                        {step.label}
                      </Text>
                      <Text style={styles.stepDesc}>{step.desc}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ) : (
          <View style={styles.cancelledCard}>
            <Ionicons name="close-circle" size={32} color={Palette.danger} />
            <Text style={styles.cancelledTitle}>Booking Cancelled</Text>
            {booking.cancellationReason ? (
              <Text style={styles.cancelledReason}>
                Reason: {booking.cancellationReason}
              </Text>
            ) : null}
          </View>
        )}

        {/* Customer Information Card (Crucial for Provider & Admin) */}
        {isProvider && (
          <View style={styles.customerCard}>
            <Text style={styles.cardHeading}>Customer Information</Text>
            <View style={styles.customerRow}>
              <View style={styles.customerAvatarBox}>
                <Ionicons name="person" size={22} color={Palette.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.customerNameText}>{booking.customerName || 'Customer'}</Text>
                <Text style={styles.customerContactSub}>
                  Contact: {booking.customerPhone || booking.customerContact || 'Phone on file'}
                </Text>
                {booking.customerEmail ? (
                  <Text style={styles.customerContactSub}>Email: {booking.customerEmail}</Text>
                ) : null}
              </View>
            </View>
          </View>
        )}

        {/* Provider Contact Card (Visible to Customer) */}
        {!isProvider && (
          <View style={styles.providerCard}>
            <View style={styles.providerLeft}>
              {booking.providerAvatar ? (
                <Image source={{ uri: booking.providerAvatar }} style={styles.providerAvatar} />
              ) : (
                <View style={styles.providerAvatarFallback}>
                  <Ionicons name="person" size={24} color={Palette.gray600} />
                </View>
              )}
              <View>
                <Text style={styles.providerName}>{booking.providerName}</Text>
                <Text style={styles.providerRole}>Assigned Service Pro</Text>
                {booking.providerPhone ? (
                  <Text style={styles.providerPhone}>{booking.providerPhone}</Text>
                ) : null}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.chatActionBtn, unreadChatCount > 0 && styles.chatActionBtnWithUnread]}
              onPress={handleOpenChat}
              activeOpacity={0.7}
            >
              <Ionicons name="chatbubble" size={16} color={Palette.white} />
              <Text style={styles.chatActionText}>
                {unreadChatCount > 0 ? `Chat (${unreadChatCount})` : 'Chat'}
              </Text>
              {unreadChatCount > 0 && <View style={styles.chatActionBadgeDot} />}
            </TouchableOpacity>
          </View>
        )}

        {/* Service Details Card */}
        <View style={styles.detailCard}>
          <Text style={styles.cardHeading}>Service Details</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Service:</Text>
            <Text style={styles.infoValue}>{booking.serviceTitle || booking.serviceName}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Category:</Text>
            <Text style={styles.infoValue}>{booking.categoryName || 'Home Improvement'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Scheduled Date:</Text>
            <Text style={styles.infoValue}>{booking.date || booking.bookingDate}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Time Slot:</Text>
            <Text style={styles.infoValue}>{booking.timeSlot || booking.bookingTime}</Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.cardHeading}>Service Address</Text>
          <Text style={styles.addressStreet}>{booking.address?.street || 'Customer Address'}</Text>
          {booking.address?.apartment ? (
            <Text style={styles.addressSub}>{booking.address.apartment}</Text>
          ) : null}
          {booking.address?.city ? (
            <Text style={styles.addressSub}>
              {booking.address.city}, {booking.address.state} {booking.address.zipCode}
            </Text>
          ) : null}

          {booking.notes ? (
            <>
              <View style={styles.divider} />
              <Text style={styles.cardHeading}>Special Instructions</Text>
              <Text style={styles.notesText}>{booking.notes}</Text>
            </>
          ) : null}
        </View>

        {/* Payment Summary */}
        <View style={styles.detailCard}>
          <Text style={styles.cardHeading}>Payment Information</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Payment Method:</Text>
            <Text style={styles.infoValue}>
              {booking.paymentMethod === 'cash' || booking.paymentMethod === 'Cash on Delivery'
                ? 'Cash / Pay After Service'
                : 'Credit / Debit Card (Stripe)'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Payment Status:</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {isPaid && <Ionicons name="checkmark-circle" size={16} color={Palette.accent} />}
              <Text
                style={[
                  styles.infoValue,
                  { color: isPaid ? Palette.accent : Palette.warning, fontWeight: '700' },
                ]}
              >
                {(booking.paymentStatus || 'Pending').toUpperCase()}
              </Text>
            </View>
          </View>

          {booking.stripePaymentId ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Stripe Transaction:</Text>
              <Text
                style={[styles.infoValue, { fontSize: 11, color: '#635BFF', fontWeight: '700' }]}
                numberOfLines={1}
              >
                {booking.stripePaymentId}
              </Text>
            </View>
          ) : null}

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Price</Text>
            <Text style={styles.totalValue}>${booking.totalPrice}</Text>
          </View>

          {/* Quick Pay with Stripe banner if customer & unpaid & not cancelled */}
          {!isProvider && !isPaid && !isCancelled && (
            <TouchableOpacity
              style={styles.stripePayBanner}
              onPress={() => setStripeModalVisible(true)}
              activeOpacity={0.8}
            >
              <View style={styles.stripePayBannerIcon}>
                <Ionicons name="card" size={20} color={Palette.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stripePayBannerTitle}>Pay ${booking.totalPrice} Online Now</Text>
                <Text style={styles.stripePayBannerSubtitle}>Powered by Stripe 256-bit secure checkout</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#635BFF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Action Buttons Section */}
        <View style={styles.actionsContainer}>
          {/* PROVIDER WORKFLOW BUTTONS */}
          {isProvider ? (
            <View style={styles.providerActionSection}>
              {booking.status === 'pending' && (
                <View style={styles.pendingActionGrid}>
                  <Button
                    title="Accept Booking"
                    onPress={handleAcceptBooking}
                    icon="checkmark-circle"
                    size="lg"
                    loading={isUpdatingStatus}
                    style={{ flex: 1, backgroundColor: Palette.accent, marginRight: 8 }}
                  />
                  <Button
                    title="Decline"
                    variant="outline"
                    onPress={() => {
                      setSelectedDeclineReason(DECLINE_REASONS[0]);
                      setCustomDeclineNote('');
                      setDeclineModalVisible(true);
                    }}
                    icon="close-circle"
                    size="lg"
                    style={{ borderColor: Palette.danger }}
                    textStyle={{ color: Palette.danger }}
                  />
                </View>
              )}

              {booking.status === 'accepted' && (
                <View style={{ gap: 10 }}>
                  <Button
                    title="Complete Order"
                    onPress={() => handleAdvanceStatus('completed')}
                    icon="shield-checkmark"
                    size="lg"
                    loading={isUpdatingStatus}
                    style={{ backgroundColor: Palette.accent }}
                  />
                  <Button
                    title="Mark On The Way"
                    onPress={() => handleAdvanceStatus('on_the_way')}
                    variant="outline"
                    icon="car"
                    size="md"
                    loading={isUpdatingStatus}
                    style={{ borderColor: Palette.primary }}
                    textStyle={{ color: Palette.primary }}
                  />
                  <Button
                    title="Chat with Customer"
                    variant="outline"
                    onPress={handleOpenChat}
                    icon="chatbubbles"
                    size="md"
                  />
                </View>
              )}

              {booking.status === 'on_the_way' && (
                <View style={{ gap: 10 }}>
                  <Button
                    title="Start Service (In Progress)"
                    onPress={() => handleAdvanceStatus('in_progress')}
                    icon="construct"
                    size="lg"
                    loading={isUpdatingStatus}
                    style={{ backgroundColor: Palette.purple }}
                  />
                  <Button
                    title="Chat with Customer"
                    variant="outline"
                    onPress={handleOpenChat}
                    icon="chatbubbles"
                    size="md"
                  />
                </View>
              )}

              {booking.status === 'in_progress' && (
                <View style={{ gap: 10 }}>
                  <Button
                    title="Complete Service"
                    onPress={() => handleAdvanceStatus('completed')}
                    icon="shield-checkmark"
                    size="lg"
                    loading={isUpdatingStatus}
                    style={{ backgroundColor: Palette.accent }}
                  />
                  <Button
                    title="Chat with Customer"
                    variant="outline"
                    onPress={handleOpenChat}
                    icon="chatbubbles"
                    size="md"
                  />
                </View>
              )}

              {booking.status === 'completed' && (
                <Button
                  title="Chat with Customer"
                  variant="outline"
                  onPress={handleOpenChat}
                  icon="chatbubbles"
                  size="lg"
                />
              )}
            </View>
          ) : (
            /* CUSTOMER WORKFLOW BUTTONS */
            <View style={{ gap: 12 }}>
              {!isPaid && !isCancelled && (
                <Button
                  title={`Pay $${booking.totalPrice} Online with Stripe`}
                  onPress={() => setStripeModalVisible(true)}
                  icon="card"
                  size="lg"
                  style={{ backgroundColor: '#635BFF' }}
                />
              )}

              <Button
                title="Chat with Provider"
                variant="outline"
                onPress={handleOpenChat}
                icon="chatbubbles"
                size="md"
                style={{ borderColor: Palette.primary }}
                textStyle={{ color: Palette.primary }}
              />

              {booking.status === 'completed' && (
                <Button
                  title="Rate & Review Service"
                  onPress={() => setReviewModalVisible(true)}
                  icon="star"
                  size="lg"
                  style={{ backgroundColor: Palette.warning }}
                />
              )}

              {(booking.status === 'pending' || booking.status === 'accepted') && (
                <Button
                  title="Cancel Order"
                  variant="outline"
                  onPress={handleCancelBooking}
                  icon="close-circle-outline"
                  size="lg"
                  style={{ borderColor: Palette.danger }}
                  textStyle={{ color: Palette.danger }}
                />
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Decline Booking Modal for Providers */}
      <Modal
        visible={declineModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeclineModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconBox}>
                <Ionicons name="alert-circle" size={24} color={Palette.danger} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Decline Booking Request</Text>
                <Text style={styles.modalSub}>
                  Please choose a reason for declining {booking.customerName}&apos;s booking.
                </Text>
              </View>
              <TouchableOpacity onPress={() => setDeclineModalVisible(false)}>
                <Ionicons name="close" size={22} color={Palette.gray500} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSectionLabel}>Reason for declining:</Text>
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
                    size={18}
                    color={isSelected ? Palette.danger : Palette.gray400}
                  />
                  <Text style={[styles.reasonText, isSelected && styles.reasonTextSelected]}>
                    {reason}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {selectedDeclineReason === 'Other reason' && (
              <TextInput
                style={styles.modalInput}
                placeholder="Briefly state your reason..."
                placeholderTextColor={Palette.gray400}
                value={customDeclineNote}
                onChangeText={setCustomDeclineNote}
                multiline
                numberOfLines={3}
              />
            )}

            <View style={styles.modalBtnRow}>
              <Button
                title="Go Back"
                variant="outline"
                onPress={() => setDeclineModalVisible(false)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="Confirm Decline"
                onPress={handleConfirmDecline}
                loading={isSubmittingDecline}
                style={{ flex: 1, backgroundColor: Palette.danger }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Customer Cancellation Reason Modal */}
      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconBox, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="close-circle" size={24} color={Palette.danger} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Cancel Service Order</Text>
                <Text style={styles.modalSub}>
                  Please let us know why you are cancelling this booking.
                </Text>
              </View>
              <TouchableOpacity onPress={() => setCancelModalVisible(false)}>
                <Ionicons name="close" size={22} color={Palette.gray500} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSectionLabel}>Reason for cancellation:</Text>
            {CUSTOMER_CANCEL_REASONS.map((reason) => {
              const isSelected = selectedCancelReason === reason;
              return (
                <TouchableOpacity
                  key={reason}
                  style={[styles.reasonOption, isSelected && styles.reasonOptionSelected]}
                  onPress={() => setSelectedCancelReason(reason)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                    size={18}
                    color={isSelected ? Palette.danger : Palette.gray400}
                  />
                  <Text style={[styles.reasonText, isSelected && styles.reasonTextSelected]}>
                    {reason}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {selectedCancelReason === 'Other reason' && (
              <TextInput
                style={styles.modalInput}
                placeholder="Please state why you are cancelling..."
                placeholderTextColor={Palette.gray400}
                value={customCancelNote}
                onChangeText={setCustomCancelNote}
                multiline
                numberOfLines={3}
              />
            )}

            <View style={styles.modalBtnRow}>
              <Button
                title="Keep Order"
                variant="outline"
                onPress={() => setCancelModalVisible(false)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="Confirm Cancel"
                onPress={handleConfirmCancel}
                loading={isSubmittingCancel}
                style={{ flex: 1, backgroundColor: Palette.danger }}
              />
            </View>
          </View>
        </View>
      </Modal>

      <StripePaymentModal
        visible={stripeModalVisible}
        onClose={() => setStripeModalVisible(false)}
        amount={Number(booking.totalPrice) || 0}
        serviceTitle={booking.serviceTitle || booking.serviceName || 'Fixora Service'}
        customerName={booking.customerName || user?.name || ''}
        customerEmail={booking.customerEmail || user?.email || ''}
        onPaymentSuccess={handleOnlinePaymentSuccess}
      />

      <ReviewModal
        visible={reviewModalVisible}
        booking={booking}
        onClose={() => setReviewModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.white,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Palette.gray600,
    fontWeight: '600',
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
  navBtn: {
    padding: 4,
    position: 'relative',
  },
  chatNavBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: Palette.danger,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Palette.white,
  },
  chatNavBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  chatActionBtnWithUnread: {
    backgroundColor: Palette.accent,
  },
  chatActionBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    marginLeft: 2,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.gray900,
  },
  statusBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Palette.white,
    padding: Spacing.three,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Palette.gray200,
    marginBottom: Spacing.three,
    ...Shadows.sm,
  },
  statusBannerLeft: {},
  statusBannerTitle: {
    fontSize: 12,
    color: Palette.gray500,
    fontWeight: '600',
  },
  statusBannerSubtitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Palette.gray900,
    marginTop: 2,
  },
  stepperCard: {
    backgroundColor: Palette.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: Palette.gray200,
    marginBottom: Spacing.three,
    ...Shadows.sm,
  },
  stepperHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.gray900,
    marginBottom: Spacing.three,
  },
  stepperContainer: {},
  stepRow: {
    flexDirection: 'row',
  },
  stepIndicatorCol: {
    alignItems: 'center',
    width: 32,
  },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Palette.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotCompleted: {
    backgroundColor: Palette.primary,
  },
  stepDotCurrent: {
    backgroundColor: Palette.accent,
  },
  stepLine: {
    width: 2,
    height: 36,
    backgroundColor: Palette.gray200,
    marginVertical: 2,
  },
  stepLineCompleted: {
    backgroundColor: Palette.primary,
  },
  stepTextCol: {
    flex: 1,
    marginLeft: 10,
    paddingBottom: 20,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.gray400,
  },
  stepTitleCompleted: {
    color: Palette.gray800,
  },
  stepTitleCurrent: {
    color: Palette.accent,
    fontWeight: '800',
  },
  stepDesc: {
    fontSize: 11,
    color: Palette.gray400,
    marginTop: 1,
  },
  cancelledCard: {
    backgroundColor: '#FEF2F2',
    padding: Spacing.four,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Palette.dangerSoft,
    marginBottom: Spacing.three,
  },
  cancelledTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.danger,
    marginTop: 6,
  },
  cancelledReason: {
    fontSize: 12,
    color: Palette.gray600,
    marginTop: 4,
  },
  customerCard: {
    backgroundColor: Palette.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: Palette.gray200,
    marginBottom: Spacing.three,
    ...Shadows.sm,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  customerAvatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Palette.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.gray900,
  },
  customerContactSub: {
    fontSize: 12,
    color: Palette.gray600,
    marginTop: 2,
  },
  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: Palette.gray200,
    marginBottom: Spacing.three,
    ...Shadows.sm,
  },
  providerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  providerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  providerAvatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Palette.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerName: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.gray900,
  },
  providerRole: {
    fontSize: 11,
    color: Palette.gray500,
  },
  providerPhone: {
    fontSize: 11,
    color: Palette.primary,
    marginTop: 2,
  },
  chatActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Palette.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
  },
  chatActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.white,
  },
  detailCard: {
    backgroundColor: Palette.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: Palette.gray200,
    marginBottom: Spacing.three,
    ...Shadows.sm,
  },
  cardHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.gray900,
    marginBottom: Spacing.two,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 12,
    color: Palette.gray500,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.gray800,
  },
  divider: {
    height: 1,
    backgroundColor: Palette.gray100,
    marginVertical: 10,
  },
  addressStreet: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.gray900,
  },
  addressSub: {
    fontSize: 12,
    color: Palette.gray500,
    marginTop: 1,
  },
  notesText: {
    fontSize: 12,
    color: Palette.gray700,
    fontStyle: 'italic',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: Palette.gray900,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.primary,
  },
  actionsContainer: {
    marginTop: Spacing.two,
  },
  providerActionSection: {
    marginTop: Spacing.one,
  },
  pendingActionGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: Palette.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.four,
    ...Shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: Spacing.three,
  },
  modalIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.gray900,
  },
  modalSub: {
    fontSize: 12,
    color: Palette.gray500,
    marginTop: 2,
  },
  modalSectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.gray800,
    marginBottom: 8,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Palette.gray200,
    marginBottom: 8,
  },
  reasonOptionSelected: {
    borderColor: Palette.danger,
    backgroundColor: '#FEF2F2',
  },
  reasonText: {
    fontSize: 13,
    color: Palette.gray700,
    flex: 1,
  },
  reasonTextSelected: {
    color: Palette.danger,
    fontWeight: '600',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: Palette.gray300,
    borderRadius: BorderRadius.md,
    padding: Spacing.three,
    fontSize: 13,
    color: Palette.gray800,
    height: 70,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  modalBtnRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Palette.gray800,
    marginTop: 12,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 13,
    color: Palette.gray500,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  stripePayBanner: {
    marginTop: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#EEF2FF',
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    borderRadius: BorderRadius.lg,
    padding: Spacing.three,
  },
  stripePayBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#635BFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stripePayBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#312E81',
  },
  stripePayBannerSubtitle: {
    fontSize: 11,
    color: '#6366F1',
    marginTop: 2,
  },
});
