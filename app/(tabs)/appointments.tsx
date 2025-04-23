import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Modal, TextInput, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar as CalendarIcon, Clock, MapPin, Bell, Plus, ChevronRight, X, Edit, Trash2 } from 'lucide-react-native';
import { Calendar } from 'react-native-calendars';
import { useAuth } from '@/utils/AuthContext';
import { DatabaseService } from '@/services/database';
import type { Appointment } from '@/types/database';
import { useFocusEffect } from 'expo-router';

export default function AppointmentsScreen() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [dailyAppointments, setDailyAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [markedDates, setMarkedDates] = useState<Record<string, any>>({});
  const [currentHour, setCurrentHour] = useState(new Date().getHours());
  
  // Modal states
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showAppointmentDetails, setShowAppointmentDetails] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Form states
  const [appointmentName, setAppointmentName] = useState('');
  const [appointmentDescription, setAppointmentDescription] = useState('');
  const [appointmentDate, setAppointmentDate] = useState(new Date());
  const [appointmentStartTime, setAppointmentStartTime] = useState('09:00');
  const [appointmentEndTime, setAppointmentEndTime] = useState('10:00');
  const [appointmentAddress, setAppointmentAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Delete confirmation
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  
  // Show more in home
  const [expandedInHome, setExpandedInHome] = useState(false);

  // Update time tracker
  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentHour(new Date().getHours());
    }, 60000); // Update every minute
    
    return () => clearInterval(intervalId);
  }, []);

  // Load data when the screen is focused
  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        loadAppointments();
        loadDailyAppointments(selectedDate);
        loadMarkedDates();
      }
      return () => {
        // Cleanup
      };
    }, [user, selectedDate])
  );

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

  const loadMarkedDates = async () => {
    if (!user) return;
    
    try {
      // Get first and last day of current month
      const date = new Date(selectedDate);
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      // Get all dates with appointments
      const dates = await DatabaseService.getDatesWithAppointments(user.uid, firstDay, lastDay);
      
      // Format for the calendar
      const markedDatesObj: Record<string, any> = {};
      
      dates.forEach(date => {
        const dateString = date.toISOString().split('T')[0];
        markedDatesObj[dateString] = { marked: true, dotColor: '#9333ea' };
      });
      
      // Also mark the selected date
      const selectedDateString = selectedDate.toISOString().split('T')[0];
      markedDatesObj[selectedDateString] = { 
        ...(markedDatesObj[selectedDateString] || {}),
        selected: true, 
        selectedColor: '#9333ea'
      };
      
      setMarkedDates(markedDatesObj);
    } catch (error) {
      console.error('Error loading marked dates:', error);
    }
  };

  const handleDayPress = (day: any) => {
    // Convert the selected date string to a Date object
    const [year, month, date] = day.dateString.split('-');
    const newSelectedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(date));
    
    setSelectedDate(newSelectedDate);
    loadDailyAppointments(newSelectedDate);
    
    // Update marked dates
    const newMarkedDates = { ...markedDates };
    
    // Remove previous selection
    Object.keys(newMarkedDates).forEach(dateString => {
      if (newMarkedDates[dateString].selected) {
        if (newMarkedDates[dateString].marked) {
          newMarkedDates[dateString] = { marked: true, dotColor: '#9333ea' };
        } else {
          delete newMarkedDates[dateString];
        }
      }
    });
    
    // Add new selection
    newMarkedDates[day.dateString] = { 
      ...(newMarkedDates[day.dateString] || {}),
      selected: true, 
      selectedColor: '#9333ea' 
    };
    
    setMarkedDates(newMarkedDates);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (time: string) => {
    return time;
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a1a1a', '#2a1a2a']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Appointments</Text>
        <Text style={styles.headerSubtitle}>Manage your schedule</Text>

        <TouchableOpacity 
          style={styles.calendarButton}
          onPress={() => setShowCalendar(true)}
        >
          <CalendarIcon size={24} color="#9333ea" />
          <Text style={styles.calendarButtonText}>View Calendar</Text>
          <ChevronRight size={20} color="#9333ea" />
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.dayCalendarContainer}>
        <View style={styles.dayHeader}>
          <Text style={styles.dayHeaderDate}>{formatDate(selectedDate)}</Text>
        </View>
        
        <ScrollView 
          style={styles.timelineContainer}
          showsVerticalScrollIndicator={false}
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
              <Text style={styles.modalTitle}>Select Date</Text>
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
            />
            
            {/* Display appointments for the selected date */}
            <View style={styles.calendarDayAppointments}>
              <Text style={styles.calendarDayTitle}>
                Appointments for {formatDate(selectedDate)}
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
                      No appointments for this day
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
                {isEditMode ? 'Edit Appointment' : 'New Appointment'}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowAppointmentModal(false)}
              >
                <X size={20} color="#666666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollContent}>
              <Text style={styles.inputLabel}>Title</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Appointment title"
                placeholderTextColor="#999999"
                value={appointmentName}
                onChangeText={setAppointmentName}
              />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={styles.textAreaInput}
                placeholder="Description (optional)"
                placeholderTextColor="#999999"
                value={appointmentDescription}
                onChangeText={setAppointmentDescription}
                multiline
                textAlignVertical="top"
              />

              <Text style={styles.inputLabel}>Date</Text>
              <View style={styles.datePickerContainer}>
                {/* Note: In a real implementation, use a date picker component */}
                <TextInput
                  style={styles.dateInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#999999"
                  value={appointmentDate.toISOString().split('T')[0]}
                  onChangeText={(text) => {
                    const [year, month, day] = text.split('-').map(Number);
                    const date = new Date(year, month - 1, day);
                    if (!isNaN(date.getTime())) {
                      setAppointmentDate(date);
                    }
                  }}
                />
              </View>

              <View style={styles.timeInputRow}>
                <View style={styles.timeInputContainer}>
                  <Text style={styles.inputLabel}>Start Time</Text>
                  <TextInput
                    style={styles.timeInput}
                    placeholder="HH:MM"
                    placeholderTextColor="#999999"
                    value={appointmentStartTime}
                    onChangeText={setAppointmentStartTime}
                  />
                </View>

                <View style={styles.timeInputContainer}>
                  <Text style={styles.inputLabel}>End Time</Text>
                  <TextInput
                    style={styles.timeInput}
                    placeholder="HH:MM"
                    placeholderTextColor="#999999"
                    value={appointmentEndTime}
                    onChangeText={setAppointmentEndTime}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Location (optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Address"
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
                  
                  try {
                    setIsSubmitting(true);
                    
                    const appointmentData = {
                      userID: user.uid,
                      appointmentName: appointmentName.trim(),
                      description: appointmentDescription.trim(),
                      date: appointmentDate,
                      startTime: appointmentStartTime,
                      endTime: appointmentEndTime,
                      address: appointmentAddress.trim() || undefined,
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
                  <Text style={styles.saveButtonText}>
                    {isEditMode ? 'Update Appointment' : 'Create Appointment'}
                  </Text>
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
              <Text style={styles.modalTitle}>Appointment Details</Text>
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
                      setAppointmentName(selectedAppointment.appointmentName);
                      setAppointmentDescription(selectedAppointment.description);
                      setAppointmentDate(selectedAppointment.date);
                      setAppointmentStartTime(selectedAppointment.startTime);
                      setAppointmentEndTime(selectedAppointment.endTime);
                      setAppointmentAddress(selectedAppointment.address || '');
                      setIsEditMode(true);
                      setShowAppointmentDetails(false);
                      setShowAppointmentModal(true);
                    }}
                  >
                    <Edit size={18} color="#9333ea" />
                    <Text style={styles.actionButtonText}>Edit</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteActionButton]}
                    onPress={() => {
                      setShowDeleteConfirmation(true);
                    }}
                  >
                    <Trash2 size={18} color="#ef4444" />
                    <Text style={styles.deleteActionButtonText}>Delete</Text>
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
            <Text style={styles.confirmModalTitle}>Delete Appointment</Text>
            <Text style={styles.confirmModalText}>
              Are you sure you want to delete this appointment?
            </Text>
            
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity
                style={[styles.confirmModalButton, styles.confirmModalCancelButton]}
                onPress={() => setShowDeleteConfirmation(false)}
              >
                <Text style={styles.confirmModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.confirmModalButton, styles.confirmModalDeleteButton]}
                onPress={async () => {
                  if (!selectedAppointment?.appointmentID) return;
                  
                  try {
                    await DatabaseService.deleteAppointment(selectedAppointment.appointmentID);
                    
                    // Reload data
                    await loadAppointments();
                    await loadDailyAppointments(selectedDate);
                    await loadMarkedDates();
                    
                    // Close both modals
                    setShowDeleteConfirmation(false);
                    setShowAppointmentDetails(false);
                  } catch (error) {
                    console.error('Error deleting appointment:', error);
                  }
                }}
              >
                <Text style={styles.confirmModalDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => {
          setIsEditMode(false);
          setAppointmentName('');
          setAppointmentDescription('');
          setAppointmentDate(new Date());
          setAppointmentStartTime('09:00');
          setAppointmentEndTime('10:00');
          setAppointmentAddress('');
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
    flex: 1,
    backgroundColor: '#ffffff',
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
});