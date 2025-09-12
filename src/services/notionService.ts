import api from './api';

export interface NotionPage {
  id: string;
  title: string;
  url: string;
  lastEdited: string;
  createdTime: string;
  icon?: string;
  parentId?: string;
  parentType?: 'workspace' | 'page' | 'database';
}

export interface NotionDatabase {
  id: string;
  title: string;
  url: string;
  lastEdited: string;
  createdTime: string;
  icon?: string;
  parentId?: string;
  parentType?: 'workspace' | 'page';
}

export interface NotionBlock {
  id: string;
  type: string;
  content: any;
  hasChildren: boolean;
}



// Check if Notion integration is connected
export const checkNotionConnection = async (userId: string): Promise<boolean> => {
  try {
    const response = await api.get('/integrations/notion/status', {
      params: { userId }
    });
    return response.data.connected;
  } catch (error) {
    console.error('Error checking Notion connection:', error);
    return false;
  }
};

// Connect to Notion (returns auth URL to redirect user)
export const initiateNotionConnection = async (
  userId: string, 
  redirectUrl: string
): Promise<string> => {
  try {
    const response = await api.post('/integrations/notion/connect', {
      userId,
      redirectUrl
    });
    return response.data.authUrl;
  } catch (error) {
    console.error('Error initiating Notion connection:', error);
    throw new Error('Failed to connect to Notion');
  }
};

// Complete Notion OAuth connection (after user authorized)
export const completeNotionConnection = async (
  userId: string,
  code: string
): Promise<boolean> => {
  try {
    const response = await api.post('/integrations/notion/callback', {
      userId,
      code
    });
    return response.data.success;
  } catch (error) {
    console.error('Error completing Notion connection:', error);
    return false;
  }
};

// Fetch user's Notion pages
export const fetchNotionPages = async (userId: string): Promise<NotionPage[]> => {
  try {
    const response = await api.get('/integrations/notion/pages', {
      params: { userId }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching Notion pages:', error);
    return [];
  }
};

// Fetch user's Notion databases
export const fetchNotionDatabases = async (userId: string): Promise<NotionDatabase[]> => {
  try {
    const response = await api.get('/integrations/notion/databases', {
      params: { userId }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching Notion databases:', error);
    return [];
  }
};

// Fetch blocks from specific page
export const fetchNotionPageBlocks = async (pageId: string): Promise<NotionBlock[]> => {
  try {
    const response = await api.get(`/integrations/notion/pages/${pageId}/blocks`);
    return response.data;
  } catch (error) {
    console.error('Error fetching Notion page blocks:', error);
    return [];
  }
};

// Create a new Notion page
export const createNotionPage = async (
  userId: string,
  title: string,
  content: any,
  parentId?: string,
  parentType: 'page' | 'database' = 'page'
): Promise<NotionPage | null> => {
  try {
    const response = await api.post('/integrations/notion/pages', {
      userId,
      title,
      content,
      parentId,
      parentType
    });
    return response.data;
  } catch (error) {
    console.error('Error creating Notion page:', error);
    return null;
  }
};

// Search Notion by query
export const searchNotion = async (
  userId: string,
  query: string
): Promise<Array<NotionPage | NotionDatabase>> => {
  try {
    const response = await api.get('/integrations/notion/search', {
      params: { userId, query }
    });
    return response.data;
  } catch (error) {
    console.error('Error searching Notion:', error);
    return [];
  }
};

// Disconnect Notion
export const disconnectNotion = async (userId: string): Promise<boolean> => {
  try {
    const response = await api.post('/integrations/notion/disconnect', { userId });
    return response.data.success;
  } catch (error) {
    console.error('Error disconnecting Notion:', error);
    return false;
  }
}; 