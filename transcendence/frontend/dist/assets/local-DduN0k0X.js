function c(r){r.innerHTML=`
        <section class="py-10 flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 text-gray-800">
            <div class="w-full max-w-md bg-white shadow-lg rounded-2xl p-6 space-y-6 border border-gray-200">
                <h2 class="text-2xl font-bold text-center text-blue-700">Local Gateway Game</h2>
                <div class="space-y-4">
                    <button id="createDemoGame" class="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition">
                        Create Demo Game (via Gateway)
                    </button>
                    <button id="connectGame" class="px-5 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition" disabled>
                        Connect WebSocket
                    </button>
                </div>
                <pre id="output" class="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm overflow-auto max-h-40 text-gray-700"></pre>
            </div>
        </section>
    `;let n=null,o=null;const e=document.getElementById("output");document.getElementById("createDemoGame").onclick=async()=>{e.textContent="Creating demo game via gateway...";try{const a=await(await fetch("ws://game-service/ws/pong/demo",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({})})).json();n=a.id,e.textContent=`Demo game created! Game ID: ${n}
${JSON.stringify(a,null,2)}`,document.getElementById("connectGame").removeAttribute("disabled")}catch(t){e.textContent="Error creating demo game: "+(t instanceof Error?t.message:String(t))}},document.getElementById("connectGame").onclick=()=>{if(!n){e.textContent="No game ID. Create a demo game first.";return}e.textContent=`Connecting to WebSocket for game ${n}...`,o=new WebSocket(`ws://game-service/ws/pong/game-ws/${n}`),o.onopen=()=>{e.textContent+=`
WebSocket connected!`},o.onmessage=t=>{e.textContent+=`
Received: `+t.data},o.onclose=()=>{e.textContent+=`
WebSocket disconnected.`},o.onerror=t=>{e.textContent+=`
WebSocket error.`}}}export{c as default};
