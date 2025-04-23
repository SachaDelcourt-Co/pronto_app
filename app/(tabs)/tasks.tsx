import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CircleCheck as CheckCircle2, Plus } from 'lucide-react-native';

const PREDEFINED_TASKS = [
  {
    id: '1',
    name: 'Drink 1L of water',
    icon: '💧',
    defaultDays: 7,
  },
  {
    id: '2',
    name: 'Go to the gym',
    icon: '💪',
    defaultDays: 3,
  },
  {
    id: '3',
    name: 'Read a book',
    icon: '📚',
    defaultDays: 5,
  },
  {
    id: '4',
    name: 'Meditate',
    icon: '🧘',
    defaultDays: 4,
  },
  {
    id: '5',
    name: 'Healthy meal',
    icon: '🥗',
    defaultDays: 6,
  },
];

export default function TasksScreen() {
  const [tasks, setTasks] = useState(
    PREDEFINED_TASKS.map(task => ({
      ...task,
      selectedDays: task.defaultDays,
      completed: false,
    }))
  );

  const toggleTask = (taskId: string) => {
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const updateSelectedDays = (taskId: string, days: number) => {
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId ? { ...task, selectedDays: days } : task
      )
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a1a1a', '#2a1a2a']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Daily Tasks</Text>
        <Text style={styles.headerSubtitle}>Track your daily progress</Text>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {tasks.map(task => (
          <TouchableOpacity
            key={task.id}
            style={[
              styles.taskCard,
              task.completed && styles.taskCardCompleted
            ]}
            onPress={() => toggleTask(task.id)}
          >
            <View style={styles.taskHeader}>
              <Text style={styles.taskIcon}>{task.icon}</Text>
              <Text style={[
                styles.taskName,
                task.completed && styles.taskNameCompleted
              ]}>
                {task.name}
              </Text>
              {task.completed && (
                <CheckCircle2 size={24} color="#22c55e" style={styles.checkIcon} />
              )}
            </View>

            <View style={styles.daysSelector}>
              {[...Array(7)].map((_, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dayButton,
                    index < task.selectedDays && styles.dayButtonSelected
                  ]}
                  onPress={() => updateSelectedDays(task.id, index + 1)}
                >
                  <Text style={[
                    styles.dayButtonText,
                    index < task.selectedDays && styles.dayButtonTextSelected
                  ]}>
                    {index + 1}
                  </Text>
                </TouchableOpacity>
              ))}
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
    paddingTop: Platform.OS === 'web' ? 60 : 40,
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
  },
  content: {
    flex: 1,
    padding: 16,
  },
  taskCard: {
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
  taskCardCompleted: {
    backgroundColor: '#f0fdf4',
    borderColor: '#22c55e',
    borderWidth: 1,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  taskIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  taskName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1f2937',
    flex: 1,
  },
  taskNameCompleted: {
    color: '#22c55e',
  },
  checkIcon: {
    marginLeft: 12,
  },
  daysSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  dayButton: {
    flex: 1,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButtonSelected: {
    backgroundColor: '#9333ea',
  },
  dayButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#6b7280',
  },
  dayButtonTextSelected: {
    color: '#ffffff',
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