import api from './api';

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: "high" | "medium" | "low";
  dueDate?: string;
  context?: string;
  userId: string;
}



export const fetchTasks = async (userId: string): Promise<Task[]> => {
  try {
    const response = await api.get(`/api/tasks`, {
      params: { userId }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }
};

export const createTask = async (task: Omit<Task, 'id'>): Promise<Task | null> => {
  try {
    const response = await api.post(`/api/tasks`, task);
    return response.data;
  } catch (error) {
    console.error('Error creating task:', error);
    return null;
  }
};

export const updateTask = async (taskId: string, updates: Partial<Task>): Promise<Task | null> => {
  try {
    const response = await api.put(`/api/tasks/${taskId}`, updates);
    return response.data;
  } catch (error) {
    console.error('Error updating task:', error);
    return null;
  }
};

export const deleteTask = async (taskId: string): Promise<boolean> => {
  try {
    await api.delete(`/api/tasks/${taskId}`);
    return true;
  } catch (error) {
    console.error('Error deleting task:', error);
    return false;
  }
};

// Get tasks by priority
export const fetchTasksByPriority = async (userId: string, priority: string): Promise<Task[]> => {
  try {
    const response = await api.get(`/api/tasks`, {
      params: { userId, priority }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching tasks by priority:', error);
    return [];
  }
};

// Get statistics on task completion
export const fetchTaskStats = async (userId: string): Promise<{
  total: number;
  completed: number;
  highPriority: number;
  overdueCount: number;
}> => {
  try {
    const response = await api.get(`/api/tasks/stats`, {
      params: { userId }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching task stats:', error);
    return {
      total: 0,
      completed: 0,
      highPriority: 0,
      overdueCount: 0
    };
  }
}; 