import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Palette, BorderRadius, Shadows, Spacing } from '../../constants/theme';
import { Booking } from '../../types';
import { Badge } from '../common/Badge';

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

  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={handleOpenDetail} activeOpacity={0.8}>
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
            <View style={styles.statusRow}>
              <Text style={styles.categoryName}>{booking.categoryName}</Text>
              <Badge status={booking.status} />
            </View>
            <Text style={styles.serviceTitle} numberOfLines={1}>
              {booking.serviceTitle}
            </Text>
            <Text style={styles.bookingId}>Booking #{booking.id.slice(-6).toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailsBlock}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={14} color={Palette.primary} />
            <Text style={styles.detailText}>
              {booking.date} • {booking.timeSlot}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="person-outline" size={14} color={Palette.gray500} />
            <Text style={styles.detailText}>Provider: {booking.providerName}</Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={14} color={Palette.gray500} />
            <Text style={styles.detailText} numberOfLines={1}>
              {booking.address.street}, {booking.address.city}
            </Text>
          </View>
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Total Amount</Text>
          <Text style={styles.priceValue}>${booking.totalPrice}</Text>
        </View>
      </TouchableOpacity>

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
          <Text style={styles.trackButtonText}>Track Status</Text>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  serviceImageContainer: {
    width: 60,
    height: 60,
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
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  categoryName: {
    fontSize: 11,
    color: Palette.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  serviceTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.gray900,
    marginBottom: 2,
  },
  bookingId: {
    fontSize: 11,
    color: Palette.gray400,
  },
  divider: {
    height: 1,
    backgroundColor: Palette.gray100,
    marginVertical: Spacing.two,
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
