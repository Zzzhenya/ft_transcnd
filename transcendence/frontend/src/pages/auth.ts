// frontend/src/pages/auth.ts
import { signIn, signOut, getAuth, register, guestLogin } from "@/app/auth";
import { navigate } from "@/app/router";
import { setAlias, clearAlias} from "@/app/store";

export default function (root: HTMLElement, ctx: { url: URL }) {
  const next = ctx.url.searchParams.get("next") || "/profile";
  const user = getAuth();

  const dn = user
  	? (user.name ?? user.username ?? user.displayName ?? user.alias ?? user.email ?? "Player")
  	: "";

  root.innerHTML = `
    <section class="py-6 md:py-8 lg:py-10 space-y-6">
      <h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold">Authentication</h1>

      <div class="rounded border p-4 space-y-4">
        ${user ? `
          <p class="text-gray-700">Signed in as <strong>${dn}</strong></p>
          <button id="logout" class="px-3 py-2 rounded bg-slate-700 text-white">Sign out</button>
        ` : `
          <!-- Guest Play Option -->
          <!--
          <div class="space-y-3 pb-4 border-b border-gray-200">
            <h2 class="text-lg font-semibold text-green-700">🎮 Play as Guest</h2>
            <p class="text-sm text-gray-600">Jump right into the game without creating an account. Your progress won't be saved.</p>
            
            <form id="guest-form" class="space-y-2">
              <input id="guest-alias" type="text" 
                     class="border rounded px-3 py-2 w-full" 
                     placeholder="Enter your alias (optional)" 
                     maxlength="16" />
              <button type="submit" class="px-6 py-3 rounded bg-green-600 text-white font-semibold hover:bg-green-700 w-full">
                Play Now
              </button>
            </form>
            <p class="text-xs text-gray-500">Your alias is how others will see you in the game</p>
            <button id="clear-guest" class="mt-2 px-3 py-1 rounded bg-gray-300 text-gray-700">Clear Guest</button>
          </div>

          <div class="text-center py-2">
            <p class="text-gray-500 text-sm">or create an account to save your progress</p>
          </div>
          -->

          <div class="space-y-4">
            <div>
              <h2 class="text-lg font-semibold mb-2">Sign In</h2>
              <form id="signin-form" class="space-y-2">
                <input id="signin-email" type="email" class="border rounded px-3 py-2 w-full" placeholder="Email" required />
                <input id="signin-password" type="password" class="border rounded px-3 py-2 w-full" placeholder="Password" required />
                <button type="submit" class="px-3 py-2 rounded bg-indigo-600 text-white w-full">Sign In</button>
              </form>
            </div>
            
            <hr class="border-gray-300">
            
            <div>
              <h2 class="text-lg font-semibold mb-2">Register</h2>
              <form id="register-form" class="space-y-2">
                <input id="register-username" type="text" class="border rounded px-3 py-2 w-full" placeholder="Alias/Display Name" required />
                <input id="register-email" type="email" class="border rounded px-3 py-2 w-full" placeholder="Email" required />
                <input id="register-password" type="password" class="border rounded px-3 py-2 w-full" placeholder="Password" required />
                <button type="submit" class="px-3 py-2 rounded bg-green-600 text-white w-full">Register</button>
              </form>
              <!--
              <p class="text-xs text-gray-500 mt-1">Your alias is how others will see you in the game</p>
              -->
              </div>
          </div>
        `}
      </div>
      <!--
      <p class="mt-4"><a href="/" class="underline text-blue-600">← Lobby</a></p>
      -->
      </section>
  `;

  // Sign in form handler
  root.querySelector<HTMLFormElement>("#signin-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = (root.querySelector<HTMLInputElement>("#signin-email")?.value || "").trim();
    const password = (root.querySelector<HTMLInputElement>("#signin-password")?.value || "").trim();
    
    if (!email || !password) return alert("Please enter both email and password");
    
    const result = await signIn(email, password);
    if (result.success) {
      navigate(next);
    } else {
      alert(result.error || "Sign in failed");
    }
  });

  // Register form handler
  root.querySelector<HTMLFormElement>("#register-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = (root.querySelector<HTMLInputElement>("#register-username")?.value || "").trim();
    const email = (root.querySelector<HTMLInputElement>("#register-email")?.value || "").trim();
    const password = (root.querySelector<HTMLInputElement>("#register-password")?.value || "").trim();
    
    if (!username || !email || !password) return alert("Please fill in all fields");
    
    const result = await register(username, email, password);
    if (result.success) {
      navigate(next);
    } else {
      alert(result.error || "Registration failed");
    }
  });

  // Play as guest form handler
  root.querySelector<HTMLFormElement>("#guest-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const aliasInput = root.querySelector<HTMLInputElement>("#guest-alias");
    const alias = (aliasInput?.value || "").trim();
    
    // Show loading state
    const submitButton = root.querySelector<HTMLButtonElement>("#guest-form button[type='submit']");
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Creating guest user...";
    }
    
    try {
      const result = await guestLogin(alias || undefined);
      
      if (result.success) {
        const user = getAuth();
        if (user) {
			const aliasToStore = user.username ?? user.name ?? alias ?? "Guest";
			setAlias(aliasToStore);
		}
        navigate("/");
      } else {
        alert(result.error || 'Failed to create guest user');
      }
    } catch (error) {
      console.error('Guest login error:', error);
      alert('Network error. Please try again.');
    } finally {
      // Reset button state
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Play Now";
      }
    }
  });

  // Clear guest alias handler
  root.querySelector<HTMLButtonElement>("#clear-guest")?.addEventListener("click", () => {
    clearAlias();
    location.reload();
  });

  // Logout button handler
  root.querySelector<HTMLButtonElement>("#logout")?.addEventListener("click", async () => {
    await signOut();
    clearAlias();
    navigate(`/auth?next=${encodeURIComponent(next)}`);
  });
}
