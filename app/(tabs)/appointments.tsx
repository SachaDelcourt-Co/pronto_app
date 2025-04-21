import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar as CalendarIcon, Clock, MapPin, Bell, Plus, ChevronRight } from 'lucide-react-native';

type Appointment = {
  id: string;
  title: string;
  description: string;
  date: Date;
  time: string;
  location?: string;
  notifications: string[];
};

const SAMPLE_APPOINTMENTS: Appointment[] = [
  {
    id: '1',
    title: 'Doctor Appointment',
    description: 'Annual checkup with Dr. Smith',
    date: new Date(2024, 1, 15),
    time: '10:00',
    location: '123 Medical Center Dr.',
    notifications: ['1 day before', '1 hour before'],
  },
  {
    id: '2',
    title: 'Team Meeting',
    description: 'Weekly sprint planning',
    date: new Date(2024, 1, 16),
    time: '14:00',
    notifications: ['30 minutes before'],
  },
];

export default function AppointmentsScreen() {
  const [appointments] = useState<Appointment[]>(SAMPLE_APPOINTMENTS);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a1a1a', '#2a1a2a']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Appointments</Text>
        <Text style={styles.headerSubtitle}>Manage your schedule</Text>

        <TouchableOpacity style={styles.calendarButton}>
          <CalendarIcon size={24} color="#9333ea" />
          <Text style={styles.calendarButtonText}>View Calendar</Text>
          <ChevronRight size={20} color="#9333ea" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {appointments.map(appointment => (
          <TouchableOpacity key={appointment.id} style={styles.appointmentCard}>
            <View style={styles.dateHeader}>
              <Text style={styles.dateText}>{formatDate(appointment.date)}</Text>
            </View>

            <View style={styles.appointmentContent}>
              <Text style={styles.appointmentTitle}>{appointment.title}</Text>
              <Text style={styles.appointmentDescription}>
                {appointment.description}
              </Text>

              <View style={styles.detailsContainer}>
                <View style={styles.detailItem}>
                  <Clock size={16} color="#9333ea" />
                  <Text style={styles.detailText}>{appointment.time}</Text>
                </View>

                {appointment.location && (
                  <View style={styles.detailItem}>
                    <MapPin size={16} color="#9333ea" />
                    <Text style={styles.detailText}>{appointment.location}</Text>
                  </View>
                )}
              </View>

              <View style={styles.notificationsContainer}>
                {appointment.notifications.map((notification, index) => (
                  <View key={index} style={styles.notificationChip}>
                    <Bell size={14} color="#9333ea" />
                    <Text style={styles.notificationText}>{notification}</Text>
                  </View>
                ))}
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.addButton}>
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
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
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
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  appointmentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    overflow: 'hidden',
  },
  dateHeader: {
    backgroundColor: 'rgba(147, 51, 234, 0.1)',
    padding: 12,
  },
  dateText: {
    color: '#9333ea',
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },
  appointmentContent: {
    padding: 16,
  },
  appointmentTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1f2937',
    marginBottom: 4,
  },
  appointmentDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6b7280',
    marginBottom: 12,
  },
  detailsContainer: {
    gap: 8,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#4b5563',
  },
  notificationsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
  notificationText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#9333ea',
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
});