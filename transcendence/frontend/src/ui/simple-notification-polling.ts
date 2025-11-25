// Simple polling-based notification system as fallback
// import { getAuth, getToken, refreshTokenIfNeeded } from '../app/auth';
import { getAuth, loadUserProfile } from '../app/auth';
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
    }, 2000); // Poll every 2 seconds for faster response
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
      const user = getAuth();
      if (!user) {
        const refreshed = await (loadUserProfile && loadUserProfile())
        if (!refreshed)
          throw new Error({success: false, error: "Failed to fetch profile"});
        // this.stop(); 
        // return; 
      }

      // Ask what this section does
      // let token = getToken();
      // if (!token) {
      //   const refreshed = await (refreshTokenIfNeeded && refreshTokenIfNeeded());
      //   token = getToken();
      //   if (!refreshed || !token) { this.stop(); return; }
      // }

      let response = await fetch(`${GATEWAY_BASE}/user-service/notifications/unread`, {
        // headers: { 'Authorization': `Bearer ${token}` }, 
        credentials: 'include'
      });

      if (response.status === 401 || response.status === 403) {
        // const refreshed = await (loadUserProfile && loadUserProfile())
        // // const refreshed = await (refreshTokenIfNeeded && refreshTokenIfNeeded());
        // if (refreshed) {
        //   const user = getAuth()
        //   // token = getToken();
        //   // if (token) {
        //   if (user) {
        //     response = await fetch(`${GATEWAY_BASE}/user-service/notifications/unread`, {
        //       // headers: { 'Authorization': `Bearer ${token}` },
        //       credentials: 'include',
        //     });
        //   }

        // Maybe ask to login?
        this.stop(); 
        return; 
        }

      if (response.ok) {
        const data = await response.json();
        const notifications: SimpleNotification[] = data.notifications || [];
        
        // Show notifications with proper time filtering
        const notificationsToShow = notifications.filter(n => {
          const notifTime = new Date(n.timestamp).getTime();
          const age = Math.floor((Date.now() - notifTime) / 1000);
          if (n.type === 'game_invite') {
            return true; // Always show game invitations
          } else if (n.type === 'invitation_declined' || n.type === 'invitation_accepted' || n.type === 'player_left_room') {
            // Only show recent ones (last 30 seconds) to avoid showing old notifications
            return age < 30;
          } else {
            // For other types, use time filtering to avoid redirect loops
            const notifTime = new Date(n.timestamp).getTime();
            const isNewer = this.lastCheck === 0 ? (notifTime > Date.now() - 60000) : (notifTime > this.lastCheck);
            return isNewer;
          }
        });

        if (notificationsToShow.length > 0) {
          // Group by type and only show the most recent of each type
          const byType = new Map<string, SimpleNotification>();
          notificationsToShow.forEach(n => {
            const existing = byType.get(n.type);
            if (!existing || new Date(n.timestamp).getTime() > new Date(existing.timestamp).getTime()) {
              byType.set(n.type, n);
            }
          });
          
          // Show only the most recent of each type
          byType.forEach((notification) => {
            this.showNotification(notification);
          });
        }
        
        // Update and save last check time
        const now = Date.now();
        this.lastCheck = now;
        localStorage.setItem('notificationLastCheck', now.toString());
      } else if (response.status === 429) {
        await new Promise(r => setTimeout(r, 1500));
      } else if (response.status === 409 || response.status === 410) {
        // ignore
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
    } else if (notification.type === 'player_left_room') {
      this.showPlayerLeftRoom(notification);    }
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
    modal.className = 'retro-wait fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-topmost';
    modal.innerHTML = `
      <div class="bezel p-8 rounded-2xl max-w-lg w-full mx-4 border">
        <div class="text-center">
          <div class="mb-4 flex justify-center"><img class="icon-px-lg icon-px--violet" src="/icons/speaker.png" alt="Notification" /></div>
          <h3 class="text-3xl neon font-normal mb-3">GAME INVITATION</h3>
          <div class="bg-white/10 rounded-lg p-4 mb-6 backdrop-blur-sm">
            <p class="text-sm uppercase" style="color:#c4b5fd">
              <span class="font-black text-yellow-300">${notification.from}</span> 
              <br>wants to challenge you!
            </p>
            <p class="text-sm font-mono bg-black/30 rounded px-3 py-2 inline-block" style="color:#fef08a">
              Room Code: <span class="font-normal uppercase" style="color:#fef08a">${notification.roomCode}</span>
            </p>
          </div>
          <div class="flex gap-4 justify-center">
            <button 
              class="accept-btn btn-retro px-8 py-4 text-white rounded-xl font-normal text-lg"
              onclick="simpleNotificationPoller.acceptInvitation(${notification.id}, '${notification.roomCode}')">
              ✅ ACCEPT
            </button>
            <button 
              class="decline-btn btn-retro px-8 py-4 text-white rounded-xl font-normal text-lg"
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
    
    // Remove any existing accept toasts first
    document.querySelectorAll('[id^="accept-toast-"]').forEach(el => el.remove());
    
    // Clear the countdown if it exists
    this.clearInvitationCountdown();
    
    const toast = document.createElement('div');
    toast.id = `accept-toast-${notification.id}`;
    toast.className = 'retro-wait fixed top-4 right-4 p-6 rounded-lg z-50 border bezel';
    toast.innerHTML = `
      <div class="flex items-center gap-3">
        <img class="icon-px" src="/icons/speaker.png" alt="Notification" />
        <div>
          <div class="font-normal text-lg neon">INVITATION ACCEPTED</div>
          <div class="text-sm opacity-90">
            <strong>${notification.from}</strong> accepted your challenge!
          </div>
          ${notification.roomCode ? `<div class="text-xs mt-1 opacity-75">Room Code: <strong>${notification.roomCode}</strong></div>` : ''}
        </div>
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
      // let token = getToken();
      // if (!token) {
      //   const refreshed = await (refreshTokenIfNeeded && refreshTokenIfNeeded());
      //   token = getToken();
      //   if (!refreshed || !token) return;
      // }

      let response = await fetch(`${GATEWAY_BASE}/user-service/notifications/${notificationId}/accept`, {
        method: 'POST',
        headers: {
          // 'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({})
      });
      if (response.status === 401 || response.status === 403) {
        // const refreshed = await (refreshTokenIfNeeded && refreshTokenIfNeeded());
        // if (refreshed) {
        //   token = getToken();
        //   if (!token) return;
        //   response = await fetch(`${GATEWAY_BASE}/user-service/notifications/${notificationId}/accept`, {
        //     method: 'POST',
        //     headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        //     credentials: 'include',
        //     body: JSON.stringify({})
        //   });
        // }
      }

      if (response.ok) {
        const modal = document.getElementById(`simple-invitation-${notificationId}`);
        if (modal) { document.body.removeChild(modal); }
        if (roomCode) { window.location.href = `/remote/room/${roomCode}`; }
      } else if (response.status === 410) {
        const modal = document.getElementById(`simple-invitation-${notificationId}`);
        if (modal) { document.body.removeChild(modal); }
        alert('This invitation has expired.');
      } else if (response.status === 404) {
        const modal = document.getElementById(`simple-invitation-${notificationId}`);
        if (modal) { document.body.removeChild(modal); }
        // Already handled in another tab or auto-cleaned
      } else if (response.status === 409) {
        alert('You are already in a game, cannot accept this invite.');
      }
    } catch (error) {
      // Silent fail
    }
  }

  async declineInvitation(notificationId: number) {
    try {
      const user = getAuth();
      if (!user) {
        const refreshed = await (loadUserProfile && loadUserProfile())
        if (!refreshed)
          throw new Error({success: false, error: "Failed to fetch profile"});
      }
      // let token = getToken();
      // if (!token) {
      //   const refreshed = await (refreshTokenIfNeeded && refreshTokenIfNeeded());
      //   token = getToken();
      //   if (!refreshed || !token) throw new Error('not authenticated');
      // }
      let response = await fetch(`${GATEWAY_BASE}/user-service/notifications/${notificationId}/decline`, {
        method: 'POST',
        headers: {
          // 'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({})
      });
      if (response.status === 401 || response.status === 403) {
        // const refreshed = await (refreshTokenIfNeeded && refreshTokenIfNeeded());
        // if (refreshed) {
        //   token = getToken();
        //   response = await fetch(`${GATEWAY_BASE}/user-service/notifications/${notificationId}/decline`, {
        //     method: 'POST',
        //     headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },credentials: 'include',
        //     body: JSON.stringify({})
        //   });
        // }
      }
    } catch (error) {
      // Silent fail
    } finally {
      // Remove modal regardless
      const modal = document.getElementById(`simple-invitation-${notificationId}`);
      if (modal) { document.body.removeChild(modal); }
    }
  }

  private showInvitationDeclined(notification: SimpleNotification) {
    //console.log('🔔 DECLINE: Attempting to show notification', notification.id);
    // Check if we already showed this notification
    const shownKey = `decline_shown_${notification.id}`;
    if (sessionStorage.getItem(shownKey)) {
      //console.log('🔔 DECLINE: Already shown, skipping', notification.id);
      return; // Already shown, don't show again
    }
    //console.log('🔔 DECLINE: Showing toast for', notification.id);
    sessionStorage.setItem(shownKey, 'true');
    
    // Remove any existing decline toasts first
    document.querySelectorAll('[id^="decline-toast-"]').forEach(el => el.remove());
    
    // Dispatch the invite:declined event for pages to listen to
    window.dispatchEvent(new CustomEvent('invite:declined', { detail: notification }));
    
    // const toast = document.createElement('div');
    // toast.id = `decline-toast-${notification.id}`;
    // toast.className = 'retro-wait fixed top-4 right-4 p-6 rounded-lg z-50 border bezel';
    // toast.innerHTML = `
    //   <div class="flex items-center gap-3">
    //     <img class="icon-px" src="/icons/speaker.png" alt="Notification" />
    //     <div>
    //       <div class="font-normal text-lg neon">INVITATION DECLINED</div>
    //       <div class="text-sm opacity-90">
    //         <strong>${notification.from || 'Player'}</strong> declined your challenge.
    //       </div>
    //     </div>
    //   </div>
    // `;
    //  ${notification.roomCode ? `<div class="text-xs mt-1 opacity-75">Room Code: <strong>${notification.roomCode}</strong></div>` : ''}
    
    // document.body.appendChild(toast);
    
    // // Remove toast after 10 seconds
    // setTimeout(() => {
    //   if (document.body.contains(toast)) {
    //     document.body.removeChild(toast);
    //   }
    // }, 10000);
  }

  private showPlayerLeftRoom(notification: SimpleNotification) {
    //console.log('🔔 LEFT: Attempting to show notification', notification.id);
    // Check if we already showed this notification
    const shownKey = `left_shown_${notification.id}`;
    if (sessionStorage.getItem(shownKey)) {
      //console.log('🔔 LEFT: Already shown, skipping', notification.id);
      return; // Already shown, don't show again
    }
    //console.log('🔔 LEFT: Showing toast for', notification.id);
    sessionStorage.setItem(shownKey, 'true');
    
    // Remove any existing left toasts first
    document.querySelectorAll('[id^="left-toast-"]').forEach(el => el.remove());
    
    // Dispatch the player:left event for pages to listen to
    window.dispatchEvent(new CustomEvent('player:left', { detail: notification }));
    
    // const toast = document.createElement('div');
    // toast.id = `left-toast-${notification.id}`;
    // toast.className = 'retro-wait fixed top-4 right-4 p-6 rounded-lg z-50 border bezel';
    // toast.innerHTML = `
    //   <div class="flex items-center gap-3">
    //     <img class="icon-px" src="/icons/speaker.png" alt="Notification" />
    //     <div>
    //       <div class="font-normal text-lg neon">PLAYER LEFT</div>
    //       <div class="text-sm opacity-90">
    //         <strong>${notification.from || 'Player'}</strong> left the waiting room.
    //       </div>
    //     </div>
    //   </div>
    //`;
    //            ${notification.roomCode ? `<div class="text-xs mt-1 opacity-75">Room Code: <strong>${notification.roomCode}</strong></div>` : ''}

    
    // document.body.appendChild(toast);
    
    // // Remove toast after 10 seconds
    // setTimeout(() => {
    //   if (document.body.contains(toast)) {
    //     document.body.removeChild(toast);
    //   }
    // }, 10000);
  }

  showInvitationCountdown(friendName: string, roomCode: string, timeoutMs: number = 10000) {
    // Remove any existing countdown
    const existing = document.getElementById('invitation-countdown');
    if (existing) existing.remove();
    
    const countdown = document.createElement('div');
    countdown.id = 'invitation-countdown';
    countdown.className = 'retro-wait fixed top-4 right-4 p-6 rounded-lg z-50 border bezel min-w-80';
    
    let timeLeft = Math.floor(timeoutMs / 1000);
    countdown.innerHTML = `
      <div class="flex items-center gap-3 mb-3">
        <img class="icon-px" src="/icons/speaker.png" alt="Notification" />
        <div>
          <div class="font-bold text-lg">Invitation Sent!</div>
          <div class="text-sm opacity-90">
            Waiting for <strong>${friendName}</strong> to respond...
          </div>
        </div>
      </div>
      <div class="text-center">
        <div class="text-2xl font-mono bg-black/30 rounded px-3 py-1 inline-block" style="color:#fef08a">
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
            <img class="icon-px" src="/icons/speaker.png" alt="Notification" />
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
          // 'Authorization': `Bearer ${getToken()}`
        }, credentials: 'include'
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