import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Platform, Modal, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Menu, Calendar, Bell, FileText, SquareCheck as CheckSquare, X } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { getAuth } from 'firebase/auth';
import { DatabaseService } from '@/services/database';
import type { User, Appointment, Reminder, Task } from '@/types/database';
import { useAuth } from '@/utils/AuthContext';
import { useFocusEffect } from 'expo-router';

export default function HomePage() {
  const { user: authUser, authInitialized } = useAuth();
  const { t } = useTranslation();
  const [showMenu, setShowMenu] = useState(false);
  const [showAppointments, setShowAppointments] = useState(false);
  const [showReminders, setShowReminders] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [motivationalPhrase, setMotivationalPhrase] = useState<string>('');
  const [dailyTasks, setDailyTasks] = useState<Task[]>([]);
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Refresh data when the tab is focused
  useFocusEffect(
    React.useCallback(() => {
      console.log('Home tab focused, refreshing data');
      if (authInitialized && authUser) {
        loadDailyTasks();
      }
      return () => {
        // Cleanup function when component unfocuses
      };
    }, [authInitialized, authUser])
  );

  useEffect(() => {
    let isMounted = true;
    
    const loadAllData = async () => {
      if (!authInitialized) return;

      try {
        setIsLoading(true);
        
        if (!authUser) {
          console.log('No authenticated user from AuthContext');
          if (isMounted) setIsLoading(false);
          return;
        }

        const userId = authUser.uid;
        console.log('Loading data for user:', userId);
        
        // Load user data
        try {
          const userData = await DatabaseService.getUser(userId);
          if (isMounted && userData) setUser(userData);
        } catch (error) {
          console.error('Error loading user data:', error);
        }
        
        // Load appointments
        try {
          const userAppointments = await DatabaseService.getUserAppointments(userId);
          if (isMounted) setAppointments(userAppointments || []);
        } catch (error) {
          console.error('Error loading appointments:', error);
          if (isMounted) setAppointments([]);
        }
        
        // Load reminders
        try {
          const userReminders = await DatabaseService.getUserReminders(userId);
          if (isMounted) setReminders(userReminders || []);
        } catch (error) {
          console.error('Error loading reminders:', error);
          if (isMounted) setReminders([]);
        }
        
        // Load daily tasks
        try {
          console.log('Loading daily tasks for user:', userId);
          const activeTasks = await DatabaseService.getActiveDailyTasks(userId);
          console.log('Daily tasks loaded:', activeTasks.length);
          if (isMounted) setDailyTasks(activeTasks || []);
        } catch (error) {
          console.error('Error loading tasks:', error);
          if (isMounted) setDailyTasks([]);
        }
      } catch (error) {
        console.error('Error in loadAllData:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadAllData();
    
    return () => {
      isMounted = false;
    };
  }, [authInitialized, authUser]);

  const handleCompleteTask = async (taskId: string) => {
    if (!taskId || !authUser) return;
    
    try {
      setLoadingTaskId(taskId);
      await DatabaseService.markTaskCompletedForToday(taskId);
      
      // Update the UI by refetching tasks or updating locally
      const activeTasks = await DatabaseService.getActiveDailyTasks(authUser.uid);
      setDailyTasks(activeTasks || []);
    } catch (error) {
      console.error('Error completing task:', error);
    } finally {
      setLoadingTaskId(null);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View>
        <Text style={styles.headerTitle}>PRONTO</Text>
        <Text style={styles.headerSubtitle}>Your Personal Assistant</Text>
      </View>
      <TouchableOpacity
        style={styles.menuButton}
        onPress={() => setShowMenu(true)}
      >
        <Menu color="#ffffff" size={24} />
      </TouchableOpacity>
    </View>
  );

  const renderMotivationalBanner = () => (
    <LinearGradient
      colors={['rgba(147, 51, 234, 0.1)', 'rgba(147, 51, 234, 0.05)']}
      style={styles.motivationalBanner}
    >
      <Text style={styles.motivationalText}>
        {motivationalPhrase || "Believe in yourself and all that you are."}
      </Text>
    </LinearGradient>
  );

  const renderSchedule = () => (
    <View style={styles.scheduleSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Today's Schedule</Text>
        <TouchableOpacity style={styles.weekViewButton}>
          <Calendar size={18} color="#9333ea" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.scheduleBanners}>
        {/* Appointments Banner */}
        <TouchableOpacity 
          style={styles.scheduleBanner}
          onPress={() => setShowAppointments(true)}
        >
          <View style={styles.bannerHeader}>
            <Calendar size={18} color="#9333ea" />
            <Text style={styles.bannerTitle}>Appointments</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{appointments.length}</Text>
            </View>
          </View>
          
          <ScrollView 
            style={styles.eventList} 
            showsVerticalScrollIndicator={false}
            pointerEvents="none"
          >
            {appointments.map((appointment, index) => (
              <View key={index} style={styles.eventItem}>
                <Text style={styles.eventTime}>{appointment.time}</Text>
                <Text style={styles.eventName} numberOfLines={1}>
                  {appointment.appointmentName}
                </Text>
              </View>
            ))}
          </ScrollView>
        </TouchableOpacity>

        {/* Reminders Banner */}
        <TouchableOpacity 
          style={styles.scheduleBanner}
          onPress={() => setShowReminders(true)}
        >
          <View style={styles.bannerHeader}>
            <Bell size={18} color="#9333ea" />
            <Text style={styles.bannerTitle}>Reminders</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{reminders.length}</Text>
            </View>
          </View>
          
          <ScrollView 
            style={styles.eventList} 
            showsVerticalScrollIndicator={false}
            pointerEvents="none"
          >
            {reminders.map((reminder, index) => (
              <View key={index} style={styles.eventItem}>
                <Text style={styles.eventTime}>{reminder.time}</Text>
                <Text style={styles.eventName} numberOfLines={1}>
                  {reminder.reminderName}
                </Text>
              </View>
            ))}
          </ScrollView>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderExpandedList = (
    title: string,
    icon: typeof Calendar | typeof Bell,
    items: Appointment[] | Reminder[],
    onClose: () => void
  ) => (
    <Modal
      visible={true}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              {icon === Calendar ? (
                <Calendar size={20} color="#9333ea" />
              ) : (
                <Bell size={20} color="#9333ea" />
              )}
              <Text style={styles.modalTitle}>{title}</Text>
            </View>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={onClose}
            >
              <X size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.modalList}
            showsVerticalScrollIndicator={false}
          >
            {items.map((item, index) => (
              <View key={index} style={styles.modalItem}>
                <Text style={styles.modalItemTime}>
                  {(item as any).time}
                </Text>
                <View style={styles.modalItemContent}>
                  <Text style={styles.modalItemTitle}>
                    {(item as any).appointmentName || (item as any).reminderName}
                  </Text>
                  {'description' in item && (
                    <Text style={styles.modalItemDescription}>
                      {item.description}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderDailyTasks = () => {
    console.log('Rendering daily tasks, count:', dailyTasks.length);
    
    if (dailyTasks.length === 0) {
      return (
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateText}>No tasks for today</Text>
        </View>
      );
    }

    return dailyTasks.map((task) => {
      // Skip rendering invalid tasks
      if (!task || !task.taskID) {
        console.log('Skipping invalid task');
        return null;
      }
      
      // Check if task is completed today
      const today = new Date().toISOString().split('T')[0];
      const isCompletedToday = task.lastCompletedDate === today;
      
      const handleTaskCompletion = async () => {
        try {
          if (task.taskID && authUser) {
            await DatabaseService.markTaskCompletedForToday(task.taskID);
            // Reload daily tasks
            const activeTasks = await DatabaseService.getActiveDailyTasks(authUser.uid);
            setDailyTasks(activeTasks);
          }
        } catch (error) {
          console.error('Error completing task:', error);
        }
      };
      
      // Ensure progress calculation doesn't cause errors
      const progress = task.daysDone !== undefined && task.daysSelected 
        ? (task.daysDone / task.daysSelected) * 100
        : 0;
        
      return (
        <View key={task.taskID} style={[
          styles.dailyTaskCard,
          isCompletedToday && styles.completedTaskCard
        ]}>
          <View style={styles.taskHeader}>
            <View style={styles.taskTitleContainer}>
              <Text style={styles.taskIcon}>{isCompletedToday ? '✅' : '📌'}</Text>
              <Text style={[
                styles.dailyTaskName,
                isCompletedToday && styles.completedTaskText
              ]}>
                {task.taskName || 'Unnamed Task'}
              </Text>
            </View>
            {!isCompletedToday && (
              <TouchableOpacity style={styles.completeButton} onPress={handleTaskCompletion}>
                <Text style={styles.completeButtonText}>Done</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.taskProgressContainer}>
            <Text style={[
              styles.taskProgressText,
              isCompletedToday && styles.completedTaskText
            ]}>
              {`${task.daysDone || 0} / ${task.daysSelected || 1} days`}
            </Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
          </View>
        </View>
      );
    });
  };

  const renderMenu = () => {
    if (!showMenu) return null;

    return (
      <View style={StyleSheet.absoluteFill}>
        <BlurView intensity={80} style={StyleSheet.absoluteFill} tint="dark">
          <View style={styles.menuContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowMenu(false)}
            >
              <Menu color="#ffffff" size={24} />
            </TouchableOpacity>

            <View style={styles.profileSection}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=800&auto=format&fit=crop&q=80' }}
                style={styles.profileImage}
              />
              <Text style={styles.profileName}>{user?.name || 'User'}</Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
            </View>
          </View>
        </BlurView>
      </View>
    );
  };

  // Add a dedicated function to load just daily tasks
  const loadDailyTasks = async () => {
    if (!authUser) return;
    
    try {
      console.log('Loading daily tasks for user:', authUser.uid);
      const activeTasks = await DatabaseService.getActiveDailyTasks(authUser.uid);
      console.log('Daily tasks loaded:', activeTasks.length);
      setDailyTasks(activeTasks || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
      setDailyTasks([]);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a1a1a', '#2a1a2a']}
        style={styles.background}
      >
        <View style={styles.upperContent}>
          {renderHeader()}
        </View>

        <ScrollView 
          style={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContentContainer}
        >
          {renderMotivationalBanner()}
          {renderSchedule()}
          
          <View style={styles.lowerContent}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Daily Tasks</Text>
              <View style={styles.taskContainer}>
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#9333ea" />
                    <Text style={styles.loadingText}>Loading tasks...</Text>
                  </View>
                ) : (
                  renderDailyTasks()
                )}
              </View>
            </View>
          </View>
        </ScrollView>

        {showAppointments && renderExpandedList(
          'Appointments',
          Calendar,
          appointments,
          () => setShowAppointments(false)
        )}

        {showReminders && renderExpandedList(
          'Reminders',
          Bell,
          reminders,
          () => setShowReminders(false)
        )}

        {renderMenu()}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  upperContent: {
    paddingTop: Platform.OS === 'web' ? 16 : 40,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 24,
  },
  lowerContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9ca3af',
    marginTop: 1,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  motivationalBanner: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  motivationalText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 18,
    letterSpacing: 0.2,
  },
  scheduleSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    letterSpacing: 0.3,
    marginBottom: 16,
  },
  weekViewButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(147, 51, 234, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleBanners: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  scheduleBanner: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 12,
    height: 180,
  },
  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  bannerTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    marginLeft: 8,
    flex: 1,
    letterSpacing: 0.2,
  },
  badge: {
    backgroundColor: '#9333ea',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  eventList: {
    maxHeight: 120,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 8,
    borderRadius: 10,
  },
  eventTime: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#9333ea',
    width: 45,
  },
  eventName: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#ffffff',
    flex: 1,
    marginLeft: 8,
  },
  dailyTasksSection: {
    flex: 1,
    marginTop: 8,
    paddingHorizontal: 16,
  },
  tasksList: {
    flex: 1,
  },
  emptyTasksContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
  },
  emptyTasksText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9ca3af',
    marginTop: 8,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginBottom: 8,
    padding: 12,
  },
  taskCheckCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(147, 51, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  taskContent: {
    flex: 1,
  },
  taskName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    marginBottom: 4,
  },
  taskProgress: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9ca3af',
  },
  tabContent: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 16,
  },
  comingSoonText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    letterSpacing: 0.3,
  },
  menuContent: {
    flex: 1,
    padding: 16,
  },
  closeButton: {
    alignSelf: 'flex-end',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileSection: {
    alignItems: 'center',
    marginTop: 32,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
  },
  profileName: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  profileEmail: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9ca3af',
    letterSpacing: 0.2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalList: {
    flex: 1,
  },
  modalItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginBottom: 8,
  },
  modalItemTime: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#9333ea',
    width: 50,
  },
  modalItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  modalItemTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    marginBottom: 4,
  },
  modalItemDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9ca3af',
    lineHeight: 18,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyStateContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#ffffff',
  },
  taskTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  dailyTaskCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dailyTaskName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  completeButton: {
    backgroundColor: '#9333ea',
    borderRadius: 12,
    padding: 8,
  },
  completeButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  taskProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskProgressText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9ca3af',
  },
  progressBar: {
    backgroundColor: 'rgba(147, 51, 234, 0.1)',
    borderRadius: 10,
    height: 12,
    flex: 1,
    marginHorizontal: 8,
  },
  progressFill: {
    backgroundColor: '#9333ea',
    borderRadius: 10,
    height: '100%',
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  taskContainer: {
    marginBottom: 16,
  },
  completedTaskCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  completedTaskText: {
    textDecorationLine: 'line-through',
  },
}); 