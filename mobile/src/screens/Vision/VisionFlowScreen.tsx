import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, FlatList, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../types';
import api from '../../services/api';
import { colors, layout } from '../../theme';

type VisionFlowRouteProp = RouteProp<RootStackParamList, 'VisionFlow'>;
type VisionFlowNavigationProp = StackNavigationProp<RootStackParamList, 'VisionFlow'>;

export default function VisionFlowScreen() {
  const navigation = useNavigation<VisionFlowNavigationProp>();
  const route = useRoute<VisionFlowRouteProp>();
  const { width } = useWindowDimensions();
  const [prompts, setPrompts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      const promptList = await api.getMultiplePrompts(route.params.category, []);
      setPrompts(promptList);
    } catch (error) {
      Alert.alert('Error', 'Failed to load prompts');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromptSelect = (prompt: string) => {
    navigation.navigate('VisionRecord', {
      category: route.params.category,
      prompt: prompt,
      responses: [],
    });
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50
  }).current;

  const renderPrompt = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[styles.promptContainer, { width: width - (layout.screenHorizontal * 2) }]}
      onPress={() => handlePromptSelect(item)}
      activeOpacity={0.9}
    >
      <Text style={styles.promptText}>{item}</Text>
    </TouchableOpacity>
  );

  const renderDotIndicators = () => (
    <View style={styles.dotContainer}>
      {prompts.map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            index === currentIndex && styles.dotActive
          ]}
        />
      ))}
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading prompts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="chevron-back" size={24} color={colors.text} />
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.instructionText}>
          Swipe to explore • Tap to answer
        </Text>

        <FlatList
          ref={flatListRef}
          data={prompts}
          renderItem={renderPrompt}
          keyExtractor={(_, index) => index.toString()}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          snapToAlignment="center"
          decelerationRate="fast"
          contentContainerStyle={styles.listContainer}
        />

        {renderDotIndicators()}
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  backButton: {
    position: 'absolute',
    top: layout.headerTop,
    left: layout.headerSide,
    width: layout.headerButtonSize,
    height: layout.headerButtonSize,
    borderRadius: layout.headerButtonSize / 2,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 12,
    elevation: 5,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 40,
    textAlign: 'center',
  },
  listContainer: {
    paddingHorizontal: layout.screenHorizontal,
  },
  promptContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    minHeight: 300,
  },
  promptText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 40,
  },
  dotContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
    gap: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.surfaceLight,
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
