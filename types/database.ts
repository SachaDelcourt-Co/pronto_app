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
  taskName: string;
  description?: string;
  daysSelected: number[];
  status: boolean;
  timestamp: Date;
}

export interface Appointment {
  userID: string;
  appointmentName: string;
  description: string;
  date: Date;
  time: string;
  address?: string;
  notificationTimes: Date[];
}

export interface Reminder {
  userID: string;
  reminderName: string;
  date: Date;
  time: string;
  isRecurring: boolean;
  daysOfWeek?: number[];
  notificationTimes: string[];
  active: boolean;
}

export interface Note {
  userID: string;
  title: string;
  content: string;
  createdAt: Date;
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