import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function Terms() {
  const { t } = useTranslation();

  return (
    <LinearGradient
      colors={['#1a1a1a', '#2a1a2a']}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('login.termsOfUse')}</Text>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <X color="#ffffff" size={24} />
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.content}>
        <Text style={styles.lastUpdated}>{t('legal.lastUpdated')}</Text>
        <Text style={styles.text}>
          {t('legal.termsContent').split('\n').map((paragraph, index) => {
            // Check if paragraph is a section title (starts with a number followed by a dot)
            if (/^\d+\./.test(paragraph)) {
              return (
                <Text key={index} style={styles.sectionTitle}>
                  {`\n${paragraph}\n\n`}
                </Text>
              );
            }
            // Regular paragraph
            else if (paragraph.trim()) {
              return (
                <Text key={index}>
                  {`${paragraph}\n\n`}
                </Text>
              );
            }
            return <Text key={index}>{`\n`}</Text>;
          })}
        </Text>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  lastUpdated: {
    color: '#999999',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 24,
  },
  text: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    lineHeight: 24,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    lineHeight: 26,
  }
});