import { db } from '@/utils/firebase';
import { collection, doc, setDoc, getDoc, query, where, getDocs, updateDoc, deleteDoc, orderBy, limit } from 'firebase/firestore';
import type { User, Task, Appointment, Reminder, Note, SupportChat, ChatMessage } from '@/types/database';

export const DatabaseService = {
  // User operations
  async createUser(userData: Omit<User, 'userID' | 'createdAt'>): Promise<void> {
    const { auth } = await import('@/utils/firebase');
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
  async createTask(taskData: Omit<Task, 'timestamp'>): Promise<void> {
    const taskRef = doc(collection(db, 'tasks'));
    await setDoc(taskRef, {
      ...taskData,
      timestamp: new Date()
    });
  },

  async getUserTasks(userId: string): Promise<Task[]> {
    const q = query(
      collection(db, 'tasks'),
      where('userID', '==', userId),
      orderBy('timestamp', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as Task);
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