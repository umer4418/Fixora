import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { Palette, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useMarketplace } from '../../context/MarketplaceContext';
import { useSafeBack } from '../../hooks/use-safe-back';
import { useAuth } from '../../context/AuthContext';
import { StarRating } from '../../components/common/StarRating';
import { ServiceCard } from '../../components/marketplace/ServiceCard';
import { Button } from '../../components/common/Button';

export default function ProviderProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { providers, services, reviews, createReview } = useMarketplace();
  const { user } = useAuth();
  const goBack = useSafeBack();

  const [writeReviewVisible, setWriteReviewVisible] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const provider = useMemo(() => {
    return providers.find((p) => p.id === id);
  }, [providers, id]);

  const providerServices = useMemo(() => {
    return services.filter((s) => s.providerId === id);
  }, [services, id]);

  const providerReviews = useMemo(() => {
    return reviews.filter((r) => r.providerId === id);
  }, [reviews, id]);

  const handleSubmitReview = async () => {
    if (!reviewComment.trim()) {
      alert('Please enter your review feedback');
      return;
    }
    if (!provider) return;

    setIsSubmittingReview(true);
    try {
      await createReview({
        serviceId: providerServices[0]?.id || `prov-${provider.id}`,
        serviceTitle: providerServices[0]?.title || `${provider.name}'s Service`,
        providerId: provider.id,
        customerId: user?.id || 'cust-demo',
        customerName: user?.name || 'Customer',
        customerAvatar: user?.avatar,
        rating: reviewRating,
        comment: reviewComment.trim(),
      });
      setWriteReviewVisible(false);
      setReviewComment('');
      setReviewRating(5);
      alert('Thank you! Your review has been submitted.');
    } catch (e: any) {
      alert(e?.message || 'Failed to submit review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (!provider) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Palette.danger} />
          <Text style={styles.errorTitle}>Provider Not Found</Text>
          <Button title="Go Back" onPress={goBack} style={{ marginTop: 12 }} />
        </View>
      </SafeAreaView>
    );
  }

  const isAvailable = provider.availabilityStatus === 'available';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Header bar */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={goBack} style={styles.navBtn}>
          <Ionicons name="arrow-back" size={24} color={Palette.gray800} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Provider Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarWrapper}>
              {provider.avatar ? (
                <Image source={{ uri: provider.avatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Ionicons name="person" size={36} color={Palette.gray600} />
                </View>
              )}
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: isAvailable ? Palette.accent : Palette.gray400 },
                ]}
              />
            </View>

            <View style={styles.headerInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{provider.name}</Text>
                {provider.isVerified && (
                  <Ionicons name="checkmark-circle" size={18} color={Palette.primary} />
                )}
              </View>
              <Text style={styles.roleSub}>Home Services Specialist</Text>
              <StarRating
                rating={provider.rating || 5.0}
                reviewsCount={provider.reviewsCount || 0}
                size={13}
              />
            </View>
          </View>

          {/* Quick Metrics */}
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>
                {provider.hourlyRate ? `$${provider.hourlyRate}/hr` : 'Custom'}
              </Text>
              <Text style={styles.metricLabel}>Rate</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{provider.reviewsCount || 0}</Text>
              <Text style={styles.metricLabel}>Reviews</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: isAvailable ? Palette.accent : Palette.gray500 }]}>
                {isAvailable ? 'Available' : 'Busy'}
              </Text>
              <Text style={styles.metricLabel}>Status</Text>
            </View>
          </View>

          {provider.bio ? (
            <View style={styles.bioSection}>
              <Text style={styles.bioHeading}>About</Text>
              <Text style={styles.bioText}>{provider.bio}</Text>
            </View>
          ) : null}
        </View>

        {/* Services by this Provider */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Services Offered ({providerServices.length})</Text>
        </View>

        {providerServices.map((service) => (
          <ServiceCard key={service.id} service={service} horizontal />
        ))}

        {/* Customer Reviews for Provider */}
        <View style={styles.sectionHeaderBetween}>
          <Text style={styles.sectionTitle}>Reviews ({providerReviews.length})</Text>
          <TouchableOpacity
            style={styles.addReviewBtn}
            onPress={() => setWriteReviewVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={14} color={Palette.primary} />
            <Text style={styles.addReviewBtnText}>Write a Review</Text>
          </TouchableOpacity>
        </View>

        {providerReviews.length === 0 ? (
          <View style={styles.noReviewsBox}>
            <Text style={styles.noReviewsText}>No public reviews yet for this professional.</Text>
          </View>
        ) : (
          providerReviews.map((rev) => (
            <View key={rev.id} style={styles.reviewCard}>
              <View style={styles.revTop}>
                <Text style={styles.revCustomerName}>{rev.customerName}</Text>
                <StarRating rating={rev.rating} size={12} />
              </View>
              {rev.serviceTitle && (
                <Text style={styles.revServiceTag}>Service: {rev.serviceTitle}</Text>
              )}
              <Text style={styles.revComment}>{rev.comment}</Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* Write Review Modal */}
      <Modal
        visible={writeReviewVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setWriteReviewVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setWriteReviewVisible(false)}
          />
          <View style={styles.reviewModalCard}>
            <View style={styles.reviewModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="star" size={18} color={Palette.star} />
                <Text style={styles.reviewModalTitle}>Rate & Review {provider.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setWriteReviewVisible(false)}>
                <Ionicons name="close" size={20} color={Palette.gray500} />
              </TouchableOpacity>
            </View>

            <View style={styles.reviewRatingBox}>
              <Text style={styles.reviewRatePrompt}>How was your experience?</Text>
              <StarRating
                rating={reviewRating}
                size={26}
                interactive
                onRatingChange={(r) => setReviewRating(r)}
              />
              <Text style={styles.reviewRatingScore}>{reviewRating} of 5 Stars</Text>
            </View>

            <Text style={styles.reviewInputLabel}>Your Review</Text>
            <TextInput
              style={styles.reviewTextInput}
              placeholder="Tell others about timeliness, communication, and quality..."
              placeholderTextColor={Palette.gray400}
              multiline
              numberOfLines={4}
              value={reviewComment}
              onChangeText={setReviewComment}
            />

            <View style={styles.reviewActionsRow}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setWriteReviewVisible(false)}
                style={{ flex: 1, marginRight: 8 }}
                size="sm"
              />
              <Button
                title="Submit Review"
                onPress={handleSubmitReview}
                loading={isSubmittingReview}
                style={{ flex: 1.5 }}
                size="sm"
              />
            </View>
          </View>
        </KeyboardAvoidingView>
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
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
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
  profileHeaderCard: {
    backgroundColor: Palette.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: Palette.gray200,
    marginBottom: Spacing.four,
    ...Shadows.sm,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: Spacing.three,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarFallback: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Palette.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Palette.white,
  },
  headerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  name: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.gray900,
  },
  roleSub: {
    fontSize: 12,
    color: Palette.gray500,
    marginBottom: 4,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: Palette.gray50,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.three,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '800',
    color: Palette.gray900,
  },
  metricLabel: {
    fontSize: 11,
    color: Palette.gray500,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: Palette.gray200,
  },
  bioSection: {
    marginTop: 4,
  },
  bioHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.gray800,
    marginBottom: 4,
  },
  bioText: {
    fontSize: 13,
    color: Palette.gray600,
    lineHeight: 18,
  },
  sectionHeader: {
    marginBottom: Spacing.three,
    marginTop: Spacing.two,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.gray900,
  },
  noReviewsBox: {
    backgroundColor: Palette.white,
    padding: Spacing.four,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  noReviewsText: {
    fontSize: 13,
    color: Palette.gray500,
  },
  reviewCard: {
    backgroundColor: Palette.white,
    padding: Spacing.three,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Palette.gray200,
    marginBottom: Spacing.two,
  },
  revTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  revCustomerName: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.gray800,
  },
  revServiceTag: {
    fontSize: 11,
    color: Palette.primary,
    marginBottom: 4,
  },
  revComment: {
    fontSize: 12,
    color: Palette.gray600,
    lineHeight: 18,
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
    marginTop: 8,
  },
  sectionHeaderBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
    marginTop: Spacing.two,
  },
  addReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  addReviewBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.primary,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  reviewModalCard: {
    backgroundColor: Palette.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.four,
    width: '100%',
    maxWidth: 480,
    ...Shadows.lg,
  },
  reviewModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  reviewModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.gray900,
  },
  reviewRatingBox: {
    alignItems: 'center',
    backgroundColor: Palette.gray50,
    padding: Spacing.three,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Palette.gray200,
    marginBottom: Spacing.three,
  },
  reviewRatePrompt: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.gray700,
    marginBottom: 6,
  },
  reviewRatingScore: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.gray500,
    marginTop: 4,
  },
  reviewInputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.gray700,
    marginBottom: 6,
  },
  reviewTextInput: {
    borderWidth: 1,
    borderColor: Palette.gray300,
    borderRadius: BorderRadius.md,
    padding: 10,
    fontSize: 13,
    color: Palette.gray800,
    minHeight: 80,
    textAlignVertical: 'top',
    backgroundColor: Palette.gray50,
    marginBottom: Spacing.three,
  },
  reviewActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
});
