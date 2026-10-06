import React from 'react';
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
import { Review } from '../../types';
import { StarRating } from '../../components/common/StarRating';

export default function AdminReviewsScreen() {
  const { reviews, removeReview } = useMarketplace();

  const handleDelete = (rev: Review) => {
    Alert.alert('Remove Review', 'Delete this user review from public view?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await removeReview(rev.id);
          alert('Review removed.');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
          <Ionicons name="arrow-back" size={24} color={Palette.gray800} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Moderate Reviews ({reviews.length})</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.topRow}>
              <View>
                <Text style={styles.customerName}>{item.customerName}</Text>
                {item.serviceTitle && (
                  <Text style={styles.serviceName}>Service: {item.serviceTitle}</Text>
                )}
              </View>
              <StarRating rating={item.rating} size={14} />
            </View>

            <Text style={styles.comment}>&ldquo;{item.comment}&rdquo;</Text>
            <Text style={styles.dateText}>
              Posted {new Date(item.createdAt).toLocaleDateString()}
            </Text>

            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleDelete(item)}
            >
              <Ionicons name="trash-outline" size={14} color={Palette.danger} />
              <Text style={styles.deleteText}>Delete Review</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
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
  listContent: {
    padding: Spacing.four,
    backgroundColor: Palette.gray50,
    flexGrow: 1,
  },
  card: {
    backgroundColor: Palette.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.three,
    marginBottom: Spacing.two,
    borderWidth: 1,
    borderColor: Palette.gray200,
    ...Shadows.sm,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.gray900,
  },
  serviceName: {
    fontSize: 11,
    color: Palette.primary,
    marginTop: 1,
  },
  comment: {
    fontSize: 13,
    color: Palette.gray700,
    lineHeight: 18,
    marginVertical: 4,
  },
  dateText: {
    fontSize: 10,
    color: Palette.gray400,
    marginTop: 4,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-end',
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  deleteText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.danger,
  },
});
