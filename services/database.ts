import { db } from '@/utils/firebase';
import { collection, doc, setDoc, getDoc, query, where, getDocs, updateDoc, deleteDoc, orderBy, limit, addDoc, Timestamp } from 'firebase/firestore';
import { auth } from '@/utils/firebase';
import type { User, Task, Appointment, Reminder, Note, SupportChat, ChatMessage } from '@/types/database';

export const DatabaseService = {
  // User operations
  async createUser(userData: Omit<User, 'userID' | 'createdAt'>): Promise<void> {
    if (!auth.currentUser) throw new Error('User must be authenticated');
    
    const userId = auth.currentUser.uid;
    await setDoc(doc(db, 'users', userId), {
      ...userData,
      userID: userId,
      createdAt: new Date(),
      role: 'USER'
    });
  },

  async getUser(userId: string): Promise<User | null> {
    const userDoc = await getDoc(doc(db, 'users', userId));
    return userDoc.exists() ? userDoc.data() as User : null;
  },

  // Task operations
  async createTask(taskData: Omit<Task, 'timestamp' | 'taskID' | 'daysDone' | 'status' | 'createdAt'>): Promise<string> {
    const taskRef = collection(db, 'tasks');
    const now = new Date();
    
    const newTask = {
      ...taskData,
      daysDone: 0,
      status: 'active',
      createdAt: now,
      timestamp: now,
    };
    
    const docRef = await addDoc(taskRef, newTask);
    await updateDoc(docRef, { taskID: docRef.id });
    return docRef.id;
  },

  async getUserTasks(userId: string): Promise<Task[]> {
    try {
      console.log('Fetching tasks for user:', userId);
      const q = query(
        collection(db, 'tasks'),
        where('userID', '==', userId),
        orderBy('timestamp', 'desc')
      );
      const querySnapshot = await getDocs(q);
      console.log('Found tasks:', querySnapshot.size);
      
      const tasks = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Task data:', doc.id, data);
        
        // Safely convert timestamps
        let timestamp = data.timestamp;
        if (timestamp) {
          timestamp = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
        } else {
          timestamp = new Date(); // Fallback to current date if missing
        }
        
        let createdAt = data.createdAt;
        if (createdAt) {
          createdAt = createdAt instanceof Timestamp ? createdAt.toDate() : createdAt;
        } else {
          createdAt = new Date(); // Fallback to current date if missing
        }
        
        return {
          ...data,
          taskID: doc.id,
          // Ensure all required fields are present
          daysDone: data.daysDone || 0,
          daysSelected: data.daysSelected || 1,
          status: data.status || 'active',
          // Use safely converted timestamps
          timestamp: timestamp,
          createdAt: createdAt,
        } as Task;
      });
      
      console.log('Processed tasks:', tasks.length);
      return tasks;
    } catch (error) {
      console.error("Error fetching user tasks:", error);
      return [];
    }
  },

  async markTaskCompletedForToday(taskId: string): Promise<void> {
    try {
      const taskDoc = await getDoc(doc(db, 'tasks', taskId));
      if (!taskDoc.exists()) {
        throw new Error('Task not found');
      }
      
      const data = taskDoc.data();
      const task = {
        ...data,
        taskID: taskId,
        daysDone: data.daysDone || 0,
        daysSelected: data.daysSelected || 1,
      } as Task;
      
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Check if already completed today
      if (task.lastCompletedDate === today) {
        return; // Already completed today
      }
      
      const newDaysDone = (task.daysDone || 0) + 1;
      const newStatus = newDaysDone >= (task.daysSelected || 1) ? 'completed' : 'active';
      
      await updateDoc(doc(db, 'tasks', taskId), {
        daysDone: newDaysDone,
        status: newStatus,
        lastCompletedDate: today
      });
      
      console.log(`Task ${taskId} marked as completed for today`);
    } catch (error) {
      console.error("Error marking task as completed:", error);
      throw error;
    }
  },

  async getActiveDailyTasks(userId: string): Promise<Task[]> {
    try {
      console.log(`Fetching active tasks for user: ${userId}`);
      
      // Get tasks that are active (not fully completed) or completed recently
      const q = query(
        collection(db, 'tasks'),
        where('userID', '==', userId),
        orderBy('timestamp', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      console.log(`Found ${querySnapshot.size} tasks`);
      
      const tasks = querySnapshot.docs.map(doc => {
        const data = doc.data();
        
        // Safely convert timestamps
        let timestamp = data.timestamp;
        if (timestamp) {
          timestamp = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
        } else {
          timestamp = new Date(); // Fallback to current date if missing
        }
        
        let createdAt = data.createdAt;
        if (createdAt) {
          createdAt = createdAt instanceof Timestamp ? createdAt.toDate() : createdAt;
        } else {
          createdAt = new Date(); // Fallback to current date if missing
        }
        
        return {
          ...data,
          taskID: doc.id,
          // Ensure all required fields are present
          daysDone: data.daysDone || 0,
          daysSelected: data.daysSelected || 1,
          status: data.status || 'active',
          timestamp: timestamp,
          createdAt: createdAt,
        } as Task;
      });
      
      // Only include active tasks and tasks completed today
      const today = new Date().toISOString().split('T')[0];
      const filteredTasks = tasks.filter(task => 
        task.status === 'active' || 
        (task.status === 'completed' && task.lastCompletedDate === today)
      );
      
      // Sort tasks: uncompleted first, then completed for today
      const sortedTasks = filteredTasks.sort((a, b) => {
        const aCompletedToday = a.lastCompletedDate === today;
        const bCompletedToday = b.lastCompletedDate === today;
        
        if (aCompletedToday && !bCompletedToday) return 1; // a comes after b
        if (!aCompletedToday && bCompletedToday) return -1; // a comes before b
        
        // If both have same completion status, sort by name
        return a.taskName.localeCompare(b.taskName);
      });
      
      console.log(`Returning ${sortedTasks.length} tasks including completed for today`);
      return sortedTasks;
    } catch (error) {
      console.error("Error fetching active daily tasks:", error);
      return [];
    }
  },

  async deleteTask(taskId: string): Promise<void> {
    try {
      console.log(`Deleting task with ID: ${taskId}`);
      await deleteDoc(doc(db, 'tasks', taskId));
      console.log(`Task ${taskId} successfully deleted`);
    } catch (error) {
      console.error("Error deleting task:", error);
      throw error;
    }
  },

  // Appointment operations
  async createAppointment(appointmentData: Appointment): Promise<void> {
    const appointmentRef = doc(collection(db, 'appointments'));
    await setDoc(appointmentRef, appointmentData);
  },

  async getUserAppointments(userId: string): Promise<Appointment[]> {
    const q = query(
      collection(db, 'appointments'),
      where('userID', '==', userId),
      orderBy('date', 'asc'),
      limit(10)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as Appointment);
  },

  // Reminder operations
  async createReminder(reminderData: Reminder): Promise<void> {
    const reminderRef = doc(collection(db, 'reminders'));
    await setDoc(reminderRef, reminderData);
  },

  async getUserReminders(userId: string): Promise<Reminder[]> {
    const q = query(
      collection(db, 'reminders'),
      where('userID', '==', userId),
      where('active', '==', true),
      orderBy('date', 'asc'),
      limit(10)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as Reminder);
  },

  // Note operations
  async createNote(noteData: Omit<Note, 'createdAt'>): Promise<void> {
    const noteRef = doc(collection(db, 'notes'));
    await setDoc(noteRef, {
      ...noteData,
      createdAt: new Date()
    });
  },

  // Support chat operations
  async createSupportChat(userId: string): Promise<string> {
    const chatRef = doc(collection(db, 'supportChats'));
    await setDoc(chatRef, {
      userID: userId,
      chatStatus: 'active',
      createdAt: new Date()
    });
    return chatRef.id;
  },

  async addChatMessage(chatId: string, messageData: Omit<ChatMessage, 'timestamp'>): Promise<void> {
    const messageRef = doc(collection(db, `supportChats/${chatId}/messages`));
    await setDoc(messageRef, {
      ...messageData,
      timestamp: new Date()
    });
  }
};