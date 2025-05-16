import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Platform, Modal, ActivityIndicator, Dimensions, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { 
  Menu, 
  Calendar, 
  Bell, 
  FileText, 
  SquareCheck as CheckSquare, 
  X, 
  Clock, 
  MapPin, 
  Edit, 
  ChevronUp, 
  ChevronDown, 
  ArrowRight,
  Trash2,
  Languages,
  CheckCircle,
  CheckCircle2,
  Circle,
  LogOut,
  User as UserIcon,
  RefreshCw
} from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { getAuth } from 'firebase/auth';
import { DatabaseService } from '@/services/database';
import type { User as UserType, Appointment, Reminder, Task } from '@/types/database';
import { useAuth } from '@/utils/AuthContext';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveLanguagePreference } from '@/utils/i18n';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/utils/firebase';
import { formatLocalDate, parseLocalDate } from '@/utils/dateUtils';
import { Calendar as RNCalendar } from 'react-native-calendars';
import { getOrGenerateQuotes, shouldUpdateQuotes } from '@/utils/motivationalService';
import type { MotivationCategory } from '@/utils/data/motivationalQuotes';
import { 
  hasUnviewedWeeklyReport, 
  getLatestWeeklyReport, 
  markWeeklyReportAsViewed, 
  forceGenerateWeeklyReport, 
  shouldGenerateWeeklyReport, 
  generateWeeklyReport, 
  type WeeklyReportData 
} from '@/utils/weeklyReportService';
import WeeklyReportModal from '@/components/WeeklyReportModal';
import AdBanner from '@/components/AdBanner';

// Add Badge component at the top after imports
const Badge = ({ children }: { children: React.ReactNode }) => (
  <View style={styles.badge}>
    <Text style={styles.badgeText}>{children}</Text>
  </View>
);

export default function HomePage() {
  const router = useRouter();
  const { user: authUser, authInitialized } = useAuth();
  const { t, i18n } = useTranslation();
  const dimensions = useWindowDimensions();
  const [showMenu, setShowMenu] = useState(false);
  const [showAppointments, setShowAppointments] = useState(false);
  const [showReminders, setShowReminders] = useState(false);
  const [showAppointmentDetails, setShowAppointmentDetails] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [expandedAppointments, setExpandedAppointments] = useState(false);
  const [user, setUser] = useState<UserType | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [motivationalPhrases, setMotivationalPhrases] = useState<string[]>([]);
  const [dailyTasks, setDailyTasks] = useState<Task[]>([]);
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [totalAppointmentCount, setTotalAppointmentCount] = useState<number>(0);
  const [totalReminderCount, setTotalReminderCount] = useState<number>(0);
  const [expandedReminders, setExpandedReminders] = useState(false);
  const [showReminderDetails, setShowReminderDetails] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const [showEditMotivations, setShowEditMotivations] = useState(false);
  const [selectedMotivations, setSelectedMotivations] = useState<("sport" | "business" | "studies" | "wellbeing" | "parenting" | "personalDevelopment" | "financialManagement")[]>([]);
  const [isSavingMotivations, setIsSavingMotivations] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [markedDates, setMarkedDates] = useState<Record<string, any>>({});
  const [currentVisibleMonth, setCurrentVisibleMonth] = useState(formatLocalDate(new Date()).substring(0, 7)); // YYYY-MM
  const [dailyAppointments, setDailyAppointments] = useState<Appointment[]>([]);
  const [dailyReminders, setDailyReminders] = useState<Reminder[]>([]);
  
  // Weekly report states
  const [showWeeklyReport, setShowWeeklyReport] = useState(false);
  const [weeklyReportData, setWeeklyReportData] = useState<WeeklyReportData | null>(null);
  const [loadingWeeklyReport, setLoadingWeeklyReport] = useState(false);

  // Add a more aggressive refresh when tab is focused
  useFocusEffect(
    React.useCallback(() => {
      console.log('Home tab focused, clearing cache and refreshing all data');
      if (authInitialized && authUser) {
        // Clear cache and reload everything
        DatabaseService.clearAppointmentCache();
        loadUpcomingAppointments();
        loadDailyTasks();
        loadReminders();
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
          if (isMounted && userData) {
            setUser(userData);
            
            // Check and update motivational quotes if needed
            if (userData.motivations && userData.motivations.length > 0) {
              const needsUpdate = await shouldUpdateQuotes();
              if (needsUpdate) {
                console.log('Updating motivational quotes at midnight');
                const newQuotes = await getOrGenerateQuotes(
                  userData.motivations as MotivationCategory[],
                  i18n.language as any
                );
                setMotivationalPhrases(newQuotes);
              } else {
                console.log('Motivational quotes still current');
              }
            }
          }
        } catch (error) {
          console.error('Error loading user data:', error);
        }
        
        // Load upcoming appointments
        try {
          await loadUpcomingAppointments();
        } catch (error) {
          console.error('Error loading appointments:', error);
          if (isMounted) setAppointments([]);
        }
        
        // Load reminders
        try {
          await loadReminders();
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

  // Add auto-refresh for appointments
  useEffect(() => {
    // Initial load
    if (authUser) {
      loadUpcomingAppointments();
    }
    
    // Set up an interval to refresh appointments every minute
    const intervalId = setInterval(() => {
      if (authUser) {
        loadUpcomingAppointments();
      }
    }, 60000); // 60000 ms = 1 minute
    
    // Clean up the interval on component unmount
    return () => clearInterval(intervalId);
  }, [authUser]); // Removed expandedAppointments and showAppointments from dependencies

  // Add effect for reminders that triggers on expandedReminders change
  useEffect(() => {
    if (authUser) {
      loadReminders();
    }
  }, [authUser, expandedReminders, showReminders]);

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
        <Text style={styles.headerSubtitle}>{t('home.subtitle')}</Text>
      </View>
      <TouchableOpacity
        style={styles.menuButton}
        onPress={() => setShowMenu(true)}
      >
        <Menu color="#ffffff" size={24} />
      </TouchableOpacity>
    </View>
  );

  // Add a function to refresh quotes manually
  const refreshMotivationalQuotes = async () => {
    if (!user || !user.motivations || user.motivations.length === 0) return;
    
    try {
      // Force generate new quotes
      await AsyncStorage.removeItem('last_motivational_quote_update');
      
      const newQuotes = await getOrGenerateQuotes(
        user.motivations as MotivationCategory[],
        i18n.language as any
      );
      
      setMotivationalPhrases(newQuotes);
    } catch (error) {
      console.error('Error refreshing motivational quotes:', error);
    }
  };

  const renderMotivationalBanner = () => (
    <LinearGradient
      colors={['rgba(147, 51, 234, 0.1)', 'rgba(147, 51, 234, 0.05)']}
      style={styles.motivationalBanner}
    >
      {motivationalPhrases.length > 0 ? (
        <View style={styles.motivationalPhrasesContainer}>
          {motivationalPhrases.map((phrase, index) => (
            <Text key={index} style={styles.motivationalText}>
              {motivationalPhrases.length > 1 ? '- ' : ''}{phrase}
            </Text>
          ))}
        </View>
      ) : (
        <Text style={styles.motivationalText}>
          {i18n.language === 'fr' 
            ? "Crois en toi et en tout ce que tu es." 
            : "Believe in yourself and all that you are."}
        </Text>
      )}
    </LinearGradient>
  );

  const renderSchedule = () => (
    <View style={styles.scheduleSection}>
       
      <View style={styles.sectionHeader}>

        <Text style={styles.sectionTitle}>{t('home.schedule')}</Text>
        <TouchableOpacity
          style={styles.weekViewButton}
          onPress={() => setShowCalendar(true)}
        >
          <Calendar size={16} color="#9333ea" />
        </TouchableOpacity>
      </View>

      <View style={styles.scheduleBanners}>
        {/* Appointments Banner */}
        <View style={[
          styles.scheduleBanner,
          { height: 280 } // Increased from 260 to 280
        ]}>
          <View style={styles.bannerHeader}>
            <Calendar size={16} color="#9333ea" />
            <Text style={styles.bannerTitle}>{t('home.appointments')}</Text>
            <Badge>{totalAppointmentCount}</Badge>
          </View>

          <View style={styles.bannerContent}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#9333ea" />
            ) : appointments.length > 0 ? (
              <>
                <View style={styles.eventList}>
                  {appointments.slice(0, 3).map((appointment, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.eventItem}
                      onPress={() => {
                        setSelectedAppointment(appointment);
                        setShowAppointmentDetails(true);
                      }}
                    >
                      <Text style={styles.eventTime}>
                        {
                          (() => {
                            const appointmentDate = new Date(appointment.date);
                            const today = new Date();
                            const isToday = 
                              appointmentDate.getDate() === today.getDate() &&
                              appointmentDate.getMonth() === today.getMonth() &&
                              appointmentDate.getFullYear() === today.getFullYear();
                            
                            // Get the appropriate locale based on the current language
                            const currentLanguage = i18n.language;
                            let locale = currentLanguage === 'fr' ? 'fr-FR' : 
                                        currentLanguage === 'nl' ? 'nl-NL' : 
                                        currentLanguage === 'es' ? 'es-ES' : 
                                        currentLanguage === 'pt' ? 'pt-PT' : 
                                        currentLanguage === 'it' ? 'it-IT' : 'en-US';
                            
                            return isToday
                              ? appointment.startTime
                              : `${appointmentDate.toLocaleDateString(locale, {
                                  month: 'short',
                                  day: 'numeric'
                                })} ${appointment.startTime}`;
                          })()
                        }
                      </Text>
                      <Text style={styles.eventTitle} numberOfLines={1} ellipsizeMode="tail">
                        {appointment.appointmentName}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity 
                  style={styles.seeMoreButton}
                  onPress={() => {
                    setExpandedAppointments(true);
                    // First set the flag to true to trigger display of expanded list
                    setShowAppointments(true);
                    // Then explicitly reload the appointments with the expanded flag
                    loadUpcomingAppointments(true);
                  }}
                >
                  <Text style={styles.seeMoreText}>{t('home.seeAll')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.emptyEventContainer}>
                <Text style={styles.emptyEventText}>{t('home.noAppointments')}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Reminders Banner */}
        <View style={[
          styles.scheduleBanner,
          { height: 280 } // Increased from 260 to 280
        ]}>
          <View style={styles.bannerHeader}>
            <Bell size={16} color="#9333ea" />
            <Text style={styles.bannerTitle}>{t('home.reminders')}</Text>
            <Badge>{totalReminderCount}</Badge>
          </View>

          <View style={styles.bannerContent}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#9333ea" />
            ) : reminders.length > 0 ? (
              <>
                <View style={styles.eventList}>
                  {reminders.slice(0, 3).map((reminder, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.eventItem}
                      onPress={() => {
                        setSelectedReminder(reminder);
                        setShowReminderDetails(true);
                      }}
                    >
                      <Text style={styles.eventTime}>
                        {
                          (() => {
                            const reminderDate = new Date(reminder.date);
                            const today = new Date();
                            const isToday = 
                              reminderDate.getDate() === today.getDate() &&
                              reminderDate.getMonth() === today.getMonth() &&
                              reminderDate.getFullYear() === today.getFullYear();
                            
                            // Get the appropriate locale based on the current language
                            const currentLanguage = i18n.language;
                            let locale = currentLanguage === 'fr' ? 'fr-FR' : 
                                        currentLanguage === 'nl' ? 'nl-NL' : 
                                        currentLanguage === 'es' ? 'es-ES' : 
                                        currentLanguage === 'pt' ? 'pt-PT' : 
                                        currentLanguage === 'it' ? 'it-IT' : 'en-US';
                            
                            return isToday
                              ? reminder.time
                              : `${reminderDate.toLocaleDateString(locale, {
                                  month: 'short',
                                  day: 'numeric'
                                })} ${reminder.time}`;
                          })()
                        }
                      </Text>
                      <Text style={styles.eventTitle} numberOfLines={1} ellipsizeMode="tail">
                        {reminder.reminderName}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity 
                  style={styles.seeMoreButton}
                  onPress={() => {
                    setExpandedReminders(true);
                    setShowReminders(true);
                  }}
                >
                  <Text style={styles.seeMoreText}>{t('home.seeAll')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.emptyEventContainer}>
                <Text style={styles.emptyEventText}>{t('home.noReminders')}</Text>
              </View>
            )}
          </View>
        </View>
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
        <View style={[
          styles.modalContent,
          dimensions.width > 768 ? { maxWidth: 600 } : { width: '92%' }
        ]}>
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
                  {/* Display date if it's not today */}
                  {item.date && (() => {
                    const itemDate = new Date(item.date);
                    const today = new Date();
                    const isToday = 
                      itemDate.getDate() === today.getDate() &&
                      itemDate.getMonth() === today.getMonth() &&
                      itemDate.getFullYear() === today.getFullYear();
                    
                    // Get locale from current language
                    const locale = getLocaleFromLanguage(i18n.language);
                    
                    if (isToday) {
                      // Just show time for today's items
                      return (item as any).time || 
                             (item as Appointment).startTime || 
                             new Date(item.date).toLocaleTimeString(locale, {
                               hour: '2-digit',
                               minute: '2-digit',
                             });
                    } else {
                      // Show date and time for future dates
                      return `${itemDate.toLocaleDateString(locale, {
                        month: 'short',
                        day: 'numeric'
                      })} ${(item as any).time || 
                             (item as Appointment).startTime ||
                             new Date(item.date).toLocaleTimeString(locale, {
                               hour: '2-digit',
                               minute: '2-digit',
                             })}`;
                    }
                  })()}
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
          <Text style={styles.emptyStateText}>{t('home.noTasks')}</Text>
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
              ]} numberOfLines={2}>
                {task.taskName || 'Unnamed Task'}
              </Text>
            </View>
            {!isCompletedToday && (
              <TouchableOpacity style={styles.completeButton} onPress={handleTaskCompletion}>
                <Text style={styles.completeButtonText}>{t('home.done')}</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.taskProgressContainer}>
            <Text style={[
              styles.taskProgressText,
              isCompletedToday && styles.completedTaskText
            ]}>
              {`${task.daysDone || 0} / ${task.daysSelected || 1} ${t('home.days')}`}
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

    const handleLogout = async () => {
      try {
        // Close the menu
        setShowMenu(false);
        
        // Sign out the user
        const auth = getAuth();
        await auth.signOut();
        
        // Any additional cleanup can go here
        console.log('User logged out successfully');
        
        // Redirect to login page
        router.replace('/login');
      } catch (error) {
        console.error('Error signing out:', error);
      }
    };

    // Format date for last activity
    const formatLastActivity = () => {
      const now = new Date();
      // Use the current language from i18n instead of hardcoded 'en-US'
      const currentLanguage = i18n.language;
      let locale = currentLanguage;
      
      // Map languages to locales if needed
      if (currentLanguage === 'fr') locale = 'fr-FR';
      else if (currentLanguage === 'en') locale = 'en-US';
      else if (currentLanguage === 'nl') locale = 'nl-NL';
      else if (currentLanguage === 'es') locale = 'es-ES';
      else if (currentLanguage === 'pt') locale = 'pt-PT';
      else if (currentLanguage === 'it') locale = 'it-IT';
      
      return now.toLocaleDateString(locale, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    // Handle language change
    const changeLanguage = async (lang: 'fr' | 'en') => {
      try {
        await saveLanguagePreference(lang);
        // Update user language preference in database if needed
      } catch (error) {
        console.error('Error changing language:', error);
      }
    };

    return (
      <View style={StyleSheet.absoluteFill}>
        <BlurView intensity={95} style={[StyleSheet.absoluteFill, styles.menuOverlay]} tint="dark">
          <ScrollView style={styles.menuScrollContent} contentContainerStyle={{paddingTop: Platform.OS === 'ios' ? 50 : 20}}>
            <View style={styles.menuContent}>
              <TouchableOpacity
                style={[styles.closeButton, {marginTop: Platform.OS === 'ios' ? 20 : 0}]}
                onPress={() => setShowMenu(false)}
              >
                <X color="#ffffff" size={24} />
              </TouchableOpacity>

              {/* Profile Section */}
              <View style={styles.profileSection}>
                <Text style={styles.profileEmail}>{user?.email}</Text>
              </View>

              {/* Quick Stats Section */}
              <View style={styles.menuSection}>
                <Text style={styles.menuSectionTitle}>{t('home.menu.activitySummary')}</Text>
                <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                    <CheckSquare size={20} color="#9333ea" />
                    <Text style={styles.statNumber}>{dailyTasks.length}</Text>
                    <Text style={styles.statLabel}>{t('home.menu.tasks')}</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <Calendar size={20} color="#9333ea" />
                    <Text style={styles.statNumber}>{totalAppointmentCount}</Text>
                    <Text style={styles.statLabel}>{t('home.menu.appointments')}</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <Bell size={20} color="#9333ea" />
                    <Text style={styles.statNumber}>{totalReminderCount}</Text>
                    <Text style={styles.statLabel}>{t('home.menu.reminders')}</Text>
                  </View>
                </View>
              </View>

              {/* Language Switcher Section */}
              <View style={styles.menuSection}>
                <Text style={styles.menuSectionTitle}>{t('login.selectLanguage')}</Text>
                <View style={styles.languageSwitcher}>
                  <TouchableOpacity
                    style={[
                      styles.languageOption,
                      i18n.language === 'fr' && styles.languageOptionSelected
                    ]}
                    onPress={() => changeLanguage('fr')}
                  >
                    <Text style={[
                      styles.languageOptionText,
                      i18n.language === 'fr' && styles.languageOptionTextSelected
                    ]}>
                      Français
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.languageOption,
                      i18n.language === 'en' && styles.languageOptionSelected
                    ]}
                    onPress={() => changeLanguage('en')}
                  >
                    <Text style={[
                      styles.languageOptionText,
                      i18n.language === 'en' && styles.languageOptionTextSelected
                    ]}>
                      English
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Last Activity */}
              <View style={styles.menuSection}>
                <Text style={styles.menuSectionTitle}>{t('home.menu.accountInfo')}</Text>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>{t('home.menu.lastActivity')}:</Text>
                  <Text style={styles.infoValue}>{formatLastActivity()}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>{t('home.menu.language')}:</Text>
                  <Text style={styles.infoValue}>{i18n.language === 'fr' ? 'Français' : 'English'}</Text>
                </View>
                {user && user.motivations && user.motivations.length > 0 && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>{t('home.menu.motivations')}:</Text>
                    <View style={styles.motivationsContainer}>
                      {user.motivations.map((motivation, index) => (
                        <View key={index} style={styles.motivationChip}>
                          <Text style={styles.motivationText}>
                            {motivation.charAt(0).toUpperCase() + motivation.slice(1)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                <TouchableOpacity 
                  style={styles.editMotivationsButton}
                  onPress={handleOpenEditMotivations}
                >
                  <Text style={styles.editMotivationsButtonText}>{t('home.menu.editMotivations')}</Text>
                </TouchableOpacity>
              </View>

              {/* App Version and Support */}
              <View style={styles.menuSection}>
                <Text style={styles.menuSectionTitle}>{t('home.menu.appInfo')}</Text>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>{t('home.menu.version')}:</Text>
                  <Text style={styles.infoValue}>1.0.0</Text>
                </View>
                <Text style={styles.supportEmailText}>{t('home.menu.supportEmail')}</Text>
              </View>

              {/* Logout Button */}
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleLogout}
              >
                <Text style={styles.logoutButtonText}>{t('home.menu.logOut')}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
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

  // Function to load upcoming appointments
  const loadUpcomingAppointments = async (forceExpanded?: boolean) => {
    if (!authUser) return;
    
    try {
      // Always use fresh data for home screen
      DatabaseService.clearAppointmentCache();
      
      // Get current date and time
      const now = new Date();
      
      // Get the start of the current day for the database query
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      
      // Use either the passed forceExpanded parameter or the current state
      const isExpanded = forceExpanded !== undefined ? forceExpanded : expandedAppointments;
      
      // Get upcoming appointments with expanded limit if needed
      const upcomingAppointments = await DatabaseService.getUpcomingAppointments(
        authUser.uid, 
        isExpanded ? 50 : 10, // Increase limit and fetch more to ensure we have enough after filtering
        startOfDay // Use start of day to include today's appointments 
      );
      
      // Further filter appointments that have already ended
      let filteredAppointments = upcomingAppointments.filter(appointment => {
        const appointmentDate = new Date(appointment.date);
        const [endHours, endMinutes] = appointment.endTime.split(':').map(Number);
        appointmentDate.setHours(endHours, endMinutes, 0, 0);
        
        return appointmentDate > now;
      });
      
      // Sort appointments by date and time
      filteredAppointments.sort((a, b) => {
        // First compare dates
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        const dateDiff = dateA.getTime() - dateB.getTime();
        
        // If dates are different, sort by date
        if (dateDiff !== 0) return dateDiff;
        
        // If same date, sort by start time
        const [hoursA, minutesA] = a.startTime.split(':').map(Number);
        const [hoursB, minutesB] = b.startTime.split(':').map(Number);
        
        // Convert to minutes for easier comparison
        const timeA = hoursA * 60 + minutesA;
        const timeB = hoursB * 60 + minutesB;
        
        return timeA - timeB;
      });
      
      setAppointments(filteredAppointments.slice(0, isExpanded ? 50 : 3)); // Take only the needed number after filtering
      
      // Get the total count of all upcoming appointments
      const allUpcomingAppointments = await DatabaseService.getUpcomingAppointments(
        authUser.uid,
        1000, // Use a large limit to get all appointments
        startOfDay // Use start of day to include today's appointments
      );
      
      // Filter total count the same way and sort them similarly
      let filteredTotal = allUpcomingAppointments.filter(appointment => {
        const appointmentDate = new Date(appointment.date);
        const [endHours, endMinutes] = appointment.endTime.split(':').map(Number);
        appointmentDate.setHours(endHours, endMinutes, 0, 0);
        
        return appointmentDate > now;
      });
      
      // Sort total appointments the same way
      filteredTotal.sort((a, b) => {
        // First compare dates
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        const dateDiff = dateA.getTime() - dateB.getTime();
        
        // If dates are different, sort by date
        if (dateDiff !== 0) return dateDiff;
        
        // If same date, sort by start time
        const [hoursA, minutesA] = a.startTime.split(':').map(Number);
        const [hoursB, minutesB] = b.startTime.split(':').map(Number);
        
        // Convert to minutes for easier comparison
        const timeA = hoursA * 60 + minutesA;
        const timeB = hoursB * 60 + minutesB;
        
        return timeA - timeB;
      });
      
      setTotalAppointmentCount(filteredTotal.length);
    } catch (error) {
      console.error('Error loading upcoming appointments:', error);
      setAppointments([]);
      setTotalAppointmentCount(0);
    }
  };

  // Function to format appointment time
  const formatAppointmentTime = (time: string) => {
    return time;
  };

  // Add appointment detail modal
  const renderAppointmentDetail = () => {
    if (!selectedAppointment) return null;
    
    return (
      <Modal
        visible={showAppointmentDetails}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAppointmentDetails(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContent,
            dimensions.width > 768 ? { maxWidth: 600 } : { width: '92%' }
          ]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Calendar size={20} color="#9333ea" />
                <Text style={styles.modalTitle}>{t('home.appointmentDetails')}</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowAppointmentDetails(false)}
              >
                <X size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <View style={styles.appointmentDetailContainer}>
              <Text style={styles.appointmentDetailTitle}>
                {selectedAppointment.appointmentName}
              </Text>
              
              <View style={styles.appointmentDetailRow}>
                <Clock size={18} color="#9333ea" />
                <Text style={styles.appointmentDetailText}>
                  {new Date(selectedAppointment.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
              </View>
              
              <View style={styles.appointmentDetailRow}>
                <Clock size={18} color="#9333ea" />
                <Text style={styles.appointmentDetailText}>
                  {selectedAppointment.startTime} - {selectedAppointment.endTime}
                </Text>
              </View>
              
              {selectedAppointment.description && (
                <View style={styles.appointmentDescriptionContainer}>
                  <Text style={styles.appointmentDescription}>
                    {selectedAppointment.description}
                  </Text>
                </View>
              )}
              
              {selectedAppointment.address && (
                <View style={styles.appointmentDetailRow}>
                  <MapPin size={18} color="#9333ea" />
                  <Text style={styles.appointmentDetailText}>
                    {selectedAppointment.address}
                  </Text>
                </View>
              )}
              
              <TouchableOpacity
                style={styles.editAppointmentButton}
                onPress={async () => {
                  setShowAppointmentDetails(false);
                  
                  if (selectedAppointment?.appointmentID) {
                    try {
                      // Store the appointment ID in AsyncStorage
                      await AsyncStorage.setItem('editAppointmentId', selectedAppointment.appointmentID);
                      
                      // Navigate to the appointments tab
                      router.navigate('/appointments');
                    } catch (error) {
                      console.error('Error storing appointment ID:', error);
                    }
                  }
                }}
              >
                <Edit size={18} color="#ffffff" />
                <Text style={styles.editAppointmentButtonText}>
                  {t('home.editAppointment')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Add a function to load reminders with total count
  const loadReminders = async () => {
    if (!authUser) return;
    
    try {
      // Get current date and time for filtering
      const now = new Date();
      
      // Get upcoming reminders - fetch more initially to ensure we have enough after filtering
      const userReminders = await DatabaseService.getUpcomingReminders(
        authUser.uid, 
        expandedReminders ? 50 : 10 // Increased from 3 to 10 to ensure we have enough after filtering
      );
      
      // Filter out past reminders including time check
      let filteredReminders = userReminders.filter(reminder => {
        // Always keep recurring reminders
        if (reminder.isRecurring) {
          return true;
        }
        
        // For one-time reminders, check if they're in the future including time
        const reminderDate = new Date(reminder.date);
        if (reminder.time) {
          const [hours, minutes] = reminder.time.split(':').map(Number);
          reminderDate.setHours(hours, minutes, 0, 0);
        }
        
        // Keep only if reminder date/time is in the future
        return reminderDate >= now;
      });
      
      // Sort reminders by date and time
      filteredReminders.sort((a, b) => {
        // First compare dates
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        const dateDiff = dateA.getTime() - dateB.getTime();
        
        // If dates are different, sort by date
        if (dateDiff !== 0) return dateDiff;
        
        // If same date, sort by time
        // Extract hours and minutes from time strings
        const timeA = a.time ? a.time : "00:00";
        const timeB = b.time ? b.time : "00:00";
        
        const [hoursA, minutesA] = timeA.split(':').map(Number);
        const [hoursB, minutesB] = timeB.split(':').map(Number);
        
        // Convert to minutes for easier comparison
        const totalMinutesA = hoursA * 60 + minutesA;
        const totalMinutesB = hoursB * 60 + minutesB;
        
        return totalMinutesA - totalMinutesB;
      });
      
      // Ensure no duplicates by using a Map with reminderID as key
      const uniqueReminders = new Map();
      filteredReminders.forEach(reminder => {
        if (reminder.reminderID) {
          uniqueReminders.set(reminder.reminderID, reminder);
        }
      });
      
      setReminders(Array.from(uniqueReminders.values()).slice(0, expandedReminders ? 50 : 3));
      
      // Get the total count of all active reminders (include only future non-recurring)
      const allActiveReminders = await DatabaseService.getUserReminders(
        authUser.uid, 
        { active: true }
      );
      
      // Filter count the same way, including time check
      let activeReminders = allActiveReminders.filter(reminder => 
        reminder.isRecurring || 
        (() => {
          const reminderDate = new Date(reminder.date);
          if (reminder.time) {
            const [hours, minutes] = reminder.time.split(':').map(Number);
            reminderDate.setHours(hours, minutes, 0, 0);
          }
          return reminderDate >= now;
        })()
      );
      
      // Sort total reminders the same way
      activeReminders.sort((a, b) => {
        // First compare dates
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        const dateDiff = dateA.getTime() - dateB.getTime();
        
        // If dates are different, sort by date
        if (dateDiff !== 0) return dateDiff;
        
        // If same date, sort by time
        const timeA = a.time ? a.time : "00:00";
        const timeB = b.time ? b.time : "00:00";
        
        const [hoursA, minutesA] = timeA.split(':').map(Number);
        const [hoursB, minutesB] = timeB.split(':').map(Number);
        
        // Convert to minutes for easier comparison
        const totalMinutesA = hoursA * 60 + minutesA;
        const totalMinutesB = hoursB * 60 + minutesB;
        
        return totalMinutesA - totalMinutesB;
      });
      
      setTotalReminderCount(activeReminders.length);
    } catch (error) {
      console.error('Error loading reminders:', error);
      setReminders([]);
      setTotalReminderCount(0);
    }
  };

  // Add a function to render reminder details
  const renderReminderDetail = () => {
    if (!selectedReminder) return null;
    
    return (
      <Modal
        visible={showReminderDetails}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReminderDetails(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContent,
            dimensions.width > 768 ? { maxWidth: 600 } : { width: '92%' }
          ]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Bell size={20} color="#9333ea" />
                <Text style={styles.modalTitle}>{t('home.reminderDetails')}</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowReminderDetails(false)}
              >
                <X size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <View style={styles.reminderDetailContainer}>
              <Text style={styles.reminderDetailTitle}>
                {selectedReminder.reminderName}
              </Text>
              
              {selectedReminder.isRecurring ? (
                <View>
                  <Text style={styles.reminderDetailText}>
                    {t('home.recurringOn')}
                  </Text>
                  <View style={styles.reminderDetailDays}>
                    {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
                      .filter((_, index) => selectedReminder.daysOfWeek?.includes(index))
                      .map((day, index) => (
                        <View key={index} style={styles.reminderDayChip}>
                          <Text style={styles.reminderDayText}>{day}</Text>
                        </View>
                      ))
                    }
                  </View>
                </View>
              ) : (
                <View style={styles.reminderDetailRow}>
                  <Bell size={18} color="#9333ea" />
                  <Text style={styles.reminderDetailText}>
                    {new Date(selectedReminder.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })}
                    {' at '}
                    {selectedReminder.time}
                  </Text>
                </View>
              )}
              
              {selectedReminder.notificationTimes && selectedReminder.notificationTimes.length > 0 && (
                <View style={styles.reminderNotificationsContainer}>
                  <Text style={styles.reminderDetailLabel}>{t('home.notifications')}:</Text>
                  <View style={styles.reminderNotificationsRow}>
                    {selectedReminder.notificationTimes.map((time, index) => (
                      <View key={index} style={styles.reminderNotificationChip}>
                        <Bell size={12} color="#9333ea" />
                        <Text style={styles.reminderNotificationText}>{time}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              
              <TouchableOpacity
                style={styles.editReminderButton}
                onPress={() => {
                  setShowReminderDetails(false);
                  router.navigate('/reminders');
                }}
              >
                <Edit size={18} color="#ffffff" />
                <Text style={styles.editReminderButtonText}>
                  {t('home.editReminder')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Add a function to handle opening the edit motivations modal
  const handleOpenEditMotivations = () => {
    if (user && user.motivations) {
      setSelectedMotivations(user.motivations);
    } else {
      setSelectedMotivations([]);
    }
    setShowEditMotivations(true);
    setShowMenu(false);
  };
  
  // Add a function to save updated motivations
  const handleSaveMotivations = async () => {
    if (!authUser || !user) return;
    
    try {
      setIsSavingMotivations(true);
      
      // Update user in database with new motivations
      const updatedUser = {
        ...user,
        motivations: selectedMotivations
      };
      
      // Using Firebase directly since we don't have an update method in DatabaseService
      const userDocRef = doc(db, 'users', authUser.uid);
      await updateDoc(userDocRef, { motivations: selectedMotivations });
      
      // Update local user state
      setUser(updatedUser);
      
      // Update motivational phrases based on new motivations
      try {
        const newQuotes = await getOrGenerateQuotes(
          selectedMotivations as MotivationCategory[],
          i18n.language as any
        );
        setMotivationalPhrases(newQuotes);
      } catch (error) {
        console.error('Error updating motivational phrases:', error);
      }
      
      // Close the modal
      setShowEditMotivations(false);
    } catch (error) {
      console.error('Error saving motivations:', error);
      // Show an alert to inform the user about the error
      alert('Failed to save motivations. Please try again.');
    } finally {
      setIsSavingMotivations(false);
    }
  };
  
  // Add a function to toggle a motivation
  const toggleMotivation = (motivation: "sport" | "business" | "studies" | "wellbeing" | "parenting" | "personalDevelopment" | "financialManagement") => {
    setSelectedMotivations(prev => {
      // If already selected, remove it
      if (prev.includes(motivation)) {
        return prev.filter(m => m !== motivation);
      }
      
      // If we already have 2 motivations and trying to add another, limit to 2
      if (prev.length >= 2) {
        return [...prev.slice(0, 1), motivation]; // Keep first and add new one
      }
      
      // Otherwise add it
      return [...prev, motivation];
    });
  };
  
  // Add the Motivations editing modal
  const renderEditMotivationsModal = () => {
    if (!showEditMotivations) return null;
    
    const motivationOptions = [
      { key: 'sport', icon: '🏃‍♂️' },
      { key: 'business', icon: '💼' },
      { key: 'studies', icon: '📚' },
      { key: 'wellbeing', icon: '🧘‍♀️' },
      { key: 'parenting', icon: '👨‍👩‍👧‍👦' },
      { key: 'personalDevelopment', icon: '🌱' },
      { key: 'financialManagement', icon: '💰' },
    ] as const;
    
    return (
      <Modal
        visible={showEditMotivations}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditMotivations(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContent,
            dimensions.width > 768 ? { maxWidth: 600 } : { width: '92%' }
          ]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Text style={styles.modalTitle}>{t('login.selectMotivations')}</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowEditMotivations(false)}
              >
                <X size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.motivationsHint}>({t('login.selectMotivationsRequired')})</Text>
            
            <View style={styles.motivationsGrid}>
              {motivationOptions.map(({ key, icon }) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.motivationOption,
                    selectedMotivations.includes(key) && styles.motivationOptionSelected
                  ]}
                  onPress={() => toggleMotivation(key)}
                >
                  <Text style={styles.motivationOptionIcon}>{icon}</Text>
                  <Text style={[
                    styles.motivationOptionText,
                    selectedMotivations.includes(key) && styles.motivationOptionTextSelected
                  ]}>
                    {t(`motivations.${key}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TouchableOpacity
              style={[
                styles.saveMotivationsButton,
                selectedMotivations.length === 0 && styles.disabledButton
              ]}
              disabled={selectedMotivations.length === 0 || isSavingMotivations}
              onPress={handleSaveMotivations}
            >
              {isSavingMotivations ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.saveMotivationsButtonText}>{t('common.save')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // Add loadMarkedDates function
  const loadMarkedDates = async (visibleMonth?: string) => {
    if (!authUser) return;
    
    try {
      // Use provided month or current visible month
      const monthToLoad = visibleMonth || currentVisibleMonth;
      
      // Parse the month string (YYYY-MM) to create first and last day
      const [year, month] = monthToLoad.split('-').map(Number);
      const firstDay = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0); // Last day of the month
      
      // Get all dates with reminders
      const reminderDates = await DatabaseService.getDatesWithReminders(authUser.uid, firstDay, lastDay);
      const appointmentDates = await DatabaseService.getDatesWithAppointments(authUser.uid, firstDay, lastDay);
      
      // Create a new object for marked dates
      const markedDatesObj: Record<string, any> = {};
      
      // Mark dates with dots for reminders
      reminderDates.forEach(date => {
        const dateString = formatLocalDate(date);
        markedDatesObj[dateString] = { 
          dots: [{ key: 'reminder', color: '#ef4444' }],
          marked: true
        };
      });
      
      // Add dots for appointments
      appointmentDates.forEach(date => {
        const dateString = formatLocalDate(date);
        
        if (markedDatesObj[dateString]) {
          // If already marked for reminders, add appointment dot
          markedDatesObj[dateString].dots.push({ key: 'appointment', color: '#9333ea' });
        } else {
          // Otherwise just mark it for appointments
          markedDatesObj[dateString] = { 
            dots: [{ key: 'appointment', color: '#9333ea' }],
            marked: true
          };
        }
      });
      
      // Mark the selected date
      const selectedDateString = formatLocalDate(selectedDate);
      if (markedDatesObj[selectedDateString]) {
        // If the selected date already has markers, keep them while adding selection
        markedDatesObj[selectedDateString] = {
          ...markedDatesObj[selectedDateString],
          selected: true,
          selectedColor: '#9333ea',
        };
      } else {
        // Otherwise just mark it as selected
        markedDatesObj[selectedDateString] = { 
          selected: true, 
          selectedColor: '#9333ea',
        };
      }
      
      setMarkedDates(markedDatesObj);
    } catch (error) {
      console.error('Error loading marked dates:', error);
    }
  };

  // Function to load daily items for selected date
  const loadDailyItems = async (date: Date) => {
    if (!authUser) return;
    
    try {
      // Load appointments for the selected date
      const appointments = await DatabaseService.getAppointmentsByDate(authUser.uid, date);
      setDailyAppointments(appointments);
      
      // Load reminders for the selected date
      const reminders = await DatabaseService.getRemindersByDate(authUser.uid, date);
      setDailyReminders(reminders);
    } catch (error) {
      console.error('Error loading daily items:', error);
    }
  };

  // Handle day press in calendar
  const handleDayPress = (day: any) => {
    // Convert the selected date string to a Date object
    const newSelectedDate = parseLocalDate(day.dateString);
    
    // Update the selected date
    setSelectedDate(newSelectedDate);
    
    // Update the current visible month if needed
    const clickedMonth = day.dateString.substring(0, 7); // YYYY-MM format
    if (clickedMonth !== currentVisibleMonth) {
      setCurrentVisibleMonth(clickedMonth);
    }
    
    // Load items for the selected date
    if (authUser) {
      loadDailyItems(newSelectedDate);
    }
    
    // Update marked dates to show the new selection
    const newMarkedDates = { ...markedDates };
    
    // Remove previous selection highlight (but keep the dots!)
    Object.keys(newMarkedDates).forEach(dateString => {
      if (newMarkedDates[dateString]?.selected) {
        const { selected, selectedColor, ...rest } = newMarkedDates[dateString];
        newMarkedDates[dateString] = rest;
      }
    });
    
    // Add new selection
    newMarkedDates[day.dateString] = { 
      ...(newMarkedDates[day.dateString] || {}),
      selected: true, 
      selectedColor: '#9333ea',
    };
    
    setMarkedDates(newMarkedDates);
  };

  // Format a date for display
  const formatCalendarDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    };
    
    // Use the current language from i18n
    const currentLanguage = i18n.language;
    let locale = currentLanguage;
    
    // Map languages to locales if needed
    if (currentLanguage === 'fr') locale = 'fr-FR';
    else if (currentLanguage === 'en') locale = 'en-US';
    
    return date.toLocaleDateString(locale, options);
  };

  // Initialize calendar when opened
  useEffect(() => {
    if (showCalendar && authUser) {
      // Load marked dates when calendar is shown
      loadMarkedDates(currentVisibleMonth);
      // Load items for the selected date
      loadDailyItems(selectedDate);
    }
  }, [showCalendar, authUser]);

  // Update when month changes
  useEffect(() => {
    if (showCalendar && authUser) {
      // Add a slight delay to prevent immediate refresh when navigating
      const timer = setTimeout(() => {
        loadMarkedDates(currentVisibleMonth);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [currentVisibleMonth, authUser, showCalendar]);

  // Add a useEffect to load motivational quotes when user data changes
  useEffect(() => {
    const loadMotivationalPhrases = async () => {
      if (user && user.motivations && user.motivations.length > 0) {
        try {
          // Get motivational quotes based on user's motivations and language
          const quotes = await getOrGenerateQuotes(
            user.motivations as MotivationCategory[], 
            i18n.language as any
          );
          setMotivationalPhrases(quotes);
        } catch (error) {
          console.error('Error loading motivational phrases:', error);
          // Set default phrase if there's an error
          setMotivationalPhrases([i18n.language === 'fr' 
            ? "Crois en toi et en tout ce que tu es." 
            : "Believe in yourself and all that you are."]);
        }
      } else {
        // Set default phrase if user has no motivations
        setMotivationalPhrases([i18n.language === 'fr' 
          ? "Crois en toi et en tout ce que tu es." 
          : "Believe in yourself and all that you are."]);
      }
    };
    
    if (user) {
      loadMotivationalPhrases();
    }
  }, [user, i18n.language]);

  const renderCalendarModal = () => (
    <Modal
      visible={showCalendar}
      transparent
      animationType="slide"
      onRequestClose={() => setShowCalendar(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.calendarModalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('home.calendar')}</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowCalendar(false)}
            >
              <X size={20} color="#666666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView
            style={styles.calendarScrollContent}
            showsVerticalScrollIndicator={true}
          >
            <RNCalendar
              onDayPress={handleDayPress}
              markedDates={markedDates}
              markingType="multi-dot"
              theme={{
                backgroundColor: '#ffffff',
                calendarBackground: '#ffffff',
                textSectionTitleColor: '#1f2937',
                selectedDayBackgroundColor: '#9333ea',
                selectedDayTextColor: '#ffffff',
                todayTextColor: '#9333ea',
                dayTextColor: '#1f2937',
                textDisabledColor: '#d1d5db',
                dotColor: '#ef4444',
                selectedDotColor: '#ffffff',
                arrowColor: '#9333ea',
                monthTextColor: '#1f2937',
                indicatorColor: '#9333ea',
                textDayFontWeight: '400',
                textMonthFontWeight: '700',
                textDayHeaderFontWeight: '600',
                textDayFontSize: 14,
                textMonthFontSize: 16,
                textDayHeaderFontSize: 12
              }}
              onMonthChange={(month: {year: number, month: number}) => {
                const newVisibleMonth = `${month.year}-${String(month.month).padStart(2, '0')}`;
                setCurrentVisibleMonth(newVisibleMonth);
              }}
              current={currentVisibleMonth}
            />
            
            <View style={styles.calendarDayItems}>
              <Text style={styles.calendarDayTitle}>
                {formatCalendarDate(selectedDate)}
              </Text>
              
              {/* Render appointments for the selected date */}
              {dailyAppointments.length > 0 && (
                <View style={styles.calendarDaySection}>
                  <View style={styles.calendarDaySectionHeader}>
                    <Calendar size={18} color="#9333ea" />
                    <Text style={styles.calendarDaySectionTitle}>{t('home.appointments')}</Text>
                  </View>
                  
                  {dailyAppointments.map((appointment, index) => (
                    <View key={`apt-${index}`} style={styles.calendarDayItemCard}>
                      <View style={styles.itemTimeBlock}>
                        <Clock size={16} color="#9333ea" />
                        <Text style={styles.itemTimeText}>
                          {appointment.startTime} - {appointment.endTime}
                        </Text>
                      </View>
                      <Text style={styles.calendarItemName}>
                        {appointment.appointmentName}
                      </Text>
                      {appointment.address && (
                        <View style={styles.itemAddressBlock}>
                          <MapPin size={14} color="#6b7280" />
                          <Text style={styles.itemAddressText}>
                            {appointment.address}
                          </Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {/* Render reminders for the selected date */}
              {dailyReminders.length > 0 && (
                <View style={styles.calendarDaySection}>
                  <View style={styles.calendarDaySectionHeader}>
                    <Bell size={18} color="#ef4444" />
                    <Text style={styles.calendarDaySectionTitle}>{t('home.reminders')}</Text>
                  </View>
                  
                  {dailyReminders.map((reminder, index) => (
                    <View key={`rem-${index}`} style={styles.calendarDayItemCard}>
                      <View style={styles.itemTimeBlock}>
                        <Clock size={16} color="#ef4444" />
                        <Text style={[styles.itemTimeText, { color: '#ef4444' }]}>
                          {reminder.time}
                        </Text>
                      </View>
                      <Text style={styles.calendarItemName}>
                        {reminder.reminderName}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
              
              {dailyAppointments.length === 0 && dailyReminders.length === 0 && (
                <View style={styles.noItemsMessage}>
                  <Text style={styles.noItemsText}>
                    {t('home.noItemsForDate')}
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
  
  // Add an effect to check for weekly reports independently
  useEffect(() => {
    if (authInitialized && authUser) {
      // Add a short delay to avoid competing with other initial data loads
      const timer = setTimeout(() => {
        checkWeeklyReport();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [authInitialized, authUser]);

  // Check if we should generate a weekly report or if there's an unviewed one
  const checkWeeklyReport = async () => {
    try {
      if (!authUser) return;
      
      // First check if we should generate a new report (Sunday after 8pm)
      const shouldGenerate = await shouldGenerateWeeklyReport();
      if (shouldGenerate) {
        await generateWeeklyReport(authUser.uid);
      }
      
      // Then check if there's an unviewed report
      const hasUnviewed = await hasUnviewedWeeklyReport();
      if (hasUnviewed) {
        const report = await getLatestWeeklyReport();
        setWeeklyReportData(report);
        setShowWeeklyReport(true);
      }
    } catch (error) {
      console.error('Error checking weekly report:', error);
    }
  };

  // Handle closing the weekly report modal
  const handleCloseWeeklyReport = async () => {
    try {
      await markWeeklyReportAsViewed();
      setShowWeeklyReport(false);
    } catch (error) {
      console.error('Error marking weekly report as viewed:', error);
    }
  };

  // Force generation of a weekly report (for development/testing)
  // Add weekly report modal rendering function
  const renderWeeklyReportModal = () => (
    <WeeklyReportModal
      visible={showWeeklyReport}
      onClose={handleCloseWeeklyReport}
      reportData={weeklyReportData}
      loading={loadingWeeklyReport}
    />
  );

  // Add a dev section to manually trigger the weekly report

  // Add a helper function for getting locale from language
  const getLocaleFromLanguage = (language: string): string => {
    switch (language) {
      case 'fr': return 'fr-FR';
      case 'nl': return 'nl-NL';
      case 'es': return 'es-ES';
      case 'pt': return 'pt-PT';
      case 'it': return 'it-IT';
      default: return 'en-US';
    }
  };

  return (
    <View style={styles.container}>
      <AdBanner/>
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
          contentContainerStyle={[
            styles.scrollContentContainer,
            dimensions.width > 1024 ? { alignItems: 'center' } : null
          ]}
        >
          <View style={[
            styles.contentWrapper,
            dimensions.width > 1024 ? { maxWidth: 1024 } : { width: '100%' }
          ]}>
            {renderMotivationalBanner()}
            {renderSchedule()}
            
            <View style={styles.lowerContent}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('home.dailyTasks')}</Text>
                <View style={styles.taskContainer}>
                  {isLoading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="large" color="#9333ea" />
                      <Text style={styles.loadingText}>{t('home.loadingTasks')}</Text>
                    </View>
                  ) : (
                    renderDailyTasks()
                  )}
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        {showAppointments && renderExpandedList(
          t('home.appointments'),
          Calendar,
          appointments,
          () => setShowAppointments(false)
        )}

        {showReminders && renderExpandedList(
          t('home.reminders'),
          Bell,
          reminders,
          () => setShowReminders(false)
        )}

        {renderMenu()}
        {renderAppointmentDetail()}
        {renderReminderDetail()}
        {showEditMotivations && renderEditMotivationsModal()}
        {showCalendar && renderCalendarModal()}
        {showWeeklyReport && renderWeeklyReportModal()}
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
    width: '100%',
  },
  scrollContentContainer: {
    paddingBottom: 24,
    width: '100%',
  },
  contentWrapper: {
    width: '100%',
  },
  lowerContent: {
    width: '100%',
    paddingBottom: 20,
    zIndex: 0,
    position: 'relative',
    marginTop: 5, // Reduced from 10 to 5
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
    width: '100%',
    marginHorizontal: 0,
    paddingHorizontal: 16,
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
  motivationalPhrasesContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  phrasesSeparator: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: 'bold',
  },
  scheduleSection: {
    width: '100%',
    marginBottom: 10, // Reduced from 30 to 10
    position: 'relative',
    zIndex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
    width: '100%',
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
    width: '100%',
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    zIndex: 0,
  },
  scheduleBanner: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    height: 280, // Increased from 260 to 280
    overflow: 'hidden',
    flex: 1, 
    maxWidth: '48%',
  },
  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  bannerTitle: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    marginLeft: 6,
    flex: 1,
    letterSpacing: 0.2,
  },
  bannerContent: {
    flex: 1,
    justifyContent: 'space-between',
    display: 'flex',
    flexDirection: 'column',
    paddingBottom: 4, // Add padding at bottom to ensure space for button
  },
  eventList: {
    flex: 1,
    marginBottom: 8, // Add margin to create space between list and button
  },
  eventItem: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 10,
    borderRadius: 10,
    height: 56, // Slightly reduced from 60 to save space
  },
  eventTime: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#9333ea',
    marginBottom: 4,
  },
  eventTitle: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
    width: '100%',
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
  menuOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  menuScrollContent: {
    flex: 1,
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
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
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
    color: '#d1d5db',
    letterSpacing: 0.2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    width: '100%',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    width: '100%',
    maxHeight: '90%',
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
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 8,
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
    overflow: 'hidden',
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dailyTaskName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    flex: 1,
  },
  completeButton: {
    backgroundColor: '#9333ea',
    borderRadius: 12,
    padding: 8,
    minWidth: 70,
    alignItems: 'center',
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
    paddingTop: 8, // Reduced from 16 to 8
    paddingBottom: 8,
    width: '100%',
  },
  taskContainer: {
    marginBottom: 16,
    width: '100%',
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
  emptyEventContainer: {
    alignItems: 'center',
    padding: 8,
  },
  emptyEventText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  seeMoreButton: {
    alignItems: 'center',
    padding: 8,
    backgroundColor: 'rgba(147, 51, 234, 0.2)',
    borderRadius: 8,
    marginTop: 'auto', // Push to bottom
    marginBottom: 0, // Reduced from 4 to 0
    flexDirection: 'row',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(147, 51, 234, 0.3)',
    alignSelf: 'stretch',
    position: 'relative',
    zIndex: 1,
    height: 36, // Fixed height for button
  },
  seeMoreText: {
    fontSize: 11,
    color: '#9333ea',
    fontWeight: '500',
  },
  appointmentDetailContainer: {
    padding: 8,
  },
  appointmentDetailTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  appointmentDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  appointmentDetailText: {
    fontSize: 16,
    color: '#e5e7eb',
    marginLeft: 12,
  },
  appointmentDescriptionContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
  },
  appointmentDescription: {
    fontSize: 16,
    color: '#e5e7eb',
    lineHeight: 24,
  },
  editAppointmentButton: {
    backgroundColor: '#9333ea',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  editAppointmentButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  reminderDetailContainer: {
    padding: 8,
  },
  reminderDetailTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  reminderDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  reminderDetailText: {
    fontSize: 16,
    color: '#e5e7eb',
    marginLeft: 12,
  },
  reminderDetailLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e5e7eb',
    marginBottom: 8,
  },
  reminderDetailDays: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    marginBottom: 16,
  },
  reminderDayChip: {
    backgroundColor: 'rgba(147, 51, 234, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  reminderDayText: {
    color: '#e5e7eb',
    fontWeight: '600',
    fontSize: 12,
  },
  reminderNotificationsContainer: {
    marginTop: 16,
  },
  reminderNotificationsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reminderNotificationChip: {
    backgroundColor: 'rgba(147, 51, 234, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reminderNotificationText: {
    color: '#e5e7eb',
    fontWeight: '600',
    fontSize: 12,
  },
  editReminderButton: {
    backgroundColor: '#9333ea',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  editReminderButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  menuSection: {
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    marginTop: 16,
  },
  menuSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#d1d5db',
  },
  quickAccessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  quickAccessItem: {
    width: '48%',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    marginBottom: 8,
  },
  quickAccessText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 4,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#d1d5db',
  },
  infoValue: {
    fontSize: 14,
    color: '#ffffff',
  },
  motivationsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  motivationChip: {
    backgroundColor: 'rgba(147, 51, 234, 0.3)',
    borderRadius: 8,
    padding: 4,
  },
  motivationText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 12,
  },
  supportEmailText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#d1d5db',
    marginTop: 12,
  },
  logoutButton: {
    backgroundColor: '#9333ea',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    marginBottom: 32,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center',
  },
  languageSwitcher: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  languageOption: {
    padding: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 8,
    minWidth: '45%', 
    marginBottom: 8,
    alignItems: 'center',
  },
  languageOptionSelected: {
    backgroundColor: '#9333ea',
    borderColor: '#9333ea',
  },
  languageOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  languageOptionTextSelected: {
    color: '#ffffff',
  },
  badge: {
    backgroundColor: '#9333ea',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgeText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '500',
  },
  editMotivationsButton: {
    backgroundColor: '#9333ea',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  editMotivationsButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center',
  },
  motivationsHint: {
    fontSize: 12,
    color: '#d1d5db',
    marginBottom: 16,
  },
  motivationsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  motivationOption: {
    padding: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 8,
    minWidth: '45%', 
    marginBottom: 8,
    alignItems: 'center',
  },
  motivationOptionSelected: {
    backgroundColor: '#9333ea',
    borderColor: '#9333ea',
  },
  motivationOptionIcon: {
    fontSize: 18,
    marginBottom: 4,
  },
  motivationOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  motivationOptionTextSelected: {
    color: '#ffffff',
  },
  saveMotivationsButton: {
    backgroundColor: '#9333ea',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  disabledButton: {
    backgroundColor: 'rgba(147, 51, 234, 0.3)',
  },
  saveMotivationsButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center',
  },
  calendarModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
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
  calendarScrollContent: {
    flexGrow: 0,
  },
  calendarDayItems: {
    marginTop: 16,
    maxHeight: 300,
  },
  calendarDayTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  calendarDayItemsList: {
    maxHeight: 150,
  },
  calendarDaySection: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  calendarDaySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  calendarDaySectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  calendarDayItemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 6,
    padding: 10,
    marginBottom: 6,
  },
  itemTimeBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  itemTimeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9333ea',
  },
  calendarItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  itemAddressBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemAddressText: {
    fontSize: 14,
    color: '#6b7280',
  },
  noItemsMessage: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noItemsText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  refreshIconContainer: {
    marginTop: 4,
    opacity: 0.7,
  },
});
