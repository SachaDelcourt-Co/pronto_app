import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, ActivityIndicator, ProgressBarAndroid, Platform } from 'react-native';
import { X, Award, CheckCircle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';
import { fr, enUS, nl, es, pt, it } from 'date-fns/locale';
import type { WeeklyReportData } from '@/utils/weeklyReportService';

interface WeeklyReportModalProps {
  visible: boolean;
  onClose: () => void;
  reportData: WeeklyReportData | null;
  loading?: boolean;
}

const locales = {
  fr,
  en: enUS,
  nl,
  es,
  pt,
  it
};

// Custom ProgressBar component since expo-progress might not be available
const ProgressBar = ({ progress, color = '#8b5cf6', style }: { progress: number, color?: string, style?: any }) => {
  // Clamp progress between 0 and 1
  const clampedProgress = Math.min(1, Math.max(0, progress));
  
  if (Platform.OS === 'android') {
    return <ProgressBarAndroid 
      styleAttr="Horizontal"
      indeterminate={false}
      progress={clampedProgress}
      color={color}
      style={style}
    />;
  }
  
  // For iOS and other platforms
  return (
    <View style={[{ height: 8, borderRadius: 4, backgroundColor: '#e5e7eb', overflow: 'hidden' }, style]}>
      <View style={{
        height: '100%',
        width: `${clampedProgress * 100}%`,
        backgroundColor: color,
        borderRadius: 4,
      }} />
    </View>
  );
};

const WeeklyReportModal: React.FC<WeeklyReportModalProps> = ({
  visible,
  onClose,
  reportData,
  loading = false
}) => {
  const { t, i18n } = useTranslation();
  const currentLocale = locales[i18n.language as keyof typeof locales] || enUS;

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return format(date, 'PPPP', { locale: currentLocale });
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateStr;
    }
  };

  // Get appropriate color for the completion rate
  const getCompletionColor = (rate: number): [string, string] => {
    if (rate >= 90) return ['#4ade80', '#22c55e']; // Green
    if (rate >= 70) return ['#60a5fa', '#3b82f6']; // Blue
    if (rate >= 50) return ['#a78bfa', '#8b5cf6']; // Purple
    if (rate >= 30) return ['#fbbf24', '#f59e0b']; // Yellow
    return ['#f87171', '#ef4444']; // Red
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8b5cf6" />
              <Text style={styles.loadingText}>{t('common.loading')}</Text>
            </View>
          ) : !reportData ? (
            <View style={styles.emptyState}>
              <Award size={48} color="#8b5cf6" />
              <Text style={styles.emptyStateTitle}>{t('tasks.weeklyReport.title')}</Text>
              <Text style={styles.emptyStateText}>
                {t('tasks.weeklyReport.subtitle')}
              </Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeButtonText}>{t('tasks.weeklyReport.close')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('tasks.weeklyReport.title')}</Text>
                <TouchableOpacity style={styles.closeIconButton} onPress={onClose}>
                  <X size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.content}>
                {/* Period */}
                <Text style={styles.periodText}>
                  {t('tasks.weeklyReport.period', {
                    startDate: formatDate(reportData.startDate),
                    endDate: formatDate(reportData.endDate)
                  })}
                </Text>

                {/* Completion Rate */}
                <View style={styles.completionRateSection}>
                  <Text style={styles.sectionTitle}>{t('tasks.weeklyReport.completionRate')}</Text>
                  <View style={styles.completionRateContainer}>
                    <LinearGradient
                      colors={getCompletionColor(reportData.completionRate)}
                      style={styles.completionRateCircle}
                    >
                      <Text style={styles.completionRateText}>
                        {reportData.completionRate}%
                      </Text>
                    </LinearGradient>
                  </View>
                </View>

                {/* Motivational Phrase */}
                <View style={styles.motivationalSection}>
                  <Text style={styles.motivationalText}>{reportData.motivationalPhrase}</Text>
                </View>

                {/* Tasks Completed */}
                <View style={styles.tasksCompletedSection}>
                  <Text style={styles.sectionTitle}>{t('tasks.weeklyReport.tasksCompleted')}</Text>
                  {reportData.tasksCompleted.map((task, index) => (
                    <View key={`task-${index}`} style={styles.taskCompletionItem}>
                      <View style={styles.taskCompletionHeader}>
                        <CheckCircle size={20} color="#8b5cf6" />
                        <Text style={styles.taskName}>{task.taskName}</Text>
                      </View>
                      <View style={styles.taskProgressContainer}>
                        <ProgressBar
                          progress={task.completedDays / task.totalDays}
                          color={task.completedDays >= task.totalDays ? "#4ade80" : "#8b5cf6"}
                          style={styles.taskProgressBar}
                        />
                        <Text style={styles.taskProgressText}>
                          {`${task.completedDays}/${task.totalDays} ${t('tasks.days')}`}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>

              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeButtonText}>{t('tasks.weeklyReport.close')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 9999,
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    ...(Platform.OS === 'ios' ? { 
      height: '80%', 
      maxHeight: 600,
    } : { 
      maxHeight: '90%' 
    }),
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  closeIconButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  periodText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6b7280',
    marginBottom: 20,
  },
  completionRateSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 12,
  },
  completionRateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  completionRateCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completionRateText: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
  },
  motivationalSection: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  motivationalText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    textAlign: 'center',
    lineHeight: 24,
    fontStyle: 'italic',
  },
  tasksCompletedSection: {
    marginBottom: 24,
  },
  taskCompletionItem: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  taskCompletionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  taskName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
    marginLeft: 12,
    flex: 1,
  },
  taskProgressContainer: {
    marginTop: 8,
  },
  taskProgressBar: {
    width: '100%',
    borderRadius: 4,
    backgroundColor: '#e5e7eb',
    marginBottom: 8,
  },
  taskProgressText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6b7280',
  },
  closeButton: {
    backgroundColor: '#8b5cf6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  closeButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6b7280',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
});

export default WeeklyReportModal; 