// frontend/src/pages/auth.ts
import { signIn, signOut, getAuth, register } from "@/app/auth";
import { navigate } from "@/app/router";
import { clearAlias} from "@/app/store";

export default function (root: HTMLElement, ctx: { url: URL }) {
  const next = ctx.url.searchParams.get("next") || "/profile";
  const user = getAuth();

  const dn = user
  	? (user.name ?? user.username ?? user.displayName ?? user.alias ?? user.email ?? "Player")
  	: "";

  root.innerHTML = `
    <section class="py-6 md:py-8 lg:py-10 space-y-6">
      <h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold title-yellow">Authentication</h1>

      <div class="card-violet rounded border p-4 space-y-4">
        ${user ? `
          <p class="text-gray-700">Signed in as <strong>${dn}</strong></p>
          <button id="logout" class="px-3 py-2 rounded btn-retro">Sign out</button>
        ` : `
          <div class="space-y-4">
            <div>
              <h2 class="text-lg font-semibold mb-2 title-violet">Sign In</h2>
              
              <!-- Error message box -->
              <div id="signin-error" class="hidden mb-3 p-3 rounded-lg bg-red-100 border-2 border-red-400">
                <p class="text-red-800 font-semibold text-sm"></p>
              </div>
              
              <form id="signin-form" class="space-y-2">
                <input id="signin-email" type="email" class="input-violet rounded px-3 py-2 w-full" placeholder="Email" required />
                <input id="signin-password" type="password" class="input-violet rounded px-3 py-2 w-full" placeholder="Password" required />
                <button type="submit" class="px-3 py-2 rounded btn-retro w-full">Sign In</button>
              </form>
            </div>
            
            <hr class="border-gray-300">
            
            <div>
              <h2 class="text-lg font-semibold mb-2 title-violet">Register</h2>
              
              <!-- Error message box -->
              <div id="register-error" class="hidden mb-3 p-3 rounded-lg bg-red-100 border-2 border-red-400">
                <p class="text-red-800 font-semibold text-sm"></p>
              </div>
              
              <form id="register-form" class="space-y-2">
                <input id="register-username" type="text" class="input-violet rounded px-3 py-2 w-full" placeholder="Alias/Display Name" required />
                <input id="register-email" type="email" class="input-violet rounded px-3 py-2 w-full" placeholder="Email" required />
                <input id="register-password" type="password" class="input-violet rounded px-3 py-2 w-full" placeholder="Password" required />
                <button type="submit" class="px-3 py-2 rounded btn-retro w-full">Register</button>
              </form>
              
              <!-- Validation rules -->
              <div class="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                <p class="text-xs font-semibold text-blue-900 mb-1">Registration Requirements:</p>
                <ul class="text-xs text-blue-800 space-y-0.5">
                  <li>• Username: 3-20 characters, letters, numbers, underscores, hyphens</li>
                  <li>• Email: Valid email format (e.g., user@example.com)</li>
                  <li>• Password: Any length (no minimum required)</li>
                </ul>
              </div>
            </div>
          </div>
        `}
      </div>
      </section>
  `;

  // Helper function to show error in styled box
  function showError(errorBoxId: string, message: string) {
    const errorBox = root.querySelector(`#${errorBoxId}`);
    const errorText = errorBox?.querySelector('p');
    if (errorBox && errorText) {
      errorText.textContent = message;
      errorBox.classList.remove('hidden');
      // Auto-hide after 5 seconds
      setTimeout(() => errorBox.classList.add('hidden'), 5000);
    }
  }

  // Helper function to parse error messages
  function parseErrorMessage(error: string): string {
    // Extract clean message from backend error format
    if (error.includes('Upstream')) {
      const match = error.match(/"message":"([^"]+)"/);
      if (match) return match[1];
    }
    // Handle JSON error format
    try {
      const jsonMatch = error.match(/\{[^}]+\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.message) return parsed.message;
      }
    } catch {}
    return error;
  }

   function parseError(json: string) {
    const data = JSON.parse(json);

    const innerMatch = typeof data.message === "string"
    ? data.message.match(/\{.*\}/)
    : null;

    return {
    code: data.statusCode ?? null,
    message: data.message ?? null,
    innerMessage: innerMatch ? JSON.parse(innerMatch[0]).message : null
  }}


  // Sign in form handler
  root.querySelector<HTMLFormElement>("#signin-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = (root.querySelector<HTMLInputElement>("#signin-email")?.value || "").trim();
    const password = (root.querySelector<HTMLInputElement>("#signin-password")?.value || "").trim();
    
    if (!email || !password) {
      showError('signin-error', 'Please enter both email and password');
      return;
    }
    
    const result = await signIn(email, password);
    if (result.success) {
      navigate(next);
    } else {
      // const cleanError = parseErrorMessage(result.error || "Sign in failed");
      const cleanError = parseError(result.error || "Sign in failed");
      showError('signin-error', cleanError.innerMessage);
    }
  });

  // Register form handler
  root.querySelector<HTMLFormElement>("#register-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = (root.querySelector<HTMLInputElement>("#register-username")?.value || "").trim();
    const email = (root.querySelector<HTMLInputElement>("#register-email")?.value || "").trim();
    const password = (root.querySelector<HTMLInputElement>("#register-password")?.value || "").trim();
    
    if (!username || !email || !password) {
      showError('register-error', 'Please fill in all fields');
      return;
    }

    // Username validation
    if (username.length < 3 || username.length > 20) {
      showError('register-error', 'Username must be between 3 and 20 characters');
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      showError('register-error', 'Username can only contain letters, numbers, underscores, and hyphens');
      return;
    }

    // Email validation - simpler regex to match backend (allows a@a.a format)
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]+$/;
    if (!emailRegex.test(email)) {
      showError('register-error', 'Please enter a valid email address (e.g., user@example.com)');
      return;
    }

    // Check for dangerous characters
    const dangerousChars = ['<', '>', '"', "'", '&', '(', ')', '{', '}', '[', ']', '`', '$', '\\'];
    if (dangerousChars.some(char => email.includes(char) || username.includes(char))) {
      showError('register-error', 'Username or email contains invalid characters');
      return;
    }

    // No password validation - backend accepts any length
    
    const result = await register(username, email, password);
    if (result.success) {
      navigate(next);
    } else {
      const cleanError = parseError(result.error || "Registration failed");
      showError('register-error', cleanError);
    }
  });

  // Logout button handler
  root.querySelector<HTMLButtonElement>("#logout")?.addEventListener("click", async () => {
    await signOut();
    clearAlias();
    navigate(`/auth?next=${encodeURIComponent(next)}`);
  });

}
