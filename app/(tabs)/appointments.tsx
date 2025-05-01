import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Modal, TextInput, ActivityIndicator, FlatList, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar as CalendarIcon, Clock, MapPin, Bell, Plus, ChevronRight, X, Edit, Trash2, ChevronLeft, Calendar as TodayIcon, ChevronDown, Check } from 'lucide-react-native';
import { Calendar } from 'react-native-calendars';
import { useAuth } from '@/utils/AuthContext';
import { DatabaseService } from '@/services/database';
import type { Appointment } from '@/types/database';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';

export default function AppointmentsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [dailyAppointments, setDailyAppointments] = useState<Appointment[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]); // Store upcoming appointments
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [displayDate, setDisplayDate] = useState(new Date()); // Separate state for the main view
  const [showCalendar, setShowCalendar] = useState(false);
  const [markedDates, setMarkedDates] = useState<Record<string, any>>({});
  const [currentHour, setCurrentHour] = useState(new Date().getHours());
  const processedAppointmentIds = React.useRef<Set<string>>(new Set());
  const timelineScrollRef = React.useRef<ScrollView>(null); // Ref for the scrollview
  
  // Modal states
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showAppointmentDetails, setShowAppointmentDetails] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Form states
  const [appointmentName, setAppointmentName] = useState('');
  const [appointmentDescription, setAppointmentDescription] = useState('');
  const [appointmentDate, setAppointmentDate] = useState(new Date());
  const [appointmentDateInput, setAppointmentDateInput] = useState('');
  const [appointmentStartTime, setAppointmentStartTime] = useState('09:00');
  const [appointmentEndTime, setAppointmentEndTime] = useState('10:00');
  const [appointmentAddress, setAppointmentAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Delete confirmation
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  
  // Show more in home
  const [expandedInHome, setExpandedInHome] = useState(false);

  // New state for notification times
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [showNotificationPicker, setShowNotificationPicker] = useState(false);
  
  // Predefined notification options
  const notificationOptions = [
    { label: t('appointments.notificationOptions.fifteenMinutes'), value: '15min' },
    { label: t('appointments.notificationOptions.oneHour'), value: '1h' },
    { label: t('appointments.notificationOptions.threeHours'), value: '3h' },
    { label: t('appointments.notificationOptions.oneDay'), value: '1d' },
    { label: t('appointments.notificationOptions.twoDays'), value: '2d' },
  ];

  // 1. Add state to track the visible month
  const formatLocalDate = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  // Add back parseLocalDate function
  // Ensure date parsing is timezone-aware
  const parseLocalDate = (dateString: string): Date => {
    // Parse a YYYY-MM-DD date string to a Date object in the local timezone
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date;
  };

  // Track the currently visible month in the calendar
  const [currentVisibleMonth, setCurrentVisibleMonth] = useState(formatLocalDate(new Date()).substring(0, 7)); // YYYY-MM format

  // Add effect to load marked dates when month changes
  useEffect(() => {
    if (showCalendar && user) {
      console.log('Month changed, loading marks for:', currentVisibleMonth);
      
      // Use requestAnimationFrame instead of setTimeout to ensure better timing
      const rafId = requestAnimationFrame(() => {
        loadMarkedDates(currentVisibleMonth);
      });
      
      return () => cancelAnimationFrame(rafId);
    }
  }, [currentVisibleMonth, user, showCalendar]);

  // Update resetForm to use the formatLocalDate function
  const resetForm = (appointment?: Appointment | null) => {
    setAppointmentName(appointment?.appointmentName || '');
    setAppointmentDescription(appointment?.description || '');
    setAppointmentAddress(appointment?.address || '');
    
    const date = appointment?.date ? new Date(appointment.date) : new Date();
    setAppointmentDate(date);
    setAppointmentDateInput(formatLocalDate(date));
    
    // Set dropdown values for date
    setSelectedDay(date.getDate());
    setSelectedMonth(date.getMonth() + 1);
    setSelectedYear(date.getFullYear());
    
    // Set dropdown values for start time
    const startTime = appointment?.startTime || '09:00';
    setAppointmentStartTime(startTime);
    const [startHour, startMinute] = startTime.split(':');
    setSelectedStartHour(startHour);
    setSelectedStartMinute(startMinute);
    
    // Set dropdown values for end time
    const endTime = appointment?.endTime || '10:00';
    setAppointmentEndTime(endTime);
    const [endHour, endMinute] = endTime.split(':');
    setSelectedEndHour(endHour);
    setSelectedEndMinute(endMinute);
    
    // Reset notification times
    setSelectedNotifications(
      appointment?.notificationTimes 
        ? convertNotificationTimesToOptions(appointment.notificationTimes, appointment.date) 
        : []
    );
    
    setIsEditMode(!!appointment);
    
    if (appointment?.appointmentID) {
      setSelectedAppointment(appointment);
    } else {
      setSelectedAppointment(null);
    }
  };

  // Update the useEffect that sets appointmentDateInput
  useEffect(() => {
    setAppointmentDateInput(formatLocalDate(appointmentDate));
  }, [appointmentDate]);

  // Update time tracker
  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentHour(new Date().getHours());
    }, 60000); // Update every minute
    
    return () => clearInterval(intervalId);
  }, []);

  // Load upcoming appointments (future dates)
  const loadUpcomingAppointments = async () => {
    if (!user) return;
    
    try {
      // Set to beginning of today to include all of today's appointments
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Get future appointments including today's appointments
      const futureAppointments = await DatabaseService.getUserAppointments(user.uid, {
        startDate: today,
        limit: 50 // Increased limit to get more appointments
      });
      
      // Sort by date and time
      futureAppointments.sort((a, b) => {
        // First compare by date
        const dateComparison = new Date(a.date).getTime() - new Date(b.date).getTime();
        if (dateComparison !== 0) return dateComparison;
        
        // If same date, compare by start time
        return a.startTime.localeCompare(b.startTime);
      });
      
      setUpcomingAppointments(futureAppointments);
    } catch (error) {
      console.error('Error loading upcoming appointments:', error);
      setUpcomingAppointments([]);
    }
  };

  // Load data when the screen is focused
  useFocusEffect(
    React.useCallback(() => {
      const loadData = async () => {
        if (user) {
          loadAppointments();
          
          // Always load today's appointments for the main view
          const today = new Date();
          setDisplayDate(today);
          loadDailyAppointments(today);
          
          // Load upcoming appointments
          loadUpcomingAppointments();
          
          // Always reload marked dates when focused
          loadMarkedDates();
          
          // Scroll to current time when tab is focused
          scrollToCurrentTime();
          
          // Check if we need to open an appointment for editing
          try {
            const editId = await AsyncStorage.getItem('editAppointmentId');
            if (editId && !processedAppointmentIds.current.has(editId)) {
              // Mark this ID as processed to prevent infinite loops
              processedAppointmentIds.current.add(editId);
              // Clear the storage to avoid repeat processing
              await AsyncStorage.removeItem('editAppointmentId');
              // Handle the edit
              handleEditAppointment(editId);
            }
          } catch (error) {
            console.error('Error checking for appointment to edit:', error);
          }
        }
      };
      
      loadData();
      
      return () => {
        // No need to clear processedAppointmentIds on each unfocus
        // Only want to clear when completely leaving the screen
      };
    }, [user])
  );

  // Clear processedAppointmentIds when component unmounts
  useEffect(() => {
    return () => {
      processedAppointmentIds.current.clear();
    };
  }, []);

  const loadAppointments = async () => {
    try {
      setIsLoading(true);
      if (!user) return;
      
      const userAppointments = await DatabaseService.getUserAppointments(user.uid);
      setAppointments(userAppointments);
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDailyAppointments = async (date: Date) => {
    if (!user) return;
    
    try {
      const appointments = await DatabaseService.getAppointmentsByDate(user.uid, date);
      setDailyAppointments(appointments);
    } catch (error) {
      console.error('Error loading daily appointments:', error);
    }
  };

  // 2. Update loadMarkedDates to use the current visible month instead of selectedDate
  const loadMarkedDates = async (visibleMonth?: string) => {
    if (!user) return;
    
    try {
      // Always start with a clean slate for marked dates
      setMarkedDates({});
      
      // Use provided month or current visible month
      const monthToLoad = visibleMonth || currentVisibleMonth;
      console.log('Loading marked dates for month:', monthToLoad);
      
      // Parse the month string (YYYY-MM) to create first and last day
      const [year, month] = monthToLoad.split('-').map(Number);
      const firstDay = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0); // Last day of the month
      
      console.log('Loading marked dates from', formatLocalDate(firstDay), 'to', formatLocalDate(lastDay));
      
      // Get all dates with appointments
      const dates = await DatabaseService.getDatesWithAppointments(user.uid, firstDay, lastDay);
      
      console.log('Received dates with appointments:', dates.map(formatLocalDate));
      
      // Create a new object instead of modifying the existing one
      const markedDatesObj: Record<string, any> = {};
      
      // Mark dates with dots
      dates.forEach(date => {
        const dateString = formatLocalDate(date);
        console.log('Marking date:', dateString);
        markedDatesObj[dateString] = { 
          marked: true, 
          dotColor: '#9333ea'
        };
      });
      
      // Also mark the selected date
      const selectedDateString = formatLocalDate(selectedDate);
      markedDatesObj[selectedDateString] = { 
        ...(markedDatesObj[selectedDateString] || {}),
        selected: true, 
        selectedColor: '#9333ea',
        marked: markedDatesObj[selectedDateString]?.marked || false,
        dotColor: '#ffffff'
      };
      
      console.log('Final marked dates:', Object.keys(markedDatesObj).sort());
      setMarkedDates(markedDatesObj);
    } catch (error) {
      console.error('Error loading marked dates:', error);
    }
  };

  // Fix handleDayPress to preserve dots when selecting dates
  const handleDayPress = (day: any) => {
    // Convert the selected date string to a Date object
    const newSelectedDate = parseLocalDate(day.dateString);
    
    // Update the selected date for the calendar
    setSelectedDate(newSelectedDate);
    
    // Also update the display date when selecting from calendar
    setDisplayDate(newSelectedDate);
    
    // Update the current visible month to match the clicked date
    // This prevents jumping between months when clicking on a date
    const clickedMonth = day.dateString.substring(0, 7); // YYYY-MM format
    if (clickedMonth !== currentVisibleMonth) {
      console.log(`Month changed by day press: ${currentVisibleMonth} -> ${clickedMonth}`);
      setCurrentVisibleMonth(clickedMonth);
    }
    
    // Only load the appointments for the selected date for the calendar popup
    if (user) {
      DatabaseService.getAppointmentsByDate(user.uid, newSelectedDate)
        .then(appointments => {
          // Update dailyAppointments
          setDailyAppointments(appointments);
        })
        .catch(error => {
          console.error('Error loading selected date appointments:', error);
        });
    }
    
    // Update marked dates to show the new selection while preserving dots
    const newMarkedDates = { ...markedDates };
    
    // Remove previous selection highlight (but KEEP the dots!)
    Object.keys(newMarkedDates).forEach(dateString => {
      if (newMarkedDates[dateString]?.selected) {
        // Keep the 'marked' and 'dotColor' properties if they exist
        const { selected, selectedColor, ...rest } = newMarkedDates[dateString];
        newMarkedDates[dateString] = rest;
      }
    });
    
    // Add new selection
    newMarkedDates[day.dateString] = { 
      ...(newMarkedDates[day.dateString] || {}), // Keep existing properties
      selected: true, 
      selectedColor: '#9333ea',
    };
    
    setMarkedDates(newMarkedDates);
  };

  // Add function to navigate to previous day
  const goToPreviousDay = () => {
    const prevDay = new Date(displayDate);
    prevDay.setDate(prevDay.getDate() - 1);
    setDisplayDate(prevDay);
    setSelectedDate(prevDay);
    
    if (user) {
      // Load appointments for the previous day
      DatabaseService.getAppointmentsByDate(user.uid, prevDay)
        .then(appointments => {
          setDailyAppointments(appointments);
        })
        .catch(error => {
          console.error('Error loading previous day appointments:', error);
        });
    }
  };

  // Add function to navigate to next day
  const goToNextDay = () => {
    const nextDay = new Date(displayDate);
    nextDay.setDate(nextDay.getDate() + 1);
    setDisplayDate(nextDay);
    setSelectedDate(nextDay);
    
    if (user) {
      // Load appointments for the next day
      DatabaseService.getAppointmentsByDate(user.uid, nextDay)
        .then(appointments => {
          setDailyAppointments(appointments);
        })
        .catch(error => {
          console.error('Error loading next day appointments:', error);
        });
    }
  };

  // Add function to go to today
  const goToToday = () => {
    const today = new Date();
    setDisplayDate(today);
    setSelectedDate(today);
    
    if (user) {
      // Load appointments for today
      DatabaseService.getAppointmentsByDate(user.uid, today)
        .then(appointments => {
          setDailyAppointments(appointments);
        })
        .catch(error => {
          console.error('Error loading today\'s appointments:', error);
        });
    }
    
    // Scroll to current time when going to today
    scrollToCurrentTime();
  };

  const formatDate = (date: Date) => {
    // Format dates in a consistent way across the app
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

  const formatShortDate = (date: Date) => {
    // Format dates in a shorter format for the upcoming list
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
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

  const formatTime = (time: string) => {
    return time;
  };

  // Handle opening an appointment for editing
  const handleEditAppointment = async (appointmentId: string) => {
    try {
      if (!user) return;
      
      // Find the appointment in the existing list or load it
      let appointmentToEdit = appointments.find(a => a.appointmentID === appointmentId);
      
      if (!appointmentToEdit && user) {
        // Need to load all appointments to find the one to edit
        const userAppointments = await DatabaseService.getUserAppointments(user.uid);
        appointmentToEdit = userAppointments.find(a => a.appointmentID === appointmentId);
        
        if (appointmentToEdit) {
          setAppointments(userAppointments);
        }
      }
      
      if (appointmentToEdit) {
        setSelectedAppointment(appointmentToEdit);
        resetForm(appointmentToEdit);
        setShowAppointmentModal(true);
        
        // Also set selected date to the appointment date
        const appointmentDate = new Date(appointmentToEdit.date);
        setSelectedDate(appointmentDate);
        loadDailyAppointments(appointmentDate);
      }
    } catch (error) {
      console.error('Error handling appointment edit:', error);
    }
  };

  // Scroll to the current time
  const scrollToCurrentTime = () => {
    // Add a small delay to ensure the ScrollView is mounted
    setTimeout(() => {
      if (timelineScrollRef.current) {
        // Calculate position based on current time
        const now = new Date();
        const hour = now.getHours();
        const minutes = now.getMinutes();
        const position = (hour * 60 + minutes) - 120; // Scroll to position 2 hours before current time
        
        // Ensure we don't scroll to negative values
        timelineScrollRef.current.scrollTo({ 
          y: Math.max(0, position), 
          animated: true 
        });
      }
    }, 300);
  };

  // Update loadAppointmentsByDate to use the currentVisibleMonth
  const loadAppointmentsByDate = async () => {
    try {
      setIsLoading(true);
      // Extract year and month from currentVisibleMonth (format: YYYY-MM)
      const [year, month] = currentVisibleMonth.split('-').map(Number);
      
      if (!user) {
        console.log('No user logged in');
        setIsLoading(false);
        return;
      }

      // Get appointments for the entire month
      // Since getAppointmentsByDate only accepts a single date, we need to modify our approach
      // We'll use the getDatesWithAppointments function instead to get dates with appointments
      const startOfMonth = new Date(year, month - 1, 1); // Start of month
      const endOfMonth = new Date(year, month, 0);       // End of month
      
      // Get all dates with appointments
      const datesWithAppointments = await DatabaseService.getDatesWithAppointments(
        user.uid,
        startOfMonth,
        endOfMonth
      );

      // Update markedDates
      const newMarkedDates: {[key: string]: {marked: boolean, dotColor: string}} = {};
      datesWithAppointments.forEach((date: Date) => {
        const dateString = formatLocalDate(date);
        newMarkedDates[dateString] = { marked: true, dotColor: '#9333ea' };
      });

      setMarkedDates(newMarkedDates);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading appointments by date:', error);
      setIsLoading(false);
    }
  };

  // Add effect to refresh calendar when it's opened
  useEffect(() => {
    if (showCalendar && user) {
      // Clear cache and marks, then fetch fresh data when calendar opens
      DatabaseService.clearAppointmentCache();
      setMarkedDates({});
      loadMarkedDates(currentVisibleMonth);
    }
  }, [showCalendar, user]);

  // Add this utility function at the top with other utility functions
  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  };

  // Helper function to convert Date objects to option values
  const convertNotificationTimesToOptions = (notificationTimes: Date[], appointmentDate: Date): string[] => {
    if (!notificationTimes || notificationTimes.length === 0) return [];
    
    // The appointment date/time
    const appointmentDateTime = new Date(appointmentDate);
    const [hours, minutes] = appointmentStartTime.split(':').map(Number);
    appointmentDateTime.setHours(hours, minutes, 0, 0);
    
    return notificationTimes.map(notifTime => {
      // Calculate time difference in minutes
      const diffMs = appointmentDateTime.getTime() - notifTime.getTime();
      const diffMinutes = Math.round(diffMs / 60000);
      
      if (diffMinutes === 15) return '15min';
      if (diffMinutes === 60) return '1h';
      if (diffMinutes === 180) return '3h';
      if (diffMinutes === 1440) return '1d';
      if (diffMinutes === 2880) return '2d';
      
      // Default fallback
      return '1h';
    });
  };
  
  // Function to convert option values to Date objects
  const convertOptionsToNotificationTimes = (options: string[], appointmentDate: Date): Date[] => {
    // Create a date object with the appointment date and time
    const appointmentDateTime = new Date(appointmentDate);
    const [hours, minutes] = appointmentStartTime.split(':').map(Number);
    appointmentDateTime.setHours(hours, minutes, 0, 0);
    
    return options.map(option => {
      const notifTime = new Date(appointmentDateTime);
      
      // Subtract the appropriate amount of time based on the option
      switch (option) {
        case '15min':
          notifTime.setMinutes(notifTime.getMinutes() - 15);
          break;
        case '1h':
          notifTime.setHours(notifTime.getHours() - 1);
          break;
        case '3h':
          notifTime.setHours(notifTime.getHours() - 3);
          break;
        case '1d':
          notifTime.setDate(notifTime.getDate() - 1);
          break;
        case '2d':
          notifTime.setDate(notifTime.getDate() - 2);
          break;
      }
      
      return notifTime;
    });
  };

  // Toggle a notification option
  const toggleNotificationOption = (value: string) => {
    setSelectedNotifications(prevSelected => {
      // If already selected, remove it
      if (prevSelected.includes(value)) {
        return prevSelected.filter(option => option !== value);
      } 
      
      // If we already have 3 selected, don't add more
      if (prevSelected.length >= 3) {
        return prevSelected;
      }
      
      // Add the new option
      return [...prevSelected, value];
    });
  };

  // Function to get display text for selected notifications
  const getNotificationDisplayText = () => {
    if (selectedNotifications.length === 0) {
      return t('appointments.noNotifications');
    }
    
    return selectedNotifications.map(value => {
      const option = notificationOptions.find(opt => opt.value === value);
      return option?.label || value;
    }).join(', ');
  };

  // Add new state variables for the date dropdown
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Add measure position functionality for better dropdown positioning
  const [dayButtonPosition, setDayButtonPosition] = useState({ pageY: 0, pageX: 0, height: 0 });
  const [monthButtonPosition, setMonthButtonPosition] = useState({ pageY: 0, pageX: 0, height: 0 });
  const [yearButtonPosition, setYearButtonPosition] = useState({ pageY: 0, pageX: 0, height: 0 });
  
  const dayButtonRef = useRef<View>(null);
  const monthButtonRef = useRef<View>(null);
  const yearButtonRef = useRef<View>(null);
  
  const measureButtonPosition = (ref: React.RefObject<View>, setPosition: (position: {pageY: number, pageX: number, height: number}) => void) => {
    if (ref.current) {
      ref.current.measure((_x, _y, _width, height, pageX, pageY) => {
        setPosition({ pageY, pageX, height });
      });
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
    
    return date.toLocaleString(locale, { month: 'long' });
  };

  // Generate years array (current year - 1 to current year + 10)
  const getYearsArray = () => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 12 }, (_, i) => currentYear - 1 + i);
  };

  // Update appointmentDate when dropdowns change
  useEffect(() => {
    // Ensure the selected day is valid for the month/year
    const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
    const validDay = Math.min(selectedDay, daysInMonth);
    
    if (validDay !== selectedDay) {
      setSelectedDay(validDay);
    }
    
    // Update the full date with the selected values
    const newDate = new Date(selectedYear, selectedMonth - 1, validDay);
    setAppointmentDate(newDate);
    setAppointmentDateInput(formatLocalDate(newDate));
  }, [selectedDay, selectedMonth, selectedYear]);

  // Add a reference to track if we're touching inside the picker
  const pickerRef = useRef<View>(null);
  
  // Helper function to close all pickers
  const closeAllPickers = () => {
    setShowDayPicker(false);
    setShowMonthPicker(false);
    setShowYearPicker(false);
    setShowStartHourPicker(false);
    setShowStartMinutePicker(false);
    setShowEndHourPicker(false);
    setShowEndMinutePicker(false);
  };

  // Add new state variables for time pickers
  const [showStartHourPicker, setShowStartHourPicker] = useState(false);
  const [showStartMinutePicker, setShowStartMinutePicker] = useState(false);
  const [selectedStartHour, setSelectedStartHour] = useState<string>('09');
  const [selectedStartMinute, setSelectedStartMinute] = useState<string>('00');
  const [startHourButtonPosition, setStartHourButtonPosition] = useState({ pageY: 0, pageX: 0, height: 0 });
  const [startMinuteButtonPosition, setStartMinuteButtonPosition] = useState({ pageY: 0, pageX: 0, height: 0 });
  
  const [showEndHourPicker, setShowEndHourPicker] = useState(false);
  const [showEndMinutePicker, setShowEndMinutePicker] = useState(false);
  const [selectedEndHour, setSelectedEndHour] = useState<string>('10');
  const [selectedEndMinute, setSelectedEndMinute] = useState<string>('00');
  const [endHourButtonPosition, setEndHourButtonPosition] = useState({ pageY: 0, pageX: 0, height: 0 });
  const [endMinuteButtonPosition, setEndMinuteButtonPosition] = useState({ pageY: 0, pageX: 0, height: 0 });
  
  const startHourButtonRef = useRef<View>(null);
  const startMinuteButtonRef = useRef<View>(null);
  const endHourButtonRef = useRef<View>(null);
  const endMinuteButtonRef = useRef<View>(null);

  // Add helper functions for time picker
  // Generate hours array (00-23)
  const getHoursArray = () => {
    return Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  };

  // Generate minutes array (00-55, increments of 5)
  const getMinutesArray = () => {
    return Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));
  };

  // Add useEffect to update times when dropdown values change
  useEffect(() => {
    const newStartTime = `${selectedStartHour}:${selectedStartMinute}`;
    setAppointmentStartTime(newStartTime);
  }, [selectedStartHour, selectedStartMinute]);

  useEffect(() => {
    const newEndTime = `${selectedEndHour}:${selectedEndMinute}`;
    setAppointmentEndTime(newEndTime);
  }, [selectedEndHour, selectedEndMinute]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a1a1a', '#2a1a2a']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>{t('appointments.title')}</Text>
        <Text style={styles.headerSubtitle}>{t('appointments.subtitle')}</Text>

        <TouchableOpacity 
          style={styles.calendarButton}
          onPress={() => {
            // Clear cache before showing calendar
            DatabaseService.clearAppointmentCache();
            setShowCalendar(true);
          }}
        >
          <CalendarIcon size={24} color="#9333ea" />
          <Text style={styles.calendarButtonText}>{t('appointments.selectDate')}</Text>
          <ChevronRight size={20} color="#9333ea" />
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.dayCalendarContainer}>
        <View style={styles.dayHeader}>
          <View style={styles.dayHeaderControls}>
            <TouchableOpacity 
              style={styles.dayNavigationButton}
              onPress={goToPreviousDay}
            >
              <ChevronLeft size={20} color="#6b7280" />
            </TouchableOpacity>
            
            <View style={styles.dayHeaderDateContainer}>
              <Text style={styles.dayHeaderDate}>{formatDate(displayDate)}</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.dayNavigationButton}
              onPress={goToNextDay}
            >
              <ChevronRight size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={styles.todayButton}
            onPress={goToToday}
          >
            <TodayIcon size={16} color="#9333ea" />
            <Text style={styles.todayButtonText}>{t('common.today')}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.timelineContainer}
          showsVerticalScrollIndicator={false}
          ref={timelineScrollRef}
        >
          {Array.from({ length: 24 }).map((_, hour) => (
            <View key={hour} style={styles.timeSlot}>
              <Text style={styles.timeLabel}>{hour.toString().padStart(2, '0')}:00</Text>
              <View style={styles.timeSlotContent}>
                {/* Group appointments by start hour to handle multiple appointments at the same time */}
                {(() => {
                  // Get appointments that start in this hour
                  const hourAppointments = dailyAppointments.filter(appointment => {
                    const [startHour] = appointment.startTime.split(':').map(Number);
                    return startHour === hour;
                  });

                  // If no appointments in this hour, return null
                  if (hourAppointments.length === 0) return null;

                  // Calculate the width for each appointment based on how many are in this time slot
                  const appointmentWidth = 100 / Math.min(hourAppointments.length, 3); // Max 3 side by side

                  return hourAppointments.map((appointment, index) => {
                    // Calculate the height based on the appointment duration
                    const [startHour, startMinute] = appointment.startTime.split(':').map(Number);
                    const [endHour, endMinute] = appointment.endTime.split(':').map(Number);
                    
                    // Calculate total minutes for height
                    const durationInMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
                    const heightInPixels = Math.max(56, durationInMinutes); // Minimum height of 56px
                    
                    // Calculate the top offset based on start minute (1 minute = 1 pixel)
                    const topOffset = startMinute;

                    return (
                      <TouchableOpacity 
                        key={index}
                        style={[
                          styles.appointmentBlock,
                          {
                            height: heightInPixels,
                            width: `${appointmentWidth}%`,
                            left: `${appointmentWidth * (index % 3)}%`,
                            top: topOffset, // Position vertically based on minutes
                            zIndex: 10 - index, // Higher index items go behind lower index items
                          }
                        ]}
                        onPress={() => {
                          setSelectedAppointment(appointment);
                          setShowAppointmentDetails(true);
                        }}
                      >
                        <Text style={styles.appointmentBlockTitle} numberOfLines={2}>
                          {appointment.appointmentName}
                        </Text>
                        <Text style={styles.appointmentBlockTime}>
                          {appointment.startTime} - {appointment.endTime}
                        </Text>
                      </TouchableOpacity>
                    );
                  });
                })()}
              </View>
            </View>
          ))}
          
          {/* Current time indicator - only show for current day */}
          {isToday(displayDate) && (
            <View 
              style={[
                styles.currentTimeIndicator, 
                { top: currentHour * 60 + (new Date().getMinutes()) }
              ]}
            >
              <View style={styles.currentTimeDot} />
              <View style={styles.currentTimeLine} />
            </View>
          )}
        </ScrollView>
      </View>

      {/* Upcoming Appointments List */}
      <View style={styles.upcomingAppointmentsContainer}>
        <View style={styles.upcomingHeader}>
          <Text style={styles.upcomingTitle}>{t('appointments.upcomingAppointments')}</Text>
        </View>
        
        <ScrollView style={styles.upcomingList}>
          {upcomingAppointments.length > 0 ? (
            upcomingAppointments.map((appointment, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.upcomingAppointmentItem}
                onPress={() => {
                  setSelectedAppointment(appointment);
                  setShowAppointmentDetails(true);
                }}
              >
                <LinearGradient
                  colors={['rgba(147, 51, 234, 0.1)', 'rgba(147, 51, 234, 0.05)']}
                  style={styles.upcomingAppointmentGradient}
                >
                  <View style={styles.upcomingAppointmentDetails}>
                    <Text style={styles.upcomingAppointmentName}>
                      {appointment.appointmentName}
                    </Text>
                    <Text style={styles.upcomingAppointmentDate}>
                      {formatShortDate(new Date(appointment.date))}
                    </Text>
                    <Text style={styles.upcomingAppointmentTime}>
                      {appointment.startTime} - {appointment.endTime}
                    </Text>
                  </View>
                  <View style={styles.upcomingAppointmentActions}>
                    <TouchableOpacity 
                      style={styles.upcomingActionButton}
                      onPress={(e) => {
                        e.stopPropagation(); // Prevent the parent touchable from triggering
                        setSelectedAppointment(appointment);
                        resetForm(appointment);
                        setShowAppointmentModal(true);
                      }}
                    >
                      <Edit size={16} color="#9333ea" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.upcomingActionButton, styles.upcomingDeleteButton]}
                      onPress={(e) => {
                        e.stopPropagation(); // Prevent the parent touchable from triggering
                        setSelectedAppointment(appointment);
                        setShowDeleteConfirmation(true);
                      }}
                    >
                      <Trash2 size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.noUpcomingAppointments}>
              <Text style={styles.noUpcomingText}>{t('appointments.noAppointments')}</Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Calendar Modal */}
      <Modal
        visible={showCalendar}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowCalendar(false);
          // No longer reset to today here
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.calendarModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('appointments.selectDate')}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setShowCalendar(false);
                  // No longer reset to today here
                }}
              >
                <X size={20} color="#666666" />
              </TouchableOpacity>
            </View>

            <Calendar
              key={`calendar-${currentVisibleMonth}`}
              onDayPress={handleDayPress}
              markedDates={{
                ...markedDates,
                [formatLocalDate(selectedDate)]: {
                  ...(markedDates[formatLocalDate(selectedDate)] || {}),
                  selected: true,
                  selectedColor: '#9333ea',
                },
              }}
              theme={{
                backgroundColor: '#ffffff',
                calendarBackground: '#ffffff',
                textSectionTitleColor: '#1f2937',
                selectedDayBackgroundColor: '#9333ea',
                selectedDayTextColor: '#ffffff',
                todayTextColor: '#9333ea',
                dayTextColor: '#1f2937',
                textDisabledColor: '#d1d5db',
                dotColor: '#9333ea',
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
                console.log('Calendar month changed to:', newVisibleMonth);
                setCurrentVisibleMonth(newVisibleMonth);
              }}
              current={parseLocalDate(`${currentVisibleMonth}-01`)}
              hideExtraDays={false}
            />
            
            {/* Display appointments for the selected date */}
            <View style={styles.calendarDayAppointments}>
              <Text style={styles.calendarDayTitle}>
                {t('appointments.appointmentsFor', { date: formatDate(selectedDate) })}
              </Text>

              <ScrollView 
                style={styles.calendarDayAppointmentsList}
                showsVerticalScrollIndicator={false}
              >
                {dailyAppointments.length > 0 ? (
                  dailyAppointments.map((appointment, index) => (
                    <View key={index} style={styles.calendarDayAppointmentItem}>
                      <View style={styles.appointmentTimeBlock}>
                        <Clock size={16} color="#9333ea" />
                        <Text style={styles.appointmentTimeText}>
                          {appointment.startTime} - {appointment.endTime}
                        </Text>
                      </View>
                      <View style={styles.appointmentDetailsBlock}>
                        <Text style={styles.calendarAppointmentTitle}>
                          {appointment.appointmentName}
                        </Text>
                        {appointment.description && (
                          <Text style={styles.calendarAppointmentDescription}>
                            {appointment.description}
                          </Text>
                        )}
                        {appointment.address && (
                          <View style={styles.appointmentAddressBlock}>
                            <MapPin size={14} color="#6b7280" />
                            <Text style={styles.appointmentAddressText}>
                              {appointment.address}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={styles.noAppointmentsMessage}>
                    <Text style={styles.noAppointmentsText}>
                      {t('appointments.noAppointmentsForDate')}
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create/Edit Appointment Modal */}
      <Modal
        visible={showAppointmentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAppointmentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isEditMode ? t('appointments.editAppointment') : t('appointments.createAppointment')}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowAppointmentModal(false)}
              >
                <X size={20} color="#666666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollContent}>
              <Text style={styles.inputLabel}>{t('appointments.appointmentName')}</Text>
              <TextInput
                style={styles.textInput}
                placeholder={t('appointments.appointmentName')}
                placeholderTextColor="#999999"
                value={appointmentName}
                onChangeText={setAppointmentName}
              />

              <Text style={styles.inputLabel}>{t('appointments.description')}</Text>
              <TextInput
                style={styles.textAreaInput}
                placeholder={t('appointments.description')}
                placeholderTextColor="#999999"
                value={appointmentDescription}
                onChangeText={setAppointmentDescription}
                multiline
                textAlignVertical="top"
              />

              <Text style={styles.inputLabel}>{t('appointments.date')}</Text>
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

              <View style={styles.timeInputRow}>
                <View style={styles.timeInputContainer}>
                  <Text style={styles.inputLabel}>{t('appointments.startTime')}</Text>
                  <View style={styles.timePickerContainer}>
                    {/* Hour Dropdown */}
                    <View style={styles.timePickerColumn}>
                      <Text style={styles.datePickerLabel}>{t('common.hour')}</Text>
                      <Pressable 
                        ref={startHourButtonRef}
                        style={styles.datePickerButton}
                        onPress={() => {
                          measureButtonPosition(startHourButtonRef, setStartHourButtonPosition);
                          setShowStartHourPicker(true);
                          setShowStartMinutePicker(false);
                          setShowEndHourPicker(false);
                          setShowEndMinutePicker(false);
                          setShowDayPicker(false);
                          setShowMonthPicker(false);
                          setShowYearPicker(false);
                        }}
                      >
                        <Text style={styles.datePickerButtonText}>{selectedStartHour}</Text>
                        <ChevronDown size={16} color="#6b7280" />
                      </Pressable>
                      
                      {showStartHourPicker && (
                        <Modal
                          transparent={true}
                          visible={showStartHourPicker}
                          animationType="none"
                          onRequestClose={() => setShowStartHourPicker(false)}
                        >
                          <Pressable 
                            style={styles.modalOverlay}
                            onPress={() => setShowStartHourPicker(false)}
                          >
                            <View 
                              style={[
                                styles.pickerDropdown,
                                {
                                  position: 'absolute',
                                  top: startHourButtonPosition.pageY + startHourButtonPosition.height + 5,
                                  left: startHourButtonPosition.pageX,
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
                                        selectedStartHour === hour && styles.pickerItemSelected
                                      ]}
                                      onPress={() => {
                                        setSelectedStartHour(hour);
                                        setShowStartHourPicker(false);
                                      }}
                                    >
                                      <Text style={[
                                        styles.pickerItemText,
                                        selectedStartHour === hour && styles.pickerItemTextSelected
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
                        ref={startMinuteButtonRef}
                        style={styles.datePickerButton}
                        onPress={() => {
                          measureButtonPosition(startMinuteButtonRef, setStartMinuteButtonPosition);
                          setShowStartMinutePicker(true);
                          setShowStartHourPicker(false);
                          setShowEndHourPicker(false);
                          setShowEndMinutePicker(false);
                          setShowDayPicker(false);
                          setShowMonthPicker(false);
                          setShowYearPicker(false);
                        }}
                      >
                        <Text style={styles.datePickerButtonText}>{selectedStartMinute}</Text>
                        <ChevronDown size={16} color="#6b7280" />
                      </Pressable>
                      
                      {showStartMinutePicker && (
                        <Modal
                          transparent={true}
                          visible={showStartMinutePicker}
                          animationType="none"
                          onRequestClose={() => setShowStartMinutePicker(false)}
                        >
                          <Pressable 
                            style={styles.modalOverlay}
                            onPress={() => setShowStartMinutePicker(false)}
                          >
                            <View 
                              style={[
                                styles.pickerDropdown,
                                {
                                  position: 'absolute',
                                  top: startMinuteButtonPosition.pageY + startMinuteButtonPosition.height + 5,
                                  left: startMinuteButtonPosition.pageX,
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
                                        selectedStartMinute === minute && styles.pickerItemSelected
                                      ]}
                                      onPress={() => {
                                        setSelectedStartMinute(minute);
                                        setShowStartMinutePicker(false);
                                      }}
                                    >
                                      <Text style={[
                                        styles.pickerItemText,
                                        selectedStartMinute === minute && styles.pickerItemTextSelected
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
                </View>

                <View style={styles.timeInputContainer}>
                  <Text style={styles.inputLabel}>{t('appointments.endTime')}</Text>
                  <View style={styles.timePickerContainer}>
                    {/* Hour Dropdown */}
                    <View style={styles.timePickerColumn}>
                      <Text style={styles.datePickerLabel}>{t('common.hour')}</Text>
                      <Pressable 
                        ref={endHourButtonRef}
                        style={styles.datePickerButton}
                        onPress={() => {
                          measureButtonPosition(endHourButtonRef, setEndHourButtonPosition);
                          setShowEndHourPicker(true);
                          setShowEndMinutePicker(false);
                          setShowStartHourPicker(false);
                          setShowStartMinutePicker(false);
                          setShowDayPicker(false);
                          setShowMonthPicker(false);
                          setShowYearPicker(false);
                        }}
                      >
                        <Text style={styles.datePickerButtonText}>{selectedEndHour}</Text>
                        <ChevronDown size={16} color="#6b7280" />
                      </Pressable>
                      
                      {showEndHourPicker && (
                        <Modal
                          transparent={true}
                          visible={showEndHourPicker}
                          animationType="none"
                          onRequestClose={() => setShowEndHourPicker(false)}
                        >
                          <Pressable 
                            style={styles.modalOverlay}
                            onPress={() => setShowEndHourPicker(false)}
                          >
                            <View 
                              style={[
                                styles.pickerDropdown,
                                {
                                  position: 'absolute',
                                  top: endHourButtonPosition.pageY + endHourButtonPosition.height + 5,
                                  left: endHourButtonPosition.pageX,
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
                                        selectedEndHour === hour && styles.pickerItemSelected
                                      ]}
                                      onPress={() => {
                                        setSelectedEndHour(hour);
                                        setShowEndHourPicker(false);
                                      }}
                                    >
                                      <Text style={[
                                        styles.pickerItemText,
                                        selectedEndHour === hour && styles.pickerItemTextSelected
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
                        ref={endMinuteButtonRef}
                        style={styles.datePickerButton}
                        onPress={() => {
                          measureButtonPosition(endMinuteButtonRef, setEndMinuteButtonPosition);
                          setShowEndMinutePicker(true);
                          setShowEndHourPicker(false);
                          setShowStartHourPicker(false);
                          setShowStartMinutePicker(false);
                          setShowDayPicker(false);
                          setShowMonthPicker(false);
                          setShowYearPicker(false);
                        }}
                      >
                        <Text style={styles.datePickerButtonText}>{selectedEndMinute}</Text>
                        <ChevronDown size={16} color="#6b7280" />
                      </Pressable>
                      
                      {showEndMinutePicker && (
                        <Modal
                          transparent={true}
                          visible={showEndMinutePicker}
                          animationType="none"
                          onRequestClose={() => setShowEndMinutePicker(false)}
                        >
                          <Pressable 
                            style={styles.modalOverlay}
                            onPress={() => setShowEndMinutePicker(false)}
                          >
                            <View 
                              style={[
                                styles.pickerDropdown,
                                {
                                  position: 'absolute',
                                  top: endMinuteButtonPosition.pageY + endMinuteButtonPosition.height + 5,
                                  left: endMinuteButtonPosition.pageX,
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
                                        selectedEndMinute === minute && styles.pickerItemSelected
                                      ]}
                                      onPress={() => {
                                        setSelectedEndMinute(minute);
                                        setShowEndMinutePicker(false);
                                      }}
                                    >
                                      <Text style={[
                                        styles.pickerItemText,
                                        selectedEndMinute === minute && styles.pickerItemTextSelected
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
                </View>
              </View>

              <Text style={styles.inputLabel}>{t('appointments.address')}</Text>
              <TextInput
                style={styles.textInput}
                placeholder={t('appointments.address')}
                placeholderTextColor="#999999"
                value={appointmentAddress}
                onChangeText={setAppointmentAddress}
              />

              <Text style={styles.inputLabel}>{t('appointments.notifications')}</Text>
              <TouchableOpacity
                style={styles.notificationSelector}
                onPress={() => setShowNotificationPicker(true)}
              >
                <View style={styles.notificationSelectorContent}>
                  <Bell size={18} color="#9333ea" />
                  <Text style={styles.notificationSelectorText}>
                    {getNotificationDisplayText()}
                  </Text>
                </View>
                <ChevronDown size={18} color="#6b7280" />
              </TouchableOpacity>
              
              {/* Notification picker modal */}
              <Modal
                visible={showNotificationPicker}
                transparent
                animationType="fade"
                onRequestClose={() => setShowNotificationPicker(false)}
              >
                <View style={styles.modalOverlay}>
                  <View style={styles.notificationPickerContent}>
                    <View style={styles.notificationPickerHeader}>
                      <Text style={styles.notificationPickerTitle}>{t('appointments.selectNotifications')}</Text>
                      <TouchableOpacity
                        style={styles.closeButton}
                        onPress={() => setShowNotificationPicker(false)}
                      >
                        <X size={20} color="#666666" />
                      </TouchableOpacity>
                    </View>
                    
                    <Text style={styles.notificationPickerSubtitle}>
                      {t('appointments.selectUpToThree')}
                    </Text>
                    
                    <FlatList
                      data={notificationOptions}
                      keyExtractor={(item) => item.value}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={styles.notificationOption}
                          onPress={() => toggleNotificationOption(item.value)}
                        >
                          <Text style={styles.notificationOptionText}>
                            {item.label}
                          </Text>
                          {selectedNotifications.includes(item.value) && (
                            <Check size={18} color="#9333ea" />
                          )}
                        </TouchableOpacity>
                      )}
                      ItemSeparatorComponent={() => <View style={styles.notificationSeparator} />}
                    />
                    
                    <TouchableOpacity
                      style={styles.notificationDoneButton}
                      onPress={() => setShowNotificationPicker(false)}
                    >
                      <Text style={styles.notificationDoneButtonText}>
                        {t('common.done')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>

              <TouchableOpacity
                style={[
                  styles.saveButton, 
                  (!appointmentName.trim() || isSubmitting) && styles.saveButtonDisabled
                ]}
                onPress={async () => {
                  if (!appointmentName.trim() || isSubmitting || !user) return;
                  
                  // Validate date format
                  if (!/^\d{4}-\d{2}-\d{2}$/.test(appointmentDateInput)) {
                    // If you want to show an error message, you could add state for that
                    console.error('Invalid date format');
                    return;
                  }
                  
                  try {
                    setIsSubmitting(true);
                    
                    // Parse the date from the input text to ensure it's correct
                    const date = parseLocalDate(appointmentDateInput);
                    
                    // Convert notification options to actual Date objects
                    const notificationTimes = convertOptionsToNotificationTimes(
                      selectedNotifications,
                      date
                    );
                    
                    const appointmentData = {
                      userID: user.uid,
                      appointmentName: appointmentName.trim(),
                      description: appointmentDescription.trim(),
                      date: date, // Use the parsed date
                      startTime: appointmentStartTime,
                      endTime: appointmentEndTime,
                      // Only include address if it's not empty
                      ...(appointmentAddress.trim() ? { address: appointmentAddress.trim() } : {}),
                      notificationTimes: notificationTimes,
                      allDay: false,
                    };
                    
                    if (isEditMode && selectedAppointment?.appointmentID) {
                      await DatabaseService.updateAppointment(
                        selectedAppointment.appointmentID, 
                        appointmentData
                      );
                    } else {
                      await DatabaseService.createAppointment(appointmentData);
                    }
                    
                    // Reload data
                    await loadAppointments();
                    await loadDailyAppointments(selectedDate);
                    await loadMarkedDates();
                    await loadUpcomingAppointments();
                    
                    // Close modal
                    setShowAppointmentModal(false);
                  } catch (error) {
                    console.error('Error saving appointment:', error);
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                disabled={!appointmentName.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.saveButtonText}>{t('appointments.save')}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Appointment Details Modal */}
      <Modal
        visible={showAppointmentDetails}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAppointmentDetails(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('appointments.appointmentDetails')}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowAppointmentDetails(false)}
              >
                <X size={20} color="#666666" />
              </TouchableOpacity>
            </View>

            {selectedAppointment && (
              <View style={styles.appointmentDetailsContent}>
                <Text style={styles.appointmentDetailTitle}>
                  {selectedAppointment.appointmentName}
                </Text>
                
                <View style={styles.detailItem}>
                  <Clock size={18} color="#9333ea" />
                  <Text style={styles.detailText}>
                    {formatDate(selectedAppointment.date)}, {selectedAppointment.startTime} - {selectedAppointment.endTime}
                  </Text>
                </View>

                {selectedAppointment.description && (
                  <View style={styles.detailDescriptionContainer}>
                    <Text style={styles.detailDescription}>
                      {selectedAppointment.description}
                    </Text>
                  </View>
                )}
                
                {selectedAppointment.address && (
                  <View style={styles.detailItem}>
                    <MapPin size={18} color="#9333ea" />
                    <Text style={styles.detailText}>
                      {selectedAppointment.address}
                    </Text>
                </View>
                )}
                
                {selectedAppointment.notificationTimes && selectedAppointment.notificationTimes.length > 0 && (
                  <View style={styles.detailItem}>
                    <Bell size={18} color="#9333ea" />
                    <Text style={styles.detailText}>
                      {convertNotificationTimesToOptions(
                        selectedAppointment.notificationTimes, 
                        selectedAppointment.date
                      ).map(option => {
                        const notifOption = notificationOptions.find(opt => opt.value === option);
                        return notifOption?.label || option;
                      }).join(', ')}
                    </Text>
                </View>
                )}
                
                <View style={styles.appointmentActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                      setSelectedAppointment(selectedAppointment);
                      resetForm(selectedAppointment);
                      setShowAppointmentDetails(false);
                      setShowAppointmentModal(true);
                    }}
                  >
                    <Edit size={18} color="#9333ea" />
                    <Text style={styles.actionButtonText}>{t('appointments.edit')}</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteActionButton]}
                    onPress={() => {
                      setShowDeleteConfirmation(true);
                    }}
                  >
                    <Trash2 size={18} color="#ef4444" />
                    <Text style={styles.deleteActionButtonText}>{t('appointments.delete')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
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
            <Text style={styles.confirmModalTitle}>{t('appointments.deleteConfirmationTitle')}</Text>
            <Text style={styles.confirmModalText}>{t('appointments.deleteConfirmation')}</Text>
            
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity
                style={[styles.confirmModalButton, styles.confirmModalCancelButton]}
                onPress={() => setShowDeleteConfirmation(false)}
              >
                <Text style={styles.confirmModalCancelText}>{t('appointments.cancel')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.confirmModalButton, styles.confirmModalDeleteButton]}
                onPress={async () => {
                  if (!selectedAppointment?.appointmentID) return;
                  
                  try {
                    // Clear the cache before deleting to ensure all views are refreshed
                    DatabaseService.clearAppointmentCache();
                    await DatabaseService.deleteAppointment(selectedAppointment.appointmentID);
                    
                    // Reload data after deletion
                    await loadAppointments();
                    await loadDailyAppointments(selectedDate);
                    
                    // Refresh markers on calendar - create a fresh object
                    setMarkedDates({});
                    await loadMarkedDates();
                    
                    // Reload upcoming appointments
                    await loadUpcomingAppointments();
                    
                    // Close both modals
                    setShowDeleteConfirmation(false);
                    setShowAppointmentDetails(false);
                  } catch (error) {
                    console.error('Error deleting appointment:', error);
                  }
                }}
              >
                <Text style={styles.confirmModalDeleteText}>{t('appointments.delete')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => {
          resetForm(); // Use the reset function instead
          setShowAppointmentModal(true);
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
  dayCalendarContainer: {
    backgroundColor: '#ffffff',
    flex: 1,
  },
  dayHeader: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayHeaderControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayHeaderDateContainer: {
    paddingHorizontal: 12,
  },
  dayHeaderDate: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  dayNavigationButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(147, 51, 234, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  todayButtonText: {
    color: '#9333ea',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
  },
  timelineContainer: {
    flex: 1,
  },
  timeSlot: {
    flexDirection: 'row',
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  timeLabel: {
    width: 60,
    textAlign: 'center',
    fontSize: 14,
    color: '#6b7280',
    paddingTop: 8,
  },
  timeSlotContent: {
    flex: 1,
    borderLeftWidth: 1,
    borderLeftColor: '#f3f4f6',
    padding: 2,
    position: 'relative', // Important for absolute positioning of appointments
  },
  appointmentBlock: {
    backgroundColor: 'rgba(147, 51, 234, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#9333ea',
    padding: 8,
    borderRadius: 4,
    marginBottom: 1,
    minHeight: 56,
    position: 'absolute', // Change to absolute positioning
    width: '100%', // Will be overridden for multiple appointments
  },
  appointmentBlockTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  appointmentBlockTime: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  currentTimeIndicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  currentTimeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ef4444',
    marginLeft: 54,
  },
  currentTimeLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#ef4444',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-start', // Change from 'center' to 'flex-start'
    alignItems: 'center',
    paddingTop: 100, // Add padding to position modal higher
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
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#9333ea',
    borderRadius: 16,
  },
  refreshButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
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
  calendarDayAppointments: {
    marginTop: 16,
  },
  calendarDayTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  calendarDayAppointmentsList: {
    maxHeight: 300,
  },
  calendarDayAppointmentItem: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  appointmentTimeBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  appointmentTimeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9333ea',
    marginLeft: 8,
  },
  appointmentDetailsBlock: {
    marginLeft: 24,
  },
  calendarAppointmentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  calendarAppointmentDescription: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 8,
  },
  appointmentAddressBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  appointmentAddressText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 6,
  },
  noAppointmentsMessage: {
    padding: 16,
    alignItems: 'center',
  },
  noAppointmentsText: {
    fontSize: 14,
    color: '#6b7280',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    ...(Platform.OS === 'ios' && {
      minHeight: 650, // Increase minimum height for iOS
    }),
  },
  modalScrollContent: {
    flex: 1,
    // Add a specific height for iOS to fix the scroll issue
    ...(Platform.OS === 'ios' && {
      height: 600,  // Increase height for iOS
      minHeight: 300, // Increase minimum height
    }),
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
  textAreaInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
    height: 100,
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
    maxHeight: 150,
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
  timeInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  timeInputContainer: {
    flex: 1,
  },
  timeInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  saveButton: {
    backgroundColor: '#9333ea',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  appointmentDetailsContent: {
    paddingVertical: 8,
  },
  appointmentDetailTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailText: {
    fontSize: 16,
    color: '#4b5563',
    marginLeft: 12,
    flex: 1,
  },
  detailDescriptionContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
  },
  detailDescription: {
    fontSize: 16,
    color: '#4b5563',
    lineHeight: 24,
  },
  appointmentActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(147, 51, 234, 0.1)',
    flex: 1,
    marginHorizontal: 4,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9333ea',
    marginLeft: 8,
  },
  deleteActionButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  deleteActionButtonText: {
    color: '#ef4444',
    marginLeft: 8,
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
  upcomingAppointmentsContainer: {
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#2a1a2a',
  },
  upcomingHeader: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a1a2a',
  },
  upcomingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  upcomingList: {
    maxHeight: 300,
  },
  upcomingAppointmentItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#2a1a2a',
    marginBottom: 8,
  },
  upcomingAppointmentGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#9333ea',
    marginHorizontal: 8,
  },
  upcomingAppointmentDetails: {
    flex: 1,
  },
  upcomingAppointmentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  upcomingAppointmentDate: {
    fontSize: 14,
    fontWeight: '500',
    color: '#cccccc',
    marginBottom: 2,
  },
  upcomingAppointmentTime: {
    fontSize: 12,
    color: '#9333ea',
  },
  upcomingAppointmentActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  upcomingActionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(147, 51, 234, 0.2)',
    marginLeft: 8,
  },
  upcomingDeleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  noUpcomingAppointments: {
    padding: 16,
    alignItems: 'center',
  },
  noUpcomingText: {
    fontSize: 14,
    color: '#999999',
  },
  inputFormat: {
    fontSize: 12,
    fontWeight: 'normal',
    color: '#6b7280',
  },
  notificationSelector: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  notificationSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationSelectorText: {
    fontSize: 16,
    color: '#1f2937',
    marginLeft: 10,
  },
  notificationPickerContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '90%',
    maxWidth: 350,
    padding: 20,
    maxHeight: '60%',
  },
  notificationPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  notificationPickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  notificationPickerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  notificationOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  notificationOptionText: {
    fontSize: 16,
    color: '#1f2937',
  },
  notificationSeparator: {
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  notificationDoneButton: {
    backgroundColor: '#9333ea',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  notificationDoneButtonText: {
    color: '#ffffff',
    fontSize: 16,
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
});