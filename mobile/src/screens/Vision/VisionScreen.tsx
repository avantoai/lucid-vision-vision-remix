import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../types';
import { CATEGORIES } from '../../constants/config';
import api from '../../services/api';
import { colors, layout } from '../../theme';

type VisionScreenNavigationProp = StackNavigationProp<RootStackParamList>;

export default function VisionScreen() {
  const navigation = useNavigation<VisionScreenNavigationProp>();
  const insets = useSafeAreaInsets();
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
        <ActivityIndicator size="large" color={colors.primary} />
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
              onPress={() => {
                if (hasSummary) {
                  navigation.navigate('VisionDetail', { category: category.id });
                } else {
                  navigation.navigate('VisionFlow', { category: category.id });
                }
              }}
            >
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryName}>{category.name}</Text>
                {hasSummary && (
                  <Ionicons name="sparkles" size={20} color={colors.warning} />
                )}
              </View>
              {categoryData?.tagline && (
                <Text style={styles.categoryTagline}>{categoryData.tagline}</Text>
              )}
              {!hasSummary && (
                <Text style={styles.categoryStatus}>
                  {status === 'in_progress' ? 'In Progress' : 'Not Started'}
                </Text>
              )}
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
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  categoriesContainer: {
    padding: layout.screenHorizontal,
  },
  categoryCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryCardCompleted: {
    borderColor: colors.success,
    backgroundColor: colors.successLight,
  },
  categoryCardWithSummary: {
    borderColor: colors.primaryLight,
    backgroundColor: colors.surfaceLight,
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
    color: colors.text,
    textTransform: 'capitalize',
  },
  completedBadge: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
  },
  categoryTagline: {
    fontSize: 14,
    color: colors.primary,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  categoryStatus: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
