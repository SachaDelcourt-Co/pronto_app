import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, TextInput, Modal, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CircleCheck as CheckCircle2, Plus, X, Calendar, Edit3, Trash2 } from 'lucide-react-native';
import { DatabaseService } from '@/services/database';
import type { Task } from '@/types/database';
import { useAuth } from '@/utils/AuthContext';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function TasksScreen() {
  const { t } = useTranslation();
  const { user, authInitialized } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [selectedDays, setSelectedDays] = useState(3); // Default to 3 days
  const [loading, setLoading] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  // Refresh tasks when the tab is focused
  useFocusEffect(
    React.useCallback(() => {
      console.log('Tasks tab focused, refreshing tasks');
      if (authInitialized && user) {
        loadTasks();
      }
      return () => {
        // Cleanup function when component unfocuses
      };
    }, [authInitialized, user])
  );

  useEffect(() => {
    // Load tasks when auth is initialized and user is available
    if (authInitialized) {
      loadTasks();
    }
  }, [authInitialized, user]);

  const loadTasks = async () => {
    try {
      setLoadingTasks(true);
      
      if (!user) {
        console.log('No authenticated user from AuthContext');
        setTasks([]);
        return;
      }

      console.log('Loading tasks for user:', user.uid);
      // Get all tasks including completed ones
      const userTasks = await DatabaseService.getUserTasks(user.uid);
      console.log('Loaded tasks:', userTasks.length, userTasks);
      
      // Sort tasks: active first, then completed
      const sortedTasks = [...userTasks].sort((a, b) => {
        // First check if task is completed for today
        const today = new Date().toISOString().split('T')[0];
        const aCompletedToday = a.lastCompletedDate === today;
        const bCompletedToday = b.lastCompletedDate === today;
        
        if (aCompletedToday && !bCompletedToday) return 1; // a comes after b
        if (!aCompletedToday && bCompletedToday) return -1; // a comes before b
        
        // If both have same completion status, sort by name
        return a.taskName.localeCompare(b.taskName);
      });
      
      setTasks(sortedTasks || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
      setTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleCreateTask = async () => {
    if (!newTaskName.trim()) return;
    
    try {
      setLoading(true);
      
      if (!user) {
        console.log('No authenticated user from AuthContext');
        return;
      }
      
      await DatabaseService.createTask({
        userID: user.uid,
        taskName: newTaskName.trim(),
        description: newTaskDescription.trim() || null,
        daysSelected: selectedDays,
      });
      
      // Reset form and close modal
      setNewTaskName('');
      setNewTaskDescription('');
      setSelectedDays(3);
      setIsModalVisible(false);
      
      // Reload tasks
      await loadTasks();
    } catch (error) {
      console.error('Error creating task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    console.log('handleDeleteTask called with ID:', taskId);
    // Show custom delete confirmation modal
    setTaskToDelete(taskId);
    setShowDeleteConfirmation(true);
  };

  const confirmDeleteTask = async () => {
    console.log("Delete confirmed, proceeding with deletion");
    if (taskToDelete) {
      try {
        setDeletingTaskId(taskToDelete);
        await DatabaseService.deleteTask(taskToDelete);
        console.log("Task successfully deleted, reloading tasks");
        // Reload tasks after successful deletion
        await loadTasks();
      } catch (error) {
        console.error('Error deleting task:', error);
        Alert.alert("Error", "Failed to delete task. Please try again.");
      } finally {
        setDeletingTaskId(null);
        setShowDeleteConfirmation(false);
        setTaskToDelete(null);
      }
    }
  };

  const cancelDeleteTask = () => {
    console.log("Delete canceled");
    setShowDeleteConfirmation(false);
    setTaskToDelete(null);
  };

  const renderTaskModal = () => {
    return (
      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Task</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setIsModalVisible(false)}
              >
                <X size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Task Name</Text>
              <TextInput
                style={styles.formInput}
                value={newTaskName}
                onChangeText={setNewTaskName}
                placeholder="Enter task name"
                placeholderTextColor="#666666"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Description (Optional)</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                value={newTaskDescription}
                onChangeText={setNewTaskDescription}
                placeholder="Enter description"
                placeholderTextColor="#666666"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>How many days?</Text>
              <View style={styles.daysSelector}>
                {[...Array(7)].map((_, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dayButton,
                      selectedDays === index + 1 && styles.dayButtonSelected
                    ]}
                    onPress={() => setSelectedDays(index + 1)}
                  >
                    <Text style={[
                      styles.dayButtonText,
                      selectedDays === index + 1 && styles.dayButtonTextSelected
                    ]}>
                      {index + 1}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.createButton, 
                (loading || !newTaskName.trim()) && styles.createButtonDisabled
              ]}
              onPress={handleCreateTask}
              disabled={loading || !newTaskName.trim()}
            >
              <Text style={styles.createButtonText}>
                {loading ? 'Creating...' : 'Create Task'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const renderDeleteConfirmationModal = () => {
    return (
      <Modal
        visible={showDeleteConfirmation}
        transparent
        animationType="fade"
        onRequestClose={cancelDeleteTask}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContent}>
            <Text style={styles.confirmModalTitle}>Delete Task</Text>
            <Text style={styles.confirmModalText}>
              Are you sure you want to delete this task?
            </Text>
            
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity
                style={[styles.confirmModalButton, styles.confirmModalCancelButton]}
                onPress={cancelDeleteTask}
              >
                <Text style={styles.confirmModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.confirmModalButton, styles.confirmModalDeleteButton]}
                onPress={confirmDeleteTask}
              >
                <Text style={styles.confirmModalDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a1a1a', '#2a1a2a']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Daily Tasks</Text>
        <Text style={styles.headerSubtitle}>Create and track your tasks</Text>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {loadingTasks ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#9333ea" />
            <Text style={styles.loadingText}>Loading tasks...</Text>
          </View>
        ) : tasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Calendar size={48} color="#9333ea" />
            <Text style={styles.emptyStateTitle}>No Tasks Yet</Text>
            <Text style={styles.emptyStateText}>
              Create your first task to start building healthy habits
            </Text>
          </View>
        ) : (
          tasks.map(task => {
            console.log('Rendering task:', task);
            if (!task || !task.taskID) {
              console.log('Skipping invalid task');
              return null;
            }
            
            // Check if the task is completed for today
            const today = new Date().toISOString().split('T')[0];
            const isCompletedToday = task.lastCompletedDate === today;
            
            return (
              <View
                key={task.taskID}
                style={[
                  styles.taskCard,
                  isCompletedToday && styles.taskCardCompleted
                ]}
              >
                <View style={styles.taskHeader}>
                  <View style={styles.taskIconContainer}>
                    <Text style={styles.taskIcon}>
                      {isCompletedToday ? '✅' : '📌'}
                    </Text>
                  </View>
                  <View style={styles.taskInfo}>
                    <Text style={[
                      styles.taskName,
                      isCompletedToday && styles.taskNameCompleted
                    ]}>
                      {task.taskName || 'Unnamed Task'}
                    </Text>
                    {task.description ? (
                      <Text style={[
                        styles.taskDescription,
                        isCompletedToday && styles.taskDescriptionCompleted
                      ]} numberOfLines={2}>
                        {task.description}
                      </Text>
                    ) : null}
                  </View>
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => {
                      console.log('Delete button pressed for task:', task.taskID);
                      if (task.taskID) {
                        handleDeleteTask(task.taskID);
                      } else {
                        console.error('Task ID is undefined');
                      }
                    }}
                    disabled={deletingTaskId === task.taskID}
                  >
                    {deletingTaskId === task.taskID ? (
                      <ActivityIndicator size="small" color="#ef4444" />
                    ) : (
                      <Trash2 size={18} color="#ef4444" />
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.taskProgress}>
                  <Text style={[
                    styles.progressText,
                    isCompletedToday && styles.progressTextCompleted
                  ]}>
                    {`Progress: ${task.daysDone || 0} / ${task.daysSelected || 1} days`}
                  </Text>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${((task.daysDone || 0) / (task.daysSelected || 1)) * 100}%` }
                      ]}
                    />
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => setIsModalVisible(true)}
      >
        <Plus size={24} color="#ffffff" />
      </TouchableOpacity>

      {renderTaskModal()}
      {renderDeleteConfirmationModal()}
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
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
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
    backgroundColor: '#f9fafb',
    opacity: 0.8,
    borderColor: '#e5e7eb',
    borderWidth: 1,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  taskIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(147, 51, 234, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  taskIcon: {
    fontSize: 24,
  },
  taskInfo: {
    flex: 1,
  },
  taskName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1f2937',
    marginBottom: 4,
  },
  taskNameCompleted: {
    textDecorationLine: 'line-through',
    color: '#9ca3af',
  },
  taskDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6b7280',
    lineHeight: 20,
  },
  taskDescriptionCompleted: {
    textDecorationLine: 'line-through',
    color: '#9ca3af',
  },
  taskProgress: {
    marginTop: 8,
  },
  progressText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#4b5563',
    marginBottom: 6,
  },
  progressTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#9ca3af',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#9333ea',
    borderRadius: 4,
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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1f2937',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formField: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#4b5563',
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1f2937',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  daysSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  dayButton: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dayButtonSelected: {
    backgroundColor: '#9333ea',
    borderColor: '#9333ea',
  },
  dayButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#6b7280',
  },
  dayButtonTextSelected: {
    color: '#ffffff',
  },
  createButton: {
    backgroundColor: '#9333ea',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  createButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  createButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
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
    fontFamily: 'Inter-Bold',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmModalText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
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
    fontFamily: 'Inter-SemiBold',
    color: '#4b5563',
  },
  confirmModalDeleteText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
}); 