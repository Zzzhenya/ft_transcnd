// Simple polling-based notification system as fallback
import { getAuth, getToken } from '../app/auth';
import { GATEWAY_BASE } from '../app/config';

interface SimpleNotification {
  id: number;
  type: string;
  from: string;
  fromId: number;
  roomCode?: string;
  payload?: any;
  timestamp: string;
  read: boolean;
}

export class SimpleNotificationPoller {
  private pollInterval?: number;
  private isPolling = false;
  private lastCheck = 0;

  constructor() {
    console.log('🔔 Simple notification poller created');
    // Restore last check time from localStorage to avoid showing old notifications on refresh
    const stored = localStorage.getItem('notificationLastCheck');
    if (stored) {
      this.lastCheck = parseInt(stored, 10);
      console.log('🔔 Restored last check time:', new Date(this.lastCheck).toISOString());
    }
  }

  start() {
    if (this.isPolling) return;
    
    const user = getAuth();
    if (!user) {
      console.log('🔔 Cannot start polling: no user');
      return;
    }

    console.log('🔔 Starting notification polling for user:', user.id);
    this.isPolling = true;
    this.pollInterval = window.setInterval(() => {
      this.checkNotifications();
    }, 500); // Poll every 500ms for faster response
  }

  stop() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = undefined;
    }
    this.isPolling = false;
    console.log('🔔 Stopped notification polling');
  }

  private async checkNotifications() {
    try {
      const token = getToken();
      const user = getAuth();
      
      if (!token || !user) {
        console.log('🔔 ❌ No token or user, stopping polling');
        this.stop();
        return;
      }

      // console.log('🔔 📡 Checking notifications for user:', user.id);
      const response = await fetch(`${GATEWAY_BASE}/user-service/notifications/unread`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // console.log('🔔 📡 Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        const notifications: SimpleNotification[] = data.notifications || [];
        
        // console.log('🔔 📨 Raw response data:', data);
        // console.log('🔔 📨 Parsed notifications:', notifications);
        
        if (notifications.length > 0) {
          // console.log('🔔 📨 Received', notifications.length, 'total notifications:', notifications);
        } else {
          // console.log('🔔 📨 No notifications received');
        }
        
        // console.log('🔔 📊 DETAILED DEBUG:');
        // console.log('🔔 📊 this.lastCheck:', this.lastCheck);
        // console.log('🔔 📊 Date of lastCheck:', new Date(this.lastCheck).toISOString());
        // console.log('🔔 📊 Current time:', Date.now());
        // console.log('🔔 📊 Is first check?', this.lastCheck === 0);
        // console.log('🔔 📊 All notifications:', notifications);
        
        // TEMPORARY FIX: Reset lastCheck if it's too old (more than 5 minutes ago)
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
        if (this.lastCheck > 0 && this.lastCheck < fiveMinutesAgo) {
          console.log('🔔 🔧 RESET: lastCheck is too old, resetting to show recent notifications');
          this.lastCheck = Date.now() - (2 * 60 * 1000); // Set to 2 minutes ago
          localStorage.setItem('notificationLastCheck', this.lastCheck.toString());
        }
        
        // SIMPLE FIX: Show all game_invite notifications, filter out others by time
        const notificationsToShow = notifications.filter(n => {
          if (n.type === 'game_invite') {
            console.log('🔔 ✅ Showing game_invite notification:', n.id);
            return true; // Always show game invitations
          } else if (n.type === 'invitation_accepted' || n.type === 'invitation_declined') {
            // Show accept/decline notifications that are recent (last 30 seconds)
            const notifTime = new Date(n.timestamp).getTime();
            const isRecent = notifTime > Date.now() - 30000; // 30 seconds
            if (isRecent) {
              console.log('🔔 ✅ Showing recent accept/decline notification:', n.id, n.type);
            }
            // console.log('🔔 📊 Accept/Decline notification', n.id, 'type:', n.type, 'is recent:', isRecent);
            return isRecent;
          } else {
            // For other types, use time filtering to avoid redirect loops
            const notifTime = new Date(n.timestamp).getTime();
            const isNewer = this.lastCheck === 0 ? (notifTime > Date.now() - 60000) : (notifTime > this.lastCheck);
            // console.log('🔔 📊 Other notification', n.id, 'type:', n.type, 'is newer:', isNewer);
            return isNewer;
          }
        });
        
        console.log('🔔 📊 Filtering result: showing', notificationsToShow.length, 'of', notifications.length);

        if (notificationsToShow.length > 0) {
          console.log('🔔 🎮 SHOWING', notificationsToShow.length, 'notifications');
          // console.log('🔔 📊 Last check was:', new Date(this.lastCheck).toISOString());
          // console.log('🔔 📊 Current time:', new Date().toISOString());
          // console.log('🔔 📊 Notifications to show:', notificationsToShow.map(n => ({
          //   id: n.id,
          //   timestamp: n.timestamp,
          //   from: n.from,
          //   type: n.type
          // })));
          
          notificationsToShow.forEach((notification, index) => {
            // console.log(`🔔 🚀 Calling showNotification for notification ${index + 1}/${notificationsToShow.length}:`, notification);
            this.showNotification(notification);
          });
        } else {
          // console.log('🔔 📭 No notifications to show after filtering');
        }
        
        // Update and save last check time
        const now = Date.now();
        this.lastCheck = now;
        localStorage.setItem('notificationLastCheck', now.toString());
      } else {
        console.error('🔔 ❌ Failed to fetch notifications:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('🔔 ❌ Error polling notifications:', error);
    }
  }

  private showNotification(notification: SimpleNotification) {
    console.log('🔔 🎮 Showing notification:', notification);
    console.log('🔔 🎮 Notification type:', notification.type);
    console.log('🔔 🎮 Notification from:', notification.from);
    console.log('🔔 🎮 Notification roomCode:', notification.roomCode);
    
    if (notification.type === 'game_invite') {
      console.log('🔔 🎮 Creating game invitation modal...');
      this.showGameInvitation(notification);
    } else if (notification.type === 'invitation_accepted') {
      console.log('🔔 🎮 Showing invitation accepted...');
      this.showInvitationAccepted(notification);
    } else if (notification.type === 'invitation_declined') {
      console.log('🔔 🎮 Showing invitation declined...');
      this.showInvitationDeclined(notification);
    } else {
      console.log('🔔 ❌ Unknown notification type:', notification.type);
    }
  }

  private showGameInvitation(notification: SimpleNotification) {
    console.log('🔔 🚀 Creating game invitation modal for:', notification.id);
    
    // Remove any existing modals first
    const existingModal = document.getElementById(`simple-invitation-${notification.id}`);
    if (existingModal) {
      console.log('🔔 🗑️ Removing existing modal');
      document.body.removeChild(existingModal);
    }
    
    // Create invitation modal
    const modal = document.createElement('div');
    modal.id = `simple-invitation-${notification.id}`;
    modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8 rounded-2xl shadow-2xl max-w-lg w-full mx-4 border-2 border-blue-500">
        <div class="text-center">
          <div class="text-6xl mb-4">🎮</div>
          <h3 class="text-3xl font-black text-white mb-3">GAME INVITATION!</h3>
          <div class="bg-white/10 rounded-lg p-4 mb-6 backdrop-blur-sm">
            <p class="text-xl text-blue-200 mb-2">
              <span class="font-black text-yellow-300">${notification.from}</span> 
              <br>wants to challenge you!
            </p>
            <p class="text-sm text-cyan-300 font-mono bg-black/30 rounded px-3 py-2 inline-block">
              Room Code: <span class="font-black text-yellow-300">${notification.roomCode}</span>
            </p>
          </div>
          <div class="flex gap-4 justify-center">
            <button 
              class="accept-btn px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-black text-lg hover:from-green-400 hover:to-emerald-500 transition-all transform hover:scale-105"
              onclick="simpleNotificationPoller.acceptInvitation(${notification.id}, '${notification.roomCode}')">
              ✅ ACCEPT
            </button>
            <button 
              class="decline-btn px-8 py-4 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl font-black text-lg hover:from-red-400 hover:to-pink-500 transition-all transform hover:scale-105"
              onclick="simpleNotificationPoller.declineInvitation(${notification.id})">
              ❌ DECLINE
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    console.log('🔔 ✅ Simple notification modal created and added to DOM');
    console.log('🔔 🎮 Modal element:', modal);
    console.log('🔔 🎮 Modal innerHTML length:', modal.innerHTML.length);

    // Auto-decline after 30 seconds
    setTimeout(() => {
      if (document.getElementById(`simple-invitation-${notification.id}`)) {
        console.log('🔔 ⏰ Auto-declining invitation after 30 seconds');
        this.declineInvitation(notification.id);
      }
    }, 30000);
  }

  private showInvitationAccepted(notification: SimpleNotification) {
    console.log('🔔 🎉 Someone accepted your invitation!', notification);
    
    // Clear the countdown if it exists
    this.clearInvitationCountdown();
    
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-green-500 text-white p-6 rounded-lg shadow-lg z-50 border-2 border-green-300';
    toast.innerHTML = `
      <div class="flex items-center gap-3">
        <span class="text-2xl">🎉</span>
        <div>
          <div class="font-bold text-lg">Invitation Accepted!</div>
          <div class="text-sm opacity-90">
            <strong>${notification.from}</strong> accepted your challenge!
          </div>
          <div class="text-xs mt-1 opacity-75">
            Room Code: <strong>${notification.roomCode}</strong>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(toast);
    
    // Auto-redirect to game room after 3 seconds
    let countdown = 3;
    const countdownEl = document.createElement('div');
    countdownEl.className = 'text-xs mt-2 opacity-75';
    countdownEl.textContent = `Redirecting in ${countdown} seconds...`;
    toast.appendChild(countdownEl);
    
    const countdownTimer = setInterval(() => {
      countdown--;
      countdownEl.textContent = `Redirecting in ${countdown} seconds...`;
      
      if (countdown <= 0) {
        clearInterval(countdownTimer);
        if (notification.roomCode) {
          window.location.href = `/remote/room/${notification.roomCode}`;
        }
      }
    }, 1000);
    
    // Remove toast after redirect
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 3500);
  }

  async acceptInvitation(notificationId: number, roomCode: string) {
    console.log('🔔 ✅ Accepting invitation:', notificationId, roomCode);
    
    try {
      const token = getToken();
      const response = await fetch(`${GATEWAY_BASE}/user-service/notifications/${notificationId}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      if (response.ok) {
        console.log('🔔 ✅ Invitation accepted');
        
        // Remove modal
        const modal = document.getElementById(`simple-invitation-${notificationId}`);
        if (modal) {
          document.body.removeChild(modal);
        }
        
        // Navigate to game room
        if (roomCode) {
          window.location.href = `/remote/room/${roomCode}`;
        }
      } else {
        console.error('🔔 ❌ Failed to accept invitation:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('🔔 ❌ Error details:', errorText);
      }
    } catch (error) {
      console.error('🔔 ❌ Error accepting invitation:', error);
    }
  }

  async declineInvitation(notificationId: number) {
    console.log('🔔 ❌ Declining invitation:', notificationId);
    
    try {
      const token = getToken();
      const response = await fetch(`${GATEWAY_BASE}/user-service/notifications/${notificationId}/decline`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      
      if (response.ok) {
        console.log('🔔 ✅ Invitation declined successfully');
      } else {
        console.error('🔔 ❌ Failed to decline invitation:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('🔔 ❌ Error details:', errorText);
      }
    } catch (error) {
      console.error('🔔 ❌ Error declining invitation:', error);
    } finally {
      // Remove modal regardless
      const modal = document.getElementById(`simple-invitation-${notificationId}`);
      if (modal) {
        document.body.removeChild(modal);
      }
    }
  }

  private showInvitationDeclined(notification: SimpleNotification) {
    console.log('🔔 😔 Someone declined your invitation:', notification);
    
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-red-500 text-white p-6 rounded-lg shadow-lg z-50 border-2 border-red-300';
    toast.innerHTML = `
      <div class="flex items-center gap-3">
        <span class="text-2xl">😔</span>
        <div>
          <div class="font-bold text-lg">Invitation Declined</div>
          <div class="text-sm opacity-90">
            <strong>${notification.from}</strong> declined your challenge.
          </div>
          <div class="text-xs mt-1 opacity-75">
            Room Code: <strong>${notification.roomCode}</strong>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(toast);
    
    // Remove toast after 5 seconds
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 5000);
  }

  // Method to show invitation countdown for sender
  showInvitationCountdown(friendName: string, roomCode: string, timeoutMs: number = 10000) {
    console.log('🔔 📤 Showing invitation countdown for', friendName);
    
    // Remove any existing countdown
    const existing = document.getElementById('invitation-countdown');
    if (existing) existing.remove();
    
    const countdown = document.createElement('div');
    countdown.id = 'invitation-countdown';
    countdown.className = 'fixed top-4 right-4 bg-blue-600 text-white p-6 rounded-lg shadow-lg z-50 border-2 border-blue-400 min-w-80';
    
    let timeLeft = Math.floor(timeoutMs / 1000);
    countdown.innerHTML = `
      <div class="flex items-center gap-3 mb-3">
        <span class="text-2xl">📤</span>
        <div>
          <div class="font-bold text-lg">Invitation Sent!</div>
          <div class="text-sm opacity-90">
            Waiting for <strong>${friendName}</strong> to respond...
          </div>
        </div>
      </div>
      <div class="text-center">
        <div class="text-2xl font-mono bg-white/20 rounded px-3 py-1 inline-block">
          <span id="countdown-timer">${timeLeft}</span>s
        </div>
        <div class="text-xs mt-2 opacity-75">Room: ${roomCode}</div>
      </div>
    `;
    
    document.body.appendChild(countdown);
    
    const timer = setInterval(() => {
      timeLeft--;
      const timerEl = document.getElementById('countdown-timer');
      if (timerEl) timerEl.textContent = timeLeft.toString();
      
      if (timeLeft <= 0) {
        clearInterval(timer);
        
        // Show "no answer" message
        countdown.innerHTML = `
          <div class="flex items-center gap-3">
            <span class="text-2xl">⏰</span>
            <div>
              <div class="font-bold text-lg text-yellow-300">No Answer</div>
              <div class="text-sm opacity-90">
                <strong>${friendName}</strong> didn't respond to your invitation.
              </div>
            </div>
          </div>
        `;
        countdown.className = 'fixed top-4 right-4 bg-yellow-600 text-white p-6 rounded-lg shadow-lg z-50 border-2 border-yellow-400 min-w-80';
        
        // Remove after 3 seconds
        setTimeout(() => {
          if (document.body.contains(countdown)) {
            document.body.removeChild(countdown);
          }
        }, 3000);
      }
    }, 1000);
    
    // Store timer to clear it if invitation is accepted
    (countdown as any).countdownTimer = timer;
    
    return countdown;
  }

  // Method to clear countdown when invitation is accepted
  clearInvitationCountdown() {
    const countdown = document.getElementById('invitation-countdown');
    if (countdown) {
      const timer = (countdown as any).countdownTimer;
      if (timer) clearInterval(timer);
      countdown.remove();
      console.log('🔔 ✅ Cleared invitation countdown');
    }
  }

  // Public method for debugging
  async debugCheckNotifications() {
    console.log('🔔 🐛 DEBUG: Manual check triggered');
    await this.checkNotifications();
  }

  // Debug method to show all notifications ignoring time filters
  showAllNotifications() {
    console.log('🔔 🐛 DEBUG: Forcing show all notifications');
    this.checkNotifications().then(() => {
      // Override the filtering temporarily
      fetch(`${GATEWAY_BASE}/user-service/notifications/unread`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      }).then(res => res.json()).then(data => {
        const notifications = data.notifications || [];
        console.log('🔔 🐛 DEBUG: All notifications from server:', notifications);
        notifications.forEach((notification: SimpleNotification) => {
          console.log('🔔 🐛 DEBUG: Force showing notification:', notification);
          this.showNotification(notification);
        });
      });
    });
  }
  testNotification() {
    const testNotification: SimpleNotification = {
      id: 999,
      type: 'game_invite',
      from: 'TestUser',
      fromId: 1,
      roomCode: 'TEST123',
      payload: null,
      timestamp: new Date().toISOString(),
      read: false
    };
    
    this.showNotification(testNotification);
  }

  testInvitationCountdown() {
    this.showInvitationCountdown('TestFriend', 'ABC123', 10000);
  }
}

// Global instance
export const simpleNotificationPoller = new SimpleNotificationPoller();

// Make it available globally
(window as any).simpleNotificationPoller = simpleNotificationPoller;