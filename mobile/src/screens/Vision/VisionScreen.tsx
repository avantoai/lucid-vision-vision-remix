import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import { CATEGORIES } from '../../constants/config';
import api from '../../services/api';

type VisionScreenNavigationProp = StackNavigationProp<RootStackParamList>;

export default function VisionScreen() {
  const navigation = useNavigation<VisionScreenNavigationProp>();
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await api.getVisionCategories();
      setCategories(data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Living Vision</Text>
        <Text style={styles.subtitle}>Track and evolve your vision across all life categories</Text>
      </View>

      <View style={styles.categoriesContainer}>
        {CATEGORIES.map((category) => {
          const categoryData = categories.find(c => c.name === category.id);
          const status = categoryData?.status || 'not_started';
          const hasSummary = categoryData?.hasSummary || false;
          
          return (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryCard,
                hasSummary && styles.categoryCardWithSummary,
              ]}
              onPress={() => navigation.navigate('VisionDetail', { category: category.id })}
            >
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryName}>{category.name}</Text>
                {hasSummary && <View style={styles.summaryBadge}><Text style={styles.summaryBadgeText}>✨</Text></View>}
              </View>
              {categoryData?.tagline && (
                <Text style={styles.categoryTagline}>{categoryData.tagline}</Text>
              )}
              <Text style={styles.categoryStatus}>
                {hasSummary ? 'Vision Created' : status === 'in_progress' ? 'In Progress' : 'Not Started'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
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
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  categoriesContainer: {
    padding: 20,
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryCardCompleted: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  categoryCardWithSummary: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  summaryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: '#6366F1',
  },
  summaryBadgeText: {
    fontSize: 14,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    textTransform: 'capitalize',
  },
  completedBadge: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
  },
  categoryTagline: {
    fontSize: 14,
    color: '#6366F1',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  categoryStatus: {
    fontSize: 12,
    color: '#6B7280',
  },
});
