import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Palette, Spacing, BorderRadius } from '../../constants/theme';
import { useMarketplace } from '../../context/MarketplaceContext';
import { useAuth } from '../../context/AuthContext';
import { Booking } from '../../types';
import { Header } from '../../components/common/Header';
import { BookingCard } from '../../components/marketplace/BookingCard';
import { ReviewModal } from '../../components/marketplace/ReviewModal';

type FilterTab = 'all' | 'pending' | 'active' | 'completed' | 'cancelled';

export default function BookingsScreen() {
  const { bookings, changeBookingStatus, refreshAll } = useMarketplace();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  };

  const userBookings = useMemo(() => {
    // Show bookings for current user (or demo customer)
    return bookings.filter(
      (b) => b.customerId === user?.id || b.customerId === 'cust-demo'
    );
  }, [bookings, user?.id]);

  const filteredBookings = useMemo(() => {
    return userBookings.filter((b) => {
      if (activeTab === 'all') return true;
      if (activeTab === 'pending') return b.status === 'pending';
      if (activeTab === 'active')
        return b.status === 'accepted' || b.status === 'on_the_way' || b.status === 'in_progress';
      if (activeTab === 'completed') return b.status === 'completed';
      if (activeTab === 'cancelled') return b.status === 'cancelled';
      return true;
    });
  }, [userBookings, activeTab]);

  const handleCancel = (booking: Booking) => {
    Alert.alert(
      'Cancel Booking',
      `Are you sure you want to cancel your booking for ${booking.serviceTitle}?`,
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

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'pending', label: 'Pending' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header title="My Bookings" showLocation={false} />

      <View style={styles.container}>
        {/* Status Filter Tab Pills */}
        <View style={styles.tabBar}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Bookings List */}
        <FlatList
          data={filteredBookings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <BookingCard
              booking={item}
              onReviewPress={(b) => setReviewBooking(b)}
              onCancelPress={handleCancel}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="calendar-outline" size={44} color={Palette.gray400} />
              </View>
              <Text style={styles.emptyTitle}>No Bookings Found</Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'all'
                  ? 'You haven’t placed any service bookings yet.'
                  : `You have no ${activeTab} bookings.`}
              </Text>
              <TouchableOpacity
                style={styles.exploreBtn}
                onPress={() => router.push('/explore')}
              >
                <Text style={styles.exploreBtnText}>Browse Services</Text>
              </TouchableOpacity>
            </View>
          }
        />
      </View>

      <ReviewModal
        visible={!!reviewBooking}
        booking={reviewBooking}
        onClose={() => setReviewBooking(null)}
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
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Palette.white,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: Palette.gray200,
    gap: 8,
  },
  tabButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
    backgroundColor: Palette.gray100,
  },
  tabButtonActive: {
    backgroundColor: Palette.primary,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.gray600,
  },
  tabButtonTextActive: {
    color: Palette.white,
  },
  listContent: {
    padding: Spacing.four,
    paddingBottom: 96,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 70,
    paddingHorizontal: 20,
  },
  emptyIconBox: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Palette.gray200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.gray800,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Palette.gray500,
    textAlign: 'center',
    marginBottom: Spacing.four,
  },
  exploreBtn: {
    backgroundColor: Palette.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
  },
  exploreBtnText: {
    color: Palette.white,
    fontWeight: '700',
    fontSize: 13,
  },
});
