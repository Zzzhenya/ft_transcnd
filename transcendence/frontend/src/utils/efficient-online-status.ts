/**
 * EFFICIENT ONLINE STATUS MANAGER
 * 
 * Strategy: Minimize server requests by using browser events + smart caching
 * - No constant polling (3 seconds → 2 minutes)
 * - Cache friend status for 1 minute
 * - Only update on actual user activity
 * - Use sessionStorage for performance
 * 
 * 🚧 TESTING MODE: Tab blur event disabled for single-computer testing
 * TODO: Re-enable blur event once multi-user testing is available
 */

import { getAuth, getToken } from '../app/auth';
import { GATEWAY_BASE } from '../app/config';

interface CachedFriendStatus {
  friends: any[];
  timestamp: number;
  userId: string; // Changed from number to string to match getAuth().id
}

class EfficientOnlineManager {
  private static instance: EfficientOnlineManager;
  private isUserActive = true;
  private lastActivity = Date.now();
  private friendsCache: CachedFriendStatus | null = null;
  private activityCheckInterval: number | null = null;
  
  // Cache settings
  private static readonly CACHE_DURATION = 60000; // 1 minute
  private static readonly ACTIVITY_CHECK = 120000; // 2 minutes
  private static readonly CACHE_KEY = 'transcendence_friends_status';

  static getInstance(): EfficientOnlineManager {
    if (!EfficientOnlineManager.instance) {
      EfficientOnlineManager.instance = new EfficientOnlineManager();
    }
    return EfficientOnlineManager.instance;
  }

  init() {
    console.log('🎯 Initializing efficient online status manager');
    
    // IMPORTANT: Set user online immediately when initializing
    this.setUserOnline(true);
    this.isUserActive = true;
    this.lastActivity = Date.now();
    
    this.setupActivityDetection();
    this.setupWindowEvents();
    this.startActivityMonitoring();
  }

  private setupActivityDetection() {
    const updateActivity = () => {
      this.lastActivity = Date.now();
      if (!this.isUserActive) {
        console.log('👤 User is back online');
        this.setUserOnline(true);
        this.invalidateFriendsCache(); // Refresh friends when user comes back
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
    // Tab focus/blur
    window.addEventListener('focus', () => {
      console.log('🔍 Tab focused');
      this.setUserOnline(true);
      this.invalidateFriendsCache();
    });

    // TEMPORARILY DISABLED FOR TESTING - Single computer can't test with multiple tabs
    // TODO: Re-enable this once multi-user testing is possible
    // window.addEventListener('blur', () => {
    //   console.log('😴 Tab blurred');
    //   this.setUserOnline(false);
    // });

    // Page unload - keep this active for proper cleanup
    window.addEventListener('beforeunload', () => {
      console.log('👋 Page unloading');
      this.setUserOnline(false);
    });
  }

  private startActivityMonitoring() {
    // Check for inactivity every 2 minutes (not every 3 seconds!)
    this.activityCheckInterval = window.setInterval(() => {
      const timeSinceActivity = Date.now() - this.lastActivity;
      
      if (timeSinceActivity > EfficientOnlineManager.ACTIVITY_CHECK && this.isUserActive) {
        console.log('😴 User inactive for 2+ minutes, setting offline');
        this.setUserOnline(false);
        this.isUserActive = false;
      }
    }, EfficientOnlineManager.ACTIVITY_CHECK);
  }

  private async setUserOnline(isOnline: boolean) {
    const user = getAuth();
    const token = getToken();
    
    if (!user || !token) return;

    try {
      await fetch(`${GATEWAY_BASE}/user-service/users/${user.id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_online: isOnline ? 1 : 0 })
      });
    } catch (error) {
      console.error('❌ Failed to update online status:', error);
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
      const response = await fetch(`${GATEWAY_BASE}/user-service/users/${user.id}/friends`, {
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
    if (this.activityCheckInterval) {
      clearInterval(this.activityCheckInterval);
      this.activityCheckInterval = null;
    }
    this.invalidateFriendsCache();
  }
}

export const onlineManager = EfficientOnlineManager.getInstance();