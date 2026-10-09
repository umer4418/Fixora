import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Palette, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useSafeBack } from '../../hooks/use-safe-back';
import { useMarketplace } from '../../context/MarketplaceContext';
import { Category } from '../../types';
import { Button } from '../../components/common/Button';

export default function AdminCategoriesScreen() {
  const { categories, createCategory, editCategory, removeCategory } = useMarketplace();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#2563EB');
  const [icon, setIcon] = useState('sparkles');

  const openCreate = () => {
    setEditingCategory(null);
    setName('');
    setDescription('');
    setColor('#2563EB');
    setIcon('sparkles');
    setModalVisible(true);
  };

  const openEdit = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setDescription(cat.description);
    setColor(cat.color);
    setIcon(cat.icon);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !description.trim()) {
      Alert.alert('Required Fields', 'Please enter Category Name and Description.');
      return;
    }

    if (editingCategory) {
      await editCategory(editingCategory.id, {
        name: name.trim(),
        description: description.trim(),
        color,
        icon,
      });
      alert('Category updated.');
    } else {
      await createCategory({
        name: name.trim(),
        slug: name.trim().toLowerCase().replace(/\s+/g, '-'),
        description: description.trim(),
        color,
        icon,
      });
      alert('New category added.');
    }

    setModalVisible(false);
  };

  const handleDelete = (cat: Category) => {
    Alert.alert('Delete Category', `Are you sure you want to delete "${cat.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await removeCategory(cat.id);
          alert('Category deleted.');
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
        <Text style={styles.navTitle}>Manage Categories</Text>
        <TouchableOpacity onPress={openCreate} style={styles.addBtn}>
          <Ionicons name="add" size={24} color={Palette.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.categoryCard}>
            <View style={[styles.iconBox, { backgroundColor: `${item.color}18` }]}>
              <Ionicons
                name={(item.icon as keyof typeof Ionicons.glyphMap) || 'apps'}
                size={24}
                color={item.color}
              />
            </View>

            <View style={styles.categoryInfo}>
              <Text style={styles.catName}>{item.name}</Text>
              <Text style={styles.catDesc} numberOfLines={2}>
                {item.description}
              </Text>
            </View>

            <View style={styles.catActions}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => openEdit(item)}
              >
                <Ionicons name="create-outline" size={18} color={Palette.primary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => handleDelete(item)}
              >
                <Ionicons name="trash-outline" size={18} color={Palette.danger} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListFooterComponent={
          <Button
            title="+ Add New Category"
            onPress={openCreate}
            size="lg"
            style={{ marginTop: Spacing.four }}
          />
        }
      />

      {/* Category Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={Palette.gray600} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Category Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Lawn & Gardening"
              placeholderTextColor={Palette.gray400}
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.inputLabel}>Description *</Text>
            <TextInput
              style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
              placeholder="Grass cutting, hedge trimming, garden watering"
              placeholderTextColor={Palette.gray400}
              multiline
              value={description}
              onChangeText={setDescription}
            />

            <Text style={styles.inputLabel}>Accent Color Hex</Text>
            <TextInput
              style={styles.input}
              placeholder="#2563EB"
              placeholderTextColor={Palette.gray400}
              value={color}
              onChangeText={setColor}
            />

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setModalVisible(false)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title={editingCategory ? 'Save Changes' : 'Create Category'}
                onPress={handleSave}
                style={{ flex: 2 }}
              />
            </View>
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
  categoryCard: {
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
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  categoryInfo: {
    flex: 1,
  },
  catName: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.gray900,
  },
  catDesc: {
    fontSize: 11,
    color: Palette.gray500,
    marginTop: 2,
  },
  catActions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
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
  modalActions: {
    flexDirection: 'row',
    marginTop: Spacing.four,
    marginBottom: Spacing.two,
  },
});
