import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { Calendar, Bell, CircleCheck as CheckCircle, Brain, ChartBar } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const FEATURES = [
  {
    icon: Brain,
    key: 'motivation',
  },
  {
    icon: Calendar,
    key: 'appointments',
  },
  {
    icon: Bell,
    key: 'reminders',
  },
  {
    icon: CheckCircle,
    key: 'tasks',
  },
  {
    icon: ChartBar,
    key: 'reports',
  },
];

export default function Features() {
  const { t } = useTranslation();

  const handleContinue = () => {
    router.replace('/(tabs)/home');
  };

  return (
    <LinearGradient
      colors={['#1a1a1a', '#2a1a2a']}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}  pinchGestureEnabled={false} >
        <Text style={styles.title}>{t('onboarding.features.title')}</Text>
        <Text style={styles.subtitle}>{t('onboarding.features.subtitle')}</Text>

        <View style={styles.featureGrid}>
          {FEATURES.map(({ icon: Icon, key }) => (
            <View key={key} style={styles.featureCard}>
              <View style={styles.iconContainer}>
                <Icon size={32} color="#9333ea" />
              </View>
              <Text style={styles.featureTitle}>
                {t(`onboarding.features.${key}.title`)}
              </Text>
              <Text style={styles.featureDescription}>
                {t(`onboarding.features.${key}.description`)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.exampleSection}>
          <Text style={styles.exampleTitle}>
            {t('onboarding.features.examples.title')}
          </Text>
          {['water', 'sport', 'meditation', 'reading', 'healthy'].map((example) => (
            <View key={example} style={styles.exampleItem}>
              <View style={styles.exampleDot} />
              <Text style={styles.exampleText}>
                {t(`onboarding.features.examples.${example}`)}
              </Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleContinue}
        >
          <Text style={styles.buttonText}>
            {t('onboarding.features.continue')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#999999',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  featureCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(147, 51, 234, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  featureTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#999999',
    lineHeight: 20,
  },
  exampleSection: {
    marginBottom: 32,
  },
  exampleTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    marginBottom: 16,
  },
  exampleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  exampleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#9333ea',
    marginRight: 12,
  },
  exampleText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#ffffff',
  },
  button: {
    backgroundColor: '#9333ea',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
});