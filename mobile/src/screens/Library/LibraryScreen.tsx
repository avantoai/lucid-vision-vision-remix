import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { useNavigation, useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, TabParamList, Meditation } from '../../types';
import api from '../../services/api';
import { Text, Button, Card, IconButton } from '../../components/ui';
import { theme } from '../../theme/theme';
import { Ionicons } from '@expo/vector-icons';

type LibraryScreenNavigationProp = StackNavigationProp<RootStackParamList>;
type LibraryScreenRouteProp = RouteProp<TabParamList, 'Library'>;

export default function LibraryScreen() {
  const navigation = useNavigation<LibraryScreenNavigationProp>();
  const route = useRoute<LibraryScreenRouteProp>();
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
      
      if (route.params?.showGeneratingNotification) {
        setShowNotification(true);
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
      onPress={() => {
        if (item.status === 'generating') {
          Alert.alert('Still Generating', 'This meditation is still being created. You\'ll be notified when it\'s ready!');
        } else if (item.status === 'failed') {
          Alert.alert('Generation Failed', 'This meditation failed to generate. Please create a new one.');
        } else {
          navigation.navigate('MeditationPlayer', { meditationId: item.id });
        }
      }}
      activeOpacity={0.7}
    >
      <Card style={styles.meditationCard}>
        <View style={styles.cardContent}>
          <View style={styles.cardMeta}>
            <Text variant="tiny" color="primary" weight="semibold" style={styles.categoryText}>
              {item.category}
            </Text>
            <Text variant="tiny" color="secondary">
              {item.duration} min
            </Text>
          </View>
          
          <Text variant="subheading" weight="bold" numberOfLines={2} style={styles.title}>
            {item.title}
          </Text>
          
          {item.status === 'generating' && (
            <View style={styles.generatingBadge}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text variant="small" color="primary" weight="medium">Generating...</Text>
            </View>
          )}
          
          {item.status === 'failed' && (
            <View style={styles.failedBadge}>
              <Text 
                variant="small" 
                weight="medium" 
                style={styles.failedText}
              >
                ❌ Generation failed
              </Text>
            </View>
          )}
          
          <View style={styles.badges}>
            {item.is_pinned && <Text variant="tiny">📌 Pinned</Text>}
            {item.is_favorite && <Text variant="tiny">❤️</Text>}
          </View>
        </View>
        
        <View style={styles.cardImage} />
      </Card>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text variant="title" weight="bold">My Library</Text>
        
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, filter === 'all' && styles.tabActive]}
            onPress={() => setFilter('all')}
          >
            <Text 
              variant="body" 
              weight="semibold"
              style={filter === 'all' ? styles.tabTextActive : styles.tabText}
            >
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, filter === 'favorites' && styles.tabActive]}
            onPress={() => setFilter('favorites')}
          >
            <Text 
              variant="body" 
              weight="semibold"
              style={filter === 'favorites' ? styles.tabTextActive : styles.tabText}
            >
              Favorites
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {showNotification && (
        <Card style={styles.notificationBanner}>
          <View style={styles.notificationContent}>
            <Text variant="small" color="body">
              Your meditation is being generated. This will take a few minutes. We'll notify you once it's ready ✨
            </Text>
          </View>
          <IconButton
            icon={<Ionicons name="close" size={20} color={theme.colors.text.primary} />}
            onPress={() => setShowNotification(false)}
            size="small"
          />
        </Card>
      )}

      {error && (
        <Card style={styles.errorContainer}>
          <Text variant="small" style={styles.errorText}>
            ⚠️ {error}
          </Text>
          <Button
            title="Retry"
            onPress={loadMeditations}
            variant="primary"
            size="small"
          />
        </Card>
      )}

      <FlatList
        data={meditations}
        renderItem={renderMeditation}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          !error ? (
            <Text variant="body" color="secondary" align="center" style={styles.emptyText}>
              No meditations yet
            </Text>
          ) : null
        }
      />

      <View style={styles.createButtonContainer}>
        <Button
          title="Create Meditation"
          onPress={() => navigation.navigate('CategorySelection')}
          variant="primary"
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
  },
  tabs: {
    flexDirection: 'row',
    marginTop: theme.spacing.lg,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.card,
  },
  tab: {
    flex: 1,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -2,
  },
  tabActive: {
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    color: theme.colors.text.secondary,
  },
  tabTextActive: {
    color: theme.colors.primary,
  },
  listContainer: {
    padding: theme.spacing.xl,
    paddingBottom: 120,
  },
  meditationCard: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  categoryText: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    marginBottom: theme.spacing.sm,
  },
  cardImage: {
    width: 60,
    height: 60,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
  },
  generatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  failedBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    marginTop: theme.spacing.sm,
    alignSelf: 'flex-start',
  },
  badges: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  emptyText: {
    marginTop: theme.spacing.huge,
  },
  errorContainer: {
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.md,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  errorText: {
    color: theme.colors.status.error,
    marginBottom: theme.spacing.sm,
  },
  failedText: {
    color: theme.colors.status.error,
  },
  createButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background,
  },
  notificationBanner: {
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  notificationContent: {
    flex: 1,
  },
});
