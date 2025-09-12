import api from './api';

export interface LinkedInProfile {
  id: string;
  firstName: string;
  lastName: string;
  profilePicture?: string;
  headline?: string;
  vanityName?: string;
  publicProfileUrl?: string;
  email?: string;
  industry?: string;
  location?: {
    country?: string;
    city?: string;
  };
}

export interface LinkedInConnection {
  id: string;
  firstName: string;
  lastName: string;
  profilePicture?: string;
  headline?: string;
  connectionDegree?: number;
  lastInteraction?: Date;
  email?: string;
  industry?: string;
  company?: string;
  position?: string;
}

export interface LinkedInPost {
  id: string;
  authorId: string;
  authorName: string;
  authorPicture?: string;
  content: string;
  publishedDate: string;
  likes: number;
  comments: number;
  shares: number;
  reactions?: {
    like?: number;
    celebrate?: number;
    support?: number;
    love?: number;
    insightful?: number;
    curious?: number;
  };
  media?: {
    type: 'image' | 'video' | 'article' | 'document';
    url: string;
    title?: string;
    description?: string;
  }[];
}

export interface LinkedInMessage {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  senderName: string;
  recipientName: string;
  content: string;
  sentAt: string;
  read: boolean;
}



/**
 * LinkedIn Authentication & Connection Management
 */

// Check if LinkedIn integration is connected
export const checkLinkedInConnection = async (userId: string): Promise<boolean> => {
  try {
    const response = await api.get('/integrations/linkedin/status', {
      params: { userId }
    });
    return response.data.connected;
  } catch (error) {
    console.error('Error checking LinkedIn connection:', error);
    return false;
  }
};

// Initiate LinkedIn connection
export const initiateLinkedInConnection = async (
  userId: string,
  redirectUrl: string
): Promise<string> => {
  try {
    const response = await api.post('/integrations/linkedin/connect', {
      userId,
      redirectUrl
    });
    return response.data.authUrl;
  } catch (error) {
    console.error('Error initiating LinkedIn connection:', error);
    throw new Error('Failed to connect to LinkedIn');
  }
};

// Complete LinkedIn OAuth connection
export const completeLinkedInConnection = async (
  userId: string,
  code: string
): Promise<boolean> => {
  try {
    const response = await api.post('/integrations/linkedin/callback', {
      userId,
      code
    });
    return response.data.success;
  } catch (error) {
    console.error('Error completing LinkedIn connection:', error);
    return false;
  }
};

// Disconnect LinkedIn
export const disconnectLinkedIn = async (userId: string): Promise<boolean> => {
  try {
    const response = await api.post('/integrations/linkedin/disconnect', { userId });
    return response.data.success;
  } catch (error) {
    console.error('Error disconnecting LinkedIn:', error);
    return false;
  }
};

/**
 * LinkedIn Profile & Network Functions
 */

// Get user's LinkedIn profile
export const getLinkedInProfile = async (userId: string): Promise<LinkedInProfile | null> => {
  try {
    const response = await api.get('/integrations/linkedin/profile', {
      params: { userId }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching LinkedIn profile:', error);
    return null;
  }
};

// Get user's LinkedIn connections
export const getLinkedInConnections = async (
  userId: string,
  start: number = 0,
  count: number = 20
): Promise<LinkedInConnection[]> => {
  try {
    const response = await api.get('/integrations/linkedin/connections', {
      params: { userId, start, count }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching LinkedIn connections:', error);
    return [];
  }
};

// Search LinkedIn connections
export const searchLinkedInConnections = async (
  userId: string,
  query: string,
  start: number = 0,
  count: number = 20
): Promise<LinkedInConnection[]> => {
  try {
    const response = await api.get('/integrations/linkedin/connections/search', {
      params: { userId, query, start, count }
    });
    return response.data;
  } catch (error) {
    console.error('Error searching LinkedIn connections:', error);
    return [];
  }
};

/**
 * LinkedIn Content & Engagement Functions
 */

// Get user's LinkedIn feed
export const getLinkedInFeed = async (
  userId: string,
  start: number = 0,
  count: number = 10
): Promise<LinkedInPost[]> => {
  try {
    const response = await api.get('/integrations/linkedin/feed', {
      params: { userId, start, count }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching LinkedIn feed:', error);
    return [];
  }
};

// Create LinkedIn post
export const createLinkedInPost = async (
  userId: string,
  content: string,
  media?: {
    type: 'image' | 'video' | 'article' | 'document';
    url: string;
    title?: string;
    description?: string;
  }[]
): Promise<LinkedInPost | null> => {
  try {
    const response = await api.post('/integrations/linkedin/posts', {
      userId,
      content,
      media
    });
    return response.data;
  } catch (error) {
    console.error('Error creating LinkedIn post:', error);
    return null;
  }
};

// Comment on LinkedIn post
export const commentOnLinkedInPost = async (
  userId: string,
  postId: string,
  comment: string
): Promise<boolean> => {
  try {
    await api.post('/integrations/linkedin/posts/comment', {
      userId,
      postId,
      comment
    });
    return true;
  } catch (error) {
    console.error('Error commenting on LinkedIn post:', error);
    return false;
  }
};

// Like LinkedIn post
export const likeLinkedInPost = async (
  userId: string,
  postId: string
): Promise<boolean> => {
  try {
    await api.post('/integrations/linkedin/posts/like', {
      userId,
      postId
    });
    return true;
  } catch (error) {
    console.error('Error liking LinkedIn post:', error);
    return false;
  }
};

/**
 * LinkedIn Messaging Functions
 */

// Get LinkedIn conversations
export const getLinkedInConversations = async (
  userId: string,
  start: number = 0,
  count: number = 20
): Promise<{ id: string; participantNames: string[]; lastMessage: string; lastMessageDate: string }[]> => {
  try {
    const response = await api.get('/integrations/linkedin/conversations', {
      params: { userId, start, count }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching LinkedIn conversations:', error);
    return [];
  }
};

// Get LinkedIn conversation messages
export const getLinkedInMessages = async (
  userId: string,
  conversationId: string,
  start: number = 0,
  count: number = 20
): Promise<LinkedInMessage[]> => {
  try {
    const response = await api.get(`/integrations/linkedin/conversations/${conversationId}/messages`, {
      params: { userId, start, count }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching LinkedIn messages:', error);
    return [];
  }
};

// Send LinkedIn message
export const sendLinkedInMessage = async (
  userId: string,
  recipientId: string,
  message: string
): Promise<boolean> => {
  try {
    await api.post('/integrations/linkedin/messages/send', {
      userId,
      recipientId,
      message
    });
    return true;
  } catch (error) {
    console.error('Error sending LinkedIn message:', error);
    return false;
  }
}; 