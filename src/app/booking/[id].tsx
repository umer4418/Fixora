import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { Palette, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useMarketplace } from '../../context/MarketplaceContext';
import { BookingStatus } from '../../types';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { ReviewModal } from '../../components/marketplace/ReviewModal';

const STATUS_STEPS: { key: BookingStatus; label: string; desc: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'pending', label: 'Requested', desc: 'Awaiting provider confirmation', icon: 'time-outline' },
  { key: 'accepted', label: 'Accepted', desc: 'Provider accepted your booking', icon: 'checkmark-circle-outline' },
  { key: 'on_the_way', label: 'On The Way', desc: 'Provider is traveling to your address', icon: 'car-outline' },
  { key: 'in_progress', label: 'In Progress', desc: 'Service work is currently ongoing', icon: 'construct-outline' },
  { key: 'completed', label: 'Completed', desc: 'Service finished & inspected', icon: 'shield-checkmark-outline' },
];

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { bookings, changeBookingStatus } = useMarketplace();

  const [reviewModalVisible, setReviewModalVisible] = useState(false);

  const booking = useMemo(() => {
    return bookings.find((b) => b.id === id);
  }, [bookings, id]);

  if (!booking) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Booking Not Found</Text>
          <Button title="Go Back" onPress={() => router.back()} style={{ marginTop: 12 }} />
        </View>
      </SafeAreaView>
    );
  }

  const isCancelled = booking.status === 'cancelled';

  const getCurrentStepIndex = () => {
    if (isCancelled) return -1;
    const idx = STATUS_STEPS.findIndex((s) => s.key === booking.status);
    return idx >= 0 ? idx : 0;
  };

  const currentStepIdx = getCurrentStepIndex();

  const handleCancelBooking = () => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            await changeBookingStatus(booking.id, 'cancelled', 'Cancelled by customer');
            alert('Booking has been cancelled.');
          },
        },
      ]
    );
  };

  const handleOpenChat = () => {
    router.push({
      pathname: '/chat/[id]',
      params: { id: booking.id },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Top Header */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
          <Ionicons name="arrow-back" size={24} color={Palette.gray800} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Booking #{booking.id.slice(-6).toUpperCase()}</Text>
        <TouchableOpacity onPress={handleOpenChat} style={styles.navBtn}>
          <Ionicons name="chatbubble-ellipses-outline" size={22} color={Palette.primary} />
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

        {/* Provider Contact Card */}
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
            style={styles.chatActionBtn}
            onPress={handleOpenChat}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubble" size={16} color={Palette.white} />
            <Text style={styles.chatActionText}>Chat</Text>
          </TouchableOpacity>
        </View>

        {/* Service Details Card */}
        <View style={styles.detailCard}>
          <Text style={styles.cardHeading}>Service Details</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Service:</Text>
            <Text style={styles.infoValue}>{booking.serviceTitle}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Category:</Text>
            <Text style={styles.infoValue}>{booking.categoryName}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Scheduled Date:</Text>
            <Text style={styles.infoValue}>{booking.date}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Time Slot:</Text>
            <Text style={styles.infoValue}>{booking.timeSlot}</Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.cardHeading}>Service Address</Text>
          <Text style={styles.addressStreet}>{booking.address.street}</Text>
          {booking.address.apartment ? (
            <Text style={styles.addressSub}>{booking.address.apartment}</Text>
          ) : null}
          <Text style={styles.addressSub}>
            {booking.address.city}, {booking.address.state} {booking.address.zipCode}
          </Text>

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
              {booking.paymentMethod === 'cash' ? 'Cash / Pay After Service' : 'Credit / Debit Card'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Payment Status:</Text>
            <Text
              style={[
                styles.infoValue,
                { color: booking.paymentStatus === 'paid' ? Palette.accent : Palette.warning },
              ]}
            >
              {booking.paymentStatus.toUpperCase()}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Price</Text>
            <Text style={styles.totalValue}>${booking.totalPrice}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {booking.status === 'completed' && (
            <Button
              title="Rate & Review Service"
              onPress={() => setReviewModalVisible(true)}
              icon="star"
              size="lg"
              style={{ backgroundColor: Palette.warning, marginBottom: 12 }}
            />
          )}

          {(booking.status === 'pending' || booking.status === 'accepted') && (
            <Button
              title="Cancel Booking"
              variant="outline"
              onPress={handleCancelBooking}
              style={{ borderColor: Palette.danger }}
              textStyle={{ color: Palette.danger }}
            />
          )}
        </View>
      </ScrollView>

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
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Palette.gray800,
  },
});
