import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Palette, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useMarketplace } from '../../context/MarketplaceContext';
import { Service } from '../../types';
import { Button } from '../../components/common/Button';

export default function ProviderServicesScreen() {
  const { user } = useAuth();
  const { services, categories, createService, editService, removeService } = useMarketplace();

  const providerId = user?.id || 'prov-1';

  const myServices = useMemo(() => {
    return services.filter((s) => s.providerId === providerId || s.providerId === 'prov-1');
  }, [services, providerId]);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [selectedCatId, setSelectedCatId] = useState(categories[0]?.id || 'cat-cleaning');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('1-2 hours');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const openCreateModal = () => {
    setEditingService(null);
    setTitle('');
    setSelectedCatId(categories[0]?.id || 'cat-cleaning');
    setPrice('');
    setDuration('1-2 hours');
    setDescription('');
    setImageUrl('https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&auto=format&fit=crop&q=80');
    setModalVisible(true);
  };

  const openEditModal = (service: Service) => {
    setEditingService(service);
    setTitle(service.title);
    setSelectedCatId(service.categoryId);
    setPrice(service.price.toString());
    setDuration(service.duration);
    setDescription(service.description);
    setImageUrl(service.imageUrl);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !price.trim() || !description.trim()) {
      Alert.alert('Required Fields', 'Please fill in Title, Price, and Description.');
      return;
    }

    const cat = categories.find((c) => c.id === selectedCatId) || categories[0];

    if (editingService) {
      await editService(editingService.id, {
        title: title.trim(),
        categoryId: cat.id,
        categoryName: cat.name,
        price: parseFloat(price) || 50,
        duration: duration.trim(),
        description: description.trim(),
        imageUrl: imageUrl.trim() || editingService.imageUrl,
      });
      alert('Service updated successfully.');
    } else {
      await createService({
        providerId,
        providerName: user?.name || 'David Miller',
        providerAvatar: user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
        providerRating: 5.0,
        categoryId: cat.id,
        categoryName: cat.name,
        title: title.trim(),
        price: parseFloat(price) || 50,
        duration: duration.trim(),
        description: description.trim(),
        imageUrl: imageUrl.trim() || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&auto=format&fit=crop&q=80',
        isActive: true,
      });
      alert('New service published successfully.');
    }

    setModalVisible(false);
  };

  const handleDelete = (service: Service) => {
    Alert.alert('Delete Service', `Are you sure you want to remove "${service.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await removeService(service.id);
          alert('Service deleted.');
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
        <Text style={styles.navTitle}>My Services</Text>
        <TouchableOpacity onPress={openCreateModal} style={styles.addBtn}>
          <Ionicons name="add" size={24} color={Palette.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={myServices}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.serviceItemCard}>
            <Image source={{ uri: item.imageUrl }} style={styles.serviceImage} />

            <View style={styles.serviceItemInfo}>
              <Text style={styles.serviceCategory}>{item.categoryName}</Text>
              <Text style={styles.serviceTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.servicePrice}>${item.price} • {item.duration}</Text>
              <Text style={styles.serviceRating}>★ {item.rating} ({item.reviewsCount} reviews)</Text>
            </View>

            <View style={styles.itemActions}>
              <TouchableOpacity
                style={styles.actionIconBtn}
                onPress={() => openEditModal(item)}
              >
                <Ionicons name="create-outline" size={20} color={Palette.primary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionIconBtn}
                onPress={() => handleDelete(item)}
              >
                <Ionicons name="trash-outline" size={20} color={Palette.danger} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListFooterComponent={
          <Button
            title="+ Add New Service"
            onPress={openCreateModal}
            size="lg"
            style={{ marginTop: Spacing.four }}
          />
        }
      />

      {/* Create / Edit Service Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingService ? 'Edit Service' : 'Add New Service'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={Palette.gray600} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={styles.inputLabel}>Service Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Master Bedroom Painting"
                placeholderTextColor={Palette.gray400}
                value={title}
                onChangeText={setTitle}
              />

              <Text style={styles.inputLabel}>Category *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                {categories.map((c) => {
                  const isSelected = selectedCatId === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.catPill, isSelected && styles.catPillSelected]}
                      onPress={() => setSelectedCatId(c.id)}
                    >
                      <Text style={[styles.catPillText, isSelected && styles.catPillTextSelected]}>
                        {c.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={styles.rowInputs}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Price ($) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="45"
                    placeholderTextColor={Palette.gray400}
                    keyboardType="numeric"
                    value={price}
                    onChangeText={setPrice}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Duration</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="1-2 hours"
                    placeholderTextColor={Palette.gray400}
                    value={duration}
                    onChangeText={setDuration}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe what is included in this service..."
                placeholderTextColor={Palette.gray400}
                multiline
                numberOfLines={3}
                value={description}
                onChangeText={setDescription}
              />

              <Text style={styles.inputLabel}>Photo URL</Text>
              <TextInput
                style={styles.input}
                placeholder="https://..."
                placeholderTextColor={Palette.gray400}
                value={imageUrl}
                onChangeText={setImageUrl}
              />

              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setModalVisible(false)}
                  style={{ flex: 1, marginRight: 8 }}
                />
                <Button
                  title={editingService ? 'Save Changes' : 'Publish Service'}
                  onPress={handleSave}
                  style={{ flex: 2 }}
                />
              </View>
            </ScrollView>
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
  addBtn: {
    padding: 4,
  },
  listContent: {
    padding: Spacing.four,
    backgroundColor: Palette.gray50,
    flexGrow: 1,
  },
  serviceItemCard: {
    flexDirection: 'row',
    backgroundColor: Palette.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.three,
    marginBottom: Spacing.three,
    borderWidth: 1,
    borderColor: Palette.gray200,
    alignItems: 'center',
    ...Shadows.sm,
  },
  serviceImage: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.md,
    marginRight: 10,
  },
  serviceItemInfo: {
    flex: 1,
  },
  serviceCategory: {
    fontSize: 10,
    color: Palette.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  serviceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.gray900,
    marginTop: 2,
  },
  servicePrice: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.gray700,
    marginTop: 2,
  },
  serviceRating: {
    fontSize: 11,
    color: Palette.gray500,
    marginTop: 2,
  },
  itemActions: {
    flexDirection: 'column',
    gap: 8,
    marginLeft: 6,
  },
  actionIconBtn: {
    padding: 6,
    backgroundColor: Palette.gray100,
    borderRadius: BorderRadius.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Palette.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.four,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Palette.gray900,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.gray700,
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: Palette.gray300,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: Palette.gray900,
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  catScroll: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  catPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Palette.gray100,
    marginRight: 6,
    borderWidth: 1,
    borderColor: Palette.gray200,
  },
  catPillSelected: {
    backgroundColor: Palette.primary,
    borderColor: Palette.primary,
  },
  catPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.gray700,
  },
  catPillTextSelected: {
    color: Palette.white,
  },
  rowInputs: {
    flexDirection: 'row',
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: Spacing.four,
  },
});
