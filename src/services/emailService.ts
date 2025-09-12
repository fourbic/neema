import api from './api';



export interface EmailSender {
  name: string;
  email: string;
  avatar?: string;
}

export interface Email {
  id: string;
  sender: EmailSender;
  subject: string;
  preview: string;
  body?: string;
  time: string;
  isRead: boolean;
  isStarred: boolean;
  tags?: string[];
  userId: string;
}

/**
 * Fetch emails for a user
 */
export const fetchEmails = async (userId: string, limit: number = 20): Promise<Email[]> => {
  try {
    const response = await api.get(`/emails`, { params: { userId, limit } });
    return response.data;
  } catch (error) {
    console.error('Error fetching emails:', error);
    return [];
  }
};

/**
 * Fetch unread emails for a user - for AI context
 */
export const fetchUnreadEmails = async (userId: string): Promise<Email[]> => {
  try {
    console.log('Fetching unread emails for user:', userId);
    // Return mock data for now until backend is implemented
    return [
      {
        id: '1',
        sender: { name: 'John Smith', email: 'john@example.com' },
        subject: 'Project update',
        preview: 'Here are the latest updates...',
        time: new Date().toISOString(),
        isRead: false,
        isStarred: false,
        userId
      },
      {
        id: '2',
        sender: { name: 'Sarah Johnson', email: 'sarah@example.com' },
        subject: 'Meeting tomorrow',
        preview: 'Can we schedule a meeting...',
        time: new Date().toISOString(),
        isRead: false,
        isStarred: true,
        userId
      }
    ];
  } catch (error) {
    console.error('Error fetching unread emails:', error);
    return [];
  }
};

/**
 * Fetch a specific email by ID
 */
export const fetchEmailById = async (emailId: string): Promise<Email | null> => {
  try {
    const response = await api.get(`/emails/${emailId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching email by id:', error);
    return null;
  }
};

/**
 * Mark an email as read
 */
export const markEmailAsRead = async (emailId: string): Promise<boolean> => {
  try {
    await api.put(`/emails/${emailId}/read`);
    return true;
  } catch (error) {
    console.error('Error marking email as read:', error);
    return false;
  }
};

/**
 * Toggle the starred status of an email
 */
export const toggleEmailStar = async (emailId: string): Promise<boolean> => {
  try {
    await api.put(`/emails/${emailId}/star`);
    return true;
  } catch (error) {
    console.error('Error toggling email star:', error);
    return false;
  }
};

/**
 * Send a new email
 */
export const sendEmail = async (
  userId: string,
  to: string[],
  subject: string,
  body: string,
  cc?: string[],
  bcc?: string[]
): Promise<boolean> => {
  try {
    await api.post(`/emails/send`, {
      userId,
      to,
      subject,
      body,
      cc,
      bcc
    });
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

/**
 * Add a tag to an email
 */
export const addTagToEmail = async (emailId: string, tag: string): Promise<boolean> => {
  try {
    await api.put(`/emails/${emailId}/tag`, { tag });
    return true;
  } catch (error) {
    console.error('Error adding tag to email:', error);
    return false;
  }
};

/**
 * Remove a tag from an email
 */
export const removeTagFromEmail = async (emailId: string, tag: string): Promise<boolean> => {
  try {
    await api.delete(`/emails/${emailId}/tag/${encodeURIComponent(tag)}`);
    return true;
  } catch (error) {
    console.error('Error removing tag from email:', error);
    return false;
  }
};