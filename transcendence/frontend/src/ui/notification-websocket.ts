// Real-time notification WebSocket client
import { getAuth, getToken } from '../app/auth';
import { GATEWAY_BASE } from '../app/config';
import { navigate } from '../app/router';

export interface LiveNotification {
  id: number;
  type: string;
  from: string;
  fromId: number;
  roomCode?: string;
  payload?: any;
  timestamp: string;
}

export class NotificationWebSocket {
  private ws?: WebSocket;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private isIntentionalClose = false;
  private heartbeatInterval?: number;

  constructor() {
    console.log('🔔 NotificationWebSocket created');
  }

  connect(): Promise<boolean> {
    return new Promise((resolve) => {
      const token = getToken();
      const user = getAuth();
      
      console.log('🔔 🚀 CONNECT CALLED - Starting WebSocket connection process');
      console.log('🔔 🔍 Token exists:', !!token, 'length:', token?.length || 0);
      console.log('🔔 🔍 User exists:', !!user, 'user id:', user?.id || 'none');
      console.log('🔔 🔍 GATEWAY_BASE:', GATEWAY_BASE);
      
      if (!token || !user) {
        console.log('🔔 ❌ Cannot connect: no token or user');
        console.log('🔔 ❌ Token:', !!token, 'User:', !!user);
        resolve(false);
        return;
      }

      console.log('🔔 ✅ Prerequisites met, proceeding with WebSocket connection...');
      
      // Close existing connection if any
      if (this.ws) {
        console.log('🔔 🔄 Closing existing WebSocket connection');
        this.isIntentionalClose = true;
        this.ws.close();
      }

      // Build WebSocket URL - use secure WebSocket for HTTPS
      const isHTTPS = GATEWAY_BASE.includes('https');
      const wsProtocol = isHTTPS ? 'wss' : 'ws';
      
      console.log('🔔 🔍 isHTTPS:', isHTTPS, 'wsProtocol:', wsProtocol);
      
      // Extract base URL without /api if present
      let baseUrl = GATEWAY_BASE;
      if (baseUrl.includes('/api')) {
        baseUrl = baseUrl.replace('/api', '');
      }
      
      const wsUrl = `${baseUrl.replace(/^https?/, wsProtocol)}/api/user-service/ws/notifications?token=${encodeURIComponent(token)}`;
      console.log('🔔 🎯 Final WebSocket URL:', wsUrl);
      console.log('🔔 🎯 About to create WebSocket with URL above...');
      
      console.log('🔔 🎯 About to create WebSocket with URL above...');
      this.ws = new WebSocket(wsUrl);
      this.isIntentionalClose = false;
      console.log('🔔 ✅ WebSocket object created, waiting for events...');

      this.ws.onopen = () => {
        console.log('🔔 ✅ 🎉 Connected to notification WebSocket');
        
        // Send authentication message in case URL token extraction fails
        console.log('🔔 📤 Sending auth message as fallback...');
        this.ws!.send(JSON.stringify({
          type: 'auth',
          token: token
        }));
        console.log('🔔 📤 Auth message sent');
        
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.startHeartbeat();
        resolve(true);
      };

      this.ws.onmessage = async (event) => {
        console.log('🔔 📨 Raw WebSocket message received:', event.data);
        try {
          let data = event.data;
          
          // Handle Blob data
          if (data instanceof Blob) {
            data = await data.text();
          }
          
          const message = JSON.parse(data);
          console.log('🔔 📨 Parsed message:', message);
          this.handleMessage(message);
        } catch (error) {
          console.error('🔔 ❌ Failed to parse WebSocket message:', error, 'Raw data:', event.data);
        }
      };

      this.ws.onclose = (event) => {
        console.log('🔔 ❌ WebSocket closed:', event.code, event.reason);
        console.log('🔔 ❌ Close details:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
          isIntentionalClose: this.isIntentionalClose
        });
        this.stopHeartbeat();
        
        if (!this.isIntentionalClose && this.shouldReconnect()) {
          this.scheduleReconnect();
        }
        
        resolve(false);
      };

      this.ws.onerror = (error) => {
        console.error('🔔 ❌ WebSocket error occurred:', error);
        console.error('🔔 ❌ WebSocket state:', this.ws?.readyState);
        resolve(false);
      };
    });
  }

  private handleMessage(message: any) {
    console.log('🔔 🔍 Handling message type:', message.type, 'Message:', message);
    
    switch (message.type) {
      case 'connected':
        console.log('🔔 ✅ Notification system connected for user:', message.username);
        break;
        
      case 'live_notification':
        console.log('🔔 🎯 Live notification received:', message.data);
        console.log('🔔 🎯 Notification type:', message.data?.type);
        console.log('🔔 🎯 From user:', message.data?.from, 'ID:', message.data?.fromId);
        this.handleLiveNotification(message.data);
        break;
        
      case 'pong':
        console.log('🔔 💓 Heartbeat pong received');
        break;
        
      default:
        console.log('🔔 ❓ Unknown message type:', message.type, 'Full message:', message);
    }
  }

  private handleLiveNotification(notification: LiveNotification) {
    console.log('🔔 🎮 Handling live notification:', notification);
    console.log('🔔 🎮 Notification type check:', notification.type, 'Expected: game_invite or invitation_accepted');
    
    if (notification.type === 'game_invite') {
      console.log('🔔 🎮 ✅ GAME INVITE detected - calling showGameInvitation');
      try {
        this.showGameInvitation(notification);
        console.log('🔔 🎮 ✅ showGameInvitation completed without errors');
      } catch (error) {
        console.error('🔔 🎮 ❌ ERROR in showGameInvitation:', error);
      }
    } else if (notification.type === 'invitation_accepted') {
      console.log('🔔 🎮 ✅ INVITATION ACCEPTED detected - calling showInvitationAccepted');
      this.showInvitationAccepted(notification);
    } else {
      console.log('🔔 🎮 ❓ Unknown notification type:', notification.type);
    }
  }

  // Public method for testing notifications
  public testNotification() {
    console.log('🔔 🧪 Testing notification system manually...');
    const testNotification: LiveNotification = {
      id: 999,
      type: 'game_invite',
      from: 'TestUser',
      fromId: 1,
      roomCode: 'TEST123',
      payload: null,
      timestamp: new Date().toISOString()
    };
    
    console.log('🔔 🧪 Simulating notification:', testNotification);
    this.handleLiveNotification(testNotification);
  }

  private showGameInvitation(notification: LiveNotification) {
    console.log('🔔 🎮 ✅ SHOWING GAME INVITATION MODAL - FUNCTION START');
    console.log('🔔 🎮 Notification details:', {
      id: notification.id,
      from: notification.from,
      fromId: notification.fromId,
      roomCode: notification.roomCode,
      type: notification.type
    });
    
    console.log('🔔 🎮 📋 Step 1: Checking for existing modals');
    // Remove any existing modals first
    const existingModal = document.getElementById(`live-invitation-${notification.id}`);
    if (existingModal) {
      console.log('🔔 🎮 🗑️ Found existing modal, removing it');
      document.body.removeChild(existingModal);
    } else {
      console.log('🔔 🎮 ✅ No existing modal found');
    }
    
    console.log('🔔 🎮 📋 Step 2: Creating modal element');
    // Create invitation modal with improved styling and animations
    const modal = document.createElement('div');
    modal.id = `live-invitation-${notification.id}`;
    modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 animate-fade-in';
    console.log('🔔 🎮 ✅ Modal element created with id:', modal.id);
    console.log('🔔 🎮 ✅ Modal element created with id:', modal.id);
    
    console.log('🔔 🎮 📋 Step 3: Setting modal innerHTML');
    modal.innerHTML = `
      <div class="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8 rounded-2xl shadow-2xl max-w-lg w-full mx-4 border-2 border-blue-500 animate-scale-in">
        <div class="text-center">
          <div class="text-6xl mb-4 animate-bounce">🎮</div>
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
              class="accept-btn px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-black text-lg hover:from-green-400 hover:to-emerald-500 transition-all transform hover:scale-105 shadow-lg hover:shadow-green-500/50"
              data-notification-id="${notification.id}" 
              data-room-code="${notification.roomCode}">
              ✅ ACCEPT
            </button>
            <button 
              class="decline-btn px-8 py-4 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl font-black text-lg hover:from-red-400 hover:to-pink-500 transition-all transform hover:scale-105 shadow-lg hover:shadow-red-500/50"
              data-notification-id="${notification.id}">
              ❌ DECLINE
            </button>
          </div>
          <div class="mt-4 text-xs text-gray-400">
            ⏱️ Auto-declines in 30 seconds
          </div>
        </div>
      </div>
    `;
    console.log('🔔 🎮 ✅ Modal innerHTML set successfully');
    
    console.log('🔔 🎮 📋 Step 4: Adding CSS animations');
    // Add CSS animations if not already added
    if (!document.getElementById('notification-animations')) {
      console.log('🔔 🎮 🎨 Adding CSS animations to document');
      const style = document.createElement('style');
      style.id = 'notification-animations';
      style.textContent = `
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-scale-in {
          animation: scaleIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.7); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
      console.log('🔔 🎮 ✅ CSS animations added successfully');
    } else {
      console.log('🔔 🎮 ✅ CSS animations already exist');
    }
    
    console.log('🔔 🎮 📋 Step 5: Adding modal to document.body');
    console.log('🔔 🎮 📋 document.body exists:', !!document.body);
    console.log('🔔 🎮 📋 document.body children count before:', document.body.children.length);
    
    try {
      document.body.appendChild(modal);
      console.log('🔔 🎮 ✅ Modal successfully added to DOM!');
      console.log('🔔 🎮 📋 document.body children count after:', document.body.children.length);
      console.log('🔔 🎮 📋 Modal is in DOM:', !!document.getElementById(`live-invitation-${notification.id}`));
      
      // Add event listeners for buttons
      const acceptBtn = modal.querySelector('.accept-btn');
      const declineBtn = modal.querySelector('.decline-btn');
      
      if (acceptBtn) {
        acceptBtn.addEventListener('click', () => {
          const notificationId = acceptBtn.getAttribute('data-notification-id');
          const roomCode = acceptBtn.getAttribute('data-room-code');
          console.log('🔔 🎮 Accept button clicked:', { notificationId, roomCode });
          this.acceptInvitation(parseInt(notificationId || '0'), roomCode || '');
        });
      }
      
      if (declineBtn) {
        declineBtn.addEventListener('click', () => {
          const notificationId = declineBtn.getAttribute('data-notification-id');
          console.log('🔔 🎮 Decline button clicked:', { notificationId });
          this.declineInvitation(parseInt(notificationId || '0'));
        });
      }
      
    } catch (error) {
      console.error('🔔 🎮 ❌ ERROR adding modal to DOM:', error);
    }
    
    // Play notification sound if available
    try {
      // Create a simple beep sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (e) {
      console.log('🔔 📢 Could not play notification sound');
    }
    
    // Auto-remove after 30 seconds
    setTimeout(() => {
      if (document.getElementById(`live-invitation-${notification.id}`)) {
        console.log('🔔 🎮 ⏰ Auto-declining invitation after 30 seconds');
        this.declineInvitation(notification.id);
      }
    }, 30000);
  }

  private showInvitationAccepted(notification: LiveNotification) {
    console.log('🔔 ✅ Showing invitation accepted:', notification);
    
    // Create success toast
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-green-500 text-white p-4 rounded-lg shadow-lg z-50';
    toast.innerHTML = `
      <div class="flex items-center gap-2">
        <span>✅</span>
        <span><strong>${notification.from}</strong> accepted your invitation!</span>
      </div>
      <div class="text-sm mt-1 opacity-90">
        Room Code: <strong>${notification.roomCode}</strong>
      </div>
    `;
    
    document.body.appendChild(toast);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 5000);
  }

  // Public method to accept invitation
  async acceptInvitation(notificationId: number, roomCode: string) {
    console.log('🔔 ✅ Accepting invitation:', notificationId, roomCode);
    
    try {
      const token = getToken();
      const response = await fetch(`${GATEWAY_BASE}/api/user-service/notifications/${notificationId}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('🔔 ✅ Invitation accepted:', result);
        
        // Remove modal
        const modal = document.getElementById(`live-invitation-${notificationId}`);
        if (modal) {
          document.body.removeChild(modal);
        }
        
        // Navigate to game room
        if (result.roomCode) {
          console.log('🔔 🎮 Navigating to room:', result.roomCode);
          // Use proper router navigation with path parameter
          navigate(`/remote/room/${result.roomCode}`);
        }
        
      } else {
        console.error('🔔 ❌ Failed to accept invitation:', response.status);
      }
      
    } catch (error) {
      console.error('🔔 ❌ Error accepting invitation:', error);
    }
  }

  // Public method to decline invitation  
  async declineInvitation(notificationId: number) {
    console.log('🔔 ❌ Declining invitation:', notificationId);
    
    try {
      const token = getToken();
      const response = await fetch(`${GATEWAY_BASE}/api/user-service/notifications/${notificationId}/decline`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        console.log('🔔 ❌ Invitation declined');
      } else {
        console.error('🔔 ❌ Failed to decline invitation:', response.status);
      }
      
    } catch (error) {
      console.error('🔔 ❌ Error declining invitation:', error);
    } finally {
      // Remove modal regardless
      const modal = document.getElementById(`live-invitation-${notificationId}`);
      if (modal) {
        document.body.removeChild(modal);
      }
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      }
    }, 30000); // Every 30 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }

  private shouldReconnect(): boolean {
    return this.reconnectAttempts < this.maxReconnectAttempts;
  }

  private scheduleReconnect() {
    this.reconnectAttempts++;
    console.log(`🔔 🔄 Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectDelay}ms`);
    
    setTimeout(() => {
      if (!this.isIntentionalClose) {
        this.connect();
      }
    }, this.reconnectDelay);
    
    // Exponential backoff
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
  }

  disconnect() {
    console.log('🔔 💔 Disconnecting from notification WebSocket');
    this.isIntentionalClose = true;
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Global instance
export const notificationWS = new NotificationWebSocket();

// Debug method to test notifications manually
(notificationWS as any).testNotification = function() {
  console.log('🔔 🧪 Testing notification system manually...');
  const testNotification = {
    id: 999,
    type: 'game_invite',
    from: 'TestUser',
    fromId: 1,
    roomCode: 'TEST123',
    payload: null,
    timestamp: new Date().toISOString()
  };
  
  console.log('🔔 🧪 Simulating notification:', testNotification);
  
  // Call the internal method directly
  try {
    (notificationWS as any).handleLiveNotification(testNotification);
    console.log('🔔 🧪 ✅ Test notification completed successfully');
  } catch (error) {
    console.error('🔔 🧪 ❌ Error in test notification:', error);
  }
};

// Make it available globally for onclick handlers and debugging
(window as any).notificationWS = notificationWS;
console.log('🔔 💡 NotificationWS available globally. Test with: notificationWS.testNotification()');