import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Palette, Spacing, BorderRadius, Shadows } from '../constants/theme';
import {
  DEFAULT_FIREBASE_CONFIG,
  getStoredFirebaseConfig,
  saveStoredFirebaseConfig,
  isFirebaseConfigured,
} from '../services/firebaseConfig';
import { Button } from '../components/common/Button';

export default function FirebaseSetupScreen() {
  const [apiKey, setApiKey] = useState(DEFAULT_FIREBASE_CONFIG.apiKey);
  const [projectId, setProjectId] = useState(DEFAULT_FIREBASE_CONFIG.projectId);
  const [authDomain, setAuthDomain] = useState(DEFAULT_FIREBASE_CONFIG.authDomain);
  const [storageBucket, setStorageBucket] = useState(DEFAULT_FIREBASE_CONFIG.storageBucket);
  const [messagingSenderId, setMessagingSenderId] = useState(DEFAULT_FIREBASE_CONFIG.messagingSenderId);
  const [appId, setAppId] = useState(DEFAULT_FIREBASE_CONFIG.appId);

  useEffect(() => {
    async function loadConfig() {
      const cfg = await getStoredFirebaseConfig();
      if (cfg) {
        setApiKey(cfg.apiKey || '');
        setProjectId(cfg.projectId || 'fixora');
        setAuthDomain(cfg.authDomain || 'fixora.firebaseapp.com');
        setStorageBucket(cfg.storageBucket || 'fixora.firebasestorage.app');
        setMessagingSenderId(cfg.messagingSenderId || '');
        setAppId(cfg.appId || '');
      }
    }
    loadConfig();
  }, []);

  const handleSaveConfig = async () => {
    const config = {
      apiKey: apiKey.trim(),
      projectId: projectId.trim(),
      authDomain: authDomain.trim(),
      storageBucket: storageBucket.trim(),
      messagingSenderId: messagingSenderId.trim(),
      appId: appId.trim(),
    };

    await saveStoredFirebaseConfig(config);
    Alert.alert(
      'Firebase Config Saved! 🔥',
      'Your Fixora Firebase configuration has been saved. The app will use these credentials for Firebase Authentication and Cloud Firestore.'
    );
  };

  const isLive = isFirebaseConfigured();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
          <Ionicons name="arrow-back" size={24} color={Palette.gray800} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Firebase Project Fixora</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Project Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={styles.firebaseLogo}>
              <Ionicons name="logo-firebase" size={26} color="#F59E0B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.projectName}>Project: Fixora</Text>
              <Text style={styles.projectEmail}>Account: majeedumer50@gmail.com</Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: isLive ? Palette.accentSoft : Palette.warningSoft },
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  { color: isLive ? '#047857' : '#B45309' },
                ]}
              >
                {isLive ? 'LIVE CONNECTED' : 'ONLINE / DEMO READY'}
              </Text>
            </View>
          </View>

          <Text style={styles.statusDesc}>
            Fixora is integrated with Firebase Authentication and Cloud Firestore for storing
            customers, providers, categories, services, bookings, chats, and reviews.
          </Text>
        </View>

        {/* Instructions */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Connecting your Firebase Console</Text>
          <Text style={styles.infoStep}>
            1. Go to <Text style={styles.boldText}>console.firebase.google.com</Text>
          </Text>
          <Text style={styles.infoStep}>
            2. Open your project <Text style={styles.boldText}>Fixora</Text>
          </Text>
          <Text style={styles.infoStep}>
            3. In Project Settings under &ldquo;Your Apps&rdquo;, copy your Web app config keys below, or
            add them to an <Text style={styles.boldText}>.env</Text> file.
          </Text>
        </View>

        {/* Config Inputs Form */}
        <View style={styles.formCard}>
          <Text style={styles.formHeading}>Firebase Web Configuration</Text>

          <Text style={styles.label}>API Key</Text>
          <TextInput
            style={styles.input}
            placeholder="AIzaSy..."
            placeholderTextColor={Palette.gray400}
            value={apiKey}
            onChangeText={setApiKey}
          />

          <Text style={styles.label}>Project ID</Text>
          <TextInput
            style={styles.input}
            placeholder="fixora"
            placeholderTextColor={Palette.gray400}
            value={projectId}
            onChangeText={setProjectId}
          />

          <Text style={styles.label}>Auth Domain</Text>
          <TextInput
            style={styles.input}
            placeholder="fixora.firebaseapp.com"
            placeholderTextColor={Palette.gray400}
            value={authDomain}
            onChangeText={setAuthDomain}
          />

          <Text style={styles.label}>Storage Bucket</Text>
          <TextInput
            style={styles.input}
            placeholder="fixora.firebasestorage.app"
            placeholderTextColor={Palette.gray400}
            value={storageBucket}
            onChangeText={setStorageBucket}
          />

          <Text style={styles.label}>Messaging Sender ID</Text>
          <TextInput
            style={styles.input}
            placeholder="1029384756..."
            placeholderTextColor={Palette.gray400}
            value={messagingSenderId}
            onChangeText={setMessagingSenderId}
          />

          <Text style={styles.label}>App ID</Text>
          <TextInput
            style={styles.input}
            placeholder="1:1029384756:web:..."
            placeholderTextColor={Palette.gray400}
            value={appId}
            onChangeText={setAppId}
          />

          <Button
            title="Save & Connect Firebase"
            onPress={handleSaveConfig}
            icon="checkmark-circle"
            size="lg"
            style={{ marginTop: Spacing.four }}
          />
        </View>

        {/* Cloud Firestore Collections Overview */}
        <View style={styles.collectionsCard}>
          <Text style={styles.collTitle}>Active Cloud Firestore Collections</Text>

          <View style={styles.collItem}>
            <Text style={styles.collName}>📂 categories</Text>
            <Text style={styles.collDesc}>Service categories (Cleaning, Plumbing, AC, etc.)</Text>
          </View>

          <View style={styles.collItem}>
            <Text style={styles.collName}>🛠️ services</Text>
            <Text style={styles.collDesc}>Catalog of marketplace services with prices & durations</Text>
          </View>

          <View style={styles.collItem}>
            <Text style={styles.collName}>👥 users</Text>
            <Text style={styles.collDesc}>Customers, Service Providers, and Admins</Text>
          </View>

          <View style={styles.collItem}>
            <Text style={styles.collName}>📋 bookings</Text>
            <Text style={styles.collDesc}>Customer bookings with live status timelines</Text>
          </View>

          <View style={styles.collItem}>
            <Text style={styles.collName}>💬 messages</Text>
            <Text style={styles.collDesc}>Real-time 1-on-1 customer & provider messaging</Text>
          </View>

          <View style={styles.collItem}>
            <Text style={styles.collName}>⭐ reviews</Text>
            <Text style={styles.collDesc}>Ratings & customer feedback per service</Text>
          </View>
        </View>
      </ScrollView>
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
  scrollContent: {
    padding: Spacing.four,
    paddingBottom: Spacing.six,
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
  statusCard: {
    backgroundColor: Palette.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: Palette.gray200,
    marginBottom: Spacing.three,
    ...Shadows.sm,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  firebaseLogo: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectName: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.gray900,
  },
  projectEmail: {
    fontSize: 11,
    color: Palette.gray500,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusDesc: {
    fontSize: 12,
    color: Palette.gray600,
    lineHeight: 18,
    marginTop: 4,
  },
  infoCard: {
    backgroundColor: Palette.primarySoft,
    borderRadius: BorderRadius.lg,
    padding: Spacing.three,
    marginBottom: Spacing.three,
    borderWidth: 1,
    borderColor: Palette.primary,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.primary,
    marginBottom: 4,
  },
  infoStep: {
    fontSize: 12,
    color: Palette.gray700,
    lineHeight: 18,
    marginTop: 2,
  },
  boldText: {
    fontWeight: '700',
  },
  formCard: {
    backgroundColor: Palette.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: Palette.gray200,
    marginBottom: Spacing.three,
    ...Shadows.sm,
  },
  formHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.gray900,
    marginBottom: 8,
  },
  label: {
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
    backgroundColor: Palette.gray50,
  },
  collectionsCard: {
    backgroundColor: Palette.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: Palette.gray200,
    ...Shadows.sm,
  },
  collTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.gray900,
    marginBottom: Spacing.two,
  },
  collItem: {
    marginBottom: 8,
  },
  collName: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.gray800,
  },
  collDesc: {
    fontSize: 11,
    color: Palette.gray500,
  },
});
