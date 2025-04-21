import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function NotificationsPermission() {
  const { t } = useTranslation();

  const handleNotificationPermission = async () => {
    // Here you would typically request notification permissions
    // For web, this would use the Notifications API
    // For now, we'll just proceed to the features page
    router.push('/onboarding/features');
  };

  return (
    <LinearGradient
      colors={['#1a1a1a', '#2a1a2a']}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Bell size={48} color="#9333ea" />
        </View>

        <Text style={styles.title}>{t('onboarding.notifications.title')}</Text>
        <Text style={styles.description}>{t('onboarding.notifications.description')}</Text>

        <View style={styles.featureList}>
          {['appointments', 'reminders', 'tasks', 'motivation', 'support'].map((feature) => (
            <View key={feature} style={styles.featureItem}>
              <View style={styles.featureDot} />
              <Text style={styles.featureText}>
                {t(`onboarding.notifications.features.${feature}`)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.button}
            onPress={handleNotificationPermission}
          >
            <Text style={styles.buttonText}>
              {t('onboarding.notifications.allow')}
            </Text>
          </TouchableOpacity>

          <Text style={styles.note}>
            {t('onboarding.notifications.note')}
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(147, 51, 234, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#999999',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  featureList: {
    width: '100%',
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#9333ea',
    marginRight: 12,
  },
  featureText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#ffffff',
  },
  footer: {
    width: '100%',
    alignItems: 'center',
  },
  button: {
    width: '100%',
    backgroundColor: '#9333ea',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  note: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    textAlign: 'center',
  },
});