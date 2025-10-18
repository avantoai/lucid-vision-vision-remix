import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../types';
import { CATEGORIES } from '../../constants/config';
import api from '../../services/api';
import { colors, layout } from '../../theme';

type CategorySelectionNavigationProp = StackNavigationProp<RootStackParamList>;

export default function CategorySelectionScreen() {
  const navigation = useNavigation<CategorySelectionNavigationProp>();
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
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.title}>Choose a Category</Text>
        <Text style={styles.subtitle}>Select a category to create your meditation</Text>
      </View>

      <View style={styles.categoriesContainer}>
        {CATEGORIES.map((category) => {
          const categoryData = categories.find(c => c.name === category.id);
          const hasVision = categoryData?.status === 'in_progress';
          
          return (
            <TouchableOpacity
              key={category.id}
              style={styles.categoryCard}
              onPress={() => navigation.navigate('VisionFlow', { category: category.id })}
            >
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryName}>{category.name}</Text>
                {hasVision && <View style={styles.visionBadge} />}
              </View>
              <Text style={styles.categoryDescription}>{category.description}</Text>
              {categoryData?.tagline && (
                <Text style={styles.categoryTagline}>{categoryData.tagline}</Text>
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
  backButton: {
    position: 'absolute',
    top: layout.headerTop,
    left: layout.headerSide,
    zIndex: 10,
    width: layout.headerButtonSize,
    height: layout.headerButtonSize,
    borderRadius: layout.headerButtonSize / 2,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: layout.screenHorizontal,
    paddingTop: layout.screenTopBase + layout.headerButtonSize,
    paddingLeft: layout.headerSide + layout.headerButtonSize + 12,
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
    paddingTop: 0,
  },
  categoryCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
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
  visionBadge: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
  },
  categoryDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  categoryTagline: {
    fontSize: 14,
    color: colors.primary,
    fontStyle: 'italic',
  },
});
