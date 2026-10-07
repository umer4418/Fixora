import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette, BorderRadius, Spacing, Shadows } from '../../constants/theme';
import { Booking } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useMarketplace } from '../../context/MarketplaceContext';
import { StarRating } from '../common/StarRating';
import { Button } from '../common/Button';

interface ReviewModalProps {
  visible: boolean;
  booking: Booking | null;
  onClose: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  visible,
  booking,
  onClose,
}) => {
  const { user } = useAuth();
  const { createReview } = useMarketplace();

  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!booking) return null;

  const handleSubmit = async () => {
    if (!user) {
      alert('Please sign in to submit a review.');
      return;
    }

    if (!comment.trim()) {
      alert('Please enter a brief comment about your experience');
      return;
    }

    setIsSubmitting(true);
    try {
      await createReview({
        bookingId: booking.id,
        serviceId: booking.serviceId,
        serviceTitle: booking.serviceTitle,
        providerId: booking.providerId,
        customerId: user.id,
        customerName: user.name || 'Customer',
        customerAvatar: user.avatar,
        rating,
        comment: comment.trim(),
      });

      setComment('');
      setRating(5);
      onClose();
      alert('Thank you! Your review has been published.');
    } catch (e: any) {
      alert(e?.message || 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.sheet}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollInside}
          >
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <Ionicons name="star" size={20} color={Palette.star} />
                <Text style={styles.title}>Review Service</Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={22} color={Palette.gray600} />
              </TouchableOpacity>
            </View>

            <Text style={styles.serviceName}>{booking.serviceTitle}</Text>
            <Text style={styles.providerName}>Provided by {booking.providerName}</Text>

            <View style={styles.ratingSection}>
              <Text style={styles.rateQuestion}>How was your overall experience?</Text>
              <StarRating
                rating={rating}
                size={28}
                interactive
                onRatingChange={(r) => setRating(r)}
                style={styles.starBox}
              />
              <Text style={styles.ratingScore}>{rating} of 5 Stars</Text>
            </View>

            <Text style={styles.inputLabel}>Your Feedback</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Share details about punctuality, cleanliness, quality of work..."
              placeholderTextColor={Palette.gray400}
              multiline
              numberOfLines={4}
              value={comment}
              onChangeText={setComment}
            />

            <View style={styles.actionRow}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={onClose}
                style={{ flex: 1, marginRight: 8 }}
                size="sm"
              />
              <Button
                title="Submit Review"
                onPress={handleSubmit}
                loading={isSubmitting}
                style={{ flex: 2 }}
                size="sm"
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  sheet: {
    backgroundColor: Palette.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.four,
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    ...Shadows.lg,
  },
  scrollInside: {
    flexGrow: 0,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.gray900,
  },
  closeBtn: {
    padding: 4,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.primary,
    marginTop: 4,
  },
  providerName: {
    fontSize: 13,
    color: Palette.gray500,
    marginBottom: Spacing.three,
  },
  ratingSection: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    backgroundColor: Palette.gray50,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Palette.gray200,
    marginBottom: Spacing.three,
  },
  rateQuestion: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.gray800,
    marginBottom: 8,
  },
  starBox: {
    justifyContent: 'center',
  },
  ratingScore: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.gray600,
    marginTop: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.gray700,
    marginBottom: 6,
  },
  textArea: {
    borderWidth: 1,
    borderColor: Palette.gray300,
    borderRadius: BorderRadius.md,
    padding: 12,
    fontSize: 14,
    color: Palette.gray900,
    textAlignVertical: 'top',
    minHeight: 90,
    marginBottom: Spacing.four,
    backgroundColor: Palette.gray50,
  },
  actionRow: {
    flexDirection: 'row',
    marginBottom: Spacing.one,
  },
});
