import api from './api';


/**
 * Get available LLM models from the backend
 * @returns List of available LLM models
 */
export const getAvailableModels = async (): Promise<LLMModel[]> => {
  try {
    const response = await api.get('/ai/models');
    return response.data.models;
  } catch (error) {
    console.error('Error fetching available models:', error);
    return [];
  }
};

/**
 * Get LLM provider status
 * @returns Provider status information
 */
export const getProviderStatus = async (): Promise<Record<string, ProviderStatus>> => {
  try {
    const response = await api.get('/ai/providers');
    return response.data.providers;
  } catch (error) {
    console.error('Error fetching provider status:', error);
    return {};
  }
};

/**
 * Generate AI response for chat
 * @param message User message
 * @param history Chat history
 * @param context User context
 * @param model Optional model ID
 * @returns AI response
 */
export const generateResponse = async (
  message: string,
  history: Message[] = [],
  context?: AIContext,
  model: string = DEFAULT_MODEL
): Promise<string> => {
  try {
    const response = await api.post(`/ai/chat`, {
      message,
      history,
      context,
      model
    });
    
    return response.data.response;
  } catch (error) {
    console.error('Error generating AI response:', error);
    return 'Sorry, I encountered an error. Please try again.';
  }
};

/**
 * Generate task suggestions
 * @param userId User ID
 * @param context User context
 * @param model Optional model ID
 * @returns Array of task suggestions
 */
export const generateTaskSuggestions = async (
  userId: string,
  context?: AIContext,
  model: string = DEFAULT_MODEL
): Promise<{ title: string; priority: string; dueDate?: string }[]> => {
  try {
    const response = await api.post(`/ai/suggest-tasks`, {
      userId,
      context,
      model
    });
    
    return response.data.suggestions;
  } catch (error) {
    console.error('Error generating task suggestions:', error);
    return [];
  }
};

/**
 * Analyze productivity data
 * @param userId User ID
 * @param timeRange Time range
 * @param data Productivity data
 * @param model Optional model ID
 * @returns Analysis of productivity data
 */
export const analyzeProductivity = async (
  userId: string,
  timeRange: { start: string; end: string },
  data: any[],
  model: string = DEFAULT_MODEL
): Promise<any> => {
  try {
    const response = await api.post(`/ai/analyze-productivity`, {
      userId,
      timeRange,
      data,
      model
    });
    
    return response.data.analysis;
  } catch (error) {
    console.error('Error analyzing productivity:', error);
    return null;
  }
};

/**
 * Summarize emails
 * @param emails Array of emails
 * @param maxLength Optional maximum length
 * @param model Optional model ID
 * @returns Email summary
 */
export const summarizeEmails = async (
  emails: any[],
  maxLength?: number,
  model: string = DEFAULT_MODEL
): Promise<string> => {
  try {
    const response = await api.post(`/ai/summarize-emails`, {
      emails,
      maxLength,
      model
    });
    
    return response.data.summary;
  } catch (error) {
    console.error('Error summarizing emails:', error);
    return 'Unable to generate email summary.';
  }
};

/**
 * Prioritize task list
 * @param tasks Array of tasks
 * @param context User context
 * @param model Optional model ID
 * @returns Prioritized tasks
 */
export const prioritizeTaskList = async (
  tasks: any[],
  context?: AIContext,
  model: string = DEFAULT_MODEL
): Promise<any[]> => {
  try {
    const response = await api.post(`/ai/prioritize-tasks`, {
      tasks,
      context,
      model
    });
    
    return response.data.prioritizedTasks;
  } catch (error) {
    console.error('Error prioritizing tasks:', error);
    return tasks; // Return original tasks on error
  }
};

/**
 * Generate daily summary
 * @param userId User ID
 * @param date Optional date
 * @param model Optional model ID
 * @returns Daily summary
 */
export const generateDailySummary = async (
  userId: string,
  date?: string,
  model: string = DEFAULT_MODEL
): Promise<{
  greeting: string;
  focusAreas: string[];
  topTasks: any[];
  upcomingEvents: any[];
  insights: string;
}> => {
  try {
    const today = date || new Date().toISOString().split('T')[0];
    
    const response = await api.post(`/ai/daily-summary`, {
      userId,
      date: today,
      model
    });
    
    return response.data;
  } catch (error) {
    console.error('Error generating daily summary:', error);
    return {
      greeting: 'Good day',
      focusAreas: [],
      topTasks: [],
      upcomingEvents: [],
      insights: 'Unable to generate insights at this time.'
    };
  }
}; 