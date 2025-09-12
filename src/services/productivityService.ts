import api from './api';

const API_KEY = import.meta.env.VITE_API_KEY;

export interface ProductivityStat {
  title: string;
  value: number;
  target: number;
  unit: string;
  progress: number;
  change: string;
  trend: 'up' | 'down' | 'neutral';
}

export interface TimeDistribution {
  name: string;
  percentage: number;
  color: string;
}

export interface ProjectUtilization {
  name: string;
  utilization: number;
  billable: number;
  color: string;
}

export interface ProductivityTrend {
  date: string;
  focusTime: number;
  taskCompletion: number;
  contextSwitching: number;
  workLifeBalance: number;
}

export interface FocusSession {
  id: string;
  userId: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  taskId?: string;
  taskName?: string;
  category?: string;
  isComplete: boolean;
}

// Use the shared api instance for all requests. Optionally add extra headers if backend requires them.

export const fetchProductivityStats = async (userId: string): Promise<ProductivityStat[]> => {
  try {
    const response = await api.get(`/productivity/stats`, {
      params: { userId }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching productivity stats:', error);
    return [];
  }
};

export const fetchTimeDistribution = async (userId: string): Promise<TimeDistribution[]> => {
  try {
    const response = await api.get(`/productivity/time-distribution`, {
      params: { userId }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching time distribution:', error);
    return [];
  }
};

export const fetchProjectUtilization = async (userId: string): Promise<ProjectUtilization[]> => {
  try {
    const response = await api.get(`/productivity/project-utilization`, {
      params: { userId }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching project utilization:', error);
    return [];
  }
};

export const fetchProductivityTrends = async (
  userId: string,
  days: number = 7
): Promise<ProductivityTrend[]> => {
  try {
    const response = await api.get(`/productivity/trends`, {
      params: { userId, days }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching productivity trends:', error);
    return [];
  }
};

export const startFocusSession = async (
  userId: string,
  taskId?: string,
  category?: string
): Promise<FocusSession | null> => {
  try {
    const response = await api.post(`/productivity/focus-sessions`, {
      userId,
      taskId,
      category,
      startTime: new Date().toISOString()
    });
    return response.data;
  } catch (error) {
    console.error('Error starting focus session:', error);
    return null;
  }
};

export const endFocusSession = async (sessionId: string): Promise<FocusSession | null> => {
  try {
    const response = await api.put(`/productivity/focus-sessions/${sessionId}/end`, {
      endTime: new Date().toISOString()
    });
    return response.data;
  } catch (error) {
    console.error('Error ending focus session:', error);
    return null;
  }
};

export const fetchFocusSessions = async (
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<FocusSession[]> => {
  try {
    const response = await api.get(`/productivity/focus-sessions`, {
      params: {
        userId,
        startDate,
        endDate
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching focus sessions:', error);
    return [];
  }
};

export const fetchProductivityInsights = async (userId: string): Promise<{
  topPerformingHours: { hour: number; score: number }[];
  contextSwitchingFrequency: number;
  focusSessionAvgDuration: number;
  taskCompletionRate: number;
  insights: string[];
}> => {
  try {
    const response = await api.get(`/productivity/insights`, {
      params: { userId }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching productivity insights:', error);
    return {
      topPerformingHours: [],
      contextSwitchingFrequency: 0,
      focusSessionAvgDuration: 0,
      taskCompletionRate: 0,
      insights: []
    };
  }
}; 