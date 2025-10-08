import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { SubscriptionStatus, QuotaUsage } from '../../types';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
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
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  name: {
    fontSize: 18,
    color: '#6B7280',
  },
  card: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  tierBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#6366F1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
  },
  tierText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  trialText: {
    fontSize: 14,
    color: '#10B981',
  },
  quotaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  quotaLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  quotaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  logoutButton: {
    backgroundColor: '#EF4444',
    margin: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
