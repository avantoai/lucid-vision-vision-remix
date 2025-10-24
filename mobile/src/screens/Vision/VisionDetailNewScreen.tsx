import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, layout } from '../../theme';
import api from '../../services/api';

interface Vision {
  id: string;
  title: string;
  categories: string[];
  stage_progress: number;
  overall_completeness: number;
  summary: string | null;
  tagline: string | null;
  created_at: string;
  updated_at: string;
}

interface Response {
  id: string;
  question: string;
  answer: string;
  created_at: string;
}

function getProgressColor(completeness: number): string {
  if (completeness === 0) return '#6b7280';
  if (completeness <= 40) return '#ef4444';
  if (completeness <= 70) return '#f59e0b';
  return '#10b981';
}

export default function VisionDetailNewScreen({ route, navigation }: any) {
  const { visionId } = route.params;
  const [vision, setVision] = useState<Vision | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);

  const loadVisionData = useCallback(async () => {
    try {
      setLoading(true);
      const visionData = await api.getVision(visionId);
      const { responses, meditations, ...visionFields } = visionData;
      setVision(visionFields);
      setResponses(responses || []);
      setTitleInput(visionFields.title);
    } catch (error) {
      console.error('Failed to load vision:', error);
      Alert.alert('Error', 'Failed to load vision details');
    } finally {
      setLoading(false);
    }
  }, [visionId]);

  useFocusEffect(
    useCallback(() => {
      loadVisionData();
    }, [loadVisionData])
  );

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
    navigation.navigate('MeditationSetup', { 
      category: vision?.categories[0] || 'personal',
      responses: [],
      visionId 
    });
  };

  const handleEditTitle = () => {
    setMenuVisible(false);
    setEditingTitle(true);
  };

  const handleDelete = () => {
    setMenuVisible(false);
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
              navigation.navigate('MainTabs', { screen: 'Vision' });
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('MainTabs', { screen: 'Vision' })} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuButton}>
          <Ionicons name="ellipsis-horizontal" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem} onPress={handleEditTitle}>
              <Ionicons name="pencil-outline" size={20} color={colors.text} />
              <Text style={styles.menuItemText}>Edit Title</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={20} color={colors.error} />
              <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>Delete Vision</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

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
            <Text style={styles.title}>{vision.title}</Text>
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

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBackground}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { 
                    width: `${vision.overall_completeness}%`,
                    backgroundColor: getProgressColor(vision.overall_completeness)
                  }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>{Math.round(vision.overall_completeness)}%</Text>
          </View>

          {vision.tagline && (
            <Text style={styles.tagline}>{vision.tagline}</Text>
          )}

          {vision.summary && (
            <View style={styles.visionStatementSection}>
              <Text style={styles.visionStatement}>{vision.summary}</Text>
            </View>
          )}

          {/* Q&A History */}
          {responses.length > 0 && (
            <View style={styles.qaHistorySection}>
              <Text style={styles.qaHistoryTitle}>Your Vision Journey</Text>
              {responses.map((response) => (
                <View key={response.id} style={styles.qaCard}>
                  <Text style={styles.question}>{response.question}</Text>
                  <Text style={styles.answer}>{response.answer}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.actionButtons}>
        <TouchableOpacity onPress={handleContinueFlow} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Continue Flow</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleCreateMeditation}
          style={styles.secondaryButton}
          disabled={responses.length === 0}
        >
          <Ionicons name="musical-notes" size={20} color={responses.length === 0 ? colors.textTertiary : colors.primary} />
          <Text style={[
            styles.secondaryButtonText,
            responses.length === 0 && styles.secondaryButtonTextDisabled
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
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: layout.headerTop + 50,
    paddingRight: layout.headerSide,
  },
  menuContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  menuItemTextDanger: {
    color: colors.error,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: layout.screenHorizontal,
    paddingBottom: 120,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
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
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: colors.surfaceLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    minWidth: 40,
    textAlign: 'right',
  },
  tagline: {
    fontSize: 16,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 24,
    lineHeight: 24,
  },
  visionStatementSection: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  visionStatement: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 26,
    fontWeight: '500',
  },
  qaHistorySection: {
    marginBottom: 32,
  },
  qaHistoryTitle: {
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
    borderRadius: 999,
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
    borderRadius: 999,
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
