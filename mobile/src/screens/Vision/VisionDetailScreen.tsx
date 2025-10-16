import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
import api from '../../services/api';

type VisionDetailRouteProp = RouteProp<RootStackParamList, 'VisionDetail'>;
type VisionDetailNavigationProp = StackNavigationProp<RootStackParamList, 'VisionDetail'>;

export default function VisionDetailScreen() {
  const navigation = useNavigation<VisionDetailNavigationProp>();
  const route = useRoute<VisionDetailRouteProp>();
  const [visionData, setVisionData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadVisionData();
    }, [route.params.category])
  );

  const loadVisionData = async () => {
    try {
      const data = await api.getCategoryVision(route.params.category);
      setVisionData(data);
    } catch (error) {
      console.error('Failed to load vision data:', error);
      Alert.alert('Error', 'Failed to load vision summary');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExploreVision = () => {
    navigation.navigate('VisionFlow', {
      category: route.params.category
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  const hasSummary = visionData?.summary && visionData.summary.trim().length > 0;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>←</Text>
      </TouchableOpacity>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.category}>{route.params.category}</Text>
        
        {visionData?.tagline && (
          <Text style={styles.tagline}>{visionData.tagline}</Text>
        )}

        {hasSummary ? (
          <View style={styles.summaryContainer}>
            <Text style={styles.sectionTitle}>Your Vision</Text>
            <Text style={styles.summaryText}>{visionData.summary}</Text>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>✨</Text>
            <Text style={styles.emptyTitle}>No Vision Yet</Text>
            <Text style={styles.emptyDescription}>
              Begin exploring your vision for {route.params.category} to create a personalized summary.
            </Text>
          </View>
        )}

        {visionData?.responses && visionData.responses.length > 0 && (
          <View style={styles.responsesContainer}>
            <Text style={styles.sectionTitle}>Your Reflections ({visionData.responses.length})</Text>
            {visionData.responses.slice(0, 3).map((r: any, index: number) => (
              <View key={index} style={styles.responseCard}>
                <Text style={styles.responseQuestion}>{r.question}</Text>
                <Text style={styles.responseAnswer}>{r.answer}</Text>
              </View>
            ))}
            {visionData.responses.length > 3 && (
              <Text style={styles.moreResponses}>
                + {visionData.responses.length - 3} more reflections
              </Text>
            )}
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={styles.floatingButtonContainer}>
        <TouchableOpacity style={styles.exploreButton} onPress={handleExploreVision}>
          <Text style={styles.exploreButtonText}>Explore Vision</Text>
        </TouchableOpacity>
      </View>
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
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    fontSize: 24,
    color: '#6B7280',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 100,
    paddingBottom: 120,
  },
  category: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    textTransform: 'capitalize',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 18,
    color: '#6366F1',
    fontStyle: 'italic',
    marginBottom: 32,
  },
  summaryContainer: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 16,
    lineHeight: 26,
    color: '#374151',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  responsesContainer: {
    marginTop: 24,
  },
  responseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  responseQuestion: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  responseAnswer: {
    fontSize: 15,
    color: '#111827',
    lineHeight: 22,
  },
  moreResponses: {
    fontSize: 14,
    color: '#6366F1',
    textAlign: 'center',
    marginTop: 8,
  },
  bottomSpacer: {
    height: 40,
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  exploreButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  exploreButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
