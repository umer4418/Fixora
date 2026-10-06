import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Palette, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useMarketplace } from '../../context/MarketplaceContext';
import { Booking } from '../../types';
import { Badge } from '../../components/common/Badge';

export default function AdminBookingsScreen() {
  const { bookings, changeBookingStatus } = useMarketplace();

  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const filtered = useMemo(() => {
    if (selectedStatus === 'all') return bookings;
    return bookings.filter((b) => b.status === selectedStatus);
  }, [bookings, selectedStatus]);

  const handleOverrideStatus = (booking: Booking) => {
    Alert.alert(
      'Admin Status Override',
      `Modify status for order #${booking.id.slice(-6).toUpperCase()}:`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Completed',
          onPress: () => changeBookingStatus(booking.id, 'completed'),
        },
        {
          text: 'Mark In Progress',
          onPress: () => changeBookingStatus(booking.id, 'in_progress'),
        },
        {
          text: 'Force Cancel',
          style: 'destructive',
          onPress: () => changeBookingStatus(booking.id, 'cancelled', 'Admin intervention'),
        },
      ]
    );
  };

  const statuses = ['all', 'pending', 'accepted', 'in_progress', 'completed', 'cancelled'];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
          <Ionicons name="arrow-back" size={24} color={Palette.gray800} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>All Bookings ({bookings.length})</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.container}>
        {/* Status filter bar */}
        <View style={styles.filterBar}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={statuses}
            keyExtractor={(item) => item}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
            renderItem={({ item }) => {
              const isSelected = selectedStatus === item;
              return (
                <TouchableOpacity
                  style={[styles.statusChip, isSelected && styles.statusChipSelected]}
                  onPress={() => setSelectedStatus(item)}
                >
                  <Text
                    style={[
                      styles.statusChipText,
                      isSelected && styles.statusChipTextSelected,
                    ]}
                  >
                    {item.replace(/_/g, ' ').toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.bookingCard}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.bookingId}>#{item.id.slice(-6).toUpperCase()}</Text>
                  <Text style={styles.serviceTitle}>{item.serviceTitle}</Text>
                </View>
                <Badge status={item.status} />
              </View>

              <View style={styles.infoGrid}>
                <Text style={styles.infoText}>👤 Customer: {item.customerName}</Text>
                <Text style={styles.infoText}>👨‍🔧 Provider: {item.providerName}</Text>
                <Text style={styles.infoText}>📅 Date: {item.date} ({item.timeSlot})</Text>
                <Text style={styles.infoText}>📍 {item.address.street}, {item.address.city}</Text>
              </View>

              <View style={styles.footerRow}>
                <Text style={styles.priceText}>
                  Amount: <Text style={styles.priceBold}>${item.totalPrice}</Text> ({item.paymentMethod.toUpperCase()})
                </Text>

                <TouchableOpacity
                  style={styles.overrideBtn}
                  onPress={() => handleOverrideStatus(item)}
                >
                  <Ionicons name="settings-outline" size={14} color={Palette.primary} />
                  <Text style={styles.overrideText}>Override</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
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
  filterBar: {
    paddingVertical: 10,
    backgroundColor: Palette.white,
    borderBottomWidth: 1,
    borderBottomColor: Palette.gray200,
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Palette.gray100,
  },
  statusChipSelected: {
    backgroundColor: Palette.primary,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.gray600,
  },
  statusChipTextSelected: {
    color: Palette.white,
  },
  listContent: {
    padding: Spacing.four,
    paddingBottom: Spacing.six,
  },
  bookingCard: {
    backgroundColor: Palette.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.three,
    marginBottom: Spacing.three,
    borderWidth: 1,
    borderColor: Palette.gray200,
    ...Shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bookingId: {
    fontSize: 11,
    color: Palette.gray400,
    fontWeight: '700',
  },
  serviceTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.gray900,
  },
  infoGrid: {
    gap: 4,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: Palette.gray600,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Palette.gray100,
    paddingTop: 8,
    marginTop: 4,
  },
  priceText: {
    fontSize: 12,
    color: Palette.gray700,
  },
  priceBold: {
    fontWeight: '800',
    color: Palette.gray900,
  },
  overrideBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    backgroundColor: Palette.primarySoft,
  },
  overrideText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.primary,
  },
});
