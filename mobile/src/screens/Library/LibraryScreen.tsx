import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, Meditation } from '../../types';
import api from '../../services/api';

type LibraryScreenNavigationProp = StackNavigationProp<RootStackParamList>;

export default function LibraryScreen() {
  const navigation = useNavigation<LibraryScreenNavigationProp>();
  const [meditations, setMeditations] = useState<Meditation[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMeditations();
  }, [filter]);

  const loadMeditations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('📚 Loading meditations with filter:', filter === 'all' ? undefined : filter);
      const data = await api.getMeditations(filter === 'all' ? undefined : filter);
      console.log('✅ Loaded meditations:', data?.length || 0);
      setMeditations(data || []);
    } catch (error) {
      console.error('❌ Failed to load meditations:', error);
      setError(error instanceof Error ? error.message : 'Failed to load meditations');
    } finally {
      setIsLoading(false);
    }
  };

  const renderMeditation = ({ item }: { item: Meditation }) => (
    <TouchableOpacity
      style={styles.meditationCard}
      onPress={() => navigation.navigate('MeditationPlayer', { meditationId: item.id })}
    >
      <View style={styles.meditationHeader}>
        <Text style={styles.meditationTitle}>{item.title}</Text>
        <Text style={styles.meditationDuration}>{item.duration} min</Text>
      </View>
      <Text style={styles.meditationCategory}>{item.category}</Text>
      {item.is_pinned && <Text style={styles.pinnedBadge}>📌 Pinned</Text>}
      {item.is_favorite && <Text style={styles.favoriteBadge}>❤️</Text>}
    </TouchableOpacity>
  );

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
        <Text style={styles.title}>My Library</Text>
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'favorites' && styles.filterButtonActive]}
            onPress={() => setFilter('favorites')}
          >
            <Text style={[styles.filterText, filter === 'favorites' && styles.filterTextActive]}>Favorites</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'pinned' && styles.filterButtonActive]}
            onPress={() => setFilter('pinned')}
          >
            <Text style={[styles.filterText, filter === 'pinned' && styles.filterTextActive]}>Pinned</Text>
          </TouchableOpacity>
        </View>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <TouchableOpacity onPress={loadMeditations} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={meditations}
        renderItem={renderMeditation}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          !error ? <Text style={styles.emptyText}>No meditations yet</Text> : null
        }
      />

      <TouchableOpacity
        style={styles.createButton}
        onPress={() => navigation.navigate('CategorySelection')}
      >
        <Text style={styles.createButtonText}>Create Meditation</Text>
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
    marginBottom: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
  },
  filterButtonActive: {
    backgroundColor: '#6366F1',
  },
  filterText: {
    fontSize: 14,
    color: '#6B7280',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    padding: 20,
  },
  meditationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  meditationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  meditationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  meditationDuration: {
    fontSize: 14,
    color: '#6B7280',
  },
  meditationCategory: {
    fontSize: 14,
    color: '#6366F1',
    textTransform: 'capitalize',
  },
  pinnedBadge: {
    fontSize: 12,
    color: '#F59E0B',
    marginTop: 4,
  },
  favoriteBadge: {
    fontSize: 12,
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 40,
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#6366F1',
    margin: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
