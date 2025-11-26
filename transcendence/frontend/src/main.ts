// Load styles from TailwindCSS
import "./styles.css";

// Router setup: History API (f / b) + link interception.
import { initRouter } from "./app/router";
// import { getAuth, getToken } from "./app/auth";
import { getAuth } from "./app/auth";
import { simpleNotificationPoller } from "./ui/simple-notification-polling";
import { onlineManager } from "./utils/efficient-online-status";

// Make auth functions available globally for debugging
(window as any).getAuth = getAuth;
// (window as any).getToken = getToken;

// Get app's root (main: "app"), start router, render current URL(= home)
const root = document.querySelector<HTMLElement>("main#app")!;
if (!root) throw new Error("Root element #app not found");

const { render } = initRouter(root);

// Online status manager cleanup function
let onlineStatusCleanup: (() => void) | null = null;

// Initialize online status manager when user is authenticated
function initOnlineStatus() {
  const user = getAuth();
  if (user && !onlineStatusCleanup) {
    // Use ONLY the NEW efficient system
    onlineManager.init(); 
    
    // 🔔 Initialize simple polling notifications system (fallback)
    console.log('🔔 Initializing simple polling notifications...');
    simpleNotificationPoller.start();
    console.log('🔔 ✅ Simple polling notifications started');

    // 🔔 WebSocket disabled - using polling only for now
    //console.log('🔔 WebSocket notifications disabled, using polling only');
    
    console.log('🚀 Initialized efficient online status system for user:', user.id);
    
    // Set cleanup function
    onlineStatusCleanup = () => {
      onlineManager.destroy();
      simpleNotificationPoller.stop();
      console.log('🧹 Cleaned up efficient online status system');
    };
  } else if (!user && onlineStatusCleanup) {
    onlineStatusCleanup();
    onlineStatusCleanup = null;
    
    console.log('🧹 Cleaned up online status systems');
  }
}

// Listen for auth changes to manage online status
window.addEventListener('auth:changed', initOnlineStatus);

// Initialize on app start
initOnlineStatus();

render(location.pathname + location.search);