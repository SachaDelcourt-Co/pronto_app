/**
 * Formats a Date object to a YYYY-MM-DD string
 * @param date The date to format
 * @returns A string in YYYY-MM-DD format
 */
export const formatLocalDate = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

/**
 * Parses a YYYY-MM-DD date string to a Date object in the local timezone
 * @param dateString A string in YYYY-MM-DD format
 * @returns A Date object
 */
export const parseLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Formats a date for display with weekday, month, and day
 * @param date The date to format
 * @returns A formatted date string
 */
export const formatDisplayDate = (date: Date): string => {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  };
  
  return date.toLocaleDateString('en-US', options);
};

/**
 * Formats a date for display in a shorter format
 * @param date The date to format
 * @returns A formatted date string
 */
export const formatShortDate = (date: Date): string => {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  };
  
  return date.toLocaleDateString('en-US', options);
};

/**
 * Gets the start of day for a given date
 * @param date The date to get the start of day for
 * @returns A new Date set to 00:00:00.000 of the given date
 */
export const getStartOfDay = (date: Date): Date => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  return startOfDay;
};

/**
 * Gets the end of day for a given date
 * @param date The date to get the end of day for
 * @returns A new Date set to 23:59:59.999 of the given date
 */
export const getEndOfDay = (date: Date): Date => {
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  return endOfDay;
}; 