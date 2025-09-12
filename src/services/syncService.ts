import api from './api';

export interface SyncStatus {
  lastSynced: Date | null;
  syncInProgress: boolean;
  devices: Device[];
}

export interface Device {
  id: string;
  name: string;
  platform: string;
  lastActive: string;
  isCurrentDevice: boolean;
}

// Initial sync status
let syncStatus: SyncStatus = {
  lastSynced: null,
  syncInProgress: false,
  devices: []
};



export const getSyncStatus = (): SyncStatus => {
  return { ...syncStatus };
};

export const generateDeviceId = (): string => {
  // Check if device ID already exists in local storage
  let deviceId = localStorage.getItem('neema_device_id');
  
  // If not, create a new one
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem('neema_device_id', deviceId);
  }
  
  return deviceId;
};

export const getDeviceInfo = (): { 
  id: string; 
  name: string; 
  platform: string;
} => {
  const deviceId = generateDeviceId();
  const platform = navigator.platform;
  
  // Try to get a friendly device name
  const userAgent = navigator.userAgent;
  let deviceName = 'Unknown Device';
  
  if (/iPhone/.test(userAgent)) {
    deviceName = 'iPhone';
  } else if (/iPad/.test(userAgent)) {
    deviceName = 'iPad';
  } else if (/Android/.test(userAgent)) {
    deviceName = 'Android Device';
  } else if (/Mac/.test(platform)) {
    deviceName = 'Mac';
  } else if (/Win/.test(platform)) {
    deviceName = 'Windows PC';
  } else if (/Linux/.test(platform)) {
    deviceName = 'Linux Device';
  }
  
  return {
    id: deviceId,
    name: deviceName,
    platform: platform
  };
};

export const registerDevice = async (userId: string): Promise<boolean> => {
  try {
    const deviceInfo = getDeviceInfo();
    const response = await api.post(`/devices/register`, {
      userId,
      ...deviceInfo,
      lastActive: new Date().toISOString()
    });
    
    if (response.data.success) {
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error registering device:', error);
    return false;
  }
};

export const fetchUserDevices = async (userId: string): Promise<Device[]> => {
  try {
    const response = await api.get(`/devices`, {
      params: { userId }
    });
    
    const currentDeviceId = getDeviceInfo().id;
    const devices = response.data.map((device: Device) => ({
      ...device,
      isCurrentDevice: device.id === currentDeviceId
    }));
    
    // Update the devices in sync status
    syncStatus.devices = devices;
    
    return devices;
  } catch (error) {
    console.error('Error fetching user devices:', error);
    return [];
  }
};

export const removeDevice = async (deviceId: string): Promise<boolean> => {
  try {
    const response = await api.delete(`/devices/${deviceId}`);
    
    if (response.data.success) {
      // Update the devices list in sync status
      syncStatus.devices = syncStatus.devices.filter(device => device.id !== deviceId);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error removing device:', error);
    return false;
  }
};

export const syncData = async (userId: string): Promise<boolean> => {
  if (syncStatus.syncInProgress) {
    return false;
  }
  
  syncStatus.syncInProgress = true;
  
  try {
    const deviceId = getDeviceInfo().id;
    
    const response = await api.post(`/sync`, { 
      userId,
      deviceId,
      timestamp: new Date().toISOString()
    });
    
    if (response.data.success) {
      syncStatus = {
        lastSynced: new Date(),
        syncInProgress: false,
        devices: response.data.devices || syncStatus.devices
      };
      
      // Store last sync time in localStorage for offline access
      localStorage.setItem('neema_last_sync', new Date().toISOString());
      
      return true;
    }
    
    syncStatus.syncInProgress = false;
    return false;
  } catch (error) {
    console.error('Error syncing data:', error);
    syncStatus.syncInProgress = false;
    return false;
  }
};

export const setupPeriodicSync = (userId: string, intervalMinutes: number = 5): (() => void) => {
  // Initially perform a sync
  syncData(userId);
  
  // Set up periodic sync
  const intervalId = setInterval(() => {
    syncData(userId);
  }, intervalMinutes * 60 * 1000);
  
  // Return a cleanup function
  return () => clearInterval(intervalId);
};

// Function to track when user goes offline/online
export const setupSyncConnectivityHandlers = (userId: string): (() => void) => {
  const handleOnline = () => {
    console.log('Back online, syncing data...');
    syncData(userId);
  };
  
  window.addEventListener('online', handleOnline);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
  };
}; 