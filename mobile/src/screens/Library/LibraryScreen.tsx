import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, TabParamList, Meditation } from '../../types';
import api from '../../services/api';
import { colors, layout } from '../../theme';

type LibraryScreenNavigationProp = StackNavigationProp<RootStackParamList>;
type LibraryScreenRouteProp = RouteProp<TabParamList, 'Library'>;

export default function LibraryScreen() {
  const navigation = useNavigation<LibraryScreenNavigationProp>();
  const route = useRoute<LibraryScreenRouteProp>();
  const insets = useSafeAreaInsets();
  const [meditations, setMeditations] = useState<Meditation[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const previousGeneratingIds = useRef<Set<string>>(new Set());
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadMeditations();
  }, [filter]);

  useFocusEffect(
    React.useCallback(() => {
      loadMeditations();
      startPolling();
      
      // Check if we should show the notification
      if (route.params?.showGeneratingNotification) {
        setShowNotification(true);
        // Clear the param so it doesn't show again on refocus
        navigation.setParams({ showGeneratingNotification: undefined } as any);
      }
      
      return () => {
        stopPolling();
      };
    }, [filter, route.params?.showGeneratingNotification])
  );

  const startPolling = () => {
    stopPolling();
    pollingInterval.current = setInterval(() => {
      checkForCompletedMeditations();
    }, 5000);
  };

  const stopPolling = () => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
  };

  const checkForCompletedMeditations = async () => {
    try {
      const data = await api.getMeditations(filter === 'all' ? undefined : filter);
      const currentGeneratingIds = new Set(
        data.filter(m => m.status === 'generating').map(m => m.id)
      );
      
      const previousIds = Array.from(previousGeneratingIds.current);
      const nowFinishedIds = previousIds.filter(id => !currentGeneratingIds.has(id));
      
      if (nowFinishedIds.length > 0) {
        nowFinishedIds.forEach(id => {
          const meditation = data.find(m => m.id === id);
          if (meditation) {
            if (meditation.status === 'completed') {
              Alert.alert(
                '✨ Meditation Ready!',
                `"${meditation.title}" is ready to play`,
                [
                  { text: 'Later', style: 'cancel' },
                  { 
                    text: 'Play Now', 
                    onPress: () => navigation.navigate('MeditationPlayer', { meditationId: meditation.id })
                  }
                ]
              );
            } else if (meditation.status === 'failed') {
              Alert.alert(
                '❌ Generation Failed',
                `Failed to create "${meditation.title}". Please try creating a new meditation.`,
                [{ text: 'OK' }]
              );
            }
          }
        });
      }
      
      previousGeneratingIds.current = currentGeneratingIds;
      setMeditations(data || []);
    } catch (error) {
      console.error('Polling error:', error);
    }
  };

  const loadMeditations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('📚 Loading meditations with filter:', filter === 'all' ? undefined : filter);
      const data = await api.getMeditations(filter === 'all' ? undefined : filter);
      console.log('✅ Loaded meditations:', data?.length || 0);
      
      const generatingIds = new Set(
        data.filter(m => m.status === 'generating').map(m => m.id)
      );
      previousGeneratingIds.current = generatingIds;
      
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
      onPress={() => {
        if (item.status === 'generating') {
          Alert.alert('Still Generating', 'This meditation is still being created. You\'ll be notified when it\'s ready!');
        } else if (item.status === 'failed') {
          Alert.alert('Generation Failed', 'This meditation failed to generate. Please create a new one.');
        } else {
          navigation.navigate('MeditationPlayer', { meditationId: item.id });
        }
      }}
      disabled={item.status !== 'completed'}
    >
      {item.is_favorite && (
        <Ionicons name="heart" size={18} color="#EF4444" style={styles.favoriteIcon} />
      )}
      <View style={styles.meditationHeader}>
        <Text style={styles.meditationCategory}>{item.category.toUpperCase()}</Text>
        <Text style={styles.bulletSeparator}> • </Text>
        <Text style={styles.meditationDuration}>{item.duration} min</Text>
      </View>
      <Text style={styles.meditationTitle}>{item.title}</Text>
      {item.status === 'generating' && (
        <View style={styles.generatingBadge}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.generatingText}>Generating...</Text>
        </View>
      )}
      {item.status === 'failed' && (
        <View style={styles.failedBadge}>
          <Ionicons name="close-circle" size={16} color={colors.errorDark} style={{ marginRight: 6 }} />
          <Text style={styles.failedText}>Generation failed</Text>
        </View>
      )}
      {item.is_pinned && (
        <View style={styles.pinnedBadge}>
          <Ionicons name="pin" size={16} color={colors.warning} style={{ marginRight: 4 }} />
          <Text style={styles.pinnedBadgeText}>Pinned</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
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
        </View>
      </View>

      {showNotification && (
        <View style={styles.notificationBanner}>
          <View style={styles.notificationContent}>
            <Text style={styles.notificationText}>
              Your meditation is being generated. This will take a few minutes. We'll notify you once it's ready{' '}
            </Text>
            <Ionicons name="sparkles" size={16} color={colors.primary} />
          </View>
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={() => setShowNotification(false)}
          >
            <Ionicons name="close" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

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
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
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
    backgroundColor: colors.surfaceLight,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.white,
  },
  listContainer: {
    padding: layout.screenHorizontal,
  },
  meditationCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  meditationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  meditationCategory: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.primary,
    letterSpacing: 0,
  },
  bulletSeparator: {
    fontSize: 14,
    color: colors.textSecondary,
    marginHorizontal: 4,
  },
  meditationDuration: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  meditationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  favoriteIcon: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  pinnedBadgeText: {
    fontSize: 12,
    color: colors.warning,
  },
  generatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  generatingText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  failedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorLight,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  failedText: {
    fontSize: 12,
    color: colors.errorDark,
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: colors.textTertiary,
    marginTop: 40,
  },
  errorContainer: {
    backgroundColor: colors.errorLight,
    margin: layout.screenHorizontal,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.error,
  },
  errorText: {
    color: colors.errorDark,
    fontSize: 14,
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: colors.errorDark,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  retryText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: colors.primary,
    margin: layout.screenHorizontal,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 12,
    elevation: 8,
  },
  createButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
  notificationBanner: {
    backgroundColor: colors.surfaceLight,
    marginHorizontal: layout.screenHorizontal,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  notificationContent: {
    flex: 1,
    marginRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  notificationText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  dismissButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
});
