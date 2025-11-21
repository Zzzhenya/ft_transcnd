/**
 * Manages online status and friend list caching with multi-tab support
 * 
 * Performance optimizations:
 * - Caches friend list to avoid repeated requests
 * - Debounces status updates
 * - Efficient network usage
 * - Multi-tab awareness (only marks offline when ALL tabs close)
 * - Heartbeat to keep user online
 * - Per-user tab tracking (supports multiple users in different tabs)
 */

import { getAuth, getToken } from '../app/auth';
import type { PublicUser } from '../../../shared/types';

interface CachedFriendStatus {
  friends: any[];
  timestamp: number;
  userId: string;
}

class EfficientOnlineManager {
  private static instance: EfficientOnlineManager;
  private isUserActive = true;
  private lastActivity = Date.now();
  private friendsCache: CachedFriendStatus | null = null;
  private activityCheckInterval: number | null = null;
  private heartbeatInterval: number | null = null;
  private tabId: string;
  
  // Cache settings
  private static readonly CACHE_DURATION = 60000; // 1 minute
  private static readonly ACTIVITY_CHECK = 120000; // 2 minutes
  private static readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private static readonly CACHE_KEY = 'transcendence_friends_status';
  private static readonly TABS_KEY = 'transcendence_active_tabs';
  private static readonly LAST_HEARTBEAT_KEY = 'transcendence_last_heartbeat';

  constructor() {
    // Generate unique tab ID
    this.tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static getInstance(): EfficientOnlineManager {
    if (!EfficientOnlineManager.instance) {
      EfficientOnlineManager.instance = new EfficientOnlineManager();
    }
    return EfficientOnlineManager.instance;
  }

  init() {
    console.log('🎯 Initializing efficient online status manager with tab ID:', this.tabId);
    this.isUserActive = true;
    this.lastActivity = Date.now();
    
    // Register this tab
    this.registerTab();
    
    // Setup activity detection
    this.setupActivityDetection();
    
    // Setup window events (close, unload)
    this.setupWindowEvents();
    
    // Start heartbeat to keep user online
    this.startHeartbeat();
    
    // Report online immediately
    this.setUserOnline(true);
  }

  private getTabsKeyForUser(): string | null {
    const user = getAuth();
    if (!user) return null;
    return `${EfficientOnlineManager.TABS_KEY}_user_${user.id}`;
  }

  private registerTab() {
    try {
      const tabsKey = this.getTabsKeyForUser();
      if (!tabsKey) return;

      const tabs = this.getActiveTabs();
      tabs[this.tabId] = Date.now();
      localStorage.setItem(tabsKey, JSON.stringify(tabs));
      
      const user = getAuth();
      console.log('📝 Registered tab:', this.tabId, 'for user:', user?.username, 'Total tabs:', Object.keys(tabs).length);
    } catch (error) {
      console.warn('⚠️ Failed to register tab:', error);
    }
  }

  private unregisterTab() {
    try {
      const tabsKey = this.getTabsKeyForUser();
      if (!tabsKey) return 0;

      const tabs = this.getActiveTabs();
      delete tabs[this.tabId];
      localStorage.setItem(tabsKey, JSON.stringify(tabs));
      
      const user = getAuth();
      const remaining = Object.keys(tabs).length;
      console.log('🗑️ Unregistered tab:', this.tabId, 'for user:', user?.username, 'Remaining tabs:', remaining);
      return remaining;
    } catch (error) {
      console.warn('⚠️ Failed to unregister tab:', error);
      return 0;
    }
  }

  private getActiveTabs(): Record<string, number> {
    try {
      const tabsKey = this.getTabsKeyForUser();
      if (!tabsKey) return {};

      const stored = localStorage.getItem(tabsKey);
      if (!stored) return {};
      
      const tabs = JSON.parse(stored);
      const now = Date.now();
      
      // Clean up stale tabs (older than 2 minutes)
      const cleanTabs: Record<string, number> = {};
      for (const [tabId, timestamp] of Object.entries(tabs)) {
        if (now - (timestamp as number) < 120000) {
          cleanTabs[tabId] = timestamp as number;
        }
      }
      
      return cleanTabs;
    } catch {
      return {};
    }
  }

  private setupActivityDetection() {
    const updateActivity = () => {
      this.lastActivity = Date.now();
      if (!this.isUserActive) {
        console.log('👤 User is back online');
        this.setUserOnline(true);
        this.invalidateFriendsCache();
        this.isUserActive = true;
      }
    };

    // Detect user activity (passive listeners for performance)
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
      .forEach(event => {
        document.addEventListener(event, updateActivity, { passive: true });
      });
  }

  private setupWindowEvents() {
    // Handle page unload (close tab/window) - use multiple events for better coverage
    const handleUnload = () => {
      const remainingTabs = this.unregisterTab();
      
      // Only mark offline if this is the last tab
      if (remainingTabs === 0) {
        console.log('🚪 Last tab closing, marking user offline');
        // Use synchronous request for reliability during unload
        this.setUserOfflineSync();
      } else {
        console.log('🚪 Tab closing, but', remainingTabs, 'tabs remain');
      }
    };

    // Use multiple events for better browser compatibility
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('unload', handleUnload);
    window.addEventListener('pagehide', handleUnload);

    // Handle visibility change (tab switch)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        console.log('👁️ Tab hidden');
      } else {
        console.log('👁️ Tab visible, updating activity');
        this.lastActivity = Date.now();
        this.registerTab(); // Re-register in case of stale data
      }
    });
  }

  // private startHeartbeat() {
  //   // Send heartbeat every 30 seconds to keep user online
  //   this.heartbeatInterval = window.setInterval(() => {
  //     this.registerTab(); // Update tab timestamp
      
  //     const user = getAuth();
  //     if (user) {
  //       // Update last heartbeat timestamp per user
  //       const heartbeatKey = `${EfficientOnlineManager.LAST_HEARTBEAT_KEY}_user_${user.id}`;
  //       localStorage.setItem(heartbeatKey, Date.now().toString());
  //       console.log('💓 Heartbeat sent for user:', user.username);
  //     }
  //   }, EfficientOnlineManager.HEARTBEAT_INTERVAL);
  // }

  private async sendHeartbeatToBackend() {
    const user = getAuth();
    const token = getToken();
    
    if (!user || !token) return;
    
    try {
      // WICHTIG: Nutze /online-status statt /status!
      const response = await fetch(`/api/user-service/users/${user.id}/online-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_online: 1 })
      });
      
      if (response.ok) {
        console.log(`💓 Heartbeat sent to backend for user ${user.username} - last_seen updated`);
      } else {
        console.warn(`⚠️ Failed to send heartbeat: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error sending heartbeat to backend:', error);
    }
  }

// DANN ändere die startHeartbeat Methode (ersetze die komplette Methode ab Zeile ~201):

  private startHeartbeat() {
    console.log('🔄 Starting heartbeat interval (30 seconds)');
    
    // Initial heartbeat
    this.sendHeartbeatToBackend();
    
    // Send heartbeat every 30 seconds to keep user online
    this.heartbeatInterval = window.setInterval(async () => {
      this.registerTab(); // Update tab timestamp in localStorage
      
      const user = getAuth();
      const token = getToken();
      
      if (user && token) {
        // Update localStorage heartbeat timestamp
        const heartbeatKey = `${EfficientOnlineManager.LAST_HEARTBEAT_KEY}_user_${user.id}`;
        localStorage.setItem(heartbeatKey, Date.now().toString());
        
        // Send heartbeat to backend to update last_seen in database
        try {
          // WICHTIG: /online-status nutzen!
          const response = await fetch(`/api/user-service/users/${user.id}/online-status`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ is_online: 1 })
          });
          
          if (response.ok) {
            console.log(`💓 Heartbeat ${new Date().toLocaleTimeString()}: User ${user.username} - last_seen updated`);
          } else {
            console.warn(`⚠️ Heartbeat failed: ${response.status}`);
            
            // If unauthorized, user might be logged out
            if (response.status === 401 || response.status === 403) {
              console.log('🔒 User no longer authenticated, stopping heartbeat');
              clearInterval(this.heartbeatInterval);
              this.heartbeatInterval = null;
            }
          }
        } catch (error) {
          console.error('❌ Heartbeat error:', error);
        }
      } else {
        console.log('⚠️ No user/token, stopping heartbeat');
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
    }, EfficientOnlineManager.HEARTBEAT_INTERVAL);
  }

  private async setUserOnline(isOnline: boolean) {
    const user = getAuth();
    const token = getToken();
    
    if (!user || !token) return;

    try {
      const response = await fetch(`/api/user-service/users/${user.id}/online-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_online: isOnline ? 1 : 0 })
      });

      if (response.ok) {
        console.log(`✅ User ${user.username} marked ${isOnline ? 'online' : 'offline'}`);
      } else {
        console.warn(`⚠️ Failed to update online status: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error updating online status:', error);
    }
  }

  private setUserOfflineSync() {
    const user = getAuth();
    const token = getToken();
    
    if (!user || !token) return;

    try {
      // Method 1: Try sendBeacon with FormData (most reliable)
      const formData = new FormData();
      formData.append('is_online', '0');
      formData.append('token', token);
      
      const beaconUrl = `/api/user-service/users/${user.id}/online-status`;
      const sent = navigator.sendBeacon(beaconUrl, formData);
      
      if (sent) {
        console.log('📡 User', user.username, 'marked offline via beacon');
        return;
      }
      
      // Method 2: Fallback to synchronous XHR
      console.warn('⚠️ Beacon failed, trying XHR');
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `/api/user-service/users/${user.id}/online-status`, false);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(JSON.stringify({ is_online: 0 }));
      
      if (xhr.status === 200) {
        console.log('📡 User', user.username, 'marked offline via XHR');
      }
    } catch (error) {
      console.error('❌ Error sending offline:', error);
    }
  }

  // SMART FRIENDS STATUS WITH CACHING
  async getFriendsStatus(forceRefresh = false): Promise<any[]> {
    const user = getAuth();
    const token = getToken();
    
    if (!user || !token) return [];

    // Try cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = this.getCachedFriends();
      if (cached && cached.userId === user.id && !this.isCacheExpired(cached.timestamp)) {
        console.log('📋 Using cached friend status');
        return cached.friends;
      }
    }

    // Fetch from server
    console.log('🌐 Fetching fresh friend status');
    try {
      const response = await fetch(`/api/user-service/users/${user.id}/friends`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) return [];

      const result = await response.json();
      const friends = result.friends || [];

      // Cache the results
      this.cacheFriends(friends, user.id);
      return friends;

    } catch (error) {
      console.error('❌ Failed to fetch friends:', error);
      // Return cached data as fallback
      const cached = this.getCachedFriends();
      return cached?.friends || [];
    }
  }

  private getCachedFriends(): CachedFriendStatus | null {
    try {
      const cached = sessionStorage.getItem(EfficientOnlineManager.CACHE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  }

  private cacheFriends(friends: any[], userId: string) {
    const cacheData: CachedFriendStatus = {
      friends,
      userId,
      timestamp: Date.now()
    };
    
    try {
      sessionStorage.setItem(EfficientOnlineManager.CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('⚠️ Failed to cache friends data:', error);
    }
  }

  private isCacheExpired(timestamp: number): boolean {
    return Date.now() - timestamp > EfficientOnlineManager.CACHE_DURATION;
  }

  invalidateFriendsCache() {
    console.log('🗑️ Invalidating friends cache');
    try {
      sessionStorage.removeItem(EfficientOnlineManager.CACHE_KEY);
    } catch (error) {
      console.warn('⚠️ Failed to clear cache:', error);
    }
  }

  // Manual refresh for user action (like clicking refresh button)
  async refreshFriendsStatus(): Promise<any[]> {
    return this.getFriendsStatus(true);
  }

  destroy() {
    console.log('🧹 Destroying online status manager');
    
    // Stop heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    // Stop activity check
    if (this.activityCheckInterval) {
      clearInterval(this.activityCheckInterval);
      this.activityCheckInterval = null;
    }
    
    // Unregister tab and mark offline if last tab
    const remainingTabs = this.unregisterTab();
    if (remainingTabs === 0) {
      console.log('🚪 Last tab destroyed, marking user offline');
      this.setUserOnline(false);
    }
    
    this.invalidateFriendsCache();
  }
}

export const onlineManager = EfficientOnlineManager.getInstance();

// Explicit presence helpers for login/logout flows
let didReportOnline = false;
const GATEWAY_BASE: string = (import.meta as any).env?.VITE_GATEWAY_BASE || '/api';

export async function reportOnlineOnce(): Promise<void> {
  try {
    if (didReportOnline) return;
    const user = getAuth();
    const token = getToken();
    if (!user || !token) return;

    await fetch(`${GATEWAY_BASE}/user-service/users/${user.id}/online-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ is_online: 1 })
    });
    didReportOnline = true;
    console.log('✅ Reported online once for user:', user.username);
  } catch (error) {
    console.warn('⚠️ Failed to report online:', error);
  }
}

export async function reportOffline(): Promise<void> {
  try {
    const user = getAuth();
    const token = getToken();
    if (!user || !token) return;

    // Use synchronous XHR for logout to ensure it completes
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${GATEWAY_BASE}/user-service/users/${user.id}/online-status`, false);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(JSON.stringify({ is_online: 0 }));
    
    if (xhr.status === 200) {
      console.log('✅ Reported offline for user:', user.username);
    } else {
      console.warn('⚠️ Failed to report offline, status:', xhr.status);
    }
  } catch (error) {
    console.warn('⚠️ Failed to report offline:', error);
  }
}
