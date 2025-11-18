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
    // Restore last check time from localStorage to avoid showing old notifications on refresh
    const stored = localStorage.getItem('notificationLastCheck');
    if (stored) {
      this.lastCheck = parseInt(stored, 10);
    }
  }

  start() {
    if (this.isPolling) return;
    
    const user = getAuth();
    if (!user) {
      return;
    }

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
  }

  private async checkNotifications() {
    try {
      const token = getToken();
      const user = getAuth();
      
      if (!token || !user) {
        this.stop();
        return;
      }

      const response = await fetch(`${GATEWAY_BASE}/user-service/notifications/unread`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const notifications: SimpleNotification[] = data.notifications || [];
        
        // Show notifications with proper time filtering
        const notificationsToShow = notifications.filter(n => {
          if (n.type === 'game_invite') {
            return true; // Always show game invitations
          } else if (n.type === 'invitation_declined' || n.type === 'invitation_accepted') {
            // Show accept/decline notifications that are recent (last 5 minutes)
            const notifTime = new Date(n.timestamp).getTime();
            const age = Math.floor((Date.now() - notifTime) / 1000);
            const isRecent = notifTime > Date.now() - 300000; // 5 minutes
            if (n.type === 'invitation_declined') {
            //  console.log(`🔔 Decline notification #${n.id}: age=${age}s, showing=${isRecent}`);
            }
            return isRecent;
          } else {
            // For other types, use time filtering to avoid redirect loops
            const notifTime = new Date(n.timestamp).getTime();
            const isNewer = this.lastCheck === 0 ? (notifTime > Date.now() - 60000) : (notifTime > this.lastCheck);
            return isNewer;
          }
        });

        if (notificationsToShow.length > 0) {
          notificationsToShow.forEach((notification) => {
            this.showNotification(notification);
          });
        }
        
        // Update and save last check time
        const now = Date.now();
        this.lastCheck = now;
        localStorage.setItem('notificationLastCheck', now.toString());
      } else {
        // Silent fail
      }
    } catch (error) {
      // Silent fail
    }
  }

  private showNotification(notification: SimpleNotification) {
    if (notification.type === 'game_invite') {
      this.showGameInvitation(notification);
    } else if (notification.type === 'invitation_accepted') {
      this.showInvitationAccepted(notification);
    } else if (notification.type === 'invitation_declined') {
      this.showInvitationDeclined(notification);
    }
  }

  private showGameInvitation(notification: SimpleNotification) {
    // Remove any existing modals first
    const existingModal = document.getElementById(`simple-invitation-${notification.id}`);
    if (existingModal) {
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

    // Auto-decline after 30 seconds
    setTimeout(() => {
      if (document.getElementById(`simple-invitation-${notification.id}`)) {
        this.declineInvitation(notification.id);
      }
    }, 30000);
  }

  private showInvitationAccepted(notification: SimpleNotification) {
    // Check if we already showed this notification
    const shownKey = `accept_shown_${notification.id}`;
    if (sessionStorage.getItem(shownKey)) {
      return; // Already shown, don't show again
    }
    sessionStorage.setItem(shownKey, 'true');
    
    // Clear the countdown if it exists
    this.clearInvitationCountdown();
    
    const toast = document.createElement('div');
    toast.id = `accept-toast-${notification.id}`;
    toast.className = 'fixed top-4 right-4 bg-green-500 text-white p-6 rounded-lg shadow-lg z-50 border-2 border-green-300';
    toast.innerHTML = `
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <span class="text-2xl">🎉</span>
          <div>
            <div class="font-bold text-lg">Invitation Accepted!</div>
            <div class="text-sm opacity-90">
              <strong>${notification.from}</strong> accepted your challenge!
            </div>
            ${notification.roomCode ? `<div class="text-xs mt-1 opacity-75">Room Code: <strong>${notification.roomCode}</strong></div>` : ''}
          </div>
        </div>
        <button class="text-white hover:text-gray-200 text-2xl font-bold leading-none" onclick="document.getElementById('accept-toast-${notification.id}')?.remove()">×</button>
      </div>
    `;
    
    document.body.appendChild(toast);
    
    // Remove toast after 10 seconds (NO AUTO-REDIRECT)
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 10000);
  }

  async acceptInvitation(notificationId: number, roomCode: string) {
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
        // Remove modal
        const modal = document.getElementById(`simple-invitation-${notificationId}`);
        if (modal) {
          document.body.removeChild(modal);
        }
        
        // Navigate to game room
        if (roomCode) {
          window.location.href = `/remote/room/${roomCode}`;
        }
      }
    } catch (error) {
      // Silent fail
    }
  }

  async declineInvitation(notificationId: number) {
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
      
      } catch (error) {
      // Silent fail
    } finally {
      // Remove modal regardless
      const modal = document.getElementById(`simple-invitation-${notificationId}`);
      if (modal) {
        document.body.removeChild(modal);
      }
    }
  }

  private showInvitationDeclined(notification: SimpleNotification) {
    // Check if we already showed this notification
    const shownKey = `decline_shown_${notification.id}`;
    if (sessionStorage.getItem(shownKey)) {
      return; // Already shown, don't show again
    }
    sessionStorage.setItem(shownKey, 'true');
    
    // Dispatch the invite:declined event for pages to listen to
    window.dispatchEvent(new CustomEvent('invite:declined', { detail: notification }));
    
    const toast = document.createElement('div');
    toast.id = `decline-toast-${notification.id}`;
    toast.className = 'fixed top-4 right-4 bg-red-500 text-white p-6 rounded-lg shadow-lg z-50 border-2 border-red-300';
    toast.innerHTML = `
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <span class="text-2xl">😔</span>
          <div>
            <div class="font-bold text-lg">Invitation Declined</div>
            <div class="text-sm opacity-90">
              <strong>${notification.from}</strong> declined your challenge.
            </div>
          </div>
        </div>
        <button class="text-white hover:text-gray-200 text-2xl font-bold leading-none" onclick="document.getElementById('decline-toast-${notification.id}')?.remove()">×</button>
      </div>
    `;
    //  ${notification.roomCode ? `<div class="text-xs mt-1 opacity-75">Room Code: <strong>${notification.roomCode}</strong></div>` : ''}
    
    document.body.appendChild(toast);
    
    // Remove toast after 10 seconds
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 10000);
  }

  showInvitationCountdown(friendName: string, roomCode: string, timeoutMs: number = 10000) {
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
    }
  }

  async debugCheckNotifications() {
    await this.checkNotifications();
  }

  showAllNotifications() {
    this.checkNotifications().then(() => {
      // Override the filtering temporarily
      fetch(`${GATEWAY_BASE}/user-service/notifications/unread`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      }).then(res => res.json()).then(data => {
        const notifications = data.notifications || [];
        notifications.forEach((notification: SimpleNotification) => {
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