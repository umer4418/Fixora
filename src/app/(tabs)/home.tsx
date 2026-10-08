import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Palette, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useMarketplace } from '../../context/MarketplaceContext';
import { Header } from '../../components/common/Header';
import { CategoryCard } from '../../components/marketplace/CategoryCard';
import { ServiceCard } from '../../components/marketplace/ServiceCard';
import { ProviderCard } from '../../components/marketplace/ProviderCard';
import { AddressSelectorModal } from '../../components/marketplace/AddressSelectorModal';

export default function HomeScreen() {
  const { categories, services, providers, bookings, notifications, refreshAll } = useMarketplace();
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshAll(true);
    setRefreshing(false);
  };

  const displayedServices = useMemo(() => {
    if (selectedCatId) {
      return services.filter((s) => s.categoryId === selectedCatId);
    }
    const popular = services.filter((s) => s.isPopular);
    return popular.length > 0 ? popular : services.slice(0, 10);
  }, [services, selectedCatId]);

  const newAndTrendingServices = useMemo(() => {
    return [...services]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
  }, [services]);

  const activeBooking = bookings.find(
    (b) => b.status === 'in_progress' || b.status === 'accepted' || b.status === 'on_the_way'
  );

  const activeBookingUnreadChat = useMemo(() => {
    if (!activeBooking) return false;
    return notifications.some(
      (n) =>
        n.type === 'chat' &&
        !n.read &&
        (n.bookingId === activeBooking.id ||
          (activeBooking.orderId && n.bookingId === activeBooking.orderId))
    );
  }, [activeBooking, notifications]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header onLocationPress={() => setAddressModalVisible(true)} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Search Bar Input (taps into Explore) */}
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => router.push('/explore')}
          activeOpacity={0.8}
        >
          <Ionicons name="search" size={20} color={Palette.gray400} />
          <Text style={styles.searchPlaceholder}>Search for AC repair, cleaning, plumber...</Text>
          <View style={styles.searchFilterIcon}>
            <Ionicons name="options-outline" size={18} color={Palette.primary} />
          </View>
        </TouchableOpacity>

        {/* Active Booking Tracker Banner */}
        {activeBooking && (
          <TouchableOpacity
            style={styles.activeBookingCard}
            onPress={() =>
              router.push({
                pathname: activeBookingUnreadChat ? '/chat/[id]' : '/booking/[id]',
                params: { id: activeBooking.id },
              })
            }
            activeOpacity={0.8}
          >
            <View style={styles.activeBookingHeader}>
              <View style={styles.pulseDot} />
              <Text style={styles.activeBookingTitle}>
                Active Service: {activeBooking.serviceTitle}
              </Text>
              {activeBookingUnreadChat && (
                <View style={styles.activeChatBadgePill}>
                  <Ionicons name="chatbubble-ellipses" size={12} color="#FFFFFF" />
                  <Text style={styles.activeChatBadgeText}>New message</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={16} color={Palette.white} />
            </View>
            <Text style={styles.activeBookingSub}>
              Status: {activeBooking.status.replace(/_/g, ' ').toUpperCase()} • Provider: {activeBooking.providerName}
            </Text>
          </TouchableOpacity>
        )}

        {/* Promotional Hero Banner */}
        <View style={styles.heroBanner}>
          <View style={styles.heroTextCol}>
            <View style={styles.heroTag}>
              <Text style={styles.heroTagText}>SPRING HOME MAKEOVER</Text>
            </View>
            <Text style={styles.heroTitle}>Up to 25% OFF Home Deep Cleaning</Text>
            <Text style={styles.heroSubtitle}>Verified background-checked pros at your door.</Text>
            <TouchableOpacity
              style={styles.heroCta}
              onPress={() =>
                router.push({
                  pathname: '/explore',
                  params: { categoryId: 'cat-cleaning', categoryName: 'Home Cleaning' },
                })
              }
            >
              <Text style={styles.heroCtaText}>Book Now</Text>
              <Ionicons name="arrow-forward" size={14} color={Palette.white} />
            </TouchableOpacity>
          </View>
          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500&auto=format&fit=crop&q=80',
            }}
            style={styles.heroImage}
          />
        </View>

        {/* Categories Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <TouchableOpacity onPress={() => router.push('/explore')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScroll}
        >
          {categories.map((cat) => (
            <CategoryCard key={cat.id} category={cat} />
          ))}
        </ScrollView>

        {/* New & Trending Services Section */}
        {newAndTrendingServices.length > 0 && (
          <View>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>New & Trending Services</Text>
                <Text style={styles.sectionSubtitle}>Fresh additions & specialized home care</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/explore')}>
                <Text style={styles.seeAllText}>Explore All</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalServicesScroll}
            >
              {newAndTrendingServices.map((service) => (
                <ServiceCard key={service.id} service={service} horizontal />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Popular Services Section */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              {selectedCatId
                ? categories.find((c) => c.id === selectedCatId)?.name || 'Services'
                : 'Popular Services'}
            </Text>
            <Text style={styles.sectionSubtitle}>
              {selectedCatId
                ? `${displayedServices.length} verified services available`
                : 'Most requested by customers this week'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() =>
              router.push(
                selectedCatId
                  ? { pathname: '/explore', params: { categoryId: selectedCatId } }
                  : '/explore'
              )
            }
          >
            <Text style={styles.seeAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Category Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPillsScroll}
        >
          <TouchableOpacity
            style={[
              styles.categoryPill,
              selectedCatId === null && styles.categoryPillActive,
            ]}
            onPress={() => setSelectedCatId(null)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.categoryPillText,
                selectedCatId === null && styles.categoryPillTextActive,
              ]}
            >
              All Popular
            </Text>
          </TouchableOpacity>

          {categories.map((cat) => {
            const isSelected = selectedCatId === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryPill,
                  isSelected && styles.categoryPillActive,
                ]}
                onPress={() => setSelectedCatId(isSelected ? null : cat.id)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    isSelected && styles.categoryPillTextActive,
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.servicesGrid}>
          {displayedServices.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </View>

        {/* Top-Rated Service Providers */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Top-Rated Professionals</Text>
            <Text style={styles.sectionSubtitle}>Verified & licensed local experts</Text>
          </View>
        </View>

        <View style={styles.providersList}>
          {providers.slice(0, 3).map((provider) => (
            <ProviderCard key={provider.id} provider={provider} />
          ))}
        </View>

        {/* Why Choose Fixora Features */}
        <View style={styles.whyFixoraCard}>
          <Text style={styles.whyFixoraTitle}>Why Choose Fixora?</Text>
          
          <View style={styles.whyFeatureRow}>
            <View style={styles.whyIconBox}>
              <Ionicons name="shield-checkmark" size={20} color={Palette.primary} />
            </View>
            <View style={styles.whyTextBox}>
              <Text style={styles.whyFeatureHeading}>100% Verified Professionals</Text>
              <Text style={styles.whyFeatureDesc}>Thorough background checks and police verification.</Text>
            </View>
          </View>

          <View style={styles.whyFeatureRow}>
            <View style={styles.whyIconBox}>
              <Ionicons name="pricetag" size={20} color={Palette.accent} />
            </View>
            <View style={styles.whyTextBox}>
              <Text style={styles.whyFeatureHeading}>Transparent & Upfront Pricing</Text>
              <Text style={styles.whyFeatureDesc}>No hidden inspection charges or surprises.</Text>
            </View>
          </View>

          <View style={styles.whyFeatureRow}>
            <View style={styles.whyIconBox}>
              <Ionicons name="ribbon" size={20} color={Palette.warning} />
            </View>
            <View style={styles.whyTextBox}>
              <Text style={styles.whyFeatureHeading}>30-Day Service Guarantee</Text>
              <Text style={styles.whyFeatureDesc}>Free rework or refund if you are not satisfied.</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <AddressSelectorModal
        visible={addressModalVisible}
        onClose={() => setAddressModalVisible(false)}
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
  contentContainer: {
    padding: Spacing.four,
    paddingBottom: 96,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.white,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Palette.gray200,
    marginBottom: Spacing.three,
    ...Shadows.sm,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 13,
    color: Palette.gray400,
    marginLeft: 8,
  },
  searchFilterIcon: {
    padding: 2,
  },
  activeBookingCard: {
    backgroundColor: Palette.gray900,
    borderRadius: BorderRadius.lg,
    padding: Spacing.three,
    marginBottom: Spacing.three,
    ...Shadows.md,
  },
  activeBookingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Palette.accent,
    marginRight: 8,
  },
  activeBookingTitle: {
    color: Palette.white,
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  activeChatBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    marginRight: 8,
  },
  activeChatBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  activeBookingSub: {
    color: Palette.gray300,
    fontSize: 12,
    marginLeft: 16,
  },
  heroBanner: {
    flexDirection: 'row',
    backgroundColor: '#1E40AF',
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    padding: Spacing.four,
    marginBottom: Spacing.four,
    ...Shadows.md,
  },
  heroTextCol: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: Spacing.two,
  },
  heroTag: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  heroTagText: {
    color: Palette.white,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroTitle: {
    color: Palette.white,
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 22,
    marginBottom: 4,
  },
  heroSubtitle: {
    color: '#93C5FD',
    fontSize: 11,
    marginBottom: 12,
  },
  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.primaryDark,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  heroCtaText: {
    color: Palette.white,
    fontSize: 12,
    fontWeight: '700',
  },
  heroImage: {
    width: 90,
    height: 110,
    borderRadius: BorderRadius.md,
    resizeMode: 'cover',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: Spacing.three,
    marginTop: Spacing.two,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.gray900,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: Palette.gray500,
    marginTop: 2,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.primary,
  },
  categoriesScroll: {
    paddingRight: Spacing.two,
    marginBottom: Spacing.three,
  },
  horizontalServicesScroll: {
    paddingRight: Spacing.two,
    marginBottom: Spacing.three,
  },
  filterPillsScroll: {
    paddingRight: Spacing.two,
    marginBottom: Spacing.three,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    backgroundColor: Palette.white,
    borderWidth: 1,
    borderColor: Palette.gray200,
  },
  categoryPillActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.gray600,
  },
  categoryPillTextActive: {
    color: Palette.white,
    fontWeight: '700',
  },
  servicesGrid: {
    marginBottom: Spacing.three,
  },
  providersList: {
    marginBottom: Spacing.three,
  },
  whyFixoraCard: {
    backgroundColor: Palette.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: Palette.gray200,
    marginTop: Spacing.two,
    ...Shadows.sm,
  },
  whyFixoraTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.gray900,
    marginBottom: Spacing.three,
  },
  whyFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  whyIconBox: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Palette.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.three,
  },
  whyTextBox: {
    flex: 1,
  },
  whyFeatureHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.gray900,
  },
  whyFeatureDesc: {
    fontSize: 11,
    color: Palette.gray500,
    marginTop: 2,
  },
});
