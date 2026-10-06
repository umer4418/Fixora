import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Palette, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useMarketplace } from '../../context/MarketplaceContext';
import { Service } from '../../types';

const SERVICE_IMAGE_PRESETS = [
  { label: 'Cleaning', url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&auto=format&fit=crop&q=80' },
  { label: 'AC Repair', url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80' },
  { label: 'Plumbing', url: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=600&auto=format&fit=crop&q=80' },
  { label: 'Electrical', url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&auto=format&fit=crop&q=80' },
  { label: 'Painting', url: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=600&auto=format&fit=crop&q=80' },
  { label: 'Handyman', url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&auto=format&fit=crop&q=80' },
];

export default function AdminServicesScreen() {
  const { services, categories, providers, createService, removeService } = useMarketplace();

  const [search, setSearch] = useState('');
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);

  // Add Product Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newOriginalPrice, setNewOriginalPrice] = useState('');
  const [newDuration, setNewDuration] = useState('1-2 hours');
  const [newCategoryId, setNewCategoryId] = useState('');
  const [newImageUrl, setNewImageUrl] = useState(SERVICE_IMAGE_PRESETS[0].url);
  const [newDescription, setNewDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filtered = useMemo(() => {
    return services.filter((s) => {
      if (selectedCatId && s.categoryId !== selectedCatId) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return s.title.toLowerCase().includes(q) || s.providerName.toLowerCase().includes(q);
      }
      return true;
    });
  }, [services, selectedCatId, search]);

  const handleDelete = (service: Service) => {
    Alert.alert('Remove Service', `Are you sure you want to remove "${service.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await removeService(service.id);
          Alert.alert('Deleted', 'Service removed from marketplace.');
        },
      },
    ]);
  };

  const handleCreate = async () => {
    if (!newTitle.trim() || !newPrice.trim()) {
      Alert.alert('Required Fields', 'Please enter a Title and Price.');
      return;
    }

    const priceNum = parseFloat(newPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid price amount.');
      return;
    }

    const cat = categories.find((c) => c.id === newCategoryId) || categories[0];
    const prov = providers[0];

    setIsSubmitting(true);
    try {
      await createService({
        title: newTitle.trim(),
        description: newDescription.trim() || `${newTitle} by licensed background-checked experts.`,
        price: priceNum,
        originalPrice: newOriginalPrice ? parseFloat(newOriginalPrice) : Math.round(priceNum * 1.25),
        duration: newDuration.trim() || '1-2 hours',
        categoryId: cat ? cat.id : 'cat-cleaning',
        categoryName: cat ? cat.name : 'Home Cleaning',
        providerId: prov ? prov.id : 'prov-1',
        providerName: prov ? prov.name : 'David Miller',
        providerAvatar: prov ? prov.avatar : undefined,
        imageUrl: newImageUrl || SERVICE_IMAGE_PRESETS[0].url,
        isActive: true,
        isPopular: true,
      });

      setModalVisible(false);
      setNewTitle('');
      setNewPrice('');
      setNewOriginalPrice('');
      setNewDescription('');
      Alert.alert('Success', `Product "${newTitle}" published successfully!`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to create service.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Top Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
          <Ionicons name="arrow-back" size={24} color={Palette.gray800} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Platform Services ({services.length})</Text>
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={styles.addNavBtn}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={22} color={Palette.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.container}>
        {/* Search */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={Palette.gray400} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by title or provider..."
            placeholderTextColor={Palette.gray400}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Category Pills */}
        <View style={{ marginBottom: 8 }}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[{ id: 'all', name: 'All' }, ...categories]}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }}
            renderItem={({ item }) => {
              const isSelected = item.id === 'all' ? selectedCatId === null : selectedCatId === item.id;
              return (
                <TouchableOpacity
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: BorderRadius.full,
                    backgroundColor: isSelected ? Palette.primary : Palette.white,
                    borderWidth: 1,
                    borderColor: isSelected ? Palette.primary : Palette.gray300,
                  }}
                  onPress={() => setSelectedCatId(item.id === 'all' ? null : item.id)}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '600',
                      color: isSelected ? Palette.white : Palette.gray700,
                    }}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Image source={{ uri: item.imageUrl }} style={styles.image} />

              <View style={styles.infoCol}>
                <Text style={styles.categoryBadge}>{item.categoryName}</Text>
                <Text style={styles.title} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.providerName}>By: {item.providerName}</Text>
                <View style={styles.metaRow}>
                  <Text style={styles.price}>${item.price}</Text>
                  <Text style={styles.duration}>• {item.duration}</Text>
                  <Text style={styles.rating}>• ★ {item.rating}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDelete(item)}
              >
                <Ionicons name="trash-outline" size={18} color={Palette.danger} />
              </TouchableOpacity>
            </View>
          )}
        />
      </View>

      {/* Add Product Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Product / Service</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={Palette.gray600} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
              <Text style={styles.inputLabel}>Service Title *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Master Bedroom Deep Clean"
                placeholderTextColor={Palette.gray400}
                value={newTitle}
                onChangeText={setNewTitle}
              />

              <View style={styles.twoInputsRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Price ($) *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. 60"
                    placeholderTextColor={Palette.gray400}
                    keyboardType="numeric"
                    value={newPrice}
                    onChangeText={setNewPrice}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Original Price ($)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. 80"
                    placeholderTextColor={Palette.gray400}
                    keyboardType="numeric"
                    value={newOriginalPrice}
                    onChangeText={setNewOriginalPrice}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Duration</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. 1-2 hours"
                placeholderTextColor={Palette.gray400}
                value={newDuration}
                onChangeText={setNewDuration}
              />

              <Text style={styles.inputLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                {categories.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.modalPresetPill,
                      newCategoryId === c.id && styles.modalPresetPillActive,
                    ]}
                    onPress={() => setNewCategoryId(c.id)}
                  >
                    <Text
                      style={[
                        styles.modalPresetPillText,
                        newCategoryId === c.id && styles.modalPresetPillTextActive,
                      ]}
                    >
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Image Preset</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                {SERVICE_IMAGE_PRESETS.map((preset, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.modalPresetPill,
                      newImageUrl === preset.url && styles.modalPresetPillActive,
                    ]}
                    onPress={() => setNewImageUrl(preset.url)}
                  >
                    <Text
                      style={[
                        styles.modalPresetPillText,
                        newImageUrl === preset.url && styles.modalPresetPillTextActive,
                      ]}
                    >
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.formInput, { height: 60, textAlignVertical: 'top' }]}
                placeholder="Details of service..."
                placeholderTextColor={Palette.gray400}
                multiline
                numberOfLines={3}
                value={newDescription}
                onChangeText={setNewDescription}
              />
            </ScrollView>

            <TouchableOpacity
              style={styles.submitModalBtn}
              onPress={handleCreate}
              disabled={isSubmitting}
            >
              <Text style={styles.submitModalBtnText}>
                {isSubmitting ? 'Publishing...' : 'Save & Publish Product'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    padding: 4,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.gray900,
  },
  addNavBtn: {
    backgroundColor: Palette.primary,
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.white,
    marginHorizontal: Spacing.four,
    marginVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Palette.gray200,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Palette.gray900,
    marginLeft: 6,
  },
  listContent: {
    padding: Spacing.four,
    paddingBottom: Spacing.six,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.three,
    marginBottom: Spacing.two,
    borderWidth: 1,
    borderColor: Palette.gray200,
    ...Shadows.sm,
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.md,
    marginRight: 10,
  },
  infoCol: {
    flex: 1,
  },
  categoryBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.primary,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.gray900,
    marginTop: 2,
  },
  providerName: {
    fontSize: 11,
    color: Palette.gray500,
    marginTop: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  price: {
    fontSize: 13,
    fontWeight: '800',
    color: Palette.gray900,
  },
  duration: {
    fontSize: 11,
    color: Palette.gray500,
  },
  rating: {
    fontSize: 11,
    color: Palette.star,
    fontWeight: '700',
  },
  deleteBtn: {
    padding: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: Palette.white,
    borderRadius: BorderRadius.xl,
    padding: 18,
    ...Shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  inputLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
    marginTop: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: BorderRadius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  twoInputsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalPresetPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    marginRight: 6,
  },
  modalPresetPillActive: {
    borderColor: Palette.primary,
    backgroundColor: Palette.primary,
  },
  modalPresetPillText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  modalPresetPillTextActive: {
    color: Palette.white,
    fontWeight: '700',
  },
  submitModalBtn: {
    backgroundColor: Palette.primary,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  submitModalBtnText: {
    color: Palette.white,
    fontSize: 13.5,
    fontWeight: '800',
  },
});
