import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Palette, BorderRadius, Shadows } from '../constants/theme';
import { useResponsive } from '../utils/responsive';

const ONBOARDING_COMPLETED_KEY = '@fixora_onboarding_completed';

interface SlideData {
  id: string;
  badge: string;
  title: string;
  description: string;
  imageUrl: string;
  highlights: string[];
}

const SLIDES: SlideData[] = [
  {
    id: 'slide-1',
    badge: 'TRUSTED PROFESSIONALS',
    title: 'Expert Home Services at Your Fingertips',
    description:
      'Connect instantly with verified cleaners, plumbers, electricians, and technicians right at your doorstep.',
    imageUrl:
      'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&auto=format&fit=crop&q=80',
    highlights: ['100% Background-Checked', 'Upfront Transparent Pricing', 'Instant Booking'],
  },
  {
    id: 'slide-2',
    badge: 'REALTIME EXPERIENCE',
    title: 'Live Tracking & Instant Provider Chat',
    description:
      'Monitor provider arrival in real-time, message your service pro, and get milestone updates at every step.',
    imageUrl:
      'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&auto=format&fit=crop&q=80',
    highlights: ['Live Order Milestones', 'Direct In-App Chat', 'Dedicated Support'],
  },
  {
    id: 'slide-3',
    badge: 'GUARANTEED QUALITY',
    title: 'Exclusive Coupons & 30-Day Guarantee',
    description:
      'Apply promotional discounts at checkout and rest easy with our 30-day rework satisfaction guarantee.',
    imageUrl:
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
    highlights: ['Promo Coupon Discounts', 'Cash & Card Payments', '100% Satisfaction Guarantee'],
  },
];

export default function OnboardingScreen() {
  const { width, height, moderateScale, isSmallDevice, isTablet } = useResponsive();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const imageHeight = isSmallDevice ? 175 : isTablet ? 280 : Math.min(height * 0.32, 230);

  const completeOnboarding = async (targetRoute: '/auth/login' | '/auth/register' = '/auth/login') => {
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
    } catch (e) {
      console.warn('Failed to save onboarding state', e);
    }
    router.replace(targetRoute);
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
      setCurrentIndex(currentIndex + 1);
    } else {
      completeOnboarding('/auth/login');
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / width);
    if (index !== currentIndex && index >= 0 && index < SLIDES.length) {
      setCurrentIndex(index);
    }
  };

  const goToIndex = (index: number) => {
    if (index >= 0 && index < SLIDES.length) {
      flatListRef.current?.scrollToIndex({
        index,
        animated: true,
      });
      setCurrentIndex(index);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Top Header / Step Indicator / Skip */}
      <View style={styles.topBar}>
        <View style={styles.topBarInner}>
          <View style={styles.brandRow}>
            <View style={styles.brandLogoBox}>
              <Ionicons name="sparkles" size={16} color={Palette.white} />
            </View>
            <Text style={styles.brandTitle}>Fixora</Text>
          </View>

          {/* Step Indicator */}
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>Screen {currentIndex + 1} of 3</Text>
          </View>

          {currentIndex < SLIDES.length - 1 ? (
            <TouchableOpacity
              onPress={() => completeOnboarding('/auth/login')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.skipButton}
            >
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 44 }} />
          )}
        </View>
      </View>

      {/* Slides Carousel */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        onMomentumScrollEnd={handleScroll}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={styles.slideInner}>
              {/* Visual Image Card */}
              <View style={[styles.imageCard, { height: imageHeight }]}>
                <Image source={{ uri: item.imageUrl }} style={styles.slideImage} />
                <View style={styles.imageOverlayBadge}>
                  <Ionicons name="shield-checkmark" size={14} color="#10B981" />
                  <Text style={styles.overlayBadgeText}>Fixora Verified Services</Text>
                </View>
              </View>

              {/* Slide Content */}
              <View style={styles.contentBox}>
                <View style={styles.badgeContainer}>
                  <Text style={styles.badgeText}>{item.badge}</Text>
                </View>

                <Text style={[styles.slideTitle, { fontSize: moderateScale(isSmallDevice ? 19 : 22) }]}>
                  {item.title}
                </Text>

                <Text style={[styles.slideDesc, { fontSize: moderateScale(isSmallDevice ? 12 : 13) }]}>
                  {item.description}
                </Text>

                {/* Highlights Pill Row */}
                <View style={styles.highlightsContainer}>
                  {item.highlights.map((h: string, i: number) => (
                    <View key={i} style={styles.highlightPill}>
                      <Ionicons name="checkmark-circle" size={14} color={Palette.primary} />
                      <Text style={styles.highlightText}>{h}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        )}
      />

      {/* Bottom Controls */}
      <View style={styles.bottomControls}>
        {/* Pagination Dots */}
        <View style={styles.paginationRow}>
          {SLIDES.map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => goToIndex(i)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={[
                styles.dot,
                currentIndex === i ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          ))}
        </View>

        {/* Action Button */}
        <View style={styles.actionsRow}>
          {currentIndex === SLIDES.length - 1 ? (
            <View style={styles.finalButtonsCol}>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => completeOnboarding('/auth/login')}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>Get Started with Login</Text>
                <Ionicons name="arrow-forward" size={18} color={Palette.white} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => completeOnboarding('/auth/register')}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryBtnText}>Create New Account (Admin / Customer)</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.nextRow}>
              <TouchableOpacity
                style={styles.circleNextBtn}
                onPress={handleNext}
                activeOpacity={0.85}
              >
                <Text style={styles.nextText}>Next</Text>
                <Ionicons name="chevron-forward" size={18} color={Palette.white} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topBar: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    width: '100%',
  },
  topBarInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: 580,
    width: '100%',
    alignSelf: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandLogoBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: Palette.primary,
    letterSpacing: -0.5,
  },
  stepBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.primary,
  },
  skipButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: '#F1F5F9',
  },
  skipText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.gray600,
  },
  slide: {
    flex: 1,
    paddingHorizontal: 20,
  },
  slideInner: {
    flex: 1,
    maxWidth: 580,
    width: '100%',
    alignSelf: 'center',
    justifyContent: 'space-between',
  },
  imageCard: {
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    marginTop: 6,
    backgroundColor: '#F1F5F9',
    ...Shadows.md,
  },
  slideImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageOverlayBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  overlayBadgeText: {
    color: Palette.white,
    fontSize: 11,
    fontWeight: '700',
  },
  contentBox: {
    flex: 1,
    paddingTop: 24,
  },
  badgeContainer: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  badgeText: {
    color: Palette.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  slideTitle: {
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 30,
    marginBottom: 8,
  },
  slideDesc: {
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 16,
  },
  highlightsContainer: {
    gap: 8,
  },
  highlightPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
  },
  highlightText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
  },
  bottomControls: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
    maxWidth: 580,
    width: '100%',
    alignSelf: 'center',
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  activeDot: {
    width: 24,
    backgroundColor: Palette.primary,
  },
  inactiveDot: {
    width: 8,
    backgroundColor: '#CBD5E1',
  },
  actionsRow: {
    width: '100%',
  },
  nextRow: {
    alignItems: 'flex-end',
  },
  circleNextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Palette.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: BorderRadius.full,
    ...Shadows.md,
  },
  nextText: {
    color: Palette.white,
    fontSize: 15,
    fontWeight: '700',
  },
  finalButtonsCol: {
    gap: 10,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Palette.primary,
    paddingVertical: 15,
    borderRadius: BorderRadius.lg,
    ...Shadows.md,
  },
  primaryBtnText: {
    color: Palette.white,
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: BorderRadius.lg,
    backgroundColor: '#F1F5F9',
  },
  secondaryBtnText: {
    color: Palette.primary,
    fontSize: 13,
    fontWeight: '700',
  },
});
