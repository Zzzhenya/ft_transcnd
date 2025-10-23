import{g as n,n as a,b as o}from"./index-BW261ts8.js";function i(e){var s;const t=n();if(!t){a("/auth?next=/profile");return}e.innerHTML=`
    <section class="py-6 md:py-8 lg:py-10 space-y-4">
      <h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold">Profile</h1>
      <div class="rounded border p-4 space-y-2">
        <p><span class="text-gray-500">Name:</span> <strong>${t.name}</strong></p>
        <p><span class="text-gray-500">UserID:</span> <code class="text-xs">${t.id}</code></p>
      </div>
      <div class="flex gap-2">
        <button id="logout" class="px-3 py-2 rounded bg-slate-700 text-white">Sign out</button>
        <a href="/" class="px-3 py-2 rounded bg-blue-600 text-white">Go Lobby</a>
      </div>
    </section>
  `,(s=e.querySelector("#logout"))==null||s.addEventListener("click",async()=>{await o(),a("/auth?next=/profile")})}export{i as default};
