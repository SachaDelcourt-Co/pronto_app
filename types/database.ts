export interface User {
  userID: string;
  email: string;
  name: string;
  language: 'fr' | 'nl' | 'en' | 'es' | 'pt' | 'it';
  motivations: Array<'sport' | 'business' | 'studies' | 'wellbeing' | 'parenting' | 'personalDevelopment' | 'financialManagement'>;
  role?: 'USER' | 'ADMINISTRATEUR GENERAL';
  createdAt: Date;
}

export interface Task {
  userID: string;
  taskID?: string;
  taskName: string;
  description?: string | null;
  daysSelected: number;
  daysDone: number;
  status: 'active' | 'completed' | 'archived';
  lastCompletedDate?: string;
  createdAt: Date;
  timestamp: Date;
}

export interface Appointment {
  userID: string;
  appointmentID?: string;
  appointmentName: string;
  description: string;
  date: Date;
  startTime: string;
  endTime: string;
  allDay?: boolean;
  address?: string;
  notificationTimes: Date[];
  color?: string;
  createdAt: Date;
  updatedAt: Date;
  isRecurring?: boolean;
  recurrencePattern?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurrenceEndDate?: Date | null;
}

export interface Reminder {
  userID: string;
  reminderID?: string;
  reminderName: string;
  date: Date;
  time: string;
  isRecurring: boolean;
  daysOfWeek?: number[];
  notificationTimes: string[];
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Note {
  userID: string;
  noteID?: string;
  title: string;
  content: string;
  folderID?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Folder {
  userID: string;
  folderID?: string;
  folderName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SundayReport {
  userID: string;
  completionPercentage: number;
  reportDetails: {
    [day: string]: {
      completed: number;
      total: number;
    };
  };
  motivationalFeedback: string;
  reportDate: Date;
}

export interface SupportChat {
  userID: string;
  chatStatus: 'active' | 'closed';
  createdAt: Date;
}

export interface ChatMessage {
  sender: string;
  messageText: string;
  timestamp: Date;
}

export interface Notification {
  userID: string;
  notificationType: 'Motivation' | 'Appointment' | 'Reminder' | 'SundayReport';
  scheduledTime: Date;
  status: 'sent' | 'pending';
}

export interface MotivationalPhrase {
  category: string;
  phrases: string[];
  updatedAt: Date;
}

export interface EncouragementPhrase {
  range: string;
  phrases: string[];
}

export interface AdminAnalytics {
  date: Date;
  activeUsers: number;
  totalUsers: number;
  newUsers: number;
}

export interface SuspiciousActivity {
  timestamp: Date;
  type: 'mass_account_creation' | 'repeated_failed_login' | 'unusual_activity';
  details: string;
  ipAddress: string;
  resolved: boolean;
}