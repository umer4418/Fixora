import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Palette, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { useMarketplace } from '../context/MarketplaceContext';
import { AppNotification } from '../types';

export default function NotificationsScreen() {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useMarketplace();

  const handleNotificationPress = async (notif: AppNotification) => {
    await markNotificationRead(notif.id);
    if (notif.bookingId) {
      router.push({
        pathname: '/booking/[id]',
        params: { id: notif.bookingId },
      });
    }
  };

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'booking':
        return { name: 'calendar' as const, color: Palette.primary, bg: Palette.primarySoft };
      case 'chat':
        return { name: 'chatbubble' as const, color: Palette.purple, bg: Palette.purpleSoft };
      case 'promo':
        return { name: 'gift' as const, color: Palette.accent, bg: Palette.accentSoft };
      default:
        return { name: 'notifications' as const, color: Palette.warning, bg: Palette.warningSoft };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
          <Ionicons name="arrow-back" size={24} color={Palette.gray800} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Notifications</Text>
        <TouchableOpacity onPress={markAllAllRead} style={styles.markAllBtn}>
          <Text style={styles.markAllText}>Mark Read</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const iconMeta = getIcon(item.type);
          return (
            <TouchableOpacity
              style={[styles.notificationCard, !item.read && styles.unreadCard]}
              onPress={() => handleNotificationPress(item)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBox, { backgroundColor: iconMeta.bg }]}>
                <Ionicons name={iconMeta.name} size={20} color={iconMeta.color} />
              </View>

              <View style={styles.contentCol}>
                <View style={styles.titleRow}>
                  <Text style={[styles.title, !item.read && styles.unreadTitle]}>
                    {item.title}
                  </Text>
                  {!item.read && <View style={styles.unreadDot} />}
                </View>

                <Text style={styles.message}>{item.message}</Text>
                <Text style={styles.timeText}>
                  {new Date(item.createdAt).toLocaleDateString()}{' '}
                  {new Date(item.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={48} color={Palette.gray400} />
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptySub}>
              You&apos;re all caught up! Updates regarding your bookings will appear here.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );

  async function markAllAllRead() {
    await markAllNotificationsRead();
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.white,
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
  markAllBtn: {
    padding: 4,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.primary,
  },
  listContent: {
    padding: Spacing.four,
    backgroundColor: Palette.gray50,
    flexGrow: 1,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: Palette.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.three,
    marginBottom: Spacing.two,
    borderWidth: 1,
    borderColor: Palette.gray200,
    ...Shadows.sm,
  },
  unreadCard: {
    borderColor: Palette.primary,
    backgroundColor: '#F0F7FF',
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.three,
  },
  contentCol: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.gray900,
  },
  unreadTitle: {
    fontWeight: '800',
    color: Palette.gray900,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Palette.primary,
  },
  message: {
    fontSize: 12,
    color: Palette.gray600,
    lineHeight: 18,
    marginTop: 2,
  },
  timeText: {
    fontSize: 10,
    color: Palette.gray400,
    marginTop: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 90,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.gray800,
    marginTop: 10,
  },
  emptySub: {
    fontSize: 13,
    color: Palette.gray500,
    textAlign: 'center',
    marginTop: 4,
  },
});
