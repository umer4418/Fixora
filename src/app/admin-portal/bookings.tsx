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
import { Palette, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useSafeBack } from '../../hooks/use-safe-back';
import { useMarketplace } from '../../context/MarketplaceContext';
import { Booking, BookingStatus } from '../../types';
import { mapStatusToOrderDisplay } from '../../services/marketplaceService';

export default function AdminBookingsScreen() {
  const { bookings, changeBookingStatus, refreshAll } = useMarketplace();
  const goBack = useSafeBack('/admin-portal');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshAll(true);
    setRefreshing(false);
  };

  // Sort orders newest first
  const sortedBookings = useMemo(() => {
    return [...bookings].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [bookings]);

  const filtered = useMemo(() => {
    return sortedBookings.filter((b) => {
      const displayStatus = (
        b.orderStatus || mapStatusToOrderDisplay(b.status)
      ).toLowerCase();

      if (selectedStatus === 'all') return true;
      if (selectedStatus === 'placed') return displayStatus === 'placed';
      if (selectedStatus === 'processing') return displayStatus === 'processing';
      if (selectedStatus === 'completed') return displayStatus === 'completed';
      if (selectedStatus === 'cancelled') return displayStatus === 'cancelled';
      return b.status === selectedStatus;
    });
  }, [sortedBookings, selectedStatus]);

  const handleUpdateStatus = (booking: Booking, newStatus: BookingStatus) => {
    const targetDisplay = mapStatusToOrderDisplay(newStatus);
    Alert.alert(
      'Confirm Status Change',
      `Change order status to "${targetDisplay}" for Order #${booking.id.slice(-6).toUpperCase()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Set to ${targetDisplay}`,
          onPress: async () => {
            try {
              await changeBookingStatus(
                booking.id,
                newStatus,
                newStatus === 'cancelled' ? 'Cancelled by Admin' : undefined
              );
            } catch {
              Alert.alert('Error', 'Failed to update order status');
            }
          },
        },
      ]
    );
  };

  const handleOpenStatusMenu = (booking: Booking) => {
    const currentDisplay = booking.orderStatus || mapStatusToOrderDisplay(booking.status);
    Alert.alert(
      `Manage Order #${booking.id.slice(-6).toUpperCase()}`,
      `Current Status: ${currentDisplay}\nSelect new status:`,
      [
        { text: 'Close', style: 'cancel' },
        {
          text: '📌 Mark Placed',
          onPress: () => handleUpdateStatus(booking, 'pending'),
        },
        {
          text: '⚙️ Mark Processing',
          onPress: () => handleUpdateStatus(booking, 'in_progress'),
        },
        {
          text: '✅ Mark Completed',
          onPress: () => handleUpdateStatus(booking, 'completed'),
        },
        {
          text: '❌ Mark Cancelled',
          style: 'destructive',
          onPress: () => handleUpdateStatus(booking, 'cancelled'),
        },
      ]
    );
  };

  const statusFilters = [
    { key: 'all', label: 'All Orders' },
    { key: 'placed', label: 'Placed' },
    { key: 'processing', label: 'Processing' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Top Navigation */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={goBack} style={styles.navBtn}>
          <Ionicons name="arrow-back" size={24} color={Palette.gray800} />
        </TouchableOpacity>
        <View style={styles.navTitleContainer}>
          <Text style={styles.navTitle}>Orders & Bookings</Text>
          <Text style={styles.navSubtitle}>{bookings.length} total orders recorded</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.navBtn}>
          <Ionicons name="refresh" size={20} color={Palette.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.container}>
        {/* Status Filter Chips */}
        <View style={styles.filterBar}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={statusFilters}
            keyExtractor={(item) => item.key}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
            renderItem={({ item }) => {
              const isSelected = selectedStatus === item.key;
              return (
                <TouchableOpacity
                  style={[styles.statusChip, isSelected && styles.statusChipSelected]}
                  onPress={() => setSelectedStatus(item.key)}
                >
                  <Text
                    style={[
                      styles.statusChipText,
                      isSelected && styles.statusChipTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* Orders List */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={48} color={Palette.gray400} />
              <Text style={styles.emptyTitle}>No Orders Found</Text>
              <Text style={styles.emptySubtitle}>
                No orders match the selected filter.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const currentDisplay = item.orderStatus || mapStatusToOrderDisplay(item.status);
            const orderNumber = item.orderId
              ? item.orderId.startsWith('ord-')
                ? `#${item.orderId.replace('ord-', '').slice(-6).toUpperCase()}`
                : `#${item.orderId}`
              : `#${item.id.slice(-6).toUpperCase()}`;

            const totalAmount =
              item.totalAmount !== undefined ? item.totalAmount : item.totalPrice;

            const paymentMethod =
              item.paymentMethod === 'cod' || item.paymentMethod === 'cash'
                ? 'Cash on Delivery'
                : item.paymentMethod === 'card'
                ? 'Credit Card'
                : item.paymentMethod
                ? item.paymentMethod.toUpperCase()
                : 'Cash on Delivery';

            const paymentStatus = item.paymentStatus
              ? item.paymentStatus.charAt(0).toUpperCase() + item.paymentStatus.slice(1)
              : 'Pending';

            const isPlaced = currentDisplay === 'Placed';
            const isProcessing = currentDisplay === 'Processing';
            const isCompleted = currentDisplay === 'Completed';
            const isCancelled = currentDisplay === 'Cancelled';

            return (
              <View style={styles.orderCard}>
                {/* Header: Order ID & Status */}
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.orderIdText}>{orderNumber}</Text>
                    <Text style={styles.serviceTitle}>{item.serviceTitle}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      isCompleted && styles.statusBadgeCompleted,
                      isProcessing && styles.statusBadgeProcessing,
                      isPlaced && styles.statusBadgePlaced,
                      isCancelled && styles.statusBadgeCancelled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        isCompleted && styles.statusTextCompleted,
                        isProcessing && styles.statusTextProcessing,
                        isPlaced && styles.statusTextPlaced,
                        isCancelled && styles.statusTextCancelled,
                      ]}
                    >
                      {currentDisplay}
                    </Text>
                  </View>
                </View>

                {/* Details Grid */}
                <View style={styles.infoGrid}>
                  <View style={styles.infoRow}>
                    <Ionicons name="person-outline" size={14} color={Palette.gray600} />
                    <Text style={styles.infoText}>
                      <Text style={styles.infoLabel}>Customer: </Text>
                      {item.customerName || 'N/A'}
                    </Text>
                  </View>

                  {item.customerEmail ? (
                    <View style={styles.infoRow}>
                      <Ionicons name="mail-outline" size={14} color={Palette.gray600} />
                      <Text style={styles.infoText}>
                        <Text style={styles.infoLabel}>Email: </Text>
                        {item.customerEmail}
                      </Text>
                    </View>
                  ) : null}

                  {item.customerPhone ? (
                    <View style={styles.infoRow}>
                      <Ionicons name="call-outline" size={14} color={Palette.gray600} />
                      <Text style={styles.infoText}>
                        <Text style={styles.infoLabel}>Phone: </Text>
                        {item.customerPhone}
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.infoRow}>
                    <Ionicons name="construct-outline" size={14} color={Palette.gray600} />
                    <Text style={styles.infoText}>
                      <Text style={styles.infoLabel}>Provider: </Text>
                      {item.providerName || 'Fixora Team'}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={14} color={Palette.gray600} />
                    <Text style={styles.infoText}>
                      <Text style={styles.infoLabel}>Date: </Text>
                      {item.date} ({item.timeSlot})
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Ionicons name="cube-outline" size={14} color={Palette.gray600} />
                    <Text style={styles.infoText}>
                      <Text style={styles.infoLabel}>Quantity: </Text>
                      {item.quantity || 1}
                    </Text>
                  </View>

                  {item.address ? (
                    <View style={styles.infoRow}>
                      <Ionicons name="location-outline" size={14} color={Palette.gray600} />
                      <Text style={styles.infoText} numberOfLines={1}>
                        <Text style={styles.infoLabel}>Address: </Text>
                        {item.address.street}, {item.address.city}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Payment & Amount Summary */}
                <View style={styles.paymentSummaryBox}>
                  <View style={styles.paymentCol}>
                    <Text style={styles.paymentLabel}>Payment</Text>
                    <Text style={styles.paymentVal}>
                      {paymentMethod} • <Text style={styles.paymentStatusVal}>{paymentStatus}</Text>
                    </Text>
                  </View>
                  <View style={styles.amountCol}>
                    <Text style={styles.paymentLabel}>Total Amount</Text>
                    <Text style={styles.amountVal}>${totalAmount}</Text>
                  </View>
                </View>

                {/* Status Quick-Switch Action Buttons */}
                <View style={styles.statusActionRow}>
                  <Text style={styles.actionSectionLabel}>Update Status:</Text>
                  <View style={styles.actionButtonsWrap}>
                    <TouchableOpacity
                      style={[
                        styles.quickStatusBtn,
                        isPlaced && styles.quickStatusBtnActive,
                      ]}
                      onPress={() => handleUpdateStatus(item, 'pending')}
                    >
                      <Text
                        style={[
                          styles.quickStatusText,
                          isPlaced && styles.quickStatusTextActive,
                        ]}
                      >
                        Placed
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.quickStatusBtn,
                        isProcessing && styles.quickStatusBtnActive,
                      ]}
                      onPress={() => handleUpdateStatus(item, 'in_progress')}
                    >
                      <Text
                        style={[
                          styles.quickStatusText,
                          isProcessing && styles.quickStatusTextActive,
                        ]}
                      >
                        Processing
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.quickStatusBtn,
                        isCompleted && styles.quickStatusBtnActive,
                      ]}
                      onPress={() => handleUpdateStatus(item, 'completed')}
                    >
                      <Text
                        style={[
                          styles.quickStatusText,
                          isCompleted && styles.quickStatusTextActive,
                        ]}
                      >
                        Completed
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.quickStatusBtn,
                        styles.quickCancelBtn,
                        isCancelled && styles.quickCancelBtnActive,
                      ]}
                      onPress={() => handleUpdateStatus(item, 'cancelled')}
                    >
                      <Text
                        style={[
                          styles.quickStatusText,
                          styles.quickCancelText,
                          isCancelled && styles.quickCancelTextActive,
                        ]}
                      >
                        Cancelled
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.moreOptionsBtn}
                      onPress={() => handleOpenStatusMenu(item)}
                    >
                      <Ionicons name="ellipsis-horizontal" size={16} color={Palette.gray700} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
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
    padding: 6,
  },
  navTitleContainer: {
    alignItems: 'center',
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.gray900,
  },
  navSubtitle: {
    fontSize: 11,
    color: Palette.gray500,
    marginTop: 1,
  },
  filterBar: {
    paddingVertical: 10,
    backgroundColor: Palette.white,
    borderBottomWidth: 1,
    borderBottomColor: Palette.gray200,
  },
  statusChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    backgroundColor: Palette.gray100,
  },
  statusChipSelected: {
    backgroundColor: Palette.primary,
  },
  statusChipText: {
    fontSize: 12,
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.gray800,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Palette.gray500,
  },
  orderCard: {
    backgroundColor: Palette.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.four,
    marginBottom: Spacing.three,
    borderWidth: 1,
    borderColor: Palette.gray200,
    ...Shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  orderIdText: {
    fontSize: 12,
    color: Palette.primary,
    fontWeight: '800',
  },
  serviceTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.gray900,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: Palette.gray100,
  },
  statusBadgePlaced: {
    backgroundColor: '#EFF6FF',
  },
  statusBadgeProcessing: {
    backgroundColor: '#FEF3C7',
  },
  statusBadgeCompleted: {
    backgroundColor: '#D1FAE5',
  },
  statusBadgeCancelled: {
    backgroundColor: '#FEE2E2',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.gray700,
  },
  statusTextPlaced: {
    color: '#1D4ED8',
  },
  statusTextProcessing: {
    color: '#B45309',
  },
  statusTextCompleted: {
    color: '#047857',
  },
  statusTextCancelled: {
    color: '#B91C1C',
  },
  infoGrid: {
    gap: 6,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Palette.gray100,
    borderBottomWidth: 1,
    borderBottomColor: Palette.gray100,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoLabel: {
    fontWeight: '700',
    color: Palette.gray700,
  },
  infoText: {
    fontSize: 12,
    color: Palette.gray600,
    flex: 1,
  },
  paymentSummaryBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Palette.gray50,
    borderRadius: BorderRadius.sm,
    padding: 10,
    marginVertical: 10,
  },
  paymentCol: {
    gap: 2,
  },
  paymentLabel: {
    fontSize: 11,
    color: Palette.gray500,
    fontWeight: '600',
  },
  paymentVal: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.gray800,
  },
  paymentStatusVal: {
    color: Palette.primary,
  },
  amountCol: {
    alignItems: 'flex-end',
    gap: 2,
  },
  amountVal: {
    fontSize: 15,
    fontWeight: '800',
    color: Palette.gray900,
  },
  statusActionRow: {
    marginTop: 2,
  },
  actionSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.gray600,
    marginBottom: 6,
  },
  actionButtonsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  quickStatusBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    backgroundColor: Palette.gray100,
    borderWidth: 1,
    borderColor: Palette.gray200,
  },
  quickStatusBtnActive: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  quickStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.gray700,
  },
  quickStatusTextActive: {
    color: Palette.white,
  },
  quickCancelBtn: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  quickCancelBtnActive: {
    backgroundColor: Palette.danger,
    borderColor: Palette.danger,
  },
  quickCancelText: {
    color: Palette.danger,
  },
  quickCancelTextActive: {
    color: Palette.white,
  },
  moreOptionsBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    backgroundColor: Palette.gray100,
    borderWidth: 1,
    borderColor: Palette.gray200,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
