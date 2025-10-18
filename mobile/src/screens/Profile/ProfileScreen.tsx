import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { SubscriptionStatus, QuotaUsage } from '../../types';
import { colors, layout } from '../../theme';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [quotaUsage, setQuotaUsage] = useState<QuotaUsage | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [status, quota] = await Promise.all([
        api.getSubscriptionStatus(),
        api.getQuotaUsage(),
      ]);
      setSubscriptionStatus(status);
      setQuotaUsage(quota);
    } catch (error) {
      console.error('Failed to load profile data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: 20 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        {user?.full_name && (
          <Text style={styles.name}>{user.full_name}</Text>
        )}
      </View>

      {subscriptionStatus && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Subscription</Text>
          <View style={styles.tierBadge}>
            <Text style={styles.tierText}>
              {subscriptionStatus.tier === 'advanced' ? 'Advanced' : 'Basic'}
            </Text>
          </View>
          {subscriptionStatus.isInTrial && (
            <Text style={styles.trialText}>Trial active</Text>
          )}
        </View>
      )}

      {quotaUsage && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Weekly Quota</Text>
          <View style={styles.quotaRow}>
            <Text style={styles.quotaLabel}>Personal Meditations:</Text>
            <Text style={styles.quotaValue}>
              {quotaUsage.personal.used} / {quotaUsage.personal.limit}
            </Text>
          </View>
          <View style={styles.quotaRow}>
            <Text style={styles.quotaLabel}>Gift Meditations:</Text>
            <Text style={styles.quotaValue}>
              {quotaUsage.gift.used} / {quotaUsage.gift.limit}
            </Text>
          </View>
        </View>
      )}

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  header: {
    padding: layout.screenHorizontal,
    paddingTop: layout.screenTopBase,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  name: {
    fontSize: 18,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.surface,
    margin: layout.screenHorizontal,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  tierBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
  },
  tierText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  trialText: {
    fontSize: 14,
    color: colors.success,
  },
  quotaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  quotaLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  quotaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  logoutButton: {
    backgroundColor: colors.error,
    margin: layout.screenHorizontal,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
  },
  logoutText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
});
