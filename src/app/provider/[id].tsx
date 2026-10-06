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
import { StarRating } from '../../components/common/StarRating';
import { ServiceCard } from '../../components/marketplace/ServiceCard';
import { Button } from '../../components/common/Button';

export default function ProviderProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { providers, services, reviews } = useMarketplace();

  const provider = useMemo(() => {
    return providers.find((p) => p.id === id);
  }, [providers, id]);

  const providerServices = useMemo(() => {
    return services.filter((s) => s.providerId === id);
  }, [services, id]);

  const providerReviews = useMemo(() => {
    return reviews.filter((r) => r.providerId === id);
  }, [reviews, id]);

  if (!provider) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Palette.danger} />
          <Text style={styles.errorTitle}>Provider Not Found</Text>
          <Button title="Go Back" onPress={() => router.back()} style={{ marginTop: 12 }} />
        </View>
      </SafeAreaView>
    );
  }

  const isAvailable = provider.availabilityStatus === 'available';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Header bar */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
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
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Reviews ({providerReviews.length})</Text>
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
});
