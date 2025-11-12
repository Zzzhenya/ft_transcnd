/**
 * Manages online status and friend list caching
 * 
 * Performance optimizations:
 * - Caches friend list to avoid repeated requests
 * - Debounces status updates
 * - Efficient network usage
 */

import { getAuth, getToken } from '../app/auth';
import type { PublicUser } from '../../../shared/types';

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
    // Presence reporting disabled here to avoid multi-tab interference during tests
    this.isUserActive = true;
    this.lastActivity = Date.now();
    // Do not auto-wire activity/window/monitoring for presence during remote-player testing
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
    // Presence events disabled to avoid multi-tab interference during testing
  }

  private startActivityMonitoring() {
    // Disabled during testing to prevent automatic offline toggles
  }

  private async setUserOnline(_isOnline: boolean) {
    // Disabled during testing; use explicit helpers reportOnlineOnce/reportOffline instead
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
    if (this.activityCheckInterval) {
      clearInterval(this.activityCheckInterval);
      this.activityCheckInterval = null;
    }
    this.invalidateFriendsCache();
  }
}

export const onlineManager = EfficientOnlineManager.getInstance();

// Explicit presence helpers for login/logout flows (non-intrusive for multi-tab testing)
let didReportOnline = false;
const GATEWAY_BASE: string = (import.meta as any).env?.VITE_GATEWAY_BASE || '/api';

export async function reportOnlineOnce(): Promise<void> {
  try {
    if (didReportOnline) return;
    const user = getAuth();
    const token = getToken();
    if (!user || !token) return;

    // Use legacy endpoint the backend expects
    await fetch(`${GATEWAY_BASE}/user-service/users/${user.id}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ is_online: 1 })
    });
    didReportOnline = true;
  } catch {
    // ignore during testing
  }
}

export async function reportOffline(): Promise<void> {
  try {
    const user = getAuth();
    const token = getToken();
    if (!user || !token) return;

    // Use legacy endpoint the backend expects
    await fetch(`${GATEWAY_BASE}/user-service/users/${user.id}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ is_online: 0 })
    });
  } catch {
    // ignore during testing
  }
}