import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMotivationalQuotes } from './data/motivationalQuotes';
import { DatabaseService } from '@/services/database';
import { Task } from '@/types/database';
import i18n from './i18n';
import * as Notifications from 'expo-notifications';

// Keys for AsyncStorage
const LAST_REPORT_DATE_KEY = 'last_weekly_report_date';
const REPORT_VIEWED_KEY = 'weekly_report_viewed';
const REPORT_DATA_KEY = 'weekly_report_data';

// Interface for task completion logs
interface TaskCompletionLog {
  taskID: string;
  completedAt: string; // ISO date string
  userID: string;
}

// Interface for weekly report data
export interface WeeklyReportData {
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  completionRate: number; // 0-100
  tasksCompleted: Array<{
    taskName: string;
    completedDays: number;
    totalDays: number;
  }>;
  motivationalPhrase: string;
  generatedAt: string; // ISO date string
}

/**
 * Check if it's time to generate a new weekly report
 */
export const shouldGenerateWeeklyReport = async (): Promise<boolean> => {
  try {
    const now = new Date();
    const day = now.getDay(); // 0 is Sunday
    const hours = now.getHours();
    
    // Only generate report on Sunday after 8pm
    const isSundayEvening = day === 0 && hours >= 20;
    
    if (!isSundayEvening) {
      return false;
    }
    
    // Check if we've already generated a report today
    const lastReportDateStr = await AsyncStorage.getItem(LAST_REPORT_DATE_KEY);
    if (!lastReportDateStr) {
      return true; // No report has ever been generated
    }
    
    const lastReportDate = new Date(lastReportDateStr);
    const today = new Date();
    
    // Check if the last report was generated on a different day
    return (
      lastReportDate.getFullYear() !== today.getFullYear() ||
      lastReportDate.getMonth() !== today.getMonth() ||
      lastReportDate.getDate() !== today.getDate()
    );
  } catch (error) {
    console.error('Error in shouldGenerateWeeklyReport:', error);
    return false;
  }
};

/**
 * Force generation of a weekly report (for development/testing)
 */
export const forceGenerateWeeklyReport = async (userId: string): Promise<WeeklyReportData | null> => {
  try {
    const report = await generateWeeklyReport(userId);
    if (report) {
      // Mark as unviewed so it will show
      await AsyncStorage.setItem(REPORT_VIEWED_KEY, 'false');
    }
    return report;
  } catch (error) {
    console.error('Error forcing weekly report generation:', error);
    return null;
  }
};

/**
 * Temporary function to get task completion logs until implemented in DatabaseService
 */
const getTaskCompletionLogs = async (
  userId: string,
  startDate: string,
  endDate: string
): Promise<TaskCompletionLog[]> => {
  // Get all tasks for the user
  const tasks = await DatabaseService.getUserTasks(userId);
  
  // For a more accurate representation, we'll use the lastCompletedDate
  // and the task completion data
  const logs: TaskCompletionLog[] = [];
  
  tasks.forEach(task => {
    if (task.taskID) {
      // If task has last completed date, use it
      if (task.lastCompletedDate) {
        const completedDate = new Date(task.lastCompletedDate);
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // If the completion date is within our range, add it to logs
        if (completedDate >= start && completedDate <= end) {
          logs.push({
            taskID: task.taskID,
            completedAt: task.lastCompletedDate,
            userID: userId
          });
        }
      }
      
      // Use task completion history (daysDone)
      if (task.daysDone && task.daysDone > 0) {
        const taskCreatedAt = new Date(task.createdAt);
        const start = new Date(startDate);
        
        // Only consider tasks created before the start of our period
        if (taskCreatedAt <= start) {
          // For tasks with completion history, add synthetic logs based on daysDone
          // if we didn't find a lastCompletedDate
          const existingLogs = logs.filter(log => log.taskID === task.taskID).length;
          if (existingLogs === 0 && task.daysDone > 0) {
            // Add entries for completed days, but not more than the last week
            const entries = Math.min(7, task.daysDone);
            
            // Add synthetic entries, spaced throughout the week
            for (let i = 0; i < entries; i++) {
              const syntheticDate = new Date(start);
              syntheticDate.setDate(start.getDate() + i);
              
              logs.push({
                taskID: task.taskID,
                completedAt: syntheticDate.toISOString(),
                userID: userId
              });
            }
          }
        }
      }
    }
  });
  
  return logs;
};

/**
 * Generate a weekly report for the user
 */
export const generateWeeklyReport = async (userId: string): Promise<WeeklyReportData | null> => {
  try {
    const now = new Date();
    const endDate = new Date(now);
    
    // Set to the start of the day (Sunday)
    endDate.setHours(0, 0, 0, 0);
    
    // Calculate start date (previous Monday)
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 6); // 6 days before Sunday = Monday
    
    // Get all active tasks for the user
    const tasks = await DatabaseService.getUserTasks(userId);
    // Include both active tasks and recently completed tasks
    const eligibleTasks = tasks.filter(task => 
      task.status === 'active' || 
      (task.status === 'completed' && 
        task.lastCompletedDate && 
        new Date(task.lastCompletedDate) >= startDate)
    );
    
    if (eligibleTasks.length === 0) {
      console.log("No active or recently completed tasks found for weekly report");
      return null;
    }
    
    // Create a date range array for the week (Monday to Sunday)
    const dateRange: string[] = [];
    const tempDate = new Date(startDate);
    
    while (tempDate <= endDate) {
      dateRange.push(tempDate.toISOString().split('T')[0]);
      tempDate.setDate(tempDate.getDate() + 1);
    }
    
    // Get task completion logs
    const taskCompletionLogs: TaskCompletionLog[] = await getTaskCompletionLogs(
      userId,
      startDate.toISOString(),
      endDate.toISOString()
    );
    
    console.log(`Found ${taskCompletionLogs.length} completion logs for the week`);
    
    // Map of date -> taskId -> completed
    const completionMap: Record<string, Record<string, boolean>> = {};
    
    // Initialize completion map with all dates and tasks
    dateRange.forEach(date => {
      completionMap[date] = {};
      eligibleTasks.forEach(task => {
        if (task.taskID) {
          completionMap[date][task.taskID] = false;
        }
      });
    });
    
    // Fill in completion data from logs
    taskCompletionLogs.forEach(log => {
      const logDate = new Date(log.completedAt).toISOString().split('T')[0];
      if (dateRange.includes(logDate) && log.taskID) {
        if (completionMap[logDate]) {
          completionMap[logDate][log.taskID] = true;
        }
      }
    });
    
    // Track task-specific completion data - use taskID as key to avoid duplicates
    const taskCompletionData: Record<string, { completed: number, total: number, name: string }> = {};
    
    // Initialize task completion tracking, ignore duplicates
    const processedTaskIds = new Set<string>();
    eligibleTasks.forEach(task => {
      if (task.taskID && !processedTaskIds.has(task.taskID)) {
        processedTaskIds.add(task.taskID);
        taskCompletionData[task.taskID] = {
          completed: 0,
          total: 0,
          name: task.taskName
        };
      }
    });
    
    // Count completions per task per day
    let totalPossibleCompletions = 0;
    let totalActualCompletions = 0;
    
    // First, directly count from logs to ensure accuracy
    taskCompletionLogs.forEach(log => {
      const logDate = new Date(log.completedAt).toISOString().split('T')[0];
      if (dateRange.includes(logDate) && log.taskID && taskCompletionData[log.taskID]) {
        // Only count once per day per task
        if (!completionMap[logDate][log.taskID]) {
          completionMap[logDate][log.taskID] = true;
          taskCompletionData[log.taskID].completed++;
          totalActualCompletions++;
        }
      }
    });
    
    // Then count total possible completions based on task creation dates
    dateRange.forEach(date => {
      eligibleTasks.forEach(task => {
        if (task.taskID && taskCompletionData[task.taskID]) {
          // Only count days when the task was already created
          const taskCreatedAt = new Date(task.createdAt);
          const currentDate = new Date(date);
          
          if (taskCreatedAt <= currentDate) {
            totalPossibleCompletions++;
            taskCompletionData[task.taskID].total++;
          }
        }
      });
    });
    
    // Alternative calculation using direct task progress data
    eligibleTasks.forEach(task => {
      if (task.taskID && taskCompletionData[task.taskID] && task.daysSelected && task.daysDone !== undefined) {
        // Use the actual task progress data directly
        // Rather than scaling to a weekly period, use the actual days values
        taskCompletionData[task.taskID] = {
          completed: task.daysDone,
          total: task.daysSelected,
          name: task.taskName
        };
        
        // Update the overall statistics based on this task's contribution
        // First, subtract the task's previous contribution to the totals
        totalPossibleCompletions -= taskCompletionData[task.taskID].total;
        totalActualCompletions -= taskCompletionData[task.taskID].completed;
        
        // Then add the correct values
        totalPossibleCompletions += task.daysSelected;
        totalActualCompletions += task.daysDone;
      }
    });
    
    console.log(`Total possible completions: ${totalPossibleCompletions}`);
    console.log(`Total actual completions: ${totalActualCompletions}`);
    
    // Format task completion data for the report
    // Include all tasks, even 100% completed ones
    const tasksCompleted = Object.values(taskCompletionData)
      .filter(data => data.total > 0) // Only include tasks that have goals set
      .sort((a, b) => {
        // Sort by completion percentage first (descending)
        const aPercentage = a.total > 0 ? (a.completed / a.total) : 0;
        const bPercentage = b.total > 0 ? (b.completed / b.total) : 0;
        
        if (bPercentage !== aPercentage) {
          return bPercentage - aPercentage;
        }
        
        // If percentages are equal, sort by total days (descending)
        if (b.total !== a.total) {
          return b.total - a.total;
        }
        
        // If still equal, sort alphabetically
        return a.name.localeCompare(b.name);
      })
      .map(data => ({
        taskName: data.name,
        completedDays: data.completed,
        totalDays: data.total
      }));

    // Calculate global completion rate as average of individual task completion rates
    // This gives equal weight to each task regardless of how many days it has
    let completionRate = 0;
    if (tasksCompleted.length > 0) {
      const taskCompletionRates = tasksCompleted.map(task => 
        (task.completedDays / task.totalDays) * 100
      );
      const totalCompletionRate = taskCompletionRates.reduce((sum, rate) => sum + rate, 0);
      completionRate = Math.round(totalCompletionRate / tasksCompleted.length);
    }
    
    // Ensure the rate is between 0 and 100
    completionRate = Math.min(100, Math.max(0, completionRate));
    
    console.log(`Average task completion rate: ${completionRate}%`);
    
    // Get a motivational phrase based on completion rate
    const motivationalPhrase = getMotivationalPhraseForCompletion(completionRate);
    
    // Create the report
    const report: WeeklyReportData = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      completionRate,
      tasksCompleted,
      motivationalPhrase,
      generatedAt: new Date().toISOString()
    };
    
    // Save the report
    await AsyncStorage.setItem(REPORT_DATA_KEY, JSON.stringify(report));
    await AsyncStorage.setItem(LAST_REPORT_DATE_KEY, now.toISOString());
    await AsyncStorage.setItem(REPORT_VIEWED_KEY, 'false');
    
    // Schedule a notification
    await scheduleWeeklyReportNotification(completionRate);
    
    return report;
  } catch (error) {
    console.error('Error generating weekly report:', error);
    return null;
  }
};

/**
 * Check if there's an unviewed weekly report
 */
export const hasUnviewedWeeklyReport = async (): Promise<boolean> => {
  try {
    const viewed = await AsyncStorage.getItem(REPORT_VIEWED_KEY);
    return viewed === 'false';
  } catch (error) {
    console.error('Error checking for unviewed weekly report:', error);
    return false;
  }
};

/**
 * Get the latest weekly report
 */
export const getLatestWeeklyReport = async (): Promise<WeeklyReportData | null> => {
  try {
    const reportJson = await AsyncStorage.getItem(REPORT_DATA_KEY);
    if (!reportJson) {
      return null;
    }
    return JSON.parse(reportJson) as WeeklyReportData;
  } catch (error) {
    console.error('Error getting latest weekly report:', error);
    return null;
  }
};

/**
 * Mark the weekly report as viewed
 */
export const markWeeklyReportAsViewed = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(REPORT_VIEWED_KEY, 'true');
  } catch (error) {
    console.error('Error marking weekly report as viewed:', error);
  }
};

/**
 * Get a motivational phrase based on completion rate
 */
const getMotivationalPhraseForCompletion = (completionRate: number): string => {
  const lang = i18n.language as 'fr' | 'en';
  
  if (completionRate >= 90) {
    return lang === 'fr'
      ? `Excellent travail ! Vous avez atteint ${completionRate}% de vos tâches cette semaine. Continuez comme ça !`
      : `Excellent work! You achieved ${completionRate}% of your tasks this week. Keep it up!`;
  } else if (completionRate >= 75) {
    return lang === 'fr'
      ? `Très bien ! Vous avez accompli ${completionRate}% de vos tâches. Vous êtes sur la bonne voie !`
      : `Great job! You accomplished ${completionRate}% of your tasks. You're on the right track!`;
  } else if (completionRate >= 50) {
    return lang === 'fr'
      ? `Bien joué ! Vous avez complété ${completionRate}% de vos tâches. Chaque effort compte !`
      : `Well done! You completed ${completionRate}% of your tasks. Every effort counts!`;
  } else if (completionRate >= 25) {
    return lang === 'fr'
      ? `Vous avez complété ${completionRate}% de vos tâches. C'est un bon début, continuez à progresser !`
      : `You completed ${completionRate}% of your tasks. That's a good start, keep making progress!`;
  } else {
    return lang === 'fr'
      ? `Vous avez accompli ${completionRate}% de vos tâches. La semaine prochaine sera meilleure, continuez d'essayer !`
      : `You accomplished ${completionRate}% of your tasks. Next week will be better, keep trying!`;
  }
};

/**
 * Schedule a notification for the weekly report
 */
const scheduleWeeklyReportNotification = async (completionRate: number): Promise<void> => {
  try {
    // Cancel any existing notifications first
    await Notifications.cancelAllScheduledNotificationsAsync();
    
    const lang = i18n.language as 'fr' | 'en';
    
    // Create the notification content
    const title = lang === 'fr'
      ? 'Votre rapport hebdomadaire est prêt !'
      : 'Your Weekly Report is Ready!';
      
    const body = lang === 'fr'
      ? `Vous avez accompli ${completionRate}% de vos tâches cette semaine. Consultez votre rapport complet.`
      : `You accomplished ${completionRate}% of your tasks this week. Check your full report.`;
    
    // Schedule immediate notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // null means send immediately
    });
  } catch (error) {
    console.error('Error scheduling weekly report notification:', error);
  }
}; 