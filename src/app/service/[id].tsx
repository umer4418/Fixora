import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { Palette, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useMarketplace } from '../../context/MarketplaceContext';
import { useSafeBack } from '../../hooks/use-safe-back';
import { StarRating } from '../../components/common/StarRating';
import { Button } from '../../components/common/Button';

export default function ServiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { services, providers, reviews, isFavorite, toggleFavorite } = useMarketplace();
  const goBack = useSafeBack();

  const service = useMemo(() => {
    return services.find((s) => s.id === id);
  }, [services, id]);

  const provider = useMemo(() => {
    if (!service) return null;
    return providers.find((p) => p.id === service.providerId);
  }, [providers, service]);

  const serviceReviews = useMemo(() => {
    if (!service) return [];
    return reviews.filter((r) => r.serviceId === service.id);
  }, [reviews, service]);

  if (!service) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Palette.danger} />
          <Text style={styles.errorTitle}>Service Not Found</Text>
          <Button title="Go Back" onPress={goBack} style={{ marginTop: 12 }} />
        </View>
      </SafeAreaView>
    );
  }

  const isFav = isFavorite(service.id);

  const handleBookNow = () => {
    router.push({
      pathname: '/book/[serviceId]',
      params: { serviceId: service.id },
    });
  };

  const handleViewProvider = () => {
    if (provider) {
      router.push({
        pathname: '/provider/[id]',
        params: { id: provider.id },
      });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Top Header Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={goBack}
          style={styles.navBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={Palette.gray800} />
        </TouchableOpacity>

        <Text style={styles.navTitle} numberOfLines={1}>
          Service Details
        </Text>

        <TouchableOpacity
          onPress={() => toggleFavorite(service.id)}
          style={styles.navBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={isFav ? 'heart' : 'heart-outline'}
            size={24}
            color={isFav ? Palette.danger : Palette.gray800}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Service Hero Image */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: service.imageUrl }} style={styles.image} />
          <View style={styles.categoryChip}>
            <Text style={styles.categoryChipText}>{service.categoryName}</Text>
          </View>
        </View>

        <View style={styles.mainInfo}>
          <Text style={styles.title}>{service.title}</Text>

          <View style={styles.ratingAndDuration}>
            <StarRating
              rating={service.rating}
              reviewsCount={service.reviewsCount}
              size={14}
            />
            <View style={styles.durationBadge}>
              <Ionicons name="time-outline" size={14} color={Palette.gray600} />
              <Text style={styles.durationText}>{service.duration}</Text>
            </View>
          </View>

          {/* Pricing Row */}
          <View style={styles.priceContainer}>
            <View style={styles.priceCol}>
              <Text style={styles.priceLabel}>Fixed Price</Text>
              <View style={styles.priceRow}>
                <Text style={styles.price}>${service.price}</Text>
                {service.originalPrice && (
                  <Text style={styles.originalPrice}>${service.originalPrice}</Text>
                )}
              </View>
            </View>

            {service.originalPrice && (
              <View style={styles.savingsTag}>
                <Text style={styles.savingsText}>
                  Save ${service.originalPrice - service.price}
                </Text>
              </View>
            )}
          </View>

          {/* Provider Card */}
          {provider && (
            <TouchableOpacity
              style={styles.providerCard}
              onPress={handleViewProvider}
              activeOpacity={0.8}
            >
              <Image source={{ uri: provider.avatar }} style={styles.providerAvatar} />
              <View style={styles.providerInfo}>
                <View style={styles.providerNameRow}>
                  <Text style={styles.providerName}>{provider.name}</Text>
                  {provider.isVerified && (
                    <Ionicons name="checkmark-circle" size={16} color={Palette.primary} />
                  )}
                </View>
                <Text style={styles.providerRole}>Verified Professional</Text>
                <StarRating rating={provider.rating || 5.0} size={11} />
              </View>
              <View style={styles.viewProviderBtn}>
                <Text style={styles.viewProviderText}>View</Text>
                <Ionicons name="chevron-forward" size={14} color={Palette.primary} />
              </View>
            </TouchableOpacity>
          )}

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Description</Text>
            <Text style={styles.description}>{service.description}</Text>
          </View>

          {/* What's Included / Features */}
          {service.features && service.features.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionHeading}>What’s Included</Text>
              <View style={styles.featuresList}>
                {service.features.map((feature, idx) => (
                  <View key={idx} style={styles.featureItem}>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={18}
                      color={Palette.accent}
                    />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Customer Reviews Section */}
          <View style={styles.section}>
            <View style={styles.reviewsHeader}>
              <Text style={styles.sectionHeading}>
                Customer Reviews ({serviceReviews.length})
              </Text>
            </View>

            {serviceReviews.length === 0 ? (
              <Text style={styles.noReviewsText}>
                No reviews yet. Be the first to book and review!
              </Text>
            ) : (
              serviceReviews.map((rev) => (
                <View key={rev.id} style={styles.reviewCard}>
                  <View style={styles.reviewTopRow}>
                    <View style={styles.reviewerInfo}>
                      {rev.customerAvatar ? (
                        <Image source={{ uri: rev.customerAvatar }} style={styles.revAvatar} />
                      ) : (
                        <View style={styles.revAvatarFallback}>
                          <Ionicons name="person" size={14} color={Palette.gray600} />
                        </View>
                      )}
                      <Text style={styles.reviewerName}>{rev.customerName}</Text>
                    </View>
                    <StarRating rating={rev.rating} size={12} />
                  </View>
                  <Text style={styles.reviewComment}>{rev.comment}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Booking Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomPriceCol}>
          <Text style={styles.bottomPriceLabel}>Total Amount</Text>
          <Text style={styles.bottomPriceValue}>${service.price}</Text>
        </View>

        <Button
          title="Book This Service"
          onPress={handleBookNow}
          icon="calendar"
          size="lg"
          style={styles.bottomBookBtn}
        />
      </View>
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
    paddingBottom: 40,
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
    flex: 1,
    textAlign: 'center',
  },
  imageContainer: {
    position: 'relative',
    height: 220,
    width: '100%',
    backgroundColor: Palette.gray200,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  categoryChip: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    backgroundColor: Palette.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  categoryChipText: {
    color: Palette.white,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  mainInfo: {
    padding: Spacing.four,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Palette.gray900,
    lineHeight: 26,
    marginBottom: 8,
  },
  ratingAndDuration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: Spacing.three,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.gray100,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  durationText: {
    fontSize: 12,
    color: Palette.gray600,
  },
  priceContainer: {
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
  priceCol: {},
  priceLabel: {
    fontSize: 11,
    color: Palette.gray500,
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 2,
  },
  price: {
    fontSize: 22,
    fontWeight: '800',
    color: Palette.gray900,
  },
  originalPrice: {
    fontSize: 14,
    color: Palette.gray400,
    textDecorationLine: 'line-through',
  },
  savingsTag: {
    backgroundColor: Palette.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Palette.accent,
  },
  savingsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },
  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: Palette.gray200,
    marginBottom: Spacing.four,
    ...Shadows.sm,
  },
  providerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: Spacing.three,
  },
  providerInfo: {
    flex: 1,
  },
  providerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  providerName: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.gray900,
  },
  providerRole: {
    fontSize: 11,
    color: Palette.gray500,
    marginBottom: 3,
  },
  viewProviderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: Palette.primarySoft,
    borderRadius: BorderRadius.sm,
  },
  viewProviderText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.primary,
  },
  section: {
    backgroundColor: Palette.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: Palette.gray200,
    marginBottom: Spacing.three,
    ...Shadows.sm,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.gray900,
    marginBottom: 8,
  },
  description: {
    fontSize: 13,
    color: Palette.gray600,
    lineHeight: 20,
  },
  featuresList: {
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 13,
    color: Palette.gray700,
  },
  reviewsHeader: {
    marginBottom: 8,
  },
  noReviewsText: {
    fontSize: 13,
    color: Palette.gray500,
    fontStyle: 'italic',
  },
  reviewCard: {
    borderTopWidth: 1,
    borderTopColor: Palette.gray100,
    paddingTop: 8,
    marginTop: 8,
  },
  reviewTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  revAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  revAvatarFallback: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Palette.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewerName: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.gray800,
  },
  reviewComment: {
    fontSize: 12,
    color: Palette.gray600,
    lineHeight: 18,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    backgroundColor: Palette.white,
    borderTopWidth: 1,
    borderTopColor: Palette.gray200,
    ...Shadows.md,
  },
  bottomPriceCol: {},
  bottomPriceLabel: {
    fontSize: 11,
    color: Palette.gray500,
  },
  bottomPriceValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Palette.gray900,
  },
  bottomBookBtn: {
    flex: 1,
    marginLeft: Spacing.four,
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
});
