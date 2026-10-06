import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Palette, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useMarketplace } from '../../context/MarketplaceContext';
import { Button } from '../../components/common/Button';

export default function ProviderEarningsScreen() {
  const { user } = useAuth();
  const { bookings } = useMarketplace();

  const providerId = user?.id || 'prov-1';

  const completedJobs = useMemo(() => {
    return bookings.filter(
      (b) => (b.providerId === providerId || b.providerId === 'prov-1') && b.status === 'completed'
    );
  }, [bookings, providerId]);

  const jobsRevenue = completedJobs.reduce((acc, curr) => acc + curr.totalPrice, 0);
  const totalBalance = (user?.earnings || 3420) + jobsRevenue;

  const handleWithdraw = () => {
    Alert.alert(
      'Request Payout',
      `Submit payout request for $${totalBalance} to your connected bank account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Transfer',
          onPress: () => {
            alert('Payout request initiated! Funds will arrive in 1-2 business days.');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
          <Ionicons name="arrow-back" size={24} color={Palette.gray800} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Earnings & Payouts</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Earnings Hero Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>${totalBalance.toLocaleString()}</Text>
          <Text style={styles.balanceSub}>Lifetime Platform Revenue</Text>

          <Button
            title="Withdraw to Bank Account"
            onPress={handleWithdraw}
            icon="cash-outline"
            size="lg"
            style={styles.withdrawBtn}
          />
        </View>

        {/* Breakdown Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Ionicons name="checkmark-done-circle" size={22} color={Palette.accent} />
            <Text style={styles.statNumber}>{completedJobs.length + 42}</Text>
            <Text style={styles.statLabel}>Jobs Completed</Text>
          </View>

          <View style={styles.statBox}>
            <Ionicons name="trending-up" size={22} color={Palette.primary} />
            <Text style={styles.statNumber}>$68.50</Text>
            <Text style={styles.statLabel}>Avg Job Value</Text>
          </View>

          <View style={styles.statBox}>
            <Ionicons name="star" size={22} color={Palette.star} />
            <Text style={styles.statNumber}>4.9</Text>
            <Text style={styles.statLabel}>Customer Rating</Text>
          </View>
        </View>

        {/* Completed Jobs History */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Completed Job Transactions</Text>
        </View>

        {completedJobs.map((b) => (
          <View key={b.id} style={styles.transactionCard}>
            <View style={styles.transLeft}>
              <View style={styles.transIconBox}>
                <Ionicons name="build" size={18} color={Palette.accent} />
              </View>
              <View>
                <Text style={styles.transTitle}>{b.serviceTitle}</Text>
                <Text style={styles.transSub}>Customer: {b.customerName}</Text>
                <Text style={styles.transDate}>Completed on {b.date}</Text>
              </View>
            </View>

            <View style={styles.transRight}>
              <Text style={styles.transAmount}>+${b.totalPrice}</Text>
              <Text style={styles.transPaid}>PAID</Text>
            </View>
          </View>
        ))}

        {/* Demo historical transactions */}
        <View style={styles.transactionCard}>
          <View style={styles.transLeft}>
            <View style={styles.transIconBox}>
              <Ionicons name="flash" size={18} color={Palette.accent} />
            </View>
            <View>
              <Text style={styles.transTitle}>Ceiling Fan & Chandelier Fitting</Text>
              <Text style={styles.transSub}>Customer: Emma Watson</Text>
              <Text style={styles.transDate}>Completed on 2026-09-20</Text>
            </View>
          </View>
          <View style={styles.transRight}>
            <Text style={styles.transAmount}>+$39</Text>
            <Text style={styles.transPaid}>PAID</Text>
          </View>
        </View>

        <View style={styles.transactionCard}>
          <View style={styles.transLeft}>
            <View style={styles.transIconBox}>
              <Ionicons name="water" size={18} color={Palette.accent} />
            </View>
            <View>
              <Text style={styles.transTitle}>Leak Repair & Pipe Replacement</Text>
              <Text style={styles.transSub}>Customer: Alex Morgan</Text>
              <Text style={styles.transDate}>Completed on 2026-09-28</Text>
            </View>
          </View>
          <View style={styles.transRight}>
            <Text style={styles.transAmount}>+$45</Text>
            <Text style={styles.transPaid}>PAID</Text>
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
  balanceCard: {
    backgroundColor: '#064E3B',
    borderRadius: BorderRadius.xl,
    padding: Spacing.five,
    alignItems: 'center',
    marginBottom: Spacing.four,
    ...Shadows.md,
  },
  balanceLabel: {
    fontSize: 12,
    color: '#A7F3D0',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  balanceAmount: {
    fontSize: 34,
    fontWeight: '900',
    color: Palette.white,
    marginVertical: 4,
  },
  balanceSub: {
    fontSize: 11,
    color: '#6EE7B7',
    marginBottom: Spacing.four,
  },
  withdrawBtn: {
    backgroundColor: Palette.accent,
    width: '100%',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.four,
  },
  statBox: {
    flex: 1,
    backgroundColor: Palette.white,
    padding: 12,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Palette.gray200,
    ...Shadows.sm,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.gray900,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 10,
    color: Palette.gray500,
    marginTop: 2,
    textAlign: 'center',
  },
  sectionHeader: {
    marginBottom: Spacing.three,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.gray900,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.white,
    padding: Spacing.three,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Palette.gray200,
    marginBottom: Spacing.two,
    ...Shadows.sm,
  },
  transLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  transIconBox: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: Palette.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.gray900,
  },
  transSub: {
    fontSize: 11,
    color: Palette.gray600,
    marginTop: 1,
  },
  transDate: {
    fontSize: 10,
    color: Palette.gray400,
    marginTop: 2,
  },
  transRight: {
    alignItems: 'flex-end',
  },
  transAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: Palette.accent,
  },
  transPaid: {
    fontSize: 9,
    fontWeight: '800',
    color: Palette.gray400,
    marginTop: 2,
  },
});
