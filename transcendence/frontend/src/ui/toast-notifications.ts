// Toast notification system for game invitations
import { getAuth, getToken } from '../app/auth';
import { GATEWAY_BASE } from '../app/config';

interface Notification {
	id: number;
	actor_id: number;
	type: string;
	payload: string | null;
	read: number;
	created_at: string;
}

interface ToastData {
	id: string;
	title: string;
	message: string;
	type: 'info' | 'success' | 'warning' | 'error' | 'invitation';
	duration?: number;
	actions?: Array<{
		label: string;
		action: () => void;
		className?: string;
	}>;
}

class ToastNotificationSystem {
	private container: HTMLElement | null = null;
	private activeToasts: Map<string, HTMLElement> = new Map();
	private pollInterval: number | null = null;
	private seenNotificationIds: Set<number> = new Set();

	init() {
		console.log('🍞 Toast system initializing...');
		this.createContainer();
		this.startPolling();
		console.log('🍞 Toast system initialized!');
	}

	private createContainer() {
		// Remove existing container if it exists
		const existing = document.getElementById('toast-container');
		if (existing) existing.remove();

		// Create toast container
		this.container = document.createElement('div');
		this.container.id = 'toast-container';
		this.container.className = 'fixed top-4 right-4 z-50 space-y-3 pointer-events-none';
		this.container.style.cssText = `
			position: fixed;
			top: 1rem;
			right: 1rem;
			z-index: 9999;
			display: flex;
			flex-direction: column;
			gap: 0.75rem;
			pointer-events: none;
		`;
		document.body.appendChild(this.container);
	}

	private startPolling() {
		// Check for new notifications every 3 seconds
		this.pollInterval = window.setInterval(() => {
			this.checkForNewNotifications();
		}, 3000);

		// Initial check
		this.checkForNewNotifications();
	}

	private async checkForNewNotifications() {
		const user = getAuth();
		const token = getToken();
		
		console.log('🍞 Checking notifications...', { user: user?.id, hasToken: !!token });
		
		if (!user || !token) {
			console.log('🍞 No user or token, skipping notification check');
			return;
		}

		try {
			const response = await fetch(`${GATEWAY_BASE}/user-service/users/${user.id}/notifications`, {
				headers: { 'Authorization': `Bearer ${token}` }
			});

			console.log('🍞 Notification response:', response.status);

			if (!response.ok) {
				console.log('🍞 Bad response:', response.status, response.statusText);
				return;
			}

			const result = await response.json();
			const notifications: Notification[] = result.notifications || [];

			console.log('🍞 Got notifications:', notifications.length, notifications);

			// Only show the most recent notification that we haven't seen
			const latestNotification = notifications[0]; // Notifications are ordered by created_at DESC
			
			if (latestNotification && !this.seenNotificationIds.has(latestNotification.id) && latestNotification.type === 'game_invite') {
				console.log('🍞 Showing toast for latest notification:', latestNotification.id);
				
				// Clear all existing toasts before showing the new one
				this.clearAllToasts();
				
				await this.showInvitationToast(latestNotification);
				this.seenNotificationIds.add(latestNotification.id);
			} else {
				console.log('🍞 No new notifications to show');
			}

		} catch (error) {
			console.error('🍞 Error checking notifications:', error);
		}
	}

	private async showInvitationToast(notification: Notification) {
		// Get sender username
		const senderName = await this.getSenderUsername(notification.actor_id);
		
		const toast: ToastData = {
			id: `invitation-${notification.id}`,
			title: '🎮 Game Invitation',
			message: `${senderName} invited you to a remote game!`,
			type: 'invitation',
			duration: 10000, // 10 seconds
			actions: [
				{
					label: '✅ Accept',
					action: () => this.acceptInvitation(notification.id),
					className: 'bg-green-500 hover:bg-green-600 text-white'
				},
				{
					label: '❌ Decline',
					action: () => this.declineInvitation(notification.id),
					className: 'bg-red-500 hover:bg-red-600 text-white'
				}
			]
		};

		this.showToast(toast);
	}

	private async getSenderUsername(actorId: number): Promise<string> {
		try {
			const token = getToken();
			console.log('🍞 Getting username for actor:', actorId);
			console.log('🍞 Token available:', !!token);
			
			const url = `${GATEWAY_BASE}/user-service/users/${actorId}`;
			console.log('🍞 Full URL:', url);
			
			const response = await fetch(url, {
				headers: { 'Authorization': `Bearer ${token}` }
			});

			console.log('🍞 Username response status:', response.status);

			if (response.ok) {
				const user = await response.json();
				console.log('🍞 Username response data:', user);
				console.log('🍞 Extracted username:', user.username);
				return user.username || `User ${actorId}`;
			} else {
				const errorText = await response.text();
				console.log('🍞 Failed to get username:', response.status, response.statusText, errorText);
			}
		} catch (error) {
			console.error('🍞 Error getting sender username:', error);
		}
		
		return `User ${actorId}`;
	}

	private async acceptInvitation(notificationId: number) {
		const token = getToken();
		console.log('🍞 Accept invitation - token available:', !!token);
		try {
			const response = await fetch(`${GATEWAY_BASE}/user-service/notifications/${notificationId}/accept`, {
				method: 'POST',
				headers: { 
					'Authorization': `Bearer ${token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({})
			});

			if (response.ok) {
				this.removeToast(`invitation-${notificationId}`);
				this.showToast({
					id: `accept-${notificationId}`,
					title: '✅ Invitation Accepted',
					message: 'Joining game...',
					type: 'success',
					duration: 3000
				});
			} else {
				const errorData = await response.text();
				console.error('🍞 Accept invitation error:', response.status, errorData);
				throw new Error(`Failed to accept (${response.status}): ${errorData}`);
			}
		} catch (error) {
			console.error('Error accepting invitation:', error);
			this.showToast({
				id: `error-accept-${notificationId}`,
				title: '❌ Error',
				message: 'Failed to accept invitation',
				type: 'error',
				duration: 3000
			});
		}
	}

	private async declineInvitation(notificationId: number) {
		const token = getToken();
		console.log('🍞 Decline invitation - token available:', !!token);
		try {
			const response = await fetch(`${GATEWAY_BASE}/user-service/notifications/${notificationId}/decline`, {
				method: 'POST',
				headers: { 
					'Authorization': `Bearer ${token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({})
			});

			if (response.ok) {
				this.removeToast(`invitation-${notificationId}`);
				this.showToast({
					id: `decline-${notificationId}`,
					title: '❌ Invitation Declined',
					message: 'Invitation declined',
					type: 'info',
					duration: 2000
				});
			} else {
				const errorData = await response.text();
				console.error('🍞 Decline invitation error:', response.status, errorData);
				throw new Error(`Failed to decline (${response.status}): ${errorData}`);
			}
		} catch (error) {
			console.error('Error declining invitation:', error);
			this.showToast({
				id: `error-decline-${notificationId}`,
				title: '❌ Error',
				message: 'Failed to decline invitation',
				type: 'error',
				duration: 3000
			});
		}
	}

	showToast(toast: ToastData) {
		if (!this.container) {
			this.createContainer();
		}

		// Remove existing toast with same ID
		this.removeToast(toast.id);

		// Create toast element
		const toastEl = document.createElement('div');
		toastEl.id = `toast-${toast.id}`;
		toastEl.className = 'toast-notification pointer-events-auto';
		
		// Toast styling based on type
		const typeStyles = {
			info: 'bg-blue-500/90 border-blue-400',
			success: 'bg-green-500/90 border-green-400',
			warning: 'bg-yellow-500/90 border-yellow-400',
			error: 'bg-red-500/90 border-red-400',
			invitation: 'bg-purple-500/90 border-purple-400'
		};

		const style = typeStyles[toast.type] || typeStyles.info;

		toastEl.innerHTML = `
			<div class="min-w-80 max-w-sm ${style} backdrop-blur-lg rounded-lg border p-4 shadow-lg animate-slide-in">
				<div class="flex items-start justify-between">
					<div class="flex-1">
						<h4 class="text-white font-bold text-sm mb-1">${toast.title}</h4>
						<p class="text-white/90 text-sm">${toast.message}</p>
						${toast.actions ? `
							<div class="flex gap-2 mt-3">
								${toast.actions.map((action, index) => `
									<button class="action-btn-${index} px-3 py-1 rounded text-xs font-semibold transition-all ${action.className || 'bg-white/20 hover:bg-white/30 text-white'}">${action.label}</button>
								`).join('')}
							</div>
						` : ''}
					</div>
					<button class="close-btn text-white/60 hover:text-white ml-3 text-sm">✕</button>
				</div>
			</div>
		`;

		// Add click handlers
		const closeBtn = toastEl.querySelector('.close-btn');
		closeBtn?.addEventListener('click', () => this.removeToast(toast.id));

		// Add action button handlers
		toast.actions?.forEach((action, index) => {
			const btn = toastEl.querySelector(`.action-btn-${index}`);
			btn?.addEventListener('click', () => {
				action.action();
			});
		});

		// Add to container
		this.container!.appendChild(toastEl);
		this.activeToasts.set(toast.id, toastEl);

		// Auto-remove after duration
		if (toast.duration && toast.duration > 0) {
			setTimeout(() => {
				this.removeToast(toast.id);
			}, toast.duration);
		}

		return toastEl;
	}

	removeToast(id: string) {
		const toastEl = this.activeToasts.get(id);
		if (toastEl) {
			toastEl.style.animation = 'slide-out 0.3s ease-in forwards';
			setTimeout(() => {
				toastEl.remove();
				this.activeToasts.delete(id);
			}, 300);
		}
	}

	clearAllToasts() {
		console.log('🍞 Clearing all existing toasts');
		for (const toastEl of this.activeToasts.values()) {
			toastEl.style.animation = 'slide-out 0.3s ease-in forwards';
			setTimeout(() => {
				toastEl.remove();
			}, 300);
		}
		this.activeToasts.clear();
	}

	destroy() {
		if (this.pollInterval) {
			clearInterval(this.pollInterval);
			this.pollInterval = null;
		}
		
		this.activeToasts.clear();
		
		if (this.container) {
			this.container.remove();
			this.container = null;
		}
	}
}

// Global instance
export const toastNotifications = new ToastNotificationSystem();

// CSS animations
const style = document.createElement('style');
style.textContent = `
	@keyframes slide-in {
		from {
			transform: translateX(100%);
			opacity: 0;
		}
		to {
			transform: translateX(0);
			opacity: 1;
		}
	}
	
	@keyframes slide-out {
		from {
			transform: translateX(0);
			opacity: 1;
		}
		to {
			transform: translateX(100%);
			opacity: 0;
		}
	}
	
	.animate-slide-in {
		animation: slide-in 0.3s ease-out;
	}
`;
document.head.appendChild(style);