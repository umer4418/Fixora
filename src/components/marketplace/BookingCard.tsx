import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Palette, BorderRadius, Shadows, Spacing } from '../../constants/theme';
import { Booking } from '../../types';
import { Badge } from '../common/Badge';
import { mapStatusToOrderDisplay } from '../../services/marketplaceService';

interface BookingCardProps {
  booking: Booking;
  onReviewPress?: (booking: Booking) => void;
  onCancelPress?: (booking: Booking) => void;
}

export const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  onReviewPress,
  onCancelPress,
}) => {
  const handleOpenDetail = () => {
    router.push({
      pathname: '/booking/[id]',
      params: { id: booking.id },
    });
  };

  const handleOpenChat = () => {
    router.push({
      pathname: '/chat/[id]',
      params: { id: booking.id },
    });
  };

  const orderNumber = booking.orderId
    ? booking.orderId.startsWith('ord-')
      ? `#${booking.orderId.replace('ord-', '').slice(-6).toUpperCase()}`
      : `#${booking.orderId}`
    : `#${booking.id.slice(-6).toUpperCase()}`;

  const currentOrderStatus = booking.orderStatus || mapStatusToOrderDisplay(booking.status);
  const displayTotal =
    booking.totalAmount !== undefined ? booking.totalAmount : booking.totalPrice;
  const paymentMethodLabel =
    booking.paymentMethod === 'cod' || booking.paymentMethod === 'cash'
      ? 'Cash on Delivery'
      : booking.paymentMethod === 'card'
      ? 'Credit Card'
      : booking.paymentMethod
      ? booking.paymentMethod.toUpperCase()
      : 'Cash on Delivery';

  const paymentStatusLabel = booking.paymentStatus
    ? booking.paymentStatus.charAt(0).toUpperCase() + booking.paymentStatus.slice(1)
    : 'Pending';

  const isCancelled =
    currentOrderStatus === 'Cancelled' ||
    currentOrderStatus === 'Rejected' ||
    booking.providerStatus === 'Rejected' ||
    booking.status === 'cancelled';

  const isProviderAccepted =
    booking.providerStatus === 'Accepted' ||
    booking.status === 'accepted' ||
    booking.status === 'on_the_way' ||
    booking.status === 'in_progress' ||
    booking.status === 'completed';

  const isPendingProvider =
    booking.providerStatus === 'Pending' ||
    currentOrderStatus === 'Pending Provider Acceptance' ||
    booking.status === 'pending';

  const isProcessing =
    currentOrderStatus === 'Processing' ||
    booking.status === 'on_the_way' ||
    booking.status === 'in_progress';

  const isCompleted = currentOrderStatus === 'Completed' || booking.status === 'completed';

  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={handleOpenDetail} activeOpacity={0.85}>
        {/* Header: Order ID + Status Badge */}
        <View style={styles.cardTopBar}>
          <View style={styles.orderIdContainer}>
            <Text style={styles.orderIdLabel}>Order {orderNumber}</Text>
            <Text style={styles.categoryName}>{booking.categoryName || 'Service'}</Text>
          </View>
          <Badge status={booking.status} />
        </View>

        {/* Service Info Row */}
        <View style={styles.headerRow}>
          <View style={styles.serviceImageContainer}>
            {booking.serviceImage ? (
              <Image source={{ uri: booking.serviceImage }} style={styles.serviceImage} />
            ) : (
              <View style={styles.serviceImageFallback}>
                <Ionicons name="build" size={20} color={Palette.primary} />
              </View>
            )}
          </View>

          <View style={styles.headerInfo}>
            <Text style={styles.serviceTitle} numberOfLines={2}>
              {booking.serviceTitle}
            </Text>
            {booking.providerName ? (
              <Text style={styles.providerNameText} numberOfLines={1}>
                Provider: {booking.providerName}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.divider} />

        {/* Visual Stepper / Status Progress */}
        {isCancelled ? (
          <View style={styles.cancelledBanner}>
            <Ionicons name="alert-circle" size={16} color={Palette.danger} />
            <Text style={styles.cancelledBannerText}>
              Status: {booking.providerStatus === 'Rejected' ? 'Declined by Provider' : 'Cancelled'}
              {booking.cancellationReason ? ` (${booking.cancellationReason})` : ''}
            </Text>
          </View>
        ) : (
          <View style={styles.stepperContainer}>
            <View style={styles.stepperHeaderRow}>
              <Text style={styles.stepperTitle}>
                Status: <Text style={styles.stepperTitleBold}>{currentOrderStatus}</Text>
              </Text>
              {isPendingProvider && (
                <View style={styles.pendingProviderPill}>
                  <Text style={styles.pendingProviderText}>Awaiting Provider</Text>
                </View>
              )}
            </View>

            <View style={styles.stepperRow}>
              {/* Step 1: Placed */}
              <View style={styles.stepItem}>
                <Ionicons name="checkmark-circle" size={14} color={Palette.accent} />
                <Text style={styles.stepTextActive}>Placed: ✓</Text>
              </View>

              <View style={[styles.stepLine, isProviderAccepted && styles.stepLineActive]} />

              {/* Step 2: Provider Acceptance */}
              <View style={styles.stepItem}>
                <Ionicons
                  name={isProviderAccepted ? 'checkmark-circle' : isPendingProvider ? 'time' : 'ellipse-outline'}
                  size={14}
                  color={isProviderAccepted ? Palette.accent : isPendingProvider ? Palette.primary : Palette.gray400}
                />
                <Text
                  style={
                    isProviderAccepted
                      ? styles.stepTextActive
                      : isPendingProvider
                      ? [styles.stepTextActive, { color: Palette.primary }]
                      : styles.stepTextInactive
                  }
                >
                  {isProviderAccepted ? 'Accepted: ✓' : 'Provider: ⏳'}
                </Text>
              </View>

              <View style={[styles.stepLine, (isProcessing || isCompleted) && styles.stepLineActive]} />

              {/* Step 3: In Progress */}
              <View style={styles.stepItem}>
                <Ionicons
                  name={isProcessing || isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
                  size={14}
                  color={isProcessing || isCompleted ? Palette.accent : Palette.gray400}
                />
                <Text
                  style={
                    isProcessing || isCompleted ? styles.stepTextActive : styles.stepTextInactive
                  }
                >
                  Active: {isProcessing || isCompleted ? '✓' : '○'}
                </Text>
              </View>

              <View style={[styles.stepLine, isCompleted && styles.stepLineActive]} />

              {/* Step 4: Completed */}
              <View style={styles.stepItem}>
                <Ionicons
                  name={isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
                  size={14}
                  color={isCompleted ? Palette.accent : Palette.gray400}
                />
                <Text style={isCompleted ? styles.stepTextActive : styles.stepTextInactive}>
                  Done: {isCompleted ? '✓' : '○'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Order Details Grid */}
        <View style={styles.detailsBlock}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={14} color={Palette.primary} />
            <Text style={styles.detailText}>
              Date: {booking.date} • {booking.timeSlot}
            </Text>
          </View>

          {booking.address ? (
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={14} color={Palette.gray500} />
              <Text style={styles.detailText} numberOfLines={1}>
                {booking.address.street}, {booking.address.city}
              </Text>
            </View>
          ) : null}

          <View style={styles.paymentMetaRow}>
            <View style={styles.paymentMetaItem}>
              <Ionicons name="cash-outline" size={13} color={Palette.gray600} />
              <Text style={styles.paymentMetaText}>
                Payment: <Text style={styles.paymentMetaBold}>{paymentMethodLabel}</Text>
              </Text>
            </View>
            <View style={styles.paymentMetaBadge}>
              <Text style={styles.paymentMetaBadgeText}>
                {paymentStatusLabel}
              </Text>
            </View>
          </View>
        </View>

        {/* Pricing Summary */}
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Total Amount</Text>
          <Text style={styles.priceValue}>${displayTotal}</Text>
        </View>
      </TouchableOpacity>

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.chatButton}
          onPress={handleOpenChat}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={16} color={Palette.primary} />
          <Text style={styles.chatButtonText}>Chat</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.trackButton}
          onPress={handleOpenDetail}
          activeOpacity={0.7}
        >
          <Ionicons name="navigate-outline" size={16} color={Palette.white} />
          <Text style={styles.trackButtonText}>View Order</Text>
        </TouchableOpacity>

        {booking.status === 'completed' && onReviewPress && (
          <TouchableOpacity
            style={styles.reviewButton}
            onPress={() => onReviewPress(booking)}
            activeOpacity={0.7}
          >
            <Ionicons name="star" size={14} color={Palette.star} />
            <Text style={styles.reviewButtonText}>Review</Text>
          </TouchableOpacity>
        )}

        {(booking.status === 'pending' || booking.status === 'accepted') && onCancelPress && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => onCancelPress(booking)}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Palette.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: Palette.gray200,
    marginBottom: Spacing.three,
    ...Shadows.sm,
  },
  cardTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  orderIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderIdLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: Palette.gray900,
  },
  categoryName: {
    fontSize: 10,
    color: Palette.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
    backgroundColor: Palette.primarySoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  serviceImageContainer: {
    width: 54,
    height: 54,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    backgroundColor: Palette.gray100,
  },
  serviceImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  serviceImageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.primarySoft,
  },
  headerInfo: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.gray900,
    marginBottom: 3,
  },
  providerNameText: {
    fontSize: 12,
    color: Palette.gray500,
  },
  divider: {
    height: 1,
    backgroundColor: Palette.gray100,
    marginVertical: Spacing.two,
  },
  stepperContainer: {
    backgroundColor: Palette.gray50,
    borderRadius: BorderRadius.md,
    padding: 10,
    marginBottom: Spacing.two,
    borderWidth: 1,
    borderColor: Palette.gray200,
  },
  stepperHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  stepperTitle: {
    fontSize: 11,
    color: Palette.gray600,
  },
  stepperTitleBold: {
    fontWeight: '700',
    color: Palette.primary,
  },
  pendingProviderPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  pendingProviderText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: Palette.primary,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stepTextActive: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.accent,
  },
  stepTextInactive: {
    fontSize: 11,
    fontWeight: '500',
    color: Palette.gray400,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: Palette.gray200,
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: Palette.accent,
  },
  cancelledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Palette.dangerSoft,
    padding: 10,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.two,
  },
  cancelledBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.danger,
    flex: 1,
  },
  detailsBlock: {
    gap: 6,
    marginBottom: Spacing.two,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    color: Palette.gray600,
    flex: 1,
  },
  paymentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  paymentMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paymentMetaText: {
    fontSize: 12,
    color: Palette.gray600,
  },
  paymentMetaBold: {
    fontWeight: '700',
    color: Palette.gray800,
  },
  paymentMetaBadge: {
    backgroundColor: Palette.gray100,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  paymentMetaBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.gray700,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Palette.gray50,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.two,
  },
  priceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.gray600,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.gray900,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Palette.primary,
    backgroundColor: Palette.primarySoft,
  },
  chatButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.primary,
  },
  trackButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.md,
    backgroundColor: Palette.primary,
  },
  trackButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.white,
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.md,
    backgroundColor: Palette.warningSoft,
    borderWidth: 1,
    borderColor: Palette.warning,
  },
  reviewButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.md,
    backgroundColor: Palette.dangerSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.danger,
  },
});
