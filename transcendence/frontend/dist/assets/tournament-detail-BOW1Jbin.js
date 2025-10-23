import{c as p,a as s,s as g,n as y,d as b,e as x,f as l}from"./index-BW261ts8.js";function S(e,o){var i;const a=((i=o.params)==null?void 0:i.id)??"t-unknown";p(a);const r=s().session.alias;e.innerHTML=`
	<section class="py-6 md:py-8 lg:py-10 space-y-6">
		<h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold">Tournament ${a}</h1>

		<div class="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
			<button id="goGame"
				class="w-full sm:w-auto
						px-4 sm:px-5 lg:px-6
						py-2 sm:py-2.5 lg:py-3
						text-sm sm:text-base lg:text-lg
						rounded bg-gray-800 text-white
						hover:bg-gray-900
						focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
				Go to my game
			</button>

			<p id="statusLine"
				class="text-xs sm:text-sm lg:text-base text-gray-600">
			</p>
		</div>

		<div class="rounded border p-4 space-y-3">
			<h2 class="font-semibold">Alias</h2>
			<form id="aliasForm" class="flex gap-2 items-center">
				<input id="aliasInput" class="border rounded px-3 py-2 w-full sm:w-64" placeholder="Enter alias" value="${r??""}" />
				<button class="px-3 py-2 rounded bg-indigo-600 text-white">Save</button>
			</form>
			<p class="text-sm text-gray-600">Alias is required to receive your match.</p>
		</div>

		<div class="rounded border p-4 space-y-3">
			<h2 class="font-semibold">My Match</h2>
			<div class="flex flex-wrap gap-2">
				<button id="assignPending" class="px-3 py-2 rounded bg-slate-200">Assign (pending)</button>
				<button id="setReady" class="px-3 py-2 rounded bg-emerald-600 text-white">Set Ready</button>
				<button id="setPlaying" class="px-3 py-2 rounded bg-blue-600 text-white">Set Playing</button>
			</div>
			<p class="text-sm text-gray-600">Use these to simulate a real tournament backend.</p>
		</div>

		<section class="rounded border p-4"><h2 class="font-semibold">BracketView (stub)</h2></section>
		<section class="rounded border p-4"><h2 class="font-semibold">Announcements (stub)</h2></section>

		<p class="mt-4"><a href="/tournaments" class="underline text-blue-600">← Tournaments</a></p>
	</section>`;const c=e.querySelector("#goGame"),d=e.querySelector("#statusLine");function n(){const t=s().myMatch;d.textContent=`Status: ${(t==null?void 0:t.status)??"none"} (id: ${(t==null?void 0:t.id)??"-"})`}n();const u=g(n);return c.addEventListener("click",()=>{const t=s().myMatch;if(!t)return alert("No match assigned yet.");t.status==="ready"||t.status==="playing"?y(`/game/${t.id}`):alert(`Match not ready (status=${t.status}).`)}),e.querySelector("#aliasForm").addEventListener("submit",t=>{t.preventDefault();const m=(e.querySelector("#aliasInput").value||"").trim();b(m)}),e.querySelector("#assignPending").addEventListener("click",()=>{const t=`tmatch-${Date.now()}`;x(t,"pending"),alert(`Assigned match: ${t} (status=pending)`)}),e.querySelector("#setReady").addEventListener("click",()=>{l("ready"),alert("My match is now READY")}),e.querySelector("#setPlaying").addEventListener("click",()=>{l("playing"),alert("My match is now PLAYING")}),()=>{u()}}export{S as default};
