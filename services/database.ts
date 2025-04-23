import { db } from '@/utils/firebase';
import { collection, doc, setDoc, getDoc, query, where, getDocs, updateDoc, deleteDoc, orderBy, limit, addDoc, Timestamp } from 'firebase/firestore';
import { auth } from '@/utils/firebase';
import type { User, Task, Appointment, Reminder, Note, SupportChat, ChatMessage, Folder } from '@/types/database';

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
  async createAppointment(appointmentData: Omit<Appointment, 'appointmentID' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const appointmentRef = collection(db, 'appointments');
      const now = new Date();
      
      const newAppointment = {
        ...appointmentData,
        createdAt: now,
        updatedAt: now
      };
      
      const docRef = await addDoc(appointmentRef, newAppointment);
      await updateDoc(docRef, { appointmentID: docRef.id });
      return docRef.id;
    } catch (error) {
      console.error("Error creating appointment:", error);
      throw error;
    }
  },

  async getUserAppointments(userId: string, options?: { 
    limit?: number, 
    startDate?: Date, 
    endDate?: Date, 
    includeRecurring?: boolean 
  }): Promise<Appointment[]> {
    try {
      // Start building the query
      let appointmentsQuery = query(
        collection(db, 'appointments'),
        where('userID', '==', userId)
      );
      
      // Add date range filter if provided
      if (options?.startDate) {
        appointmentsQuery = query(
          appointmentsQuery,
          where('date', '>=', options.startDate)
        );
      }
      
      // Always order by date
      appointmentsQuery = query(
        appointmentsQuery,
        orderBy('date', 'asc')
      );
      
      // Apply limit if specified
      if (options?.limit) {
        appointmentsQuery = query(appointmentsQuery, limit(options.limit));
      }
      
      const querySnapshot = await getDocs(appointmentsQuery);
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        
        // Safely convert dates and timestamps
        let date = data.date;
        if (date) {
          date = date instanceof Timestamp ? date.toDate() : date;
        }
        
        let createdAt = data.createdAt;
        if (createdAt) {
          createdAt = createdAt instanceof Timestamp ? createdAt.toDate() : createdAt;
        } else {
          createdAt = new Date();
        }
        
        let updatedAt = data.updatedAt;
        if (updatedAt) {
          updatedAt = updatedAt instanceof Timestamp ? updatedAt.toDate() : updatedAt;
        } else {
          updatedAt = new Date();
        }
        
        let recurrenceEndDate = data.recurrenceEndDate;
        if (recurrenceEndDate) {
          recurrenceEndDate = recurrenceEndDate instanceof Timestamp ? recurrenceEndDate.toDate() : recurrenceEndDate;
        }
        
        // Convert notificationTimes
        const notificationTimes = data.notificationTimes || [];
        const convertedNotificationTimes = notificationTimes.map(time => 
          time instanceof Timestamp ? time.toDate() : time
        );
        
        return {
          ...data,
          appointmentID: doc.id,
          date: date,
          createdAt: createdAt,
          updatedAt: updatedAt,
          recurrenceEndDate: recurrenceEndDate,
          notificationTimes: convertedNotificationTimes
        } as Appointment;
      });
    } catch (error) {
      console.error("Error fetching user appointments:", error);
      return [];
    }
  },
  
  async getAppointmentsByDate(userId: string, date: Date): Promise<Appointment[]> {
    try {
      // Convert the provided date to start and end of day
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      // Query for appointments on the specific date
      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('userID', '==', userId),
        where('date', '>=', startOfDay),
        where('date', '<=', endOfDay),
        orderBy('date', 'asc')
      );
      
      const querySnapshot = await getDocs(appointmentsQuery);
      
      // Process each document
      const appointments = querySnapshot.docs.map(doc => {
        const data = doc.data();
        
        // Convert timestamps
        let date = data.date instanceof Timestamp ? data.date.toDate() : data.date;
        let createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt || new Date());
        let updatedAt = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt || new Date());
        
        // Convert notification times
        const notificationTimes = (data.notificationTimes || []).map(time => 
          time instanceof Timestamp ? time.toDate() : time
        );
        
        return {
          ...data,
          appointmentID: doc.id,
          date: date,
          createdAt: createdAt,
          updatedAt: updatedAt,
          notificationTimes: notificationTimes
        } as Appointment;
      });
      
      // Additionally, we should check for recurring appointments
      const recurringAppointmentsQuery = query(
        collection(db, 'appointments'),
        where('userID', '==', userId),
        where('isRecurring', '==', true)
      );
      
      const recurringSnapshot = await getDocs(recurringAppointmentsQuery);
      
      // Filter recurring appointments that occur on the specified date
      const matchingRecurringAppointments = recurringSnapshot.docs
        .map(doc => {
          const data = doc.data();
          
          // Convert timestamps
          let appointmentDate = data.date instanceof Timestamp ? data.date.toDate() : data.date;
          let createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt || new Date());
          let updatedAt = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt || new Date());
          let recurrenceEndDate = data.recurrenceEndDate instanceof Timestamp ? data.recurrenceEndDate.toDate() : data.recurrenceEndDate;
          
          // Convert notification times
          const notificationTimes = (data.notificationTimes || []).map(time => 
            time instanceof Timestamp ? time.toDate() : time
          );
          
          const appointment = {
            ...data,
            appointmentID: doc.id,
            date: appointmentDate,
            createdAt: createdAt,
            updatedAt: updatedAt,
            recurrenceEndDate: recurrenceEndDate,
            notificationTimes: notificationTimes
          } as Appointment;
          
          // Check if this recurring appointment occurs on the specified date
          return this.doesRecurringAppointmentOccurOnDate(appointment, date) ? appointment : null;
        })
        .filter(Boolean) as Appointment[];
      
      // Combine regular and matching recurring appointments
      return [...appointments, ...matchingRecurringAppointments];
    } catch (error) {
      console.error("Error fetching appointments by date:", error);
      return [];
    }
  },
  
  /**
   * Check if a recurring appointment occurs on a specific date
   */
  doesRecurringAppointmentOccurOnDate(appointment: Appointment, targetDate: Date): boolean {
    if (!appointment.isRecurring) return false;
    
    const appointmentDate = appointment.date;
    const recurrenceEndDate = appointment.recurrenceEndDate;
    
    // Check if target date is beyond recurrence end date
    if (recurrenceEndDate && targetDate > recurrenceEndDate) {
      return false;
    }
    
    // Check if target date is before the first occurrence
    if (targetDate < appointmentDate) {
      return false;
    }
    
    // Calculate based on recurrence pattern
    switch (appointment.recurrencePattern) {
      case 'daily':
        // Every day
        return true;
        
      case 'weekly':
        // Same day of week
        return appointmentDate.getDay() === targetDate.getDay();
        
      case 'monthly':
        // Same day of month
        return appointmentDate.getDate() === targetDate.getDate();
        
      case 'yearly':
        // Same day of year
        return (
          appointmentDate.getMonth() === targetDate.getMonth() &&
          appointmentDate.getDate() === targetDate.getDate()
        );
        
      default:
        return false;
    }
  },
  
  async updateAppointment(appointmentId: string, appointmentData: Partial<Omit<Appointment, 'appointmentID' | 'createdAt'>>): Promise<void> {
    try {
      const updateData = {
        ...appointmentData,
        updatedAt: new Date()
      };
      
      await updateDoc(doc(db, 'appointments', appointmentId), updateData);
    } catch (error) {
      console.error("Error updating appointment:", error);
      throw error;
    }
  },
  
  async deleteAppointment(appointmentId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'appointments', appointmentId));
    } catch (error) {
      console.error("Error deleting appointment:", error);
      throw error;
    }
  },
  
  async getUpcomingAppointments(userId: string, limit: number = 3): Promise<Appointment[]> {
    try {
      const now = new Date();
      
      // Query for upcoming appointments
      const appointmentsQuery = query(
      collection(db, 'appointments'),
      where('userID', '==', userId),
        where('date', '>=', now),
      orderBy('date', 'asc'),
        limit(limit)
      );
      
      const querySnapshot = await getDocs(appointmentsQuery);
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        
        // Convert timestamps
        let date = data.date instanceof Timestamp ? data.date.toDate() : data.date;
        let createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt || new Date());
        let updatedAt = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt || new Date());
        let recurrenceEndDate = data.recurrenceEndDate instanceof Timestamp ? data.recurrenceEndDate.toDate() : data.recurrenceEndDate;
        
        // Convert notification times
        const notificationTimes = (data.notificationTimes || []).map(time => 
          time instanceof Timestamp ? time.toDate() : time
        );
        
        return {
          ...data,
          appointmentID: doc.id,
          date: date,
          createdAt: createdAt,
          updatedAt: updatedAt,
          recurrenceEndDate: recurrenceEndDate,
          notificationTimes: notificationTimes
        } as Appointment;
      });
    } catch (error) {
      console.error("Error fetching upcoming appointments:", error);
      return [];
    }
  },
  
  async getDatesWithAppointments(userId: string, startDate: Date, endDate: Date): Promise<Date[]> {
    try {
      // Query for appointments in the date range
      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('userID', '==', userId),
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      );
      
      const querySnapshot = await getDocs(appointmentsQuery);
      
      // Extract dates from appointments
      const datesWithAppointments = new Set<string>();
      
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        const date = data.date instanceof Timestamp ? data.date.toDate() : data.date;
        datesWithAppointments.add(date.toISOString().split('T')[0]);
      });
      
      // Also check recurring appointments
      const recurringAppointmentsQuery = query(
        collection(db, 'appointments'),
        where('userID', '==', userId),
        where('isRecurring', '==', true)
      );
      
      const recurringSnapshot = await getDocs(recurringAppointmentsQuery);
      
      // For each recurring appointment, check each day in the range
      recurringSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const appointment = {
          ...data,
          appointmentID: doc.id,
          date: data.date instanceof Timestamp ? data.date.toDate() : data.date,
          recurrenceEndDate: data.recurrenceEndDate instanceof Timestamp 
            ? data.recurrenceEndDate.toDate() 
            : data.recurrenceEndDate
        } as Appointment;
        
        // Check each day in the range
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
          if (this.doesRecurringAppointmentOccurOnDate(appointment, currentDate)) {
            datesWithAppointments.add(currentDate.toISOString().split('T')[0]);
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
      });
      
      // Convert back to Date objects
      return Array.from(datesWithAppointments).map(dateString => {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day);
      });
    } catch (error) {
      console.error("Error fetching dates with appointments:", error);
      return [];
    }
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
  async createNote(noteData: Omit<Note, 'noteID' | 'updatedAt'>): Promise<string> {
    try {
      const noteRef = collection(db, 'notes');
      const now = new Date();
      
      const newNote = {
      ...noteData,
        updatedAt: now,
      };
      
      const docRef = await addDoc(noteRef, newNote);
      await updateDoc(docRef, { noteID: docRef.id });
      return docRef.id;
    } catch (error) {
      console.error("Error creating note:", error);
      throw error;
    }
  },

  async getUserNotes(userId: string, folderID: string | null = null): Promise<Note[]> {
    try {
      // Query to get notes, filtered by folder if provided
      let q;
      if (folderID === null) {
        // Get notes at root level (no folder)
        q = query(
          collection(db, 'notes'),
          where('userID', '==', userId),
          where('folderID', '==', null),
          orderBy('updatedAt', 'desc')
        );
      } else {
        // Get notes in a specific folder
        q = query(
          collection(db, 'notes'),
          where('userID', '==', userId),
          where('folderID', '==', folderID),
          orderBy('updatedAt', 'desc')
        );
      }
      
      const querySnapshot = await getDocs(q);
      console.log(`Found ${querySnapshot.size} notes for user`);
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        
        // Safely convert timestamps
        let createdAt = data.createdAt;
        let updatedAt = data.updatedAt;
        
        if (createdAt) {
          createdAt = createdAt instanceof Timestamp ? createdAt.toDate() : createdAt;
        } else {
          createdAt = new Date();
        }
        
        if (updatedAt) {
          updatedAt = updatedAt instanceof Timestamp ? updatedAt.toDate() : updatedAt;
        } else {
          updatedAt = new Date();
        }
        
        return {
          ...data,
          noteID: doc.id,
          createdAt: createdAt,
          updatedAt: updatedAt,
        } as Note;
      });
    } catch (error) {
      console.error("Error fetching user notes:", error);
      return [];
    }
  },
  
  async deleteNote(noteId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'notes', noteId));
    } catch (error) {
      console.error("Error deleting note:", error);
      throw error;
    }
  },
  
  async updateNote(noteId: string, noteData: Partial<Omit<Note, 'noteID' | 'createdAt'>>): Promise<void> {
    try {
      const updateData = {
        ...noteData,
        updatedAt: new Date()
      };
      
      await updateDoc(doc(db, 'notes', noteId), updateData);
    } catch (error) {
      console.error("Error updating note:", error);
      throw error;
    }
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
  },

  // Folder operations
  async createFolder(folderData: Omit<Folder, 'folderID' | 'updatedAt'>): Promise<string> {
    try {
      const folderRef = collection(db, 'folders');
      const now = new Date();
      
      const newFolder = {
        ...folderData,
        updatedAt: now,
      };
      
      const docRef = await addDoc(folderRef, newFolder);
      await updateDoc(docRef, { folderID: docRef.id });
      return docRef.id;
    } catch (error) {
      console.error("Error creating folder:", error);
      throw error;
    }
  },
  
  async getUserFolders(userId: string): Promise<Folder[]> {
    try {
      const q = query(
        collection(db, 'folders'),
        where('userID', '==', userId),
        orderBy('folderName', 'asc')
      );
      
      const querySnapshot = await getDocs(q);
      console.log(`Found ${querySnapshot.size} folders for user`);
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        
        // Safely convert timestamps
        let createdAt = data.createdAt;
        let updatedAt = data.updatedAt;
        
        if (createdAt) {
          createdAt = createdAt instanceof Timestamp ? createdAt.toDate() : createdAt;
        } else {
          createdAt = new Date();
        }
        
        if (updatedAt) {
          updatedAt = updatedAt instanceof Timestamp ? updatedAt.toDate() : updatedAt;
        } else {
          updatedAt = new Date();
        }
        
        return {
          ...data,
          folderID: doc.id,
          createdAt: createdAt,
          updatedAt: updatedAt,
        } as Folder;
      });
    } catch (error) {
      console.error("Error fetching user folders:", error);
      return [];
    }
  },
  
  async deleteFolder(folderId: string): Promise<void> {
    try {
      // First, update all notes in this folder to have no folder (move to root)
      const notesQuery = query(
        collection(db, 'notes'),
        where('folderID', '==', folderId)
      );
      
      const querySnapshot = await getDocs(notesQuery);
      
      // Update all notes in this folder to have folderID = null
      const updatePromises = querySnapshot.docs.map(doc => {
        return updateDoc(doc.ref, { 
          folderID: null,
          updatedAt: new Date()
        });
      });
      
      await Promise.all(updatePromises);
      
      // Now delete the folder
      await deleteDoc(doc(db, 'folders', folderId));
    } catch (error) {
      console.error("Error deleting folder:", error);
      throw error;
    }
  },
};