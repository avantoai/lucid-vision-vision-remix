import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
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
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [prompts, setPrompts] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      const promptArray = await api.getNextPrompt(route.params.category, []);
      setPrompts(promptArray);
      setIsLoading(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to load prompts');
      navigation.goBack();
    }
  };

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / width);
    setCurrentIndex(index);
  };

  const scrollToPrompt = (index: number) => {
    scrollViewRef.current?.scrollTo({ x: index * width, animated: true });
    setCurrentIndex(index);
  };

  const handleSelectPrompt = (index: number) => {
    navigation.navigate('VisionRecord', {
      category: route.params.category,
      prompts: prompts,
      currentPromptIndex: index,
      responses: [],
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading your vision prompts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="close" size={24} color={colors.text} />
      </TouchableOpacity>

      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {prompts.map((prompt, index) => (
          <View key={index} style={[styles.promptCard, { width }]}>
            <View style={styles.promptContent}>
              <Text style={styles.promptText}>{prompt}</Text>
              
              <TouchableOpacity
                style={styles.respondButton}
                onPress={() => handleSelectPrompt(index)}
              >
                <Text style={styles.respondButtonText}>Respond</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dotsContainer}>
        {prompts.map((_, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => scrollToPrompt(index)}
            style={[
              styles.dot,
              index === currentIndex && styles.dotActive
            ]}
          />
        ))}
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
  closeButton: {
    position: 'absolute',
    top: layout.headerTop,
    right: layout.headerSide,
    width: layout.headerButtonSize,
    height: layout.headerButtonSize,
    borderRadius: layout.headerButtonSize / 2,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
  },
  promptCard: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: layout.screenHorizontal,
  },
  promptContent: {
    width: '100%',
    alignItems: 'center',
  },
  promptText: {
    fontSize: 32,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 42,
    marginBottom: 40,
  },
  respondButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 100,
    marginTop: 20,
  },
  respondButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 60,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textSecondary,
    opacity: 0.3,
  },
  dotActive: {
    backgroundColor: colors.primary,
    opacity: 1,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
