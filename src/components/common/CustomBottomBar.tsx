import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { Palette } from '../../constants/theme';
import { useMarketplace } from '../../context/MarketplaceContext';

interface CustomBottomBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

export const CustomBottomBar: React.FC<CustomBottomBarProps> = ({
  state,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { bookings, notifications } = useMarketplace();

  const unreadChatCount = notifications.filter((n) => n.type === 'chat' && !n.read).length;

  const activeBookingsCount = bookings.filter(
    (b) =>
      b.status === 'pending' ||
      b.status === 'accepted' ||
      b.status === 'in_progress' ||
      b.status === 'on_the_way'
  ).length;

  const routes = state.routes;
  const currentRouteName = routes[state.index]?.name;

  const homeRoute = routes.find((r: any) => r.name === 'home' || r.name === 'index');
  const exploreRoute = routes.find((r: any) => r.name === 'explore');
  const bookingsRoute = routes.find((r: any) => r.name === 'bookings');
  const favoritesRoute = routes.find((r: any) => r.name === 'favorites');
  const profileRoute = routes.find((r: any) => r.name === 'profile');

  const onPressRoute = (routeName: string, isFocused: boolean) => {
    const event = navigation.emit({
      type: 'tabPress',
      target: routeName,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(routeName);
    }
  };

  const isBookingsFocused = currentRouteName === 'bookings';
  const barHeight = 62 + Math.max(insets.bottom, 10);

  // Responsive width: 100% on phones, capped at 580 on tablets/web
  const barWidth = Math.min(width, 580);
  const centerX = barWidth / 2;

  // Mathematically smooth C1-continuous cradle notch geometry
  const notchHalfWidth = 46;
  const notchDepth = 30;
  const p1 = centerX - notchHalfWidth;
  const p2 = centerX + notchHalfWidth;
  const cp1x = centerX - 24;
  const cp2x = centerX - 18;
  const cp3x = centerX + 18;
  const cp4x = centerX + 24;

  const pathD = `M 0 0 L ${p1} 0 C ${cp1x} 0, ${cp2x} ${notchDepth}, ${centerX} ${notchDepth} C ${cp3x} ${notchDepth}, ${cp4x} 0, ${p2} 0 L ${barWidth} 0 L ${barWidth} ${barHeight} L 0 ${barHeight} Z`;
  const borderD = `M 0 0 L ${p1} 0 C ${cp1x} 0, ${cp2x} ${notchDepth}, ${centerX} ${notchDepth} C ${cp3x} ${notchDepth}, ${cp4x} 0, ${p2} 0 L ${barWidth} 0`;

  const sideWidth = Math.max(0, (barWidth - (notchHalfWidth * 2 + 10)) / 2);

  const renderTabItem = (
    routeName: string | undefined,
    label: string,
    activeIcon: keyof typeof Ionicons.glyphMap,
    inactiveIcon: keyof typeof Ionicons.glyphMap,
    badgeCount?: number
  ) => {
    if (!routeName) return null;
    const isFocused = currentRouteName === routeName;

    return (
      <TouchableOpacity
        key={routeName}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        accessibilityLabel={label}
        onPress={() => onPressRoute(routeName, isFocused)}
        activeOpacity={0.7}
        style={styles.tabButton}
      >
        <View style={styles.iconContainer}>
          <Ionicons
            name={isFocused ? activeIcon : inactiveIcon}
            size={22}
            color={isFocused ? Palette.primary : Palette.gray400}
          />
          {badgeCount && badgeCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badgeCount > 9 ? '9+' : badgeCount}</Text>
            </View>
          ) : null}
        </View>
        <Text
          style={[
            styles.tabLabel,
            {
              color: isFocused ? Palette.primary : Palette.gray500,
              fontWeight: isFocused ? '700' : '500',
            },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { height: barHeight, pointerEvents: 'box-none' }]}>
      <View
        style={{
          width: barWidth,
          height: barHeight,
          alignSelf: 'center',
          position: 'relative',
          pointerEvents: 'box-none',
        }}
      >
        {/* SVG Background with Half-Cut Curved Notch Cutout */}
        <View style={[styles.svgContainer, { pointerEvents: 'none' }]}>
          <Svg width={barWidth} height={barHeight}>
            <Path d={pathD} fill="#FFFFFF" />
            <Path d={borderD} fill="none" stroke="#CBD5E1" strokeWidth="1.5" />
          </Svg>
        </View>

        {/* Floating Action Button for Booking nested in the half-cut notch */}
        <View
          style={[
            styles.fabWrapper,
            { left: centerX - 29 },
          ]}
        >
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Booking"
            activeOpacity={0.85}
            onPress={() =>
              bookingsRoute
                ? onPressRoute(bookingsRoute.name, isBookingsFocused)
                : navigation.navigate('bookings')
            }
            style={[
              styles.fabButton,
              isBookingsFocused && styles.fabButtonActive,
            ]}
          >
            <View style={styles.fabInner}>
              <Ionicons
                name={isBookingsFocused ? 'calendar' : 'calendar-outline'}
                size={23}
                color="#FFFFFF"
              />
              <Text style={styles.fabLabel}>Booking</Text>
              {(unreadChatCount > 0 || activeBookingsCount > 0) && (
                <View style={[styles.fabBadge, unreadChatCount > 0 && styles.fabBadgeChat]}>
                  <Text style={styles.fabBadgeText}>
                    {unreadChatCount > 0
                      ? unreadChatCount > 9
                        ? '9+'
                        : unreadChatCount
                      : activeBookingsCount > 9
                      ? '9+'
                      : activeBookingsCount}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Tabs Content Row */}
        <View style={[styles.tabsRow, { paddingBottom: Math.max(insets.bottom, 6) }]}>
          {/* Left Side: Home and Explore */}
          <View style={[styles.sideGroup, { width: sideWidth }]}>
            {renderTabItem(homeRoute?.name || 'home', 'Home', 'home', 'home-outline')}
            {renderTabItem(exploreRoute?.name || 'explore', 'Search', 'search', 'search-outline')}
          </View>

          {/* Center Gap for Notch (102px) */}
          <View style={{ width: notchHalfWidth * 2 + 10, pointerEvents: 'none' }} />

          {/* Right Side: Saved and Profile */}
          <View style={[styles.sideGroup, { width: sideWidth }]}>
            {renderTabItem(favoritesRoute?.name || 'favorites', 'Saved', 'heart', 'heart-outline')}
            {renderTabItem(profileRoute?.name || 'profile', 'Profile', 'person', 'person-outline')}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 12,
      },
      web: {
        boxShadow: '0px -4px 12px rgba(15, 23, 42, 0.1)',
      },
      default: {
        boxShadow: '0px -4px 12px rgba(15, 23, 42, 0.1)',
      },
    }),
  },
  svgContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  tabsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  sideGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  iconContainer: {
    position: 'relative',
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10.5,
    marginTop: 2,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: Palette.danger,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  fabWrapper: {
    position: 'absolute',
    top: -22,
    width: 58,
    height: 58,
    zIndex: 99,
  },
  fabButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3.5,
    borderColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: Palette.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.45,
        shadowRadius: 8,
      },
      android: {
        elevation: 10,
      },
      web: {
        boxShadow: '0px 6px 8px rgba(37, 99, 235, 0.45)',
      },
      default: {
        boxShadow: '0px 6px 8px rgba(37, 99, 235, 0.45)',
      },
    }),
  },
  fabButtonActive: {
    backgroundColor: '#1E40AF',
    borderColor: '#EFF6FF',
  },
  fabInner: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabLabel: {
    color: '#EFF6FF',
    fontSize: 9,
    fontWeight: '800',
    marginTop: 1,
    letterSpacing: 0.2,
  },
  fabBadge: {
    position: 'absolute',
    top: -8,
    right: -10,
    backgroundColor: Palette.danger,
    borderRadius: 9,
    minWidth: 17,
    height: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  fabBadgeChat: {
    backgroundColor: '#DC2626',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  fabBadgeText: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontWeight: '800',
  },
});
