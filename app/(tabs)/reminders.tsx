import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Modal, TextInput, ActivityIndicator, Switch, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, Calendar as CalendarIcon, Plus, ChevronRight, X, Edit, Trash2, Save, Check, ChevronDown } from 'lucide-react-native';
import { Calendar } from 'react-native-calendars';
import { useAuth } from '@/utils/AuthContext';
import { DatabaseService } from '@/services/database';
import type { Reminder } from '@/types/database';
import { useFocusEffect } from 'expo-router';
import { parseLocalDate, formatLocalDate } from '@/utils/dateUtils';
import * as Notifications from 'expo-notifications';
import { useTranslation } from 'react-i18next';

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
  
  // Delete confirmation
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  // Add new state variables for date dropdown
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  
  // Add new state variables for time pickers
  const [showHourPicker, setShowHourPicker] = useState(false);
  const [showMinutePicker, setShowMinutePicker] = useState(false);
  const [selectedHour, setSelectedHour] = useState<string>('09');
  const [selectedMinute, setSelectedMinute] = useState<string>('00');
  const [hourButtonPosition, setHourButtonPosition] = useState({ pageY: 0, pageX: 0, height: 0 });
  const [minuteButtonPosition, setMinuteButtonPosition] = useState({ pageY: 0, pageX: 0, height: 0 });
  
  // Add a reference to track if we're touching inside the picker
  const pickerRef = useRef<View>(null);
  
  // Add measure position functionality for better dropdown positioning
  const [dayButtonPosition, setDayButtonPosition] = useState({ pageY: 0, pageX: 0, height: 0 });
  const [monthButtonPosition, setMonthButtonPosition] = useState({ pageY: 0, pageX: 0, height: 0 });
  const [yearButtonPosition, setYearButtonPosition] = useState({ pageY: 0, pageX: 0, height: 0 });
  
  const dayButtonRef = useRef<View>(null);
  const monthButtonRef = useRef<View>(null);
  const yearButtonRef = useRef<View>(null);
  
  const hourButtonRef = useRef<View>(null);
  const minuteButtonRef = useRef<View>(null);
  
  const measureButtonPosition = (ref: React.RefObject<View>, setPosition: (position: {pageY: number, pageX: number, height: number}) => void) => {
    if (ref.current) {
      ref.current.measure((_x, _y, _width, height, pageX, pageY) => {
        setPosition({ pageY, pageX, height });
      });
    }
  };
  
  // Helper function to close all pickers
  const closeAllPickers = () => {
    setShowDayPicker(false);
    setShowMonthPicker(false);
    setShowYearPicker(false);
    setShowHourPicker(false);
    setShowMinutePicker(false);
    setNotificationHourPickers(notificationHourPickers.map(() => false));
    setNotificationMinutePickers(notificationMinutePickers.map(() => false));
  };

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

  // Load data when the screen is focused
  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        loadReminders();
        
        // Load reminders for today
        const today = new Date();
        setSelectedDate(today);
        loadDailyReminders(today);
        
        // Load marked dates for calendar
        loadMarkedDates();
      }
    }, [user])
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
    } catch (error) {
      console.error('Error loading reminders:', error);
    } finally {
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
    
    // Set dropdown values for date
    setSelectedDay(date.getDate());
    setSelectedMonth(date.getMonth() + 1);
    setSelectedYear(date.getFullYear());
    
    // Set time values
    const timeValue = reminder?.time || '09:00';
    setReminderTime(timeValue);
    
    // Set dropdown values for time
    const [hour, minute] = timeValue.split(':');
    setSelectedHour(hour);
    setSelectedMinute(minute);
    
    setIsRecurring(reminder?.isRecurring || false);
    setSelectedDays(reminder?.daysOfWeek || []);
    
    // Set notification times
    const notificationTimesArray = reminder?.notificationTimes || ['09:00'];
    setNotificationTimes(notificationTimesArray);
    
    // Set notification time pickers
    const hours: string[] = [];
    const minutes: string[] = [];
    
    notificationTimesArray.forEach((time, index) => {
      const [h, m] = time.split(':');
      hours[index] = h;
      minutes[index] = m;
    });
    
    // Fill remaining slots with default values
    for (let i = notificationTimesArray.length; i < 3; i++) {
      hours[i] = '09';
      minutes[i] = '00';
    }
    
    setNotificationTimeHours(hours);
    setNotificationTimeMinutes(minutes);
    
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
    if (notificationTimes.length < 3) {
      const newTime = `${notificationTimeHours[notificationTimes.length]}:${notificationTimeMinutes[notificationTimes.length]}`;
      setNotificationTimes([...notificationTimes, newTime]);
    }
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

  // Add helper functions for dropdown date selection
  // Get array of days in the current month
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  // Generate days array based on selected month and year
  const getDaysArray = () => {
    const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  };

  // Generate months array (1-12)
  const getMonthsArray = () => {
    return Array.from({ length: 12 }, (_, i) => i + 1);
  };

  // Get month name
  const getMonthName = (monthNum: number) => {
    const date = new Date();
    date.setMonth(monthNum - 1);
    
    // Use the current language from i18n 
    const currentLanguage = i18n.language;
    let locale = currentLanguage;
    
    // Map languages to locales if needed
    if (currentLanguage === 'fr') locale = 'fr-FR';
    else if (currentLanguage === 'en') locale = 'en-US';
    else if (currentLanguage === 'nl') locale = 'nl-NL';
    else if (currentLanguage === 'es') locale = 'es-ES';
    else if (currentLanguage === 'pt') locale = 'pt-PT';
    else if (currentLanguage === 'it') locale = 'it-IT';
    
    return date.toLocaleString(locale, { month: 'long' });
  };

  // Generate years array (current year - 1 to current year + 10)
  const getYearsArray = () => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 12 }, (_, i) => currentYear - 1 + i);
  };

  // Update reminderDate when dropdowns change
  useEffect(() => {
    // Ensure the selected day is valid for the month/year
    const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
    const validDay = Math.min(selectedDay, daysInMonth);
    
    if (validDay !== selectedDay) {
      setSelectedDay(validDay);
    }
    
    // Update the full date with the selected values
    const newDate = new Date(selectedYear, selectedMonth - 1, validDay);
    setReminderDate(newDate);
    setReminderDateInput(formatLocalDate(newDate));
  }, [selectedDay, selectedMonth, selectedYear]);

  // Add helper functions for time picker
  // Generate hours array (00-23)
  const getHoursArray = () => {
    return Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  };

  // Generate minutes array (00-55, increments of 5)
  const getMinutesArray = () => {
    return Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));
  };

  // Add useEffect to update reminderTime when time dropdowns change
  useEffect(() => {
    const newTime = `${selectedHour}:${selectedMinute}`;
    setReminderTime(newTime);
  }, [selectedHour, selectedMinute]);

  const [notificationHourPickers, setNotificationHourPickers] = useState<boolean[]>([false, false, false]);
  const [notificationMinutePickers, setNotificationMinutePickers] = useState<boolean[]>([false, false, false]);
  const [notificationTimeHours, setNotificationTimeHours] = useState<string[]>(['09', '09', '09']);
  const [notificationTimeMinutes, setNotificationTimeMinutes] = useState<string[]>(['00', '00', '00']);
  const [notificationHourPositions, setNotificationHourPositions] = useState<{pageY: number, pageX: number, height: number}[]>([
    { pageY: 0, pageX: 0, height: 0 },
    { pageY: 0, pageX: 0, height: 0 },
    { pageY: 0, pageX: 0, height: 0 }
  ]);
  const [notificationMinutePositions, setNotificationMinutePositions] = useState<{pageY: number, pageX: number, height: number}[]>([
    { pageY: 0, pageX: 0, height: 0 },
    { pageY: 0, pageX: 0, height: 0 },
    { pageY: 0, pageX: 0, height: 0 }
  ]);
  
  const notificationHourRefs = useRef<Array<React.RefObject<View>>>([
    React.createRef<View>(),
    React.createRef<View>(),
    React.createRef<View>()
  ]);
  
  const notificationMinuteRefs = useRef<Array<React.RefObject<View>>>([
    React.createRef<View>(),
    React.createRef<View>(),
    React.createRef<View>()
  ]);

  // Toggle notification hour picker visibility
  const toggleNotificationHourPicker = (index: number) => {
    const newPickers = notificationHourPickers.map((_, i) => i === index);
    setNotificationHourPickers(newPickers);
    setNotificationMinutePickers(notificationMinutePickers.map(() => false));
    
    // Close other pickers
    setShowDayPicker(false);
    setShowMonthPicker(false);
    setShowYearPicker(false);
    setShowHourPicker(false);
    setShowMinutePicker(false);
    
    // Measure button position
    measureButtonPosition(
      notificationHourRefs.current[index],
      (position) => {
        const newPositions = [...notificationHourPositions];
        newPositions[index] = position;
        setNotificationHourPositions(newPositions);
      }
    );
  };
  
  // Toggle notification minute picker visibility
  const toggleNotificationMinutePicker = (index: number) => {
    const newPickers = notificationMinutePickers.map((_, i) => i === index);
    setNotificationMinutePickers(newPickers);
    setNotificationHourPickers(notificationHourPickers.map(() => false));
    
    // Close other pickers
    setShowDayPicker(false);
    setShowMonthPicker(false);
    setShowYearPicker(false);
    setShowHourPicker(false);
    setShowMinutePicker(false);
    
    // Measure button position
    measureButtonPosition(
      notificationMinuteRefs.current[index],
      (position) => {
        const newPositions = [...notificationMinutePositions];
        newPositions[index] = position;
        setNotificationMinutePositions(newPositions);
      }
    );
  };
  
  // Set notification time hour
  const setNotificationTimeHour = (index: number, hour: string) => {
    const newHours = [...notificationTimeHours];
    newHours[index] = hour;
    setNotificationTimeHours(newHours);
    
    // Update notification time
    const newTime = `${hour}:${notificationTimeMinutes[index]}`;
    updateNotificationTime(index, newTime);
    
    // Close picker
    const newPickers = [...notificationHourPickers];
    newPickers[index] = false;
    setNotificationHourPickers(newPickers);
  };
  
  // Set notification time minute
  const setNotificationTimeMinute = (index: number, minute: string) => {
    const newMinutes = [...notificationTimeMinutes];
    newMinutes[index] = minute;
    setNotificationTimeMinutes(newMinutes);
    
    // Update notification time
    const newTime = `${notificationTimeHours[index]}:${minute}`;
    updateNotificationTime(index, newTime);
    
    // Close picker
    const newPickers = [...notificationMinutePickers];
    newPickers[index] = false;
    setNotificationMinutePickers(newPickers);
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
                  {reminder.notificationTimes && reminder.notificationTimes.length > 0 ? (
                    reminder.notificationTimes.map((time, index) => (
                      <View key={index} style={styles.notificationTimeDisplay}>
                        <Bell size={14} color="#ef4444" />
                        <Text style={styles.notificationTimeText}>{time}</Text>
                      </View>
                    ))
                  ) : null}
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
                {t('reminders.createReminderTip')}
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

            <ScrollView
              style={styles.calendarScrollContent}
              showsVerticalScrollIndicator={true}
            >
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
              
              {/* Display reminders for the selected date */}
              <View style={styles.calendarDayReminders}>
                <Text style={styles.calendarDayTitle}>
                  {t('reminders.remindersFor', { date: formatDate(selectedDate) })}
                </Text>

                <ScrollView 
                  style={styles.calendarDayRemindersList}
                  showsVerticalScrollIndicator={true}
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
            </ScrollView>
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
          <View style={styles.modalContent}>
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

            <ScrollView style={styles.modalScrollContent}>
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
              <Text style={styles.inputLabel}>
                {isRecurring ? t('reminders.date') : t('reminders.date')}
              </Text>
              <View style={styles.datePickerContainer}>
                {/* Day Dropdown */}
                <View style={styles.datePickerColumn}>
                  <Text style={styles.datePickerLabel}>{t('common.day')}</Text>
                  <Pressable 
                    ref={dayButtonRef}
                    style={styles.datePickerButton}
                    onPress={() => {
                      measureButtonPosition(dayButtonRef, setDayButtonPosition);
                      setShowDayPicker(true);
                      setShowMonthPicker(false);
                      setShowYearPicker(false);
                    }}
                  >
                    <Text style={styles.datePickerButtonText}>{selectedDay}</Text>
                    <ChevronDown size={16} color="#6b7280" />
                  </Pressable>
                  
                  {showDayPicker && (
                    <Modal
                      transparent={true}
                      visible={showDayPicker}
                      animationType="none"
                      onRequestClose={() => setShowDayPicker(false)}
                    >
                      <Pressable 
                        style={styles.modalOverlay}
                        onPress={() => setShowDayPicker(false)}
                      >
                        <View 
                          style={[
                            styles.pickerDropdown,
                            {
                              position: 'absolute',
                              top: dayButtonPosition.pageY + dayButtonPosition.height + 5,
                              left: dayButtonPosition.pageX,
                              width: '28%',
                              maxHeight: 200,
                              zIndex: 9999,
                            }
                          ]}
                        >
                          <Pressable onPress={(e) => e.stopPropagation()}>
                            <ScrollView style={styles.pickerScrollView}>
                              {getDaysArray().map(day => (
                                <Pressable
                                  key={day}
                                  style={[
                                    styles.pickerItem,
                                    selectedDay === day && styles.pickerItemSelected
                                  ]}
                                  onPress={() => {
                                    setSelectedDay(day);
                                    setShowDayPicker(false);
                                  }}
                                >
                                  <Text style={[
                                    styles.pickerItemText,
                                    selectedDay === day && styles.pickerItemTextSelected
                                  ]}>
                                    {day}
                                  </Text>
                                </Pressable>
                              ))}
                            </ScrollView>
                          </Pressable>
                        </View>
                      </Pressable>
                    </Modal>
                  )}
                </View>
                
                {/* Month Dropdown */}
                <View style={styles.datePickerColumn}>
                  <Text style={styles.datePickerLabel}>{t('common.month')}</Text>
                  <Pressable 
                    ref={monthButtonRef}
                    style={styles.datePickerButton}
                    onPress={() => {
                      measureButtonPosition(monthButtonRef, setMonthButtonPosition);
                      setShowMonthPicker(true);
                      setShowDayPicker(false);
                      setShowYearPicker(false);
                    }}
                  >
                    <Text style={styles.datePickerButtonText}>{getMonthName(selectedMonth)}</Text>
                    <ChevronDown size={16} color="#6b7280" />
                  </Pressable>
                  
                  {showMonthPicker && (
                    <Modal
                      transparent={true}
                      visible={showMonthPicker}
                      animationType="none"
                      onRequestClose={() => setShowMonthPicker(false)}
                    >
                      <Pressable 
                        style={styles.modalOverlay}
                        onPress={() => setShowMonthPicker(false)}
                      >
                        <View 
                          style={[
                            styles.pickerDropdown,
                            {
                              position: 'absolute',
                              top: monthButtonPosition.pageY + monthButtonPosition.height + 5,
                              left: monthButtonPosition.pageX,
                              width: '28%',
                              maxHeight: 200,
                              zIndex: 9999,
                            }
                          ]}
                        >
                          <Pressable onPress={(e) => e.stopPropagation()}>
                            <ScrollView style={styles.pickerScrollView}>
                              {getMonthsArray().map(month => (
                                <Pressable
                                  key={month}
                                  style={[
                                    styles.pickerItem,
                                    selectedMonth === month && styles.pickerItemSelected
                                  ]}
                                  onPress={() => {
                                    setSelectedMonth(month);
                                    setShowMonthPicker(false);
                                  }}
                                >
                                  <Text style={[
                                    styles.pickerItemText,
                                    selectedMonth === month && styles.pickerItemTextSelected
                                  ]}>
                                    {getMonthName(month)}
                                  </Text>
                                </Pressable>
                              ))}
                            </ScrollView>
                          </Pressable>
                        </View>
                      </Pressable>
                    </Modal>
                  )}
                </View>
                
                {/* Year Dropdown */}
                <View style={styles.datePickerColumn}>
                  <Text style={styles.datePickerLabel}>{t('common.year')}</Text>
                  <Pressable 
                    ref={yearButtonRef}
                    style={styles.datePickerButton}
                    onPress={() => {
                      measureButtonPosition(yearButtonRef, setYearButtonPosition);
                      setShowYearPicker(true);
                      setShowDayPicker(false);
                      setShowMonthPicker(false);
                    }}
                  >
                    <Text style={styles.datePickerButtonText}>{selectedYear}</Text>
                    <ChevronDown size={16} color="#6b7280" />
                  </Pressable>
                  
                  {showYearPicker && (
                    <Modal
                      transparent={true}
                      visible={showYearPicker}
                      animationType="none"
                      onRequestClose={() => setShowYearPicker(false)}
                    >
                      <Pressable 
                        style={styles.modalOverlay}
                        onPress={() => setShowYearPicker(false)}
                      >
                        <View 
                          style={[
                            styles.pickerDropdown,
                            {
                              position: 'absolute',
                              top: yearButtonPosition.pageY + yearButtonPosition.height + 5,
                              left: yearButtonPosition.pageX,
                              width: '28%',
                              maxHeight: 200,
                              zIndex: 9999,
                            }
                          ]}
                        >
                          <Pressable onPress={(e) => e.stopPropagation()}>
                            <ScrollView style={styles.pickerScrollView}>
                              {getYearsArray().map(year => (
                                <Pressable
                                  key={year}
                                  style={[
                                    styles.pickerItem,
                                    selectedYear === year && styles.pickerItemSelected
                                  ]}
                                  onPress={() => {
                                    setSelectedYear(year);
                                    setShowYearPicker(false);
                                  }}
                                >
                                  <Text style={[
                                    styles.pickerItemText,
                                    selectedYear === year && styles.pickerItemTextSelected
                                  ]}>
                                    {year}
                                  </Text>
                                </Pressable>
                              ))}
                            </ScrollView>
                          </Pressable>
                        </View>
                      </Pressable>
                    </Modal>
                  )}
                </View>
              </View>

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
              <View style={styles.timePickerContainer}>
                {/* Hour Dropdown */}
                <View style={styles.timePickerColumn}>
                  <Text style={styles.datePickerLabel}>{t('common.hour')}</Text>
                  <Pressable 
                    ref={hourButtonRef}
                    style={styles.datePickerButton}
                    onPress={() => {
                      measureButtonPosition(hourButtonRef, setHourButtonPosition);
                      setShowHourPicker(true);
                      setShowMinutePicker(false);
                      setShowDayPicker(false);
                      setShowMonthPicker(false);
                      setShowYearPicker(false);
                    }}
                  >
                    <Text style={styles.datePickerButtonText}>{selectedHour}</Text>
                    <ChevronDown size={16} color="#6b7280" />
                  </Pressable>
                  
                  {showHourPicker && (
                    <Modal
                      transparent={true}
                      visible={showHourPicker}
                      animationType="none"
                      onRequestClose={() => setShowHourPicker(false)}
                    >
                      <Pressable 
                        style={styles.modalOverlay}
                        onPress={() => setShowHourPicker(false)}
                      >
                        <View 
                          style={[
                            styles.pickerDropdown,
                            {
                              position: 'absolute',
                              top: hourButtonPosition.pageY + hourButtonPosition.height + 5,
                              left: hourButtonPosition.pageX,
                              width: '40%',
                              maxHeight: 200,
                              zIndex: 9999,
                            }
                          ]}
                        >
                          <Pressable onPress={(e) => e.stopPropagation()}>
                            <ScrollView style={styles.pickerScrollView}>
                              {getHoursArray().map(hour => (
                                <Pressable
                                  key={hour}
                                  style={[
                                    styles.pickerItem,
                                    selectedHour === hour && styles.pickerItemSelected
                                  ]}
                                  onPress={() => {
                                    setSelectedHour(hour);
                                    setShowHourPicker(false);
                                  }}
                                >
                                  <Text style={[
                                    styles.pickerItemText,
                                    selectedHour === hour && styles.pickerItemTextSelected
                                  ]}>
                                    {hour}
                                  </Text>
                                </Pressable>
                              ))}
                            </ScrollView>
                          </Pressable>
                        </View>
                      </Pressable>
                    </Modal>
                  )}
                </View>
                
                <Text style={styles.timeSeparator}>:</Text>
                
                {/* Minute Dropdown */}
                <View style={styles.timePickerColumn}>
                  <Text style={styles.datePickerLabel}>{t('common.minute')}</Text>
                  <Pressable 
                    ref={minuteButtonRef}
                    style={styles.datePickerButton}
                    onPress={() => {
                      measureButtonPosition(minuteButtonRef, setMinuteButtonPosition);
                      setShowMinutePicker(true);
                      setShowHourPicker(false);
                      setShowDayPicker(false);
                      setShowMonthPicker(false);
                      setShowYearPicker(false);
                    }}
                  >
                    <Text style={styles.datePickerButtonText}>{selectedMinute}</Text>
                    <ChevronDown size={16} color="#6b7280" />
                  </Pressable>
                  
                  {showMinutePicker && (
                    <Modal
                      transparent={true}
                      visible={showMinutePicker}
                      animationType="none"
                      onRequestClose={() => setShowMinutePicker(false)}
                    >
                      <Pressable 
                        style={styles.modalOverlay}
                        onPress={() => setShowMinutePicker(false)}
                      >
                        <View 
                          style={[
                            styles.pickerDropdown,
                            {
                              position: 'absolute',
                              top: minuteButtonPosition.pageY + minuteButtonPosition.height + 5,
                              left: minuteButtonPosition.pageX,
                              width: '40%',
                              maxHeight: 200,
                              zIndex: 9999,
                            }
                          ]}
                        >
                          <Pressable onPress={(e) => e.stopPropagation()}>
                            <ScrollView style={styles.pickerScrollView}>
                              {getMinutesArray().map(minute => (
                                <Pressable
                                  key={minute}
                                  style={[
                                    styles.pickerItem,
                                    selectedMinute === minute && styles.pickerItemSelected
                                  ]}
                                  onPress={() => {
                                    setSelectedMinute(minute);
                                    setShowMinutePicker(false);
                                  }}
                                >
                                  <Text style={[
                                    styles.pickerItemText,
                                    selectedMinute === minute && styles.pickerItemTextSelected
                                  ]}>
                                    {minute}
                                  </Text>
                                </Pressable>
                              ))}
                            </ScrollView>
                          </Pressable>
                        </View>
                      </Pressable>
                    </Modal>
                  )}
                </View>
              </View>

              {/* Notifications Section */}
              <Text style={styles.inputLabel}>{t('reminders.notifications')}</Text>
              
              {notificationTimes.map((time, index) => (
                <View key={index} style={styles.notificationTimeContainer}>
                  <View style={styles.notificationTimeRow}>
                    <View style={styles.timePickerContainer}>
                      {/* Hour Dropdown */}
                      <View style={styles.timePickerColumn}>
                        <Text style={styles.datePickerLabel}>{t('common.hour')}</Text>
                        <Pressable 
                          ref={notificationHourRefs.current[index]}
                          style={styles.datePickerButton}
                          onPress={() => toggleNotificationHourPicker(index)}
                        >
                          <Text style={styles.datePickerButtonText}>
                            {notificationTimeHours[index]}
                          </Text>
                          <ChevronDown size={16} color="#6b7280" />
                        </Pressable>
                        
                        {notificationHourPickers[index] && (
                          <Modal
                            transparent={true}
                            visible={notificationHourPickers[index]}
                            animationType="none"
                            onRequestClose={() => {
                              const newPickers = [...notificationHourPickers];
                              newPickers[index] = false;
                              setNotificationHourPickers(newPickers);
                            }}
                          >
                            <Pressable 
                              style={styles.modalOverlay}
                              onPress={() => {
                                const newPickers = [...notificationHourPickers];
                                newPickers[index] = false;
                                setNotificationHourPickers(newPickers);
                              }}
                            >
                              <View 
                                style={[
                                  styles.pickerDropdown,
                                  {
                                    position: 'absolute',
                                    top: notificationHourPositions[index].pageY + notificationHourPositions[index].height + 5,
                                    left: notificationHourPositions[index].pageX,
                                    width: '40%',
                                    maxHeight: 200,
                                    zIndex: 9999,
                                  }
                                ]}
                              >
                                <Pressable onPress={(e) => e.stopPropagation()}>
                                  <ScrollView style={styles.pickerScrollView}>
                                    {getHoursArray().map(hour => (
                                      <Pressable
                                        key={hour}
                                        style={[
                                          styles.pickerItem,
                                          notificationTimeHours[index] === hour && styles.pickerItemSelected
                                        ]}
                                        onPress={() => setNotificationTimeHour(index, hour)}
                                      >
                                        <Text style={[
                                          styles.pickerItemText,
                                          notificationTimeHours[index] === hour && styles.pickerItemTextSelected
                                        ]}>
                                          {hour}
                                        </Text>
                                      </Pressable>
                                    ))}
                                  </ScrollView>
                                </Pressable>
                              </View>
                            </Pressable>
                          </Modal>
                        )}
                      </View>
                      
                      <Text style={styles.timeSeparator}>:</Text>
                      
                      {/* Minute Dropdown */}
                      <View style={styles.timePickerColumn}>
                        <Text style={styles.datePickerLabel}>{t('common.minute')}</Text>
                        <Pressable 
                          ref={notificationMinuteRefs.current[index]}
                          style={styles.datePickerButton}
                          onPress={() => toggleNotificationMinutePicker(index)}
                        >
                          <Text style={styles.datePickerButtonText}>
                            {notificationTimeMinutes[index]}
                          </Text>
                          <ChevronDown size={16} color="#6b7280" />
                        </Pressable>
                        
                        {notificationMinutePickers[index] && (
                          <Modal
                            transparent={true}
                            visible={notificationMinutePickers[index]}
                            animationType="none"
                            onRequestClose={() => {
                              const newPickers = [...notificationMinutePickers];
                              newPickers[index] = false;
                              setNotificationMinutePickers(newPickers);
                            }}
                          >
                            <Pressable 
                              style={styles.modalOverlay}
                              onPress={() => {
                                const newPickers = [...notificationMinutePickers];
                                newPickers[index] = false;
                                setNotificationMinutePickers(newPickers);
                              }}
                            >
                              <View 
                                style={[
                                  styles.pickerDropdown,
                                  {
                                    position: 'absolute',
                                    top: notificationMinutePositions[index].pageY + notificationMinutePositions[index].height + 5,
                                    left: notificationMinutePositions[index].pageX,
                                    width: '40%',
                                    maxHeight: 200,
                                    zIndex: 9999,
                                  }
                                ]}
                              >
                                <Pressable onPress={(e) => e.stopPropagation()}>
                                  <ScrollView style={styles.pickerScrollView}>
                                    {getMinutesArray().map(minute => (
                                      <Pressable
                                        key={minute}
                                        style={[
                                          styles.pickerItem,
                                          notificationTimeMinutes[index] === minute && styles.pickerItemSelected
                                        ]}
                                        onPress={() => setNotificationTimeMinute(index, minute)}
                                      >
                                        <Text style={[
                                          styles.pickerItemText,
                                          notificationTimeMinutes[index] === minute && styles.pickerItemTextSelected
                                        ]}>
                                          {minute}
                                        </Text>
                                      </Pressable>
                                    ))}
                                  </ScrollView>
                                </Pressable>
                              </View>
                            </Pressable>
                          </Modal>
                        )}
                      </View>
                    </View>
                    
                    {notificationTimes.length > 1 && (
                      <TouchableOpacity
                        style={styles.removeNotificationButton}
                        onPress={() => removeNotificationTime(index)}
                      >
                        <X size={16} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
              
              {notificationTimes.length < 3 && (
                <TouchableOpacity
                  style={styles.addNotificationButton}
                  onPress={addNotificationTime}
                >
                  <Plus size={16} color="#9333ea" />
                  <Text style={styles.addNotificationText}>
                    {t('reminders.addNotificationTime')}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Toggle for Active/Inactive */}
              <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>{t('reminders.active')}</Text>
                <Switch
                  value={isActive}
                  onValueChange={setIsActive}
                  trackColor={{ false: '#e5e7eb', true: '#9333ea' }}
                  thumbColor={isActive ? '#ffffff' : '#f4f3f4'}
                />
              </View>
              
              {/* Save Button */}
              <TouchableOpacity
                style={[styles.saveButton, isSubmitting && styles.disabledButton]}
                onPress={handleSubmitReminder}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.saveButtonText}>{t('common.save')}</Text>
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
        animationType="slide"
        onRequestClose={() => setShowDeleteConfirmation(false)}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalContent}>
            <Text style={styles.confirmModalTitle}>{t('reminders.deleteConfirmationTitle')}</Text>
            <Text style={styles.confirmModalText}>{t('reminders.deleteConfirmation')}</Text>
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity
                style={styles.confirmModalCancelButton}
                onPress={() => setShowDeleteConfirmation(false)}
              >
                <Text style={styles.confirmModalCancelText}>{t('reminders.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmModalDeleteButton}
                onPress={handleDeleteReminder}
              >
                <Text style={styles.confirmModalDeleteText}>{t('reminders.delete')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add button */}
      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => {
          resetForm();
          setIsEditMode(false);
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
  notificationTimeContainer: {
    marginBottom: 16,
  },
  notificationTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  removeNotificationButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    marginLeft: 8,
  },
  addNotificationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(147, 51, 234, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  addNotificationText: {
    color: '#9333ea',
    marginLeft: 8,
    fontWeight: '500',
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
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
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
    maxHeight: 150,
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
    maxHeight: '90%',
    margin: 20,
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
  modalScrollContent: {
    flexGrow: 1,
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
  datePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  datePickerColumn: {
    flex: 1,
    position: 'relative',
  },
  datePickerLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  datePickerButton: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  datePickerButtonText: {
    fontSize: 16,
    color: '#1f2937',
  },
  pickerDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    marginTop: 4,
    zIndex: 9999,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    maxHeight: 160,
  },
  pickerScrollView: {
    maxHeight: 200,
    backgroundColor: '#ffffff',
  },
  pickerItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#ffffff',
  },
  pickerItemSelected: {
    backgroundColor: 'rgba(147, 51, 234, 0.1)',
  },
  pickerItemText: {
    fontSize: 14,
    color: '#4b5563',
  },
  pickerItemTextSelected: {
    color: '#9333ea',
    fontWeight: '600',
  },
  timePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  timePickerColumn: {
    flex: 1,
    position: 'relative',
  },
  timeSeparator: {
    fontSize: 24,
    color: '#4b5563',
    marginBottom: 10,
    paddingHorizontal: 5,
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
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
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
  saveButton: {
    backgroundColor: '#9333ea',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
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
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  disabledButton: {
    backgroundColor: '#e5e7eb',
  },
  notificationTimeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTimeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ef4444',
    marginLeft: 4,
  },
});