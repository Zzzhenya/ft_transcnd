import{g as b,h as x,n,r as h,i as w,d as v,b as q}from"./index-BW261ts8.js";function P(e,f){var d,c,p,g;const o=f.url.searchParams.get("next")||"/profile",u=b();e.innerHTML=`
    <section class="py-6 md:py-8 lg:py-10 space-y-6">
      <h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold">Authentication</h1>

      <div class="rounded border p-4 space-y-4">
        ${u?`
          <p class="text-gray-700">Signed in as <strong>${u.name}</strong></p>
          <button id="logout" class="px-3 py-2 rounded bg-slate-700 text-white">Sign out</button>
        `:`
          <!-- Guest Play Option -->
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
          </div>

          <div class="text-center py-2">
            <p class="text-gray-500 text-sm">or create an account to save your progress</p>
          </div>

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
              <p class="text-xs text-gray-500 mt-1">Your alias is how others will see you in the game</p>
            </div>
          </div>
        `}
      </div>

      <p class="mt-4"><a href="/" class="underline text-blue-600">← Lobby</a></p>
    </section>
  `,(d=e.querySelector("#signin-form"))==null||d.addEventListener("submit",async i=>{var r,l;i.preventDefault();const s=(((r=e.querySelector("#signin-email"))==null?void 0:r.value)||"").trim(),a=(((l=e.querySelector("#signin-password"))==null?void 0:l.value)||"").trim();if(!s||!a)return alert("Please enter both email and password");const t=await x(s,a);t.success?n(o):alert(t.error||"Sign in failed")}),(c=e.querySelector("#register-form"))==null||c.addEventListener("submit",async i=>{var l,m,y;i.preventDefault();const s=(((l=e.querySelector("#register-username"))==null?void 0:l.value)||"").trim(),a=(((m=e.querySelector("#register-email"))==null?void 0:m.value)||"").trim(),t=(((y=e.querySelector("#register-password"))==null?void 0:y.value)||"").trim();if(!s||!a||!t)return alert("Please fill in all fields");const r=await h(s,a,t);r.success?n(o):alert(r.error||"Registration failed")}),(p=e.querySelector("#guest-form"))==null||p.addEventListener("submit",async i=>{i.preventDefault();const s=e.querySelector("#guest-alias"),a=((s==null?void 0:s.value)||"").trim(),t=await w(a||void 0);if(t.success){const r=b();r&&v(r.username),n("/")}else alert(t.error||"Failed to create guest user")}),(g=e.querySelector("#logout"))==null||g.addEventListener("click",async()=>{await q(),n(`/auth?next=${encodeURIComponent(o)}`)})}export{P as default};
