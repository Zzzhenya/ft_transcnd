// Load styles from TailwindCSS
import "./styles.css";

// Router setup: History API (f / b) + link interception.
import { initRouter } from "./app/router";
import { initOnlineStatusManager, getAuth } from "./app/auth";
import { toastNotifications } from "./ui/toast-notifications";

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
    onlineStatusCleanup = initOnlineStatusManager();
    // Initialize toast notifications when user logs in
    toastNotifications.init();
  } else if (!user && onlineStatusCleanup) {
    onlineStatusCleanup();
    onlineStatusCleanup = null;
    // Destroy toast notifications when user logs out
    toastNotifications.destroy();
  }
}

// Listen for auth changes to manage online status
window.addEventListener('auth:changed', initOnlineStatus);

// Initialize on app start
initOnlineStatus();

render(location.pathname + location.search);