import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Modal, TextInput, ActivityIndicator, Switch } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, Calendar as CalendarIcon, Plus, ChevronRight, X, Edit, Trash2, Save, Check, Clock } from 'lucide-react-native';
import { Calendar } from 'react-native-calendars';
import { useAuth } from '@/utils/AuthContext';
import { DatabaseService } from '@/services/database';
import type { Reminder } from '@/types/database';
import { useFocusEffect } from 'expo-router';
import { parseLocalDate, formatLocalDate } from '@/utils/dateUtils';
import * as Notifications from 'expo-notifications';
import { useTranslation } from 'react-i18next';
import DateTimePicker from '@react-native-community/datetimepicker';

// Register for push notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function RemindersScreen() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [filteredReminders, setFilteredReminders] = useState<Reminder[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'recurring' | 'nonRecurring'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [markedDates, setMarkedDates] = useState<Record<string, any>>({});
  const [currentVisibleMonth, setCurrentVisibleMonth] = useState(formatLocalDate(new Date()).substring(0, 7)); // YYYY-MM
  const [dailyReminders, setDailyReminders] = useState<Reminder[]>([]);
  
  // Form states for creating/editing reminders
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const [reminderName, setReminderName] = useState('');
  const [reminderDate, setReminderDate] = useState(new Date());
  const [reminderDateInput, setReminderDateInput] = useState('');
  const [reminderTime, setReminderTime] = useState('09:00');
  const [isRecurring, setIsRecurring] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [notificationTimes, setNotificationTimes] = useState<string[]>(['09:00']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isActive, setIsActive] = useState(true);
  
  // Date and time picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showNotificationTimePicker, setShowNotificationTimePicker] = useState(false);
  const [editingNotificationIndex, setEditingNotificationIndex] = useState(-1);
  const [pickerDate, setPickerDate] = useState(new Date());
  
  // Delete confirmation
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  // Initialize component date state
  useEffect(() => {
    // Set selectedDate to today when component first mounts
    const today = new Date();
    setSelectedDate(today);
  }, []);

  // Define a function to get localized day abbreviations based on current language
  const getDaysAbbreviations = () => {
    if (i18n.language === 'fr') {
      return ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    } else {
      // Default to English
      return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    }
  };
  
  // Use the function to get the days abbreviations
  const DAYS = getDaysAbbreviations();
  
  // Update if language changes
  useEffect(() => {
    // This will update the DAYS constant when language changes
    const days = getDaysAbbreviations();
    setSelectedDays(selectedDays.map(idx => idx)); // Force a re-render with same values
  }, [i18n.language]);

  // Update the useEffect that sets reminderDateInput
  useEffect(() => {
    setReminderDateInput(formatLocalDate(reminderDate));
  }, [reminderDate]);

  // Load data when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        loadReminders();
        
        // Load reminders for the current selected date
        loadDailyReminders(selectedDate);
        
        // Load marked dates for calendar if visible
        if (showCalendar) {
          loadMarkedDates(currentVisibleMonth);
        }
      } else {
        // Make sure to stop loading if no user is available
        setIsLoading(false);
      }
      return () => {
        // Cleanup
      };
    }, [user, selectedDate, currentVisibleMonth, showCalendar])
  );

  // Update the useEffect that loads marked dates when month changes
  useEffect(() => {
    if (showCalendar && user) {
      // Add a slight delay to prevent immediate refresh when navigating
      const timer = setTimeout(() => {
        loadMarkedDates(currentVisibleMonth);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [currentVisibleMonth, user, showCalendar]);

  // Add effect to filter reminders when active filter or reminders array changes
  useEffect(() => {
    if (reminders.length > 0) {
      filterReminders();
    } else {
      setFilteredReminders([]);
    }
  }, [activeFilter, reminders]);

  // Load all reminders
  const loadReminders = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const userReminders = await DatabaseService.getUserReminders(user.uid);
      setReminders(userReminders);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading reminders:', error);
      setIsLoading(false);
    }
  };

  // Load reminders for a specific date
  const loadDailyReminders = async (date: Date) => {
    if (!user) return;
    
    try {
      const reminders = await DatabaseService.getRemindersByDate(user.uid, date);
      setDailyReminders(reminders);
    } catch (error) {
      console.error('Error loading daily reminders:', error);
    }
  };

  // Load dates with reminders for the calendar
  const loadMarkedDates = async (visibleMonth?: string) => {
    if (!user) return;
    
    try {
      // Use provided month or current visible month
      const monthToLoad = visibleMonth || currentVisibleMonth;
      console.log(`Loading marked dates for month: ${monthToLoad}`);
      
      // Parse the month string (YYYY-MM) to create first and last day
      const [year, month] = monthToLoad.split('-').map(Number);
      const firstDay = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0); // Last day of the month
      
      console.log(`Date range: ${firstDay.toISOString()} to ${lastDay.toISOString()}`);
      
      // Get all dates with reminders
      const dates = await DatabaseService.getDatesWithReminders(user.uid, firstDay, lastDay);
      
      console.log(`Received ${dates.length} dates with reminders`);
      
      // Create a new object for marked dates
      const markedDatesObj: Record<string, any> = {};
      
      // Mark dates with dots
      dates.forEach(date => {
        const dateString = formatLocalDate(date);
        console.log(`Marking date with reminder: ${dateString}`);
        markedDatesObj[dateString] = { 
          dots: [{ key: 'reminder', color: '#ef4444' }],
          marked: true
        };
      });
      
      // Also get dates with appointments to show both
      try {
        const appointmentDates = await DatabaseService.getDatesWithAppointments(user.uid, firstDay, lastDay);
        
        console.log(`Received ${appointmentDates.length} dates with appointments`);
        
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
      } catch (error) {
        console.error('Error loading appointment dates:', error);
      }
      
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
      
      console.log(`Total marked dates: ${Object.keys(markedDatesObj).length}`);
      setMarkedDates(markedDatesObj);
    } catch (error) {
      console.error('Error loading marked dates:', error);
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
    
    // Load reminders for the selected date
    if (user) {
      loadDailyReminders(newSelectedDate);
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

  // Reset form for creating/editing reminders
  const resetForm = (reminder?: Reminder | null) => {
    setReminderName(reminder?.reminderName || '');
    
    const date = reminder?.date ? new Date(reminder.date) : new Date();
    setReminderDate(date);
    setReminderDateInput(formatLocalDate(date));
    setPickerDate(date);
    
    // Parse the time string to set the pickerDate's hours and minutes
    if (reminder?.time) {
      const [hours, minutes] = reminder.time.split(':').map(Number);
      const timeDate = new Date();
      timeDate.setHours(hours, minutes, 0, 0);
      setPickerDate(timeDate);
    }
    
    setReminderTime(reminder?.time || '09:00');
    setIsRecurring(reminder?.isRecurring || false);
    setSelectedDays(reminder?.daysOfWeek || []);
    setNotificationTimes(reminder?.notificationTimes || ['09:00']);
    setIsActive(reminder?.active !== undefined ? reminder.active : true);
    setIsEditMode(!!reminder);
  };

  // Toggle a day selection for recurring reminders
  const toggleDay = (dayIndex: number) => {
    if (selectedDays.includes(dayIndex)) {
      setSelectedDays(selectedDays.filter(day => day !== dayIndex));
    } else {
      setSelectedDays([...selectedDays, dayIndex]);
    }
  };

  // Add a notification time
  const addNotificationTime = () => {
    setNotificationTimes([...notificationTimes, '09:00']);
  };

  // Update a notification time
  const updateNotificationTime = (index: number, time: string) => {
    const newTimes = [...notificationTimes];
    newTimes[index] = time;
    setNotificationTimes(newTimes);
  };

  // Remove a notification time
  const removeNotificationTime = (index: number) => {
    if (notificationTimes.length > 1) {
      setNotificationTimes(notificationTimes.filter((_, i) => i !== index));
    }
  };

  // Format a date for display
  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    };
    
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
    
    return date.toLocaleDateString(locale, options);
  };

  // Handle reminder submission (create or update)
  const handleSubmitReminder = async () => {
    if (!reminderName.trim() || isSubmitting || !user) return;
    
    try {
      setIsSubmitting(true);
      
      // Prepare reminder data
      const reminderData: Omit<Reminder, 'reminderID' | 'createdAt' | 'updatedAt'> = {
        userID: user.uid,
        reminderName: reminderName.trim(),
        date: reminderDate,
        time: reminderTime,
        isRecurring,
        active: isActive,
        notificationTimes: notificationTimes,
      };
      
      // Add daysOfWeek only if it's a recurring reminder
      if (isRecurring) {
        reminderData.daysOfWeek = selectedDays;
      }
      
      if (isEditMode && selectedReminder?.reminderID) {
        // Update existing reminder
        await DatabaseService.updateReminder(selectedReminder.reminderID, reminderData);
      } else {
        // Create new reminder
        await DatabaseService.createReminder(reminderData);
      }
      
      // Schedule notifications
      await scheduleNotifications(reminderData);
      
      // Reload data
      await loadReminders();
      await loadDailyReminders(selectedDate);
      await loadMarkedDates();
      
      // Close modal
      setShowReminderModal(false);
    } catch (error) {
      console.error('Error saving reminder:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Schedule notifications for a reminder
  const scheduleNotifications = async (reminder: Omit<Reminder, 'reminderID' | 'createdAt' | 'updatedAt'>) => {
    try {
      // Request permissions first
      const { status } = await Notifications.getPermissionsAsync();
      
      if (status !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          console.log('Notification permission not granted');
          return;
        }
      }
      
      // Cancel any existing notifications for this reminder
      if (selectedReminder?.reminderID) {
        await Notifications.cancelScheduledNotificationAsync(selectedReminder.reminderID);
      }
      
      const notificationContent = {
        title: 'Reminder',
        body: reminder.reminderName,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      };
      
      if (reminder.isRecurring) {
        // For recurring reminders
        for (const dayOfWeek of reminder.daysOfWeek || []) {
          for (const time of reminder.notificationTimes) {
            const [hours, minutes] = time.split(':').map(Number);
            
            // Calculate next occurrence of this day
            const today = new Date();
            const daysToAdd = (dayOfWeek - today.getDay() + 7) % 7;
            const nextDate = new Date(today);
            nextDate.setDate(today.getDate() + daysToAdd);
            nextDate.setHours(hours, minutes, 0, 0);
            
            // Only schedule if it's in the future
            if (nextDate > today) {
              await Notifications.scheduleNotificationAsync({
                content: notificationContent,
                trigger: {
                  channelId: 'default',
                  date: nextDate,
                },
                identifier: `${selectedReminder?.reminderID || 'new'}-${dayOfWeek}-${time}`,
              });
            }
          }
        }
      } else {
        // For one-time reminders
        for (const time of reminder.notificationTimes) {
          const [hours, minutes] = time.split(':').map(Number);
          
          const scheduledDate = new Date(reminder.date);
          scheduledDate.setHours(hours, minutes, 0, 0);
          
          // Only schedule if it's in the future
          if (scheduledDate > new Date()) {
            await Notifications.scheduleNotificationAsync({
              content: notificationContent,
              trigger: {
                channelId: 'default',
                date: scheduledDate,
              },
              identifier: `${selectedReminder?.reminderID || 'new'}-${time}`,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error scheduling notifications:', error);
    }
  };

  // Handle deleting a reminder
  const handleDeleteReminder = async () => {
    if (!selectedReminder?.reminderID) return;
    
    try {
      // Cancel any scheduled notifications
      try {
        await Notifications.cancelScheduledNotificationAsync(selectedReminder.reminderID);
      } catch (error) {
        console.log('Error canceling notifications:', error);
      }
      
      // Delete the reminder
      await DatabaseService.deleteReminder(selectedReminder.reminderID);
      
      // Reload data
      await loadReminders();
      await loadDailyReminders(selectedDate);
      await loadMarkedDates();
      
      // Close modals
      setShowDeleteConfirmation(false);
      setShowReminderModal(false);
    } catch (error) {
      console.error('Error deleting reminder:', error);
    }
  };

  // Filter reminders based on the active filter
  const filterReminders = () => {
    switch (activeFilter) {
      case 'recurring':
        setFilteredReminders(reminders.filter(reminder => reminder.isRecurring));
        break;
      case 'nonRecurring':
        setFilteredReminders(reminders.filter(reminder => !reminder.isRecurring));
        break;
      case 'all':
      default:
        setFilteredReminders(reminders);
    }
  };

  // Handle filter change
  const handleFilterChange = (filter: 'all' | 'recurring' | 'nonRecurring') => {
    setActiveFilter(filter);
  };

  // Add a function to toggle reminder active status
  const toggleReminderActive = async (reminder: Reminder, e: any) => {
    // Stop event propagation to prevent opening the reminder edit modal
    e.stopPropagation();
    
    if (!reminder.reminderID) return;
    
    try {
      // Toggle the active state
      const newActiveState = !reminder.active;
      
      // Update in database
      await DatabaseService.updateReminder(reminder.reminderID, {
        active: newActiveState
      });
      
      // Update local state by creating a new array with the updated reminder
      setReminders(prevReminders => 
        prevReminders.map(r => 
          r.reminderID === reminder.reminderID 
            ? { ...r, active: newActiveState } 
            : r
        )
      );
      
      // Handle notifications based on the new state
      if (newActiveState) {
        // If activating, schedule notifications
        await scheduleNotifications(reminder);
      } else {
        // If deactivating, cancel notifications
        try {
          if (reminder.reminderID) {
            await Notifications.cancelScheduledNotificationAsync(reminder.reminderID);
          }
        } catch (error) {
          console.log('Error canceling notifications:', error);
        }
      }
    } catch (error) {
      console.error('Error toggling reminder active state:', error);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a1a1a', '#2a1a2a']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>{t('reminders.title')}</Text>
        <Text style={styles.headerSubtitle}>{t('reminders.subtitle')}</Text>
        
        <TouchableOpacity 
          style={styles.calendarButton}
          onPress={() => setShowCalendar(true)}
        >
          <CalendarIcon size={24} color="#9333ea" />
          <Text style={styles.calendarButtonText}>{t('reminders.openCalendar')}</Text>
          <ChevronRight size={20} color="#9333ea" />
        </TouchableOpacity>

        {/* Filter Buttons */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              activeFilter === 'all' && styles.filterButtonActive
            ]}
            onPress={() => handleFilterChange('all')}
          >
            <Text 
              style={[
                styles.filterButtonText,
                activeFilter === 'all' && styles.filterButtonTextActive
              ]}
            >
              {t('reminders.filterAll')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              activeFilter === 'recurring' && styles.filterButtonActive
            ]}
            onPress={() => handleFilterChange('recurring')}
          >
            <Text 
              style={[
                styles.filterButtonText,
                activeFilter === 'recurring' && styles.filterButtonTextActive
              ]}
            >
              {t('reminders.filterRecurring')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              activeFilter === 'nonRecurring' && styles.filterButtonActive
            ]}
            onPress={() => handleFilterChange('nonRecurring')}
          >
            <Text 
              style={[
                styles.filterButtonText,
                activeFilter === 'nonRecurring' && styles.filterButtonTextActive
              ]}
            >
              {t('reminders.filterNonRecurring')}
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#9333ea" />
          <Text style={styles.loadingText}>{t('reminders.loading')}</Text>
        </View>
      ) : (
      <ScrollView style={styles.content}>
          {filteredReminders.length > 0 ? (
            filteredReminders.map(reminder => (
              <TouchableOpacity 
                key={reminder.reminderID} 
                style={styles.reminderCard}
                onPress={() => {
                  setSelectedReminder(reminder);
                  resetForm(reminder);
                  setShowReminderModal(true);
                }}
              >
                <View style={styles.reminderHeader}>
                  <View style={styles.reminderTitleContainer}>
                    <Bell size={20} color="#9333ea" />
                    <Text style={styles.reminderName}>{reminder.reminderName}</Text>
                  </View>
                  
                  <TouchableOpacity
                    style={[
                      styles.activeIndicatorContainer,
                      reminder.active ? styles.activeContainerOn : styles.activeContainerOff
                    ]}
                    onPress={(e) => toggleReminderActive(reminder, e)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.activeIndicator,
                      reminder.active ? styles.activeIndicatorOn : styles.activeIndicatorOff
                    ]} />
                    <Text style={[
                      styles.activeText,
                      reminder.active ? styles.activeTextOn : styles.activeTextOff
                    ]}>
                      {reminder.active ? t('reminders.active') : t('reminders.inactive')}
                    </Text>
                  </TouchableOpacity>
                </View>

                {reminder.isRecurring ? (
                  <View style={styles.daysContainer}>
                    {getDaysAbbreviations().map((day, index) => (
                      <View
                        key={day}
                        style={[
                          styles.dayChip,
                          reminder.daysOfWeek?.includes(index) && styles.dayChipSelected
                        ]}
                      >
                        <Text style={[
                          styles.dayChipText,
                          reminder.daysOfWeek?.includes(index) && styles.dayChipTextSelected
                        ]}>
                          {day}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.dateText}>
                    {new Date(reminder.date).toLocaleDateString()} {t('common.at')} {reminder.time}
                  </Text>
                )}

                <View style={styles.notificationsContainer}>
                  {reminder.notificationTimes.map((time, index) => (
                    <View key={index} style={styles.notificationChip}>
                      <Bell size={14} color="#9333ea" />
                      <Text style={styles.notificationTime}>{time}</Text>
                    </View>
                  ))}
                </View>
                
                <View style={styles.reminderActions}>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      setSelectedReminder(reminder);
                      resetForm(reminder);
                      setShowReminderModal(true);
                    }}
                  >
                    <Edit size={16} color="#9333ea" />
                    <Text style={styles.actionButtonText}>{t('reminders.edit')}</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={(e) => {
                      e.stopPropagation();
                      setSelectedReminder(reminder);
                      setShowDeleteConfirmation(true);
                    }}
                  >
                    <Trash2 size={16} color="#ef4444" />
                    <Text style={styles.deleteButtonText}>{t('reminders.delete')}</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyStateContainer}>
              <Bell size={48} color="#9333ea" opacity={0.5} />
              <Text style={styles.emptyStateText}>{t('reminders.noReminders')}</Text>
              <Text style={styles.emptyStateSubtext}>
                Tap the + button to create a reminder
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Calendar Modal */}
      <Modal
        visible={showCalendar}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCalendar(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.calendarModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('reminders.selectDate')}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowCalendar(false)}
              >
                <X size={20} color="#666666" />
              </TouchableOpacity>
            </View>

            <Calendar
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
                textDayFontSize: 16,
                textMonthFontSize: 18,
                textDayHeaderFontSize: 14
              }}
              onMonthChange={(month: {year: number, month: number}) => {
                const newVisibleMonth = `${month.year}-${String(month.month).padStart(2, '0')}`;
                setCurrentVisibleMonth(newVisibleMonth);
              }}
              current={currentVisibleMonth}
            />
            
            {/* Display reminders for the selected date */}
            <View style={styles.calendarDayReminders}>
              <Text style={styles.calendarDayTitle}>
                {t('reminders.remindersFor', { date: formatDate(selectedDate) })}
              </Text>

              <ScrollView 
                style={styles.calendarDayRemindersList}
                showsVerticalScrollIndicator={false}
              >
                {dailyReminders.length > 0 ? (
                  dailyReminders.map((reminder, index) => (
                    <View key={index} style={styles.calendarDayReminderItem}>
                      <View style={styles.reminderTimeBlock}>
                        <Bell size={16} color="#ef4444" />
                        <Text style={styles.reminderTimeText}>
                          {reminder.time}
                        </Text>
                      </View>
                      <Text style={styles.calendarReminderName}>
                        {reminder.reminderName}
                      </Text>
                    </View>
                  ))
                ) : (
                  <View style={styles.noRemindersMessage}>
                    <Text style={styles.noRemindersText}>
                      {t('reminders.noReminders')}
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create/Edit Reminder Modal */}
      <Modal
        visible={showReminderModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReminderModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, Platform.OS === 'ios' && { height: 'auto' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isEditMode ? t('reminders.editReminder') : t('reminders.newReminder')}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowReminderModal(false)}
              >
                <X size={20} color="#666666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollContent} contentContainerStyle={styles.modalScrollContentContainer}>
              <Text style={styles.inputLabel}>{t('reminders.reminderTitle')}</Text>
              <TextInput
                style={styles.textInput}
                placeholder={t('reminders.reminderTitle')}
                placeholderTextColor="#999999"
                value={reminderName}
                onChangeText={setReminderName}
              />

              <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>{t('reminders.recurringReminder')}</Text>
                <Switch
                  value={isRecurring}
                  onValueChange={setIsRecurring}
                  trackColor={{ false: '#e5e7eb', true: '#9333ea' }}
                  thumbColor={isRecurring ? '#ffffff' : '#f4f3f4'}
                />
              </View>

              {/* Always show date field, for both recurring and non-recurring reminders */}
              <Text style={styles.inputLabel}>{t('reminders.date')}</Text>
              <TouchableOpacity 
                style={styles.datePickerButton}
                onPress={() => {
                  setPickerDate(reminderDate);
                  setShowDatePicker(true);
                }}
              >
                <CalendarIcon size={18} color="#9333ea" />
                <Text style={styles.datePickerButtonText}>
                  {formatLocalDate(reminderDate)}
                </Text>
              </TouchableOpacity>
              
              {showDatePicker && (
                <View>
                  <DateTimePicker
                    testID="dateTimePicker"
                    value={pickerDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, date) => {
                      setShowDatePicker(false);
                      if (date && event.type !== 'dismissed') {
                        setReminderDate(date);
                        setReminderDateInput(formatLocalDate(date));
                        setPickerDate(date);
                      }
                    }}
                    minimumDate={new Date()}
                  />
                  {Platform.OS === 'ios' && (
                    <View style={styles.iosPickerButtonRow}>
                      <TouchableOpacity 
                        style={styles.iosPickerCancelButton}
                        onPress={() => setShowDatePicker(false)}
                      >
                        <Text style={styles.iosPickerButtonText}>{t('reminders.cancel')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.iosPickerDoneButton}
                        onPress={() => setShowDatePicker(false)}
                      >
                        <Text style={styles.iosPickerButtonText}>{t('common.ok')}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              {isRecurring && (
                <View style={styles.recurringContainer}>
                  <Text style={styles.inputLabel}>{t('reminders.selectDays')}</Text>
                  <View style={styles.daysContainer}>
                    {getDaysAbbreviations().map((day, index) => (
                      <TouchableOpacity
                        key={day}
                        style={[
                          styles.dayChip,
                          selectedDays.includes(index) && styles.dayChipSelected
                        ]}
                        onPress={() => toggleDay(index)}
                      >
                        <Text style={[
                          styles.dayChipText,
                          selectedDays.includes(index) && styles.dayChipTextSelected
                        ]}>
                          {day}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              <Text style={styles.inputLabel}>{t('reminders.time')}</Text>
              <TouchableOpacity 
                style={styles.timePickerButton}
                onPress={() => {
                  const timeDate = new Date();
                  const [hours, minutes] = reminderTime.split(':').map(Number);
                  timeDate.setHours(hours, minutes, 0, 0);
                  setPickerDate(timeDate);
                  setShowTimePicker(true);
                }}
              >
                <Clock size={18} color="#9333ea" />
                <Text style={styles.timePickerButtonText}>
                  {reminderTime}
                </Text>
              </TouchableOpacity>
              
              {showTimePicker && (
                <View>
                  <DateTimePicker
                    testID="timeTimePicker"
                    value={pickerDate}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, date) => {
                      setShowTimePicker(false);
                      if (date && event.type !== 'dismissed') {
                        const hours = date.getHours();
                        const minutes = date.getMinutes();
                        setReminderTime(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
                        setPickerDate(date);
                      }
                    }}
                  />
                  {Platform.OS === 'ios' && (
                    <View style={styles.iosPickerButtonRow}>
                      <TouchableOpacity 
                        style={styles.iosPickerCancelButton}
                        onPress={() => setShowTimePicker(false)}
                      >
                        <Text style={styles.iosPickerButtonText}>{t('reminders.cancel')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.iosPickerDoneButton}
                        onPress={() => setShowTimePicker(false)}
                      >
                        <Text style={styles.iosPickerButtonText}>{t('common.ok')}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              <Text style={styles.inputLabel}>{t('reminders.notificationTimes')}</Text>
              {notificationTimes.map((time, index) => (
                <View key={index} style={styles.notificationTimeRow}>
                  <TouchableOpacity 
                    style={styles.notificationTimeButton}
                    onPress={() => {
                      const timeDate = new Date();
                      const [hours, minutes] = time.split(':').map(Number);
                      timeDate.setHours(hours, minutes, 0, 0);
                      setPickerDate(timeDate);
                      setEditingNotificationIndex(index);
                      setShowNotificationTimePicker(true);
                    }}
                  >
                    <Clock size={18} color="#9333ea" />
                    <Text style={styles.notificationTimeText}>{time}</Text>
                  </TouchableOpacity>
                  
                  {notificationTimes.length > 1 && (
                    <TouchableOpacity
                      style={styles.removeTimeButton}
                      onPress={() => removeNotificationTime(index)}
                    >
                      <X size={16} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              
              {showNotificationTimePicker && (
                <View>
                  <DateTimePicker
                    testID="notificationTimePicker"
                    value={pickerDate}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, date) => {
                      setShowNotificationTimePicker(false);
                      if (date && event.type !== 'dismissed' && editingNotificationIndex >= 0) {
                        const hours = date.getHours();
                        const minutes = date.getMinutes();
                        const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                        
                        // Update the notification time at the specified index
                        const newTimes = [...notificationTimes];
                        newTimes[editingNotificationIndex] = timeString;
                        setNotificationTimes(newTimes);
                      }
                      setEditingNotificationIndex(-1);
                    }}
                  />
                  {Platform.OS === 'ios' && (
                    <View style={styles.iosPickerButtonRow}>
                      <TouchableOpacity 
                        style={styles.iosPickerCancelButton}
                        onPress={() => {
                          setShowNotificationTimePicker(false);
                          setEditingNotificationIndex(-1);
                        }}
                      >
                        <Text style={styles.iosPickerButtonText}>{t('reminders.cancel')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.iosPickerDoneButton}
                        onPress={() => {
                          setShowNotificationTimePicker(false);
                        }}
                      >
                        <Text style={styles.iosPickerButtonText}>{t('common.ok')}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              <TouchableOpacity
                style={styles.addTimeButton}
                onPress={addNotificationTime}
              >
                <Plus size={16} color="#9333ea" />
                <Text style={styles.addTimeButtonText}>{t('reminders.addNotificationTime')}</Text>
              </TouchableOpacity>

              <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>{t('reminders.active')}</Text>
                <Switch
                  value={isActive}
                  onValueChange={setIsActive}
                  trackColor={{ false: '#e5e7eb', true: '#9333ea' }}
                  thumbColor={isActive ? '#ffffff' : '#f4f3f4'}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.saveButton, 
                  (!reminderName.trim() || isSubmitting) && styles.saveButtonDisabled
                ]}
                onPress={handleSubmitReminder}
                disabled={!reminderName.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Save size={18} color="#ffffff" />
                    <Text style={styles.saveButtonText}>
                      {isEditMode ? t('reminders.save') : t('reminders.save')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirmation}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirmation(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContent}>
            <Text style={styles.confirmModalTitle}>{t('reminders.deleteConfirmationTitle')}</Text>
            <Text style={styles.confirmModalText}>
              {t('reminders.deleteConfirmation')}
            </Text>
            
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity
                style={[styles.confirmModalButton, styles.confirmModalCancelButton]}
                onPress={() => setShowDeleteConfirmation(false)}
              >
                <Text style={styles.confirmModalCancelText}>{t('reminders.cancel')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.confirmModalButton, styles.confirmModalDeleteButton]}
                onPress={handleDeleteReminder}
              >
                <Text style={styles.confirmModalDeleteText}>{t('reminders.delete')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => {
          resetForm();
          setShowReminderModal(true);
        }}
      >
        <Plus size={24} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    paddingTop: Platform.OS === 'web' ? 20 : 40,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#999999',
    marginBottom: 16,
  },
  calendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(147, 51, 234, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  calendarButtonText: {
    color: '#9333ea',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  reminderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  reminderTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  reminderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  activeIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
    minWidth: 100,
    justifyContent: 'center',
  },
  activeIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#e5e7eb',
  },
  activeIndicatorOn: {
    backgroundColor: '#22c55e',
  },
  activeIndicatorOff: {
    backgroundColor: '#ef4444',
  },
  activeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
  },
  activeTextOn: {
    color: '#22c55e',
  },
  activeTextOff: {
    color: '#ef4444',
  },
  activeContainerOn: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderColor: 'rgba(34, 197, 94, 0.4)',
  },
  activeContainerOff: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  daysContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  dayChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    marginBottom: 4,
  },
  dayChipSelected: {
    backgroundColor: '#9333ea',
  },
  dayChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  dayChipTextSelected: {
    color: '#ffffff',
  },
  dateText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  notificationsContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  notificationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(147, 51, 234, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  notificationTime: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9333ea',
  },
  reminderActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(147, 51, 234, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9333ea',
  },
  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  deleteButtonText: {
    color: '#ef4444',
  },
  addButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#9333ea',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#9333ea',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666666',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Platform.OS === 'ios' ? 10 : 20,
  },
  calendarModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDayReminders: {
    marginTop: 16,
  },
  calendarDayTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  calendarDayRemindersList: {
    maxHeight: 300,
  },
  calendarDayReminderItem: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  reminderTimeBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reminderTimeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
    marginLeft: 8,
  },
  calendarReminderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  noRemindersMessage: {
    padding: 16,
    alignItems: 'center',
  },
  noRemindersText: {
    fontSize: 14,
    color: '#6b7280',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    height: Platform.OS === 'ios' ? '80%' : 'auto',
    maxHeight: Platform.OS === 'ios' ? '80%' : '90%',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  modalScrollContent: {
    flex: Platform.OS === 'ios' ? 1 : undefined,
    maxHeight: Platform.OS === 'ios' ? undefined : '100%',
  },
  modalScrollContentContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: 6,
    marginTop: 12,
  },
  textInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
  },
  recurringContainer: {
    marginTop: 12,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
  },
  datePickerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 8,
  },
  timePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
  },
  timePickerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 8,
  },
  notificationTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  notificationTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(147, 51, 234, 0.1)',
    padding: 12,
    borderRadius: 8,
    gap: 4,
  },
  notificationTimeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9333ea',
  },
  removeTimeButton: {
    padding: 8,
    marginLeft: 8,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#9333ea',
    borderRadius: 8,
    padding: 14,
    marginTop: 24,
    marginBottom: 16,
  },
  saveButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  inputFormat: {
    fontSize: 12,
    fontWeight: 'normal',
    color: '#6b7280',
  },
  confirmModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '90%',
    maxWidth: 350,
    padding: 20,
  },
  confirmModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmModalText: {
    fontSize: 16,
    color: '#4b5563',
    marginBottom: 20,
    textAlign: 'center',
  },
  confirmModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  confirmModalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmModalCancelButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  confirmModalDeleteButton: {
    backgroundColor: '#ef4444',
  },
  confirmModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4b5563',
  },
  confirmModalDeleteText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 6,
  },
  filterButton: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: 'rgba(147, 51, 234, 0.4)',
    borderColor: 'rgba(147, 51, 234, 0.6)',
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    opacity: 0.7,
  },
  filterButtonTextActive: {
    color: '#ffffff',
    opacity: 1,
  },
  addTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(147, 51, 234, 0.1)',
    padding: 12,
    borderRadius: 8,
    gap: 4,
  },
  addTimeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9333ea',
  },
  iosPickerButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  iosPickerCancelButton: {
    padding: 8,
  },
  iosPickerDoneButton: {
    padding: 8,
  },
  iosPickerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9333ea',
  },
});