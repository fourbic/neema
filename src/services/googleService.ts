import api from './api';



/**
 * Google Authentication & Connection Management
 */

// Check if Google integration is connected
export const checkGoogleConnection = async (userId: string): Promise<{
  connected: boolean;
  scopes: string[];
}> => {
  try {
    const response = await api.get('/integrations/google/status', {
      params: { userId }
    });
    return {
      connected: response.data.connected,
      scopes: response.data.scopes || []
    };
  } catch (error) {
    console.error('Error checking Google connection:', error);
    return { connected: false, scopes: [] };
  }
};

// Initiate Google connection
export const initiateGoogleConnection = async (
  userId: string,
  redirectUrl: string,
  scopes: string[] = ['calendar', 'gmail']
): Promise<string> => {
  try {
    const response = await api.post('/integrations/google/connect', {
      userId,
      redirectUrl,
      scopes
    });
    return response.data.authUrl;
  } catch (error) {
    console.error('Error initiating Google connection:', error);
    throw new Error('Failed to connect to Google');
  }
};

// Complete Google OAuth connection
export const completeGoogleConnection = async (
  userId: string,
  code: string
): Promise<boolean> => {
  try {
    const response = await api.post('/integrations/google/callback', {
      userId,
      code
    });
    return response.data.success;
  } catch (error) {
    console.error('Error completing Google connection:', error);
    return false;
  }
};

// Disconnect Google
export const disconnectGoogle = async (userId: string): Promise<boolean> => {
  try {
    const response = await api.post('/integrations/google/disconnect', { userId });
    return response.data.success;
  } catch (error) {
    console.error('Error disconnecting Google:', error);
    return false;
  }
};

/**
 * Google Calendar Functions
 */

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  attendees?: Array<{ email: string; displayName?: string; responseStatus?: string }>;
  hangoutLink?: string;
  conferenceData?: any;
  recurringEventId?: string;
  recurrence?: string[];
  calendarId: string;
}

export interface GoogleCalendar {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  timeZone?: string;
  backgroundColor?: string;
  foregroundColor?: string;
}

// Fetch user's calendars
export const fetchCalendars = async (userId: string): Promise<GoogleCalendar[]> => {
  try {
    const response = await api.get('/integrations/google/calendars', {
      params: { userId }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching Google calendars:', error);
    return [];
  }
};

// Fetch calendar events
export const fetchCalendarEvents = async (
  userId: string,
  calendarId: string = 'primary',
  timeMin?: string,
  timeMax?: string,
  maxResults: number = 10
): Promise<GoogleCalendarEvent[]> => {
  try {
    const response = await api.get('/integrations/google/calendar/events', {
      params: {
        userId,
        calendarId,
        timeMin,
        timeMax,
        maxResults
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return [];
  }
};

// Fetch today's events
export const fetchTodayEvents = async (
  userId: string,
  calendarId: string = 'primary'
): Promise<GoogleCalendarEvent[]> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return fetchCalendarEvents(
    userId,
    calendarId,
    today.toISOString(),
    tomorrow.toISOString(),
    100
  );
};

// Create calendar event
export const createCalendarEvent = async (
  userId: string,
  event: Partial<GoogleCalendarEvent>,
  calendarId: string = 'primary'
): Promise<GoogleCalendarEvent | null> => {
  try {
    const response = await api.post('/integrations/google/calendar/events', {
      userId,
      calendarId,
      event
    });
    return response.data;
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return null;
  }
};

// Update calendar event
export const updateCalendarEvent = async (
  userId: string,
  eventId: string,
  updates: Partial<GoogleCalendarEvent>,
  calendarId: string = 'primary'
): Promise<GoogleCalendarEvent | null> => {
  try {
    const response = await api.put(`/integrations/google/calendar/events/${eventId}`, {
      userId,
      calendarId,
      updates
    });
    return response.data;
  } catch (error) {
    console.error('Error updating calendar event:', error);
    return null;
  }
};

// Delete calendar event
export const deleteCalendarEvent = async (
  userId: string,
  eventId: string,
  calendarId: string = 'primary'
): Promise<boolean> => {
  try {
    await api.delete(`/integrations/google/calendar/events/${eventId}`, {
      params: {
        userId,
        calendarId
      }
    });
    return true;
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    return false;
  }
};

/**
 * Gmail Functions
 */

export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: {
    headers: Array<{ name: string; value: string }>;
    mimeType: string;
    body?: any;
    parts?: any[];
  };
  internalDate: string;
  sizeEstimate: number;
}

export interface GmailThread {
  id: string;
  historyId: string;
  messages: GmailMessage[];
}

// Fetch Gmail messages
export const fetchGmailMessages = async (
  userId: string,
  maxResults: number = 20,
  labelIds: string[] = ['INBOX'],
  q?: string
): Promise<GmailMessage[]> => {
  try {
    const response = await api.get('/integrations/google/gmail/messages', {
      params: {
        userId,
        maxResults,
        labelIds: labelIds.join(','),
        q
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching Gmail messages:', error);
    return [];
  }
};

// Fetch Gmail message by ID
export const fetchGmailMessage = async (
  userId: string,
  messageId: string
): Promise<GmailMessage | null> => {
  try {
    const response = await api.get(`/integrations/google/gmail/messages/${messageId}`, {
      params: { userId }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching Gmail message:', error);
    return null;
  }
};

// Send Gmail message
export const sendGmailMessage = async (
  userId: string,
  to: string[],
  subject: string,
  body: string,
  cc?: string[],
  bcc?: string[],
  attachments?: Array<{ filename: string; content: string; mimeType: string }>
): Promise<boolean> => {
  try {
    await api.post('/integrations/google/gmail/messages/send', {
      userId,
      to,
      subject,
      body,
      cc,
      bcc,
      attachments
    });
    return true;
  } catch (error) {
    console.error('Error sending Gmail message:', error);
    return false;
  }
};

// Mark Gmail message as read
export const markGmailAsRead = async (
  userId: string,
  messageId: string
): Promise<boolean> => {
  try {
    await api.post(`/integrations/google/gmail/messages/${messageId}/mark-read`, {
      userId
    });
    return true;
  } catch (error) {
    console.error('Error marking Gmail as read:', error);
    return false;
  }
};

// Archive Gmail message
export const archiveGmailMessage = async (
  userId: string,
  messageId: string
): Promise<boolean> => {
  try {
    await api.post(`/integrations/google/gmail/messages/${messageId}/archive`, {
      userId
    });
    return true;
  } catch (error) {
    console.error('Error archiving Gmail message:', error);
    return false;
  }
}; 