import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Palette, BorderRadius, Shadows } from '../../constants/theme';
import { Category } from '../../types';

interface CategoryCardProps {
  category: Category;
  compact?: boolean;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({ category, compact = false }) => {
  const handlePress = () => {
    router.push({
      pathname: '/explore',
      params: { categoryId: category.id, categoryName: category.name },
    });
  };

  const iconName = (category.icon as keyof typeof Ionicons.glyphMap) || 'apps';

  if (compact) {
    return (
      <TouchableOpacity
        style={styles.compactCard}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={[styles.compactIconBox, { backgroundColor: `${category.color}15` }]}>
          <Ionicons name={iconName} size={22} color={category.color} />
        </View>
        <Text style={styles.compactTitle} numberOfLines={1}>
          {category.name}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <View style={[styles.iconBox, { backgroundColor: `${category.color}18` }]}>
        <Ionicons name={iconName} size={26} color={category.color} />
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {category.name}
      </Text>
      {category.servicesCount !== undefined && (
        <Text style={styles.countText}>{category.servicesCount} services</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Palette.white,
    borderRadius: BorderRadius.lg,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Palette.gray200,
    ...Shadows.sm,
    width: 105,
    marginRight: 10,
    marginBottom: 10,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.gray900,
    textAlign: 'center',
  },
  countText: {
    fontSize: 10,
    color: Palette.gray400,
    marginTop: 2,
    textAlign: 'center',
  },
  compactCard: {
    alignItems: 'center',
    width: 72,
    marginRight: 12,
  },
  compactIconBox: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  compactTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.gray800,
    textAlign: 'center',
  },
});
