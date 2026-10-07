import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Palette, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useMarketplace } from '../../context/MarketplaceContext';
import { Badge } from './Badge';

interface HeaderProps {
  showBack?: boolean;
  title?: string;
  showLocation?: boolean;
  onLocationPress?: () => void;
  rightAction?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  showBack = false,
  title,
  showLocation = true,
  onLocationPress,
  rightAction,
}) => {
  const { activeRole } = useAuth();
  const { unreadNotificationsCount, selectedAddress } = useMarketplace();

  return (
    <View style={styles.container}>
      <View style={styles.leftRow}>
        {showBack ? (
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={Palette.gray800} />
          </TouchableOpacity>
        ) : null}

        {title ? (
          <Text style={styles.titleText} numberOfLines={1}>
            {title}
          </Text>
        ) : (
          <View style={styles.brandRow}>
            <View style={styles.logoBadge}>
              <Ionicons name="home" size={16} color={Palette.white} />
            </View>
            <Text style={styles.brandName}>Fixora</Text>
            {activeRole && activeRole !== 'customer' && (
              <Badge role={activeRole} style={{ marginLeft: 6 }} />
            )}
          </View>
        )}
      </View>

      <View style={styles.rightRow}>
        {showLocation && !title && (
          <TouchableOpacity
            style={styles.locationButton}
            onPress={onLocationPress}
            activeOpacity={0.7}
          >
            <Ionicons name="location-sharp" size={14} color={Palette.primary} />
            <Text style={styles.locationText} numberOfLines={1}>
              {selectedAddress
                ? `${selectedAddress.label}: ${selectedAddress.city}`
                : 'Select Location'}
            </Text>
            <Ionicons name="chevron-down" size={12} color={Palette.gray500} />
          </TouchableOpacity>
        )}

        {rightAction ? (
          rightAction
        ) : (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/notifications')}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={22} color={Palette.gray800} />
            {unreadNotificationsCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationCount}>
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    backgroundColor: Palette.white,
    borderBottomWidth: 1,
    borderBottomColor: Palette.gray200,
    ...Shadows.sm,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: Spacing.three,
    padding: 2,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBadge: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.sm,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  brandName: {
    fontSize: 20,
    fontWeight: '800',
    color: Palette.primary,
    letterSpacing: -0.5,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '700',
    color: Palette.gray900,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    maxWidth: 160,
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.primary,
    maxWidth: 100,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    backgroundColor: Palette.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Palette.danger,
    borderRadius: BorderRadius.full,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notificationCount: {
    color: Palette.white,
    fontSize: 10,
    fontWeight: '700',
  },
});
