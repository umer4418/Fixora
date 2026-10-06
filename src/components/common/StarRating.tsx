import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette } from '../../constants/theme';

interface StarRatingProps {
  rating: number; // 0 to 5
  reviewsCount?: number;
  size?: number;
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  style?: ViewStyle;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  reviewsCount,
  size = 14,
  interactive = false,
  onRatingChange,
  style,
}) => {
  const stars = [1, 2, 3, 4, 5];

  return (
    <View style={[styles.container, style]}>
      <View style={styles.starsRow}>
        {stars.map((star) => {
          const isFilled = rating >= star;
          const isHalf = !isFilled && rating >= star - 0.5;

          const iconName = isFilled
            ? 'star'
            : isHalf
            ? 'star-half'
            : 'star-outline';

          if (interactive && onRatingChange) {
            return (
              <TouchableOpacity
                key={star}
                onPress={() => onRatingChange(star)}
                activeOpacity={0.7}
                style={styles.starTouch}
              >
                <Ionicons
                  name={iconName}
                  size={size + 6}
                  color={isFilled || isHalf ? Palette.star : Palette.gray300}
                />
              </TouchableOpacity>
            );
          }

          return (
            <Ionicons
              key={star}
              name={iconName}
              size={size}
              color={isFilled || isHalf ? Palette.star : Palette.gray300}
              style={{ marginRight: 2 }}
            />
          );
        })}
      </View>

      {!interactive && (
        <View style={styles.textRow}>
          <Text style={[styles.ratingText, { fontSize: size }]}>
            {rating.toFixed(1)}
          </Text>
          {reviewsCount !== undefined && (
            <Text style={[styles.reviewsText, { fontSize: size - 1 }]}>
              ({reviewsCount})
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starTouch: {
    padding: 3,
  },
  textRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  ratingText: {
    fontWeight: '700',
    color: Palette.gray800,
  },
  reviewsText: {
    color: Palette.gray500,
    marginLeft: 2,
  },
});
