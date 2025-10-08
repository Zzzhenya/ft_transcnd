


export default function (root: HTMLElement) {
    root.innerHTML = `
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
    `;

    let gameId: number | null = null;
    let ws: WebSocket | null = null;
    const output = document.getElementById("output") as HTMLElement;

    document.getElementById("createDemoGame")!.onclick = async () => {
        output.textContent = "Creating demo game via gateway...";
        try {
            const res = await fetch("ws://game-service/ws/pong/demo", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({})
            });
            const data = await res.json();
            gameId = data.id;
            output.textContent = `Demo game created! Game ID: ${gameId}\n${JSON.stringify(data, null, 2)}`;
            document.getElementById("connectGame")!.removeAttribute("disabled");
        } catch (err) {
            output.textContent = "Error creating demo game: " + (err instanceof Error ? err.message : String(err));
        }
    };

    document.getElementById("connectGame")!.onclick = () => {
        if (!gameId) {
            output.textContent = "No game ID. Create a demo game first.";
            return;
        }
        output.textContent = `Connecting to WebSocket for game ${gameId}...`;
        ws = new WebSocket(`ws://game-service/ws/pong/game-ws/${gameId}`);
        ws.onopen = () => {
            output.textContent += "\nWebSocket connected!";
        };
        ws.onmessage = (event) => {
            output.textContent += "\nReceived: " + event.data;
        };
        ws.onclose = () => {
            output.textContent += "\nWebSocket disconnected.";
        };
        ws.onerror = (err) => {
            output.textContent += "\nWebSocket error.";
        };
    };
}
