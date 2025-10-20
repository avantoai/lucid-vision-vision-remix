import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, layout } from '../../theme';
import api from '../../services/api';

interface Vision {
  id: string;
  title: string;
  categories: string[];
  stage_progress: number;
  summary: string | null;
  tagline: string | null;
  created_at: string;
  updated_at: string;
}

interface Response {
  id: string;
  stage: string;
  question: string;
  answer: string;
  created_at: string;
}

const STAGES = ['Vision', 'Belief', 'Identity', 'Embodiment', 'Action'];

function getProgressColor(progress: number): string {
  if (progress === 0) return '#6b7280';
  if (progress <= 2) return '#ef4444';
  if (progress <= 4) return '#f59e0b';
  return '#10b981';
}

export default function VisionDetailNewScreen({ route, navigation }: any) {
  const { visionId } = route.params;
  const [vision, setVision] = useState<Vision | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');

  useEffect(() => {
    loadVisionData();
  }, [visionId]);

  const loadVisionData = async () => {
    try {
      const visionData = await api.getVision(visionId);
      setVision(visionData.vision);
      setResponses(visionData.responses || []);
      setTitleInput(visionData.vision.title);
    } catch (error) {
      console.error('Failed to load vision:', error);
      Alert.alert('Error', 'Failed to load vision details');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTitle = async () => {
    if (!titleInput.trim()) {
      Alert.alert('Error', 'Title cannot be empty');
      return;
    }
    try {
      await api.updateVisionTitle(visionId, titleInput.trim());
      setVision(prev => prev ? { ...prev, title: titleInput.trim() } : null);
      setEditingTitle(false);
    } catch (error) {
      console.error('Failed to update title:', error);
      Alert.alert('Error', 'Failed to update title');
    }
  };

  const handleContinueFlow = () => {
    navigation.navigate('VisionFlow', { visionId, isNewVision: false });
  };

  const handleCreateMeditation = () => {
    navigation.navigate('CreateMeditation', { visionId });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Vision',
      'Are you sure you want to delete this vision? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteVision(visionId);
              navigation.goBack();
            } catch (error) {
              console.error('Failed to delete vision:', error);
              Alert.alert('Error', 'Failed to delete vision');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!vision) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Vision not found</Text>
      </View>
    );
  }

  const responsesByStage = responses.reduce((acc, response) => {
    if (!acc[response.stage]) acc[response.stage] = [];
    acc[response.stage].push(response);
    return acc;
  }, {} as Record<string, Response[]>);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
          <Ionicons name="trash-outline" size={20} color={colors.error} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {editingTitle ? (
            <View style={styles.titleEditContainer}>
              <TextInput
                style={styles.titleInput}
                value={titleInput}
                onChangeText={setTitleInput}
                autoFocus
                multiline
              />
              <View style={styles.titleActions}>
                <TouchableOpacity onPress={() => {
                  setEditingTitle(false);
                  setTitleInput(vision.title);
                }} style={styles.titleCancelButton}>
                  <Text style={styles.titleCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSaveTitle} style={styles.titleSaveButton}>
                  <Text style={styles.titleSaveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setEditingTitle(true)} activeOpacity={0.7}>
              <View style={styles.titleContainer}>
                <Text style={styles.title}>{vision.title}</Text>
                <Ionicons name="pencil" size={20} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>
          )}

          {vision.categories.length > 0 && (
            <View style={styles.categoryContainer}>
              {vision.categories.map((category, index) => (
                <View key={index} style={styles.categoryPill}>
                  <Text style={styles.categoryText}>{category}</Text>
                </View>
              ))}
            </View>
          )}

          {vision.tagline && (
            <Text style={styles.tagline}>{vision.tagline}</Text>
          )}

          <View style={styles.progressSection}>
            <Text style={styles.sectionTitle}>Progress</Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${(vision.stage_progress / 5) * 100}%`,
                    backgroundColor: getProgressColor(vision.stage_progress),
                  },
                ]}
              />
            </View>
            <View style={styles.stageLabels}>
              {STAGES.map((stage, index) => (
                <View key={stage} style={styles.stageLabel}>
                  <View
                    style={[
                      styles.stageDot,
                      index < vision.stage_progress && styles.stageDotComplete,
                    ]}
                  />
                  <Text
                    style={[
                      styles.stageLabelText,
                      index < vision.stage_progress && styles.stageLabelTextComplete,
                    ]}
                  >
                    {stage}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {vision.summary && (
            <View style={styles.summarySection}>
              <Text style={styles.sectionTitle}>Summary</Text>
              <Text style={styles.summaryText}>{vision.summary}</Text>
            </View>
          )}

          {STAGES.map((stage) => {
            const stageResponses = responsesByStage[stage];
            if (!stageResponses || stageResponses.length === 0) return null;

            return (
              <View key={stage} style={styles.stageSection}>
                <Text style={styles.stageTitle}>{stage}</Text>
                {stageResponses.map((response) => (
                  <View key={response.id} style={styles.qaCard}>
                    <Text style={styles.question}>{response.question}</Text>
                    <Text style={styles.answer}>{response.answer}</Text>
                  </View>
                ))}
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.actionButtons}>
        <TouchableOpacity onPress={handleContinueFlow} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Continue Flow</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleCreateMeditation}
          style={styles.secondaryButton}
          disabled={vision.stage_progress === 0}
        >
          <Ionicons name="musical-notes" size={20} color={vision.stage_progress === 0 ? colors.textTertiary : colors.primary} />
          <Text style={[
            styles.secondaryButtonText,
            vision.stage_progress === 0 && styles.secondaryButtonTextDisabled
          ]}>
            Create Meditation
          </Text>
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
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: layout.headerTop,
    paddingHorizontal: layout.headerSide,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: layout.screenHorizontal,
    paddingBottom: 120,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
    marginRight: 12,
  },
  titleEditContainer: {
    marginBottom: 16,
  },
  titleInput: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  titleActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 12,
  },
  titleCancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  titleCancelText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  titleSaveButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  titleSaveText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  categoryPill: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 13,
    color: colors.primaryLight,
    textTransform: 'capitalize',
    fontWeight: '500',
  },
  tagline: {
    fontSize: 16,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 32,
    lineHeight: 24,
  },
  progressSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.surfaceLight,
    borderRadius: 4,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  stageLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stageLabel: {
    alignItems: 'center',
    flex: 1,
  },
  stageDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.surfaceLight,
    marginBottom: 8,
  },
  stageDotComplete: {
    backgroundColor: colors.success,
  },
  stageLabelText: {
    fontSize: 11,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  stageLabelTextComplete: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  summarySection: {
    marginBottom: 32,
  },
  summaryText: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  stageSection: {
    marginBottom: 32,
  },
  stageTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  qaCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  question: {
    fontSize: 14,
    color: colors.primary,
    marginBottom: 8,
    fontWeight: '500',
  },
  answer: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  actionButtons: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    padding: layout.screenHorizontal,
    paddingBottom: 40,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 17,
    fontWeight: '600',
  },
  secondaryButtonTextDisabled: {
    color: colors.textTertiary,
  },
});
