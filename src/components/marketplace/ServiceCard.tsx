import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Palette, BorderRadius, Shadows, Spacing } from '../../constants/theme';
import { Service } from '../../types';
import { useMarketplace } from '../../context/MarketplaceContext';
import { StarRating } from '../common/StarRating';

interface ServiceCardProps {
  service: Service;
  horizontal?: boolean;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ service, horizontal = false }) => {
  const { isFavorite, toggleFavorite } = useMarketplace();
  const isFav = isFavorite(service.id);

  const handlePress = () => {
    router.push({
      pathname: '/service/[id]',
      params: { id: service.id },
    });
  };

  const handleBookPress = () => {
    router.push({
      pathname: '/book/[serviceId]',
      params: { serviceId: service.id },
    });
  };

  const discountPercent =
    service.originalPrice && service.originalPrice > service.price
      ? Math.round(((service.originalPrice - service.price) / service.originalPrice) * 100)
      : null;

  if (horizontal) {
    return (
      <TouchableOpacity
        style={styles.horizontalCard}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <Image source={{ uri: service.imageUrl }} style={styles.horizontalImage} />
        
        <View style={styles.horizontalContent}>
          <View style={styles.topRow}>
            <Text style={styles.categoryBadge}>{service.categoryName}</Text>
            <TouchableOpacity
              onPress={() => toggleFavorite(service.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={isFav ? 'heart' : 'heart-outline'}
                size={18}
                color={isFav ? Palette.danger : Palette.gray400}
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.horizontalTitle} numberOfLines={2}>
            {service.title}
          </Text>

          <View style={styles.providerRow}>
            <Ionicons name="person-circle-outline" size={14} color={Palette.gray500} />
            <Text style={styles.providerName} numberOfLines={1}>
              {service.providerName}
            </Text>
          </View>

          <View style={styles.bottomRow}>
            <View>
              <View style={styles.priceRow}>
                <Text style={styles.price}>${service.price}</Text>
                {service.originalPrice && (
                  <Text style={styles.originalPrice}>${service.originalPrice}</Text>
                )}
              </View>
              <StarRating rating={service.rating} reviewsCount={service.reviewsCount} size={12} />
            </View>

            <TouchableOpacity style={styles.quickBookBtn} onPress={handleBookPress}>
              <Text style={styles.quickBookText}>Book</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.8}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: service.imageUrl }} style={styles.image} />
        
        {discountPercent ? (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{discountPercent}% OFF</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => toggleFavorite(service.id)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isFav ? 'heart' : 'heart-outline'}
            size={18}
            color={isFav ? Palette.danger : Palette.gray700}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.categoryAndDuration}>
          <Text style={styles.categoryBadge}>{service.categoryName}</Text>
          <View style={styles.durationRow}>
            <Ionicons name="time-outline" size={12} color={Palette.gray400} />
            <Text style={styles.durationText}>{service.duration}</Text>
          </View>
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {service.title}
        </Text>

        <View style={styles.providerRow}>
          {service.providerAvatar ? (
            <Image source={{ uri: service.providerAvatar }} style={styles.providerAvatar} />
          ) : (
            <Ionicons name="person-circle" size={16} color={Palette.primary} />
          )}
          <Text style={styles.providerName} numberOfLines={1}>
            {service.providerName}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.bottomRow}>
          <View>
            <View style={styles.priceRow}>
              <Text style={styles.price}>${service.price}</Text>
              {service.originalPrice && (
                <Text style={styles.originalPrice}>${service.originalPrice}</Text>
              )}
            </View>
            <StarRating rating={service.rating} reviewsCount={service.reviewsCount} size={12} />
          </View>

          <TouchableOpacity style={styles.bookButton} onPress={handleBookPress}>
            <Text style={styles.bookButtonText}>Book</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Palette.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Palette.gray200,
    overflow: 'hidden',
    marginBottom: Spacing.three,
    ...Shadows.sm,
  },
  imageContainer: {
    position: 'relative',
    height: 140,
    width: '100%',
    backgroundColor: Palette.gray100,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  favoriteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: Palette.white,
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  discountBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: Palette.danger,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  discountText: {
    color: Palette.white,
    fontSize: 10,
    fontWeight: '700',
  },
  content: {
    padding: Spacing.three,
  },
  categoryAndDuration: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  durationText: {
    fontSize: 11,
    color: Palette.gray500,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.gray900,
    lineHeight: 20,
    marginBottom: 6,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  providerAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  providerName: {
    fontSize: 12,
    color: Palette.gray600,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: Palette.gray100,
    marginVertical: 6,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 2,
  },
  price: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.gray900,
  },
  originalPrice: {
    fontSize: 13,
    color: Palette.gray400,
    textDecorationLine: 'line-through',
  },
  bookButton: {
    backgroundColor: Palette.primary,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: BorderRadius.md,
  },
  bookButtonText: {
    color: Palette.white,
    fontWeight: '700',
    fontSize: 13,
  },
  // Horizontal styles
  horizontalCard: {
    flexDirection: 'row',
    backgroundColor: Palette.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Palette.gray200,
    overflow: 'hidden',
    marginBottom: Spacing.two,
    marginRight: Spacing.three,
    width: 290,
    height: 134,
    ...Shadows.sm,
  },
  horizontalImage: {
    width: 105,
    height: '100%',
    resizeMode: 'cover',
  },
  horizontalContent: {
    flex: 1,
    padding: 10,
    justifyContent: 'space-between',
  },
  horizontalTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.gray900,
    lineHeight: 18,
    marginVertical: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quickBookBtn: {
    backgroundColor: Palette.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: BorderRadius.sm,
  },
  quickBookText: {
    color: Palette.primary,
    fontWeight: '700',
    fontSize: 12,
  },
});
