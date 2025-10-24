import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, layout } from '../../theme';
import api from '../../services/api';

interface Vision {
  id: string;
  title: string;
  categories: string[];
  overall_completeness: number;
  summary: string | null;
  tagline: string | null;
  updated_at: string;
}

const CATEGORIES = [
  'All',
  'Freeform',
  'Health',
  'Wealth',
  'Relationships',
  'Play',
  'Love',
  'Purpose',
  'Spirit',
  'Healing'
];

function getProgressColor(completeness: number): string {
  if (completeness === 0) return '#6b7280';
  if (completeness <= 40) return '#ef4444';
  if (completeness <= 70) return '#f59e0b'; 
  return '#10b981';
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString();
}

export default function MyVisionsScreen({ navigation }: any) {
  const [visions, setVisions] = useState<Vision[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');

  const loadVisions = useCallback(async () => {
    try {
      const visionsData = await api.getAllVisions();
      setVisions(visionsData);
    } catch (error) {
      console.error('Failed to load visions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadVisions();
    }, [loadVisions])
  );

  const handleCreateVision = async () => {
    try {
      const vision = await api.createVision();
      navigation.navigate('VisionFlow', { visionId: vision.id, isNewVision: true });
    } catch (error) {
      console.error('Failed to create vision:', error);
    }
  };

  const handleVisionPress = (visionId: string) => {
    navigation.navigate('VisionDetail', { visionId });
  };

  const filteredVisions = visions.filter(v => {
    if (selectedCategory === 'All') return true;
    return v.categories.some(c => c.toLowerCase() === selectedCategory.toLowerCase());
  });

  // Get categories that have at least one vision
  const availableCategories = ['All', ...CATEGORIES.slice(1).filter(category => 
    visions.some(v => v.categories.some(c => c.toLowerCase() === category.toLowerCase()))
  )];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Visions</Text>
        <TouchableOpacity onPress={handleCreateVision} style={styles.addButton}>
          <Ionicons name="add" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      {availableCategories.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
          contentContainerStyle={styles.categoriesContent}
        >
          {availableCategories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryFilterPill,
                selectedCategory === category && styles.categoryFilterPillActive
              ]}
              onPress={() => setSelectedCategory(category)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.categoryFilterText,
                  selectedCategory === category && styles.categoryFilterTextActive
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {filteredVisions.length === 0 && selectedCategory === 'All' && (
          <View style={styles.emptyState}>
            <Ionicons name="flower-outline" size={64} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>Start Your First Vision</Text>
            <Text style={styles.emptyText}>
              Create a vision to begin exploring what you want to manifest in your life.
            </Text>
            <TouchableOpacity onPress={handleCreateVision} style={styles.emptyButton}>
              <Text style={styles.emptyButtonText}>+ New Vision</Text>
            </TouchableOpacity>
          </View>
        )}

        {filteredVisions.length === 0 && selectedCategory !== 'All' && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No visions in {selectedCategory}</Text>
          </View>
        )}

        {filteredVisions.map((vision) => (
          <TouchableOpacity
            key={vision.id}
            style={styles.visionCard}
            onPress={() => handleVisionPress(vision.id)}
            activeOpacity={0.7}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.visionTitle}>
                {vision.title}
              </Text>
              <Text style={styles.updatedDate}>{formatDate(vision.updated_at)}</Text>
            </View>

            {vision.categories.length > 0 && (
              <View style={styles.categoryContainer}>
                {vision.categories.slice(0, 3).map((category, index) => (
                  <View key={index} style={styles.categoryPill}>
                    <Text style={styles.categoryText}>{category}</Text>
                  </View>
                ))}
                {vision.categories.length > 3 && (
                  <Text style={styles.moreCategoriesText}>+{vision.categories.length - 3}</Text>
                )}
              </View>
            )}

            {vision.tagline && (
              <Text style={styles.tagline} numberOfLines={2}>
                {vision.tagline}
              </Text>
            )}

            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${vision.overall_completeness}%`,
                      backgroundColor: getProgressColor(vision.overall_completeness)
                    }
                  ]}
                />
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
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
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenHorizontal,
    paddingTop: layout.screenTopBase,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoriesScroll: {
    flexGrow: 0,
    marginBottom: 20,
  },
  categoriesContent: {
    paddingHorizontal: layout.screenHorizontal,
    gap: 8,
  },
  categoryFilterPill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.surfaceLight,
  },
  categoryFilterPillActive: {
    backgroundColor: colors.primary,
  },
  categoryFilterText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  categoryFilterTextActive: {
    color: colors.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: layout.screenHorizontal,
    paddingBottom: 100,
  },
  visionCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  visionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginRight: 12,
  },
  updatedDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    alignItems: 'center',
  },
  categoryPill: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 6,
  },
  categoryText: {
    fontSize: 12,
    color: colors.primaryLight,
    textTransform: 'capitalize',
  },
  moreCategoriesText: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  tagline: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 16,
    lineHeight: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    width: 30,
    height: 6,
    backgroundColor: colors.surfaceLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    minWidth: 32,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
    marginTop: 24,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 999,
  },
  emptyButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
