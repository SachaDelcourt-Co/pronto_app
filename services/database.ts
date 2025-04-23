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