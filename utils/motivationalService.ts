import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMotivationalQuotes } from './data/motivationalQuotes';
import type { MotivationCategory } from './data/motivationalQuotes';
import type { SupportedLanguage } from './i18n';

const LAST_QUOTE_UPDATE_KEY = 'last_motivational_quote_update';
const STORED_QUOTES_KEY = 'stored_motivational_quotes';
const STORED_LANGUAGE_KEY = 'stored_quote_language';
const STORED_MOTIVATIONS_KEY = 'stored_quote_motivations';

// Format date to YYYY-MM-DD
const formatDateToString = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// Get today's date as a string in YYYY-MM-DD format
const getTodayString = (): string => {
  return formatDateToString(new Date());
};

// Function to check if quotes need to be updated (based on date change)
export const shouldUpdateQuotes = async (): Promise<boolean> => {
  try {
    const lastUpdate = await AsyncStorage.getItem(LAST_QUOTE_UPDATE_KEY);
    const today = getTodayString();
    
    // If there's no last update or it's different from today, we should update
    return !lastUpdate || lastUpdate !== today;
  } catch (error) {
    console.error('Error checking quote update status:', error);
    return true; // Default to updating if there's an error
  }
};

// Check if motivations or language have changed
const hasContextChanged = async (
  motivations: MotivationCategory[],
  language: SupportedLanguage
): Promise<boolean> => {
  try {
    const storedLanguage = await AsyncStorage.getItem(STORED_LANGUAGE_KEY);
    const storedMotivationsJson = await AsyncStorage.getItem(STORED_MOTIVATIONS_KEY);
    
    // If no stored values, context has changed
    if (!storedLanguage || !storedMotivationsJson) {
      return true;
    }
    
    // Check if language has changed
    if (storedLanguage !== language) {
      return true;
    }
    
    // Check if motivations have changed
    const storedMotivations = JSON.parse(storedMotivationsJson);
    
    // If different number of motivations
    if (storedMotivations.length !== motivations.length) {
      return true;
    }
    
    // Check if any motivation is different
    const hasMotivationsChanged = !motivations.every(
      motivation => storedMotivations.includes(motivation)
    );
    
    return hasMotivationsChanged;
  } catch (error) {
    console.error('Error checking context change:', error);
    return true; // Default to updating if there's an error
  }
};

// Get stored quotes or generate new ones if needed
export const getOrGenerateQuotes = async (
  motivations: MotivationCategory[],
  language: SupportedLanguage
): Promise<string[]> => {
  try {
    const needsUpdate = await shouldUpdateQuotes();
    const contextChanged = await hasContextChanged(motivations, language);
    
    if (needsUpdate || contextChanged) {
      // Generate new quotes if date changed or context changed
      return await generateAndStoreNewQuotes(motivations, language);
    } else {
      // Try to retrieve stored quotes
      const storedQuotesJson = await AsyncStorage.getItem(STORED_QUOTES_KEY);
      
      if (storedQuotesJson) {
        const storedQuotes = JSON.parse(storedQuotesJson);
        return storedQuotes;
      } else {
        // If no stored quotes, generate new ones
        return await generateAndStoreNewQuotes(motivations, language);
      }
    }
  } catch (error) {
    console.error('Error getting or generating quotes:', error);
    
    // Fallback to direct generation without storing
    return getMotivationalQuotes(motivations, language);
  }
};

// Generate new quotes and store them
const generateAndStoreNewQuotes = async (
  motivations: MotivationCategory[],
  language: SupportedLanguage
): Promise<string[]> => {
  try {
    // Generate new quotes
    const newQuotes = getMotivationalQuotes(motivations, language);
    
    // Store the quotes
    await AsyncStorage.setItem(STORED_QUOTES_KEY, JSON.stringify(newQuotes));
    
    // Update the last update date
    await AsyncStorage.setItem(LAST_QUOTE_UPDATE_KEY, getTodayString());
    
    // Store the context (language and motivations)
    await AsyncStorage.setItem(STORED_LANGUAGE_KEY, language);
    await AsyncStorage.setItem(STORED_MOTIVATIONS_KEY, JSON.stringify(motivations));
    
    return newQuotes;
  } catch (error) {
    console.error('Error generating and storing new quotes:', error);
    
    // Fallback to direct generation
    return getMotivationalQuotes(motivations, language);
  }
}; 