import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Palette, BorderRadius, Shadows, Spacing } from '../../constants/theme';
import { User } from '../../types';
import { StarRating } from '../common/StarRating';

interface ProviderCardProps {
  provider: User;
}

export const ProviderCard: React.FC<ProviderCardProps> = ({ provider }) => {
  const handlePress = () => {
    router.push({
      pathname: '/provider/[id]',
      params: { id: provider.id },
    });
  };

  const isAvailable = provider.availabilityStatus === 'available';

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.8}>
      <View style={styles.avatarContainer}>
        {provider.avatar ? (
          <Image source={{ uri: provider.avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Ionicons name="person" size={28} color={Palette.gray500} />
          </View>
        )}
        <View
          style={[
            styles.statusDot,
            { backgroundColor: isAvailable ? Palette.accent : Palette.gray400 },
          ]}
        />
      </View>

      <View style={styles.content}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {provider.name}
          </Text>
          {provider.isVerified && (
            <Ionicons name="checkmark-circle" size={16} color={Palette.primary} />
          )}
        </View>

        {provider.bio ? (
          <Text style={styles.bio} numberOfLines={2}>
            {provider.bio}
          </Text>
        ) : null}

        <View style={styles.bottomRow}>
          <StarRating
            rating={provider.rating || 5.0}
            reviewsCount={provider.reviewsCount || 0}
            size={12}
          />

          {provider.hourlyRate ? (
            <Text style={styles.rateText}>
              <Text style={styles.rateAmount}>${provider.hourlyRate}</Text>/hr
            </Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: Palette.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: Palette.gray200,
    marginBottom: Spacing.two,
    ...Shadows.sm,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: Spacing.three,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Palette.gray100,
  },
  avatarFallback: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Palette.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: Palette.white,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.gray900,
  },
  bio: {
    fontSize: 12,
    color: Palette.gray500,
    lineHeight: 16,
    marginBottom: 6,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  rateText: {
    fontSize: 12,
    color: Palette.gray500,
  },
  rateAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.gray900,
  },
});
