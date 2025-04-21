import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, Calendar as CalendarIcon, Plus, ChevronRight } from 'lucide-react-native';

type Reminder = {
  id: string;
  name: string;
  date: Date;
  time: string;
  recurring: boolean;
  days?: number[];
  notifications: string[];
  active: boolean;
};

const SAMPLE_REMINDERS: Reminder[] = [
  {
    id: '1',
    name: 'Take vitamins',
    date: new Date(),
    time: '09:00',
    recurring: true,
    days: [1, 3, 5],
    notifications: ['09:00', '20:00'],
    active: true,
  },
  {
    id: '2',
    name: 'Call mom',
    date: new Date(),
    time: '18:00',
    recurring: true,
    days: [0],
    notifications: ['17:45'],
    active: true,
  },
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function RemindersScreen() {
  const [reminders] = useState<Reminder[]>(SAMPLE_REMINDERS);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a1a1a', '#2a1a2a']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Reminders</Text>
        <Text style={styles.headerSubtitle}>Never miss what's important</Text>
        
        <TouchableOpacity style={styles.calendarButton}>
          <CalendarIcon size={24} color="#9333ea" />
          <Text style={styles.calendarButtonText}>Open Calendar</Text>
          <ChevronRight size={20} color="#9333ea" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {reminders.map(reminder => (
          <View key={reminder.id} style={styles.reminderCard}>
            <View style={styles.reminderHeader}>
              <Bell size={20} color="#9333ea" />
              <Text style={styles.reminderName}>{reminder.name}</Text>
              <View style={[
                styles.activeIndicator,
                reminder.active && styles.activeIndicatorOn
              ]} />
            </View>

            {reminder.recurring ? (
              <View style={styles.daysContainer}>
                {DAYS.map((day, index) => (
                  <View
                    key={day}
                    style={[
                      styles.dayChip,
                      reminder.days?.includes(index) && styles.dayChipSelected
                    ]}
                  >
                    <Text style={[
                      styles.dayChipText,
                      reminder.days?.includes(index) && styles.dayChipTextSelected
                    ]}>
                      {day}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.dateText}>
                {reminder.date.toLocaleDateString()} at {reminder.time}
              </Text>
            )}

            <View style={styles.notificationsContainer}>
              {reminder.notifications.map((time, index) => (
                <View key={index} style={styles.notificationChip}>
                  <Bell size={14} color="#9333ea" />
                  <Text style={styles.notificationTime}>{time}</Text>
                </View>
              ))}
            </View>
          </View>
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
    marginBottom: 12,
  },
  reminderName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1f2937',
    flex: 1,
    marginLeft: 12,
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
  daysContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  dayChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  dayChipSelected: {
    backgroundColor: '#9333ea',
  },
  dayChipText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#6b7280',
  },
  dayChipTextSelected: {
    color: '#ffffff',
  },
  dateText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6b7280',
    marginBottom: 12,
  },
  notificationsContainer: {
    flexDirection: 'row',
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
  notificationTime: {
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