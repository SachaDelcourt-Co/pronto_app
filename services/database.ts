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
      
      // Create a clean object without undefined values
      const cleanData: Record<string, any> = {};
      Object.entries(appointmentData).forEach(([key, value]) => {
        if (value !== undefined) {
          cleanData[key] = value;
        }
      });
      
      const newAppointment = {
        ...cleanData,
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

  // Add these internal cache variables for appointments
  _appointmentCache: new Map<string, any>(),
  
  // Add a function to clear appointment cache
  clearAppointmentCache(): void {
    this._appointmentCache.clear();
    console.log("Appointment cache cleared");
  },

  async deleteAppointment(appointmentId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'appointments', appointmentId));
      
      // Clear all appointment-related cache
      this.clearAppointmentCache();
    } catch (error) {
      console.error("Error deleting appointment:", error);
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
      // Generate a cache key based on the query parameters
      const cacheKey = `getUserAppointments:${userId}:${JSON.stringify(options || {})}`;
      
      // Check if we have a cached result
      if (this._appointmentCache.has(cacheKey)) {
        console.log("Using cached appointments for", cacheKey);
        return this._appointmentCache.get(cacheKey);
      }
      
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
      
      const appointments = querySnapshot.docs.map(doc => {
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
        const convertedNotificationTimes = notificationTimes.map((time: any) => 
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
      
      // Cache the result
      this._appointmentCache.set(cacheKey, appointments);
      
      return appointments;
    } catch (error) {
      console.error("Error fetching user appointments:", error);
      return [];
    }
  },
  
  async getUpcomingAppointments(userId: string, limitCount: number = 3, startDate?: Date): Promise<Appointment[]> {
    try {
      // Use the getUserAppointments with appropriate options to leverage the same cache
      const now = startDate || new Date();
      return this.getUserAppointments(userId, {
        startDate: now,
        limit: limitCount
      });
    } catch (error) {
      console.error("Error fetching upcoming appointments:", error);
      return [];
    }
  },
  
  async getAppointmentsByDate(userId: string, date: Date, endDate?: Date): Promise<Appointment[]> {
    try {
      // Generate a cache key
      const endDateStr = endDate ? endDate.toISOString() : "";
      const cacheKey = `getAppointmentsByDate:${userId}:${date.toISOString()}:${endDateStr}`;
      
      // Check if we have a cached result
      if (this._appointmentCache.has(cacheKey)) {
        console.log("Using cached appointments for date", date);
        return this._appointmentCache.get(cacheKey);
      }
      
      // If endDate is provided, we're looking for appointments in a date range
      if (endDate) {
        // Get all appointments in the date range
        const appointments = await this.getUserAppointments(userId, {
          startDate: date,
          endDate: endDate
        });
        
        // Cache the result
        this._appointmentCache.set(cacheKey, appointments);
        
        return appointments;
      }
      
      // Otherwise, we're looking for appointments on a specific date
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
        const notificationTimes = (data.notificationTimes || []).map((time: any) => 
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
          const notificationTimes = (data.notificationTimes || []).map((time: any) => 
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
      const result = [...appointments, ...matchingRecurringAppointments];
      
      // Cache the result
      this._appointmentCache.set(cacheKey, result);
      
      return result;
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
  
  async getDatesWithAppointments(userId: string, startDate: Date, endDate: Date): Promise<Date[]> {
    try {
      // Generate a cache key
      const cacheKey = `getDatesWithAppointments:${userId}:${startDate.toISOString()}:${endDate.toISOString()}`;
      
      // Check if we have a cached result
      if (this._appointmentCache.has(cacheKey)) {
        console.log("Using cached dates with appointments");
        return this._appointmentCache.get(cacheKey);
      }
      
      console.log(`Getting dates with appointments for user ${userId} from ${startDate.toISOString()} to ${endDate.toISOString()}`);
      
      // Create clean date objects to avoid timezone issues
      const cleanStartDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0);
      const cleanEndDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59);
      
      console.log(`Using clean date range: ${cleanStartDate.toISOString()} to ${cleanEndDate.toISOString()}`);
      
      // Get all appointments in this date range
      const appointments = await this.getUserAppointments(userId, {
        startDate: cleanStartDate,
        endDate: cleanEndDate
      });
      
      // Extract dates from appointments
      const datesWithAppointments = new Set<string>();
      
      appointments.forEach(appointment => {
        const date = appointment.date;
        
        // Format date as YYYY-MM-DD string in local timezone
        const localDateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        
        console.log(`Appointment on date: ${localDateString} (from ${date.toISOString()})`);
        datesWithAppointments.add(localDateString);
      });
      
      // Process recurring appointments
      const recurringAppointmentsQuery = query(
        collection(db, 'appointments'),
        where('userID', '==', userId),
        where('isRecurring', '==', true)
      );
      
      const recurringSnapshot = await getDocs(recurringAppointmentsQuery);
      console.log(`Found ${recurringSnapshot.size} recurring appointments`);
      
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
        const currentDate = new Date(cleanStartDate);
        while (currentDate <= cleanEndDate) {
          if (this.doesRecurringAppointmentOccurOnDate(appointment, currentDate)) {
            // Format as YYYY-MM-DD in local timezone
            const localDateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
            
            console.log(`Recurring appointment on date: ${localDateString}`);
            datesWithAppointments.add(localDateString);
          }
          // Clone the date to avoid modifying the same object
          currentDate.setDate(currentDate.getDate() + 1);
        }
      });
      
      // Convert back to Date objects, using local parsing
      const result = Array.from(datesWithAppointments).map(dateString => {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day);
      });
      
      console.log(`Returning ${result.length} dates with appointments`);
      
      // Cache the result
      this._appointmentCache.set(cacheKey, result);
      
      return result;
    } catch (error) {
      console.error("Error fetching dates with appointments:", error);
      return [];
    }
  },

  // Reminder operations
  async createReminder(reminderData: Omit<Reminder, 'reminderID' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const reminderRef = collection(db, 'reminders');
      const now = new Date();
      
      const newReminder = {
        ...reminderData,
        createdAt: now,
        updatedAt: now
      };
      
      const docRef = await addDoc(reminderRef, newReminder);
      await updateDoc(docRef, { reminderID: docRef.id });
      return docRef.id;
    } catch (error) {
      console.error("Error creating reminder:", error);
      throw error;
    }
  },

  async getUserReminders(userId: string, options?: { limit?: number, active?: boolean }): Promise<Reminder[]> {
    try {
      // Start with base query
      let remindersQuery = query(
        collection(db, 'reminders'),
        where('userID', '==', userId)
      );
      
      // Add active filter if specified
      if (options?.active !== undefined) {
        remindersQuery = query(
          remindersQuery,
          where('active', '==', options.active)
        );
      }
      
      // Always order by date
      remindersQuery = query(
        remindersQuery,
        orderBy('date', 'asc')
      );
      
      // Apply limit if specified
      if (options?.limit) {
        remindersQuery = query(remindersQuery, limit(options.limit));
      }
      
      const querySnapshot = await getDocs(remindersQuery);
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        
        // Convert date timestamp
        let date = data.date;
        if (date) {
          date = date instanceof Timestamp ? date.toDate() : date;
        }
        
        // Convert createdAt timestamp
        let createdAt = data.createdAt;
        if (createdAt) {
          createdAt = createdAt instanceof Timestamp ? createdAt.toDate() : createdAt;
        } else {
          createdAt = new Date();
        }
        
        // Convert updatedAt timestamp
        let updatedAt = data.updatedAt;
        if (updatedAt) {
          updatedAt = updatedAt instanceof Timestamp ? updatedAt.toDate() : updatedAt;
        } else {
          updatedAt = new Date();
        }
        
        return {
          ...data,
          reminderID: doc.id,
          date: date,
          createdAt: createdAt,
          updatedAt: updatedAt
        } as unknown as Reminder;
      });
    } catch (error) {
      console.error("Error fetching user reminders:", error);
      return [];
    }
  },

  async getRemindersByDate(userId: string, date: Date): Promise<Reminder[]> {
    try {
      // Convert the provided date to start and end of day
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      // Query for non-recurring reminders on the specific date
      const remindersQuery = query(
        collection(db, 'reminders'),
        where('userID', '==', userId),
        where('active', '==', true),
        where('date', '>=', startOfDay),
        where('date', '<=', endOfDay)
      );
      
      const querySnapshot = await getDocs(remindersQuery);
      
      // Process each document
      const reminders = querySnapshot.docs.map(doc => {
        const data = doc.data();
        
        // Convert date timestamp
        let date = data.date instanceof Timestamp ? data.date.toDate() : data.date;
        let createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt || new Date());
        let updatedAt = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt || new Date());
        
        return {
          ...data,
          reminderID: doc.id,
          date: date,
          createdAt: createdAt,
          updatedAt: updatedAt
        } as unknown as Reminder;
      });
      
      // Query for recurring reminders
      const recurringRemindersQuery = query(
        collection(db, 'reminders'),
        where('userID', '==', userId),
        where('active', '==', true),
        where('isRecurring', '==', true)
      );
      
      const recurringSnapshot = await getDocs(recurringRemindersQuery);
      
      // Filter recurring reminders for the target day of week
      const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      const matchingRecurringReminders = recurringSnapshot.docs
        .map(doc => {
          const data = doc.data();
          
          // Skip if daysOfWeek doesn't include this day
          if (!data.daysOfWeek || !data.daysOfWeek.includes(dayOfWeek)) {
            return null;
          }
          
          // Convert date timestamp
          let reminderDate = data.date instanceof Timestamp ? data.date.toDate() : data.date;
          
          // Only include the reminder if the selected date is on or after the initial reminder date
          if (startOfDay < reminderDate) {
            return null;
          }
          
          let createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt || new Date());
          let updatedAt = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt || new Date());
          
          return {
            ...data,
            reminderID: doc.id,
            date: reminderDate,
            createdAt: createdAt,
            updatedAt: updatedAt
          } as unknown as Reminder;
        })
        .filter(Boolean) as Reminder[];
      
      // Combine regular and recurring reminders
      return [...reminders, ...matchingRecurringReminders];
    } catch (error) {
      console.error("Error fetching reminders by date:", error);
      return [];
    }
  },

  async getUpcomingReminders(userId: string, limitCount: number = 3): Promise<Reminder[]> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Get non-recurring reminders first
      const nonRecurringQuery = query(
      collection(db, 'reminders'),
      where('userID', '==', userId),
      where('active', '==', true),
        where('date', '>=', today),
      orderBy('date', 'asc'),
        limit(limitCount)
      );
      
      const nonRecurringSnapshot = await getDocs(nonRecurringQuery);
      
      let nonRecurringReminders = nonRecurringSnapshot.docs.map(doc => {
        const data = doc.data();
        
        // Convert date timestamp
        let date = data.date instanceof Timestamp ? data.date.toDate() : data.date;
        let createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt || new Date());
        let updatedAt = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt || new Date());
        
        return {
          ...data,
          reminderID: doc.id,
          date: date,
          createdAt: createdAt,
          updatedAt: updatedAt
        } as unknown as Reminder;
      });
      
      // Get recurring reminders
      const recurringQuery = query(
        collection(db, 'reminders'),
        where('userID', '==', userId),
        where('active', '==', true),
        where('isRecurring', '==', true)
      );
      
      const recurringSnapshot = await getDocs(recurringQuery);
      
      // Filter recurring reminders for the upcoming week
      const upcomingDays: Array<{date: Date, dayOfWeek: number}> = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        upcomingDays.push({
          date: date,
          dayOfWeek: date.getDay()
        });
      }
      
      let recurringReminders: Reminder[] = [];
      
      recurringSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const daysOfWeek = data.daysOfWeek || [];
        
        // Convert timestamps for the reminder's initial date
        let reminderDate = data.date instanceof Timestamp ? data.date.toDate() : data.date;
        let createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt || new Date());
        let updatedAt = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt || new Date());
        
        // Find the next occurrence of this reminder within the upcoming days
        const nextOccurrence = upcomingDays.find(day => {
          // Only include if:
          // 1. The day of week matches
          // 2. The occurrence date is on or after the initial reminder date
          return daysOfWeek.includes(day.dayOfWeek) && 
                 day.date.getTime() >= reminderDate.setHours(0, 0, 0, 0);
        });
        
        if (nextOccurrence) {
          // Create a new date object for the next occurrence
          const nextDate = new Date(nextOccurrence.date);
          // Match the time from the original reminder
          nextDate.setHours(reminderDate.getHours(), reminderDate.getMinutes(), 0, 0);
          
          recurringReminders.push({
            ...data,
            reminderID: doc.id,
            date: nextDate, // Use the next occurrence date
            createdAt: createdAt,
            updatedAt: updatedAt
          } as unknown as Reminder);
        }
      });
      
      // Combine and sort all reminders
      const allReminders = [...nonRecurringReminders, ...recurringReminders];
      allReminders.sort((a, b) => a.date.getTime() - b.date.getTime());
      
      // Return only the requested number of reminders
      return allReminders.slice(0, limitCount);
    } catch (error) {
      console.error("Error fetching upcoming reminders:", error);
      return [];
    }
  },
  
  async getDatesWithReminders(userId: string, startDate: Date, endDate: Date): Promise<Date[]> {
    try {
      // Create clean date objects to avoid timezone issues
      const cleanStartDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0);
      const cleanEndDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59);
      
      console.log(`Getting dates with reminders from ${cleanStartDate.toISOString()} to ${cleanEndDate.toISOString()}`);
      
      // Get non-recurring reminders in this date range
      const remindersQuery = query(
        collection(db, 'reminders'),
        where('userID', '==', userId),
        where('active', '==', true),
        where('date', '>=', cleanStartDate),
        where('date', '<=', cleanEndDate)
      );
      
      const querySnapshot = await getDocs(remindersQuery);
      console.log(`Found ${querySnapshot.size} non-recurring reminders in date range`);
      
      // Extract dates from reminders
      const datesWithReminders = new Set<string>();
      
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        const date = data.date instanceof Timestamp ? data.date.toDate() : data.date;
        
        // Format date as YYYY-MM-DD string in local timezone
        const localDateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        console.log(`Adding non-recurring reminder on date: ${localDateString}`);
        datesWithReminders.add(localDateString);
      });
      
      // Get recurring reminders
      const recurringQuery = query(
        collection(db, 'reminders'),
        where('userID', '==', userId),
        where('active', '==', true),
        where('isRecurring', '==', true)
      );
      
      const recurringSnapshot = await getDocs(recurringQuery);
      console.log(`Found ${recurringSnapshot.size} recurring reminders to process`);
      
      // For each recurring reminder, add dates that match the days of week
      recurringSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const daysOfWeek = data.daysOfWeek || [];
        
        // Skip if no days of week specified
        if (daysOfWeek.length === 0) return;
        
        // Get initial reminder date for checking
        const initialDate = data.date instanceof Timestamp ? data.date.toDate() : data.date;
        const initialDateTime = initialDate.getTime();
        
        // Check each day in the range
        const currentDate = new Date(cleanStartDate);
        while (currentDate <= cleanEndDate) {
          const dayOfWeek = currentDate.getDay();
          
          // Only include dates that:
          // 1. Match one of the days of week AND
          // 2. Are on or after the initial reminder date
          if (daysOfWeek.includes(dayOfWeek) && currentDate.getTime() >= initialDateTime) {
            // Format as YYYY-MM-DD in local timezone
            const localDateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
            console.log(`Adding recurring reminder on date: ${localDateString}`);
            datesWithReminders.add(localDateString);
          }
          
          // Clone the date and move to the next day
          currentDate.setDate(currentDate.getDate() + 1);
        }
      });
      
      // Convert back to Date objects, using local parsing
      const result = Array.from(datesWithReminders).map(dateString => {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day);
      });
      
      console.log(`Returning ${result.length} dates with reminders`);
      return result;
    } catch (error) {
      console.error("Error fetching dates with reminders:", error);
      return [];
    }
  },
  
  async updateReminder(reminderId: string, reminderData: Partial<Omit<Reminder, 'reminderID' | 'createdAt'>>): Promise<void> {
    try {
      const updateData = {
        ...reminderData,
        updatedAt: new Date()
      };
      
      await updateDoc(doc(db, 'reminders', reminderId), updateData);
    } catch (error) {
      console.error("Error updating reminder:", error);
      throw error;
    }
  },
  
  async deleteReminder(reminderId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'reminders', reminderId));
    } catch (error) {
      console.error("Error deleting reminder:", error);
      throw error;
    }
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