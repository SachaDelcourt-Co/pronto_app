import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Modal, TextInput, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar as CalendarIcon, Clock, MapPin, Bell, Plus, ChevronRight, X, Edit, Trash2 } from 'lucide-react-native';
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
    
    const date = appointment?.date ? new Date(appointment.date) : new Date();
    setAppointmentDate(date);
    setAppointmentDateInput(formatLocalDate(date));
    
    setAppointmentStartTime(appointment?.startTime || '09:00');
    setAppointmentEndTime(appointment?.endTime || '10:00');
    setAppointmentAddress(appointment?.address || '');
    setIsEditMode(!!appointment);
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

  // 4. Modify the handleDayPress function to not override the current month
  const handleDayPress = (day: any) => {
    // Convert the selected date string to a Date object
    const newSelectedDate = parseLocalDate(day.dateString);
    
    // Update the selected date for the calendar
    setSelectedDate(newSelectedDate);
    
    // Update the current visible month to match the clicked date
    // This prevents jumping between months when clicking on a date
    const clickedMonth = day.dateString.substring(0, 7); // YYYY-MM format
    if (clickedMonth !== currentVisibleMonth) {
      console.log(`Month changed by day press: ${currentVisibleMonth} -> ${clickedMonth}`);
      setCurrentVisibleMonth(clickedMonth);
    }
    
    // But we don't change the display date - main view always shows today
    // Only load the appointments for the selected date for the calendar popup
    if (user) {
      DatabaseService.getAppointmentsByDate(user.uid, newSelectedDate)
        .then(appointments => {
          // Only update dailyAppointments when calendar is open
          if (showCalendar) {
            setDailyAppointments(appointments);
          }
        })
        .catch(error => {
          console.error('Error loading selected date appointments:', error);
        });
    }
    
    // Update marked dates to show the new selection
    const newMarkedDates = { ...markedDates };
    
    // Remove previous selection highlight (but keep the dots!)
    Object.keys(newMarkedDates).forEach(dateString => {
      if (newMarkedDates[dateString]?.selected) {
        // Add null check with optional chaining
        // Remove the 'selected' property but keep 'marked' if it exists
        const { selected, selectedColor, ...rest } = newMarkedDates[dateString];
        newMarkedDates[dateString] = rest;
      }
    });
    
    // Add new selection
    newMarkedDates[day.dateString] = { 
      ...(newMarkedDates[day.dateString] || {}),
      selected: true, 
      selectedColor: '#9333ea',
      marked: newMarkedDates[day.dateString]?.marked || false,
      dotColor: newMarkedDates[day.dateString]?.marked ? '#ffffff' : undefined
    };
    
    setMarkedDates(newMarkedDates);
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
          <Text style={styles.dayHeaderDate}>{formatDate(displayDate)}</Text>
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
                {dailyAppointments
                  .filter(appointment => {
                    const [hours] = appointment.startTime.split(':').map(Number);
                    return hours === hour;
                  })
                  .map((appointment, index) => (
                    <TouchableOpacity 
                      key={index}
                      style={styles.appointmentBlock}
                      onPress={() => {
                        setSelectedAppointment(appointment);
                        setShowAppointmentDetails(true);
                      }}
                    >
                      <Text style={styles.appointmentBlockTitle}>
                        {appointment.appointmentName}
              </Text>
                      <Text style={styles.appointmentBlockTime}>
                        {appointment.startTime} - {appointment.endTime}
                      </Text>
                    </TouchableOpacity>
                  ))
                }
              </View>
            </View>
          ))}
          {/* Current time indicator */}
          <View 
            style={[
              styles.currentTimeIndicator, 
              { top: currentHour * 60 + (new Date().getMinutes()) }
            ]}
          >
            <View style={styles.currentTimeDot} />
            <View style={styles.currentTimeLine} />
          </View>
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
          // Restore today's appointments when closing
          if (user) {
            const today = new Date();
            loadDailyAppointments(today);
          }
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
                  // Restore today's appointments when closing
                  if (user) {
                    const today = new Date();
                    loadDailyAppointments(today);
                  }
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
                <TextInput
                  style={styles.dateInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#999999"
                  value={appointmentDateInput}
                  onChangeText={(text) => {
                    // Always update the text input
                    setAppointmentDateInput(text);
                    
                    // Only try to parse complete dates with the right format
                    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
                      const date = parseLocalDate(text);
                      if (!isNaN(date.getTime())) {
                        setAppointmentDate(date);
                      }
                    }
                  }}
                />
              </View>

              <View style={styles.timeInputRow}>
                <View style={styles.timeInputContainer}>
                  <Text style={styles.inputLabel}>{t('appointments.startTime')}</Text>
                  <TextInput
                    style={styles.timeInput}
                    placeholder="HH:MM"
                    placeholderTextColor="#999999"
                    value={appointmentStartTime}
                    onChangeText={setAppointmentStartTime}
                  />
                </View>

                <View style={styles.timeInputContainer}>
                  <Text style={styles.inputLabel}>{t('appointments.endTime')}</Text>
                  <TextInput
                    style={styles.timeInput}
                    placeholder="HH:MM"
                    placeholderTextColor="#999999"
                    value={appointmentEndTime}
                    onChangeText={setAppointmentEndTime}
                  />
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
                    
                    const appointmentData = {
                      userID: user.uid,
                      appointmentName: appointmentName.trim(),
                      description: appointmentDescription.trim(),
                      date: date, // Use the parsed date
                      startTime: appointmentStartTime,
                      endTime: appointmentEndTime,
                      // Only include address if it's not empty
                      ...(appointmentAddress.trim() ? { address: appointmentAddress.trim() } : {}),
                      notificationTimes: [],
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
  },
  dayHeaderDate: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
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
  },
  appointmentBlock: {
    backgroundColor: 'rgba(147, 51, 234, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#9333ea',
    padding: 8,
    borderRadius: 4,
    marginBottom: 1,
    minHeight: 56,
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
  modalScrollContent: {
    flex: 1,
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
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    overflow: 'hidden',
  },
  dateInput: {
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
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
});