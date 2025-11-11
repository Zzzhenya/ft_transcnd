// frontend/src/pages/dashboard.ts
import { getAuth } from "@/app/auth";
import { navigate } from "@/app/router";

export default function (root: HTMLElement, ctx?: { url?: URL }) {
  const user = getAuth();
  const currentPath = ctx?.url?.pathname || "/dashboard";
  
  if (!user) {
    navigate(`/auth?next=${encodeURIComponent(currentPath)}`);
    return;
  }

  root.innerHTML = `
    <section class="py-6 md:py-8 lg:py-10 space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold">📊 Dashboard</h1>
      </div>

      <!-- Dashboard Content -->
      <div class="bg-white rounded-lg shadow-lg p-6">
        <h2 class="text-xl font-bold mb-4">Welcome to your Dashboard!</h2>
        <p class="text-gray-600 mb-6">
          Dashboard content will be displayed here.
        </p>
      </div>

      <!-- Navigation -->
      <div class="flex gap-3">
        <button id="back-to-profile-btn" class="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors">
          👤 Back to Profile
        </button>
      </div>
    </section>
  `;

  // Event Listeners
  root.querySelector<HTMLButtonElement>("#back-to-profile-btn")?.addEventListener("click", (e) => {
    e.preventDefault();
    navigate("/profile");
  });
}