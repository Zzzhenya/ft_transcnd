import { WS_BASE } from "../app/config";

export class MatchWS {
  private ws?: WebSocket;
  private heartbeat?: number;

  constructor(private matchId: string) {}

  connect(onMsg: (m: any) => void) {
    const qs = "";
    this.ws = new WebSocket(`${WS_BASE}/ws/matches/${this.matchId}${qs}`);

    this.ws.addEventListener("open", () => {
      this.send({ type: "ready" });
      this.heartbeat = window.setInterval(
        () => this.send({ type: "ping", ts: Date.now() }),
        10_000
      );
    });
    this.ws.addEventListener("message", (e) => onMsg(JSON.parse(e.data)));
    this.ws.addEventListener("close", () => {
      if (this.heartbeat) clearInterval(this.heartbeat);
    });
  }

  send(m: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(m));
    }
  }
  close() {
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.ws?.close();
  }
}
