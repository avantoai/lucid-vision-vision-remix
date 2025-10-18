import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../types';
import api from '../../services/api';
import { colors, layout } from '../../theme';

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
        <ActivityIndicator size="large" color={colors.primary} />
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
            <Ionicons name="sparkles" size={64} color={colors.primary} style={{ marginBottom: 16 }} />
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
  backText: {
    fontSize: 24,
    color: colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: layout.screenHorizontal,
    paddingTop: 100,
    paddingBottom: 120,
  },
  category: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    textTransform: 'capitalize',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 18,
    color: colors.primary,
    fontStyle: 'italic',
    marginBottom: 32,
  },
  summaryContainer: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 16,
    lineHeight: 26,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  responsesContainer: {
    marginTop: 24,
  },
  responseCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  responseQuestion: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  responseAnswer: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  moreResponses: {
    fontSize: 14,
    color: colors.primary,
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
    padding: layout.screenHorizontal,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  exploreButton: {
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: 999,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  exploreButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
});
