/**
 * WebSocket Gateway Client for React App
 *
 * Connects to the gateway WebSocket server and handles:
 * - Protocol frames (req/res/event)
 * - Chat messages
 * - Agent events
 */

export type GatewayFrame =
  | { type: "req"; id: string; method: string; params?: any }
  | { type: "res"; id: string; ok: boolean; payload?: any; error?: any }
  | { type: "event"; event: string; payload: any; seq?: number };

export interface GatewayClientOptions {
  url: string;
  clientId?: string;
  displayName?: string;
  authToken?: string;
  onConnect?: (payload: any) => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

export class GatewayClient {
  private ws: WebSocket | null = null;
  private requestCallbacks = new Map<string, (frame: any) => void>();
  private eventHandlers = new Map<string, Set<(payload: any) => void>>();
  private nextRequestId = 1;
  private connected = false;
  private reconnectTimeout?: number;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private stopped = false;
  private options: GatewayClientOptions;

  constructor(options: GatewayClientOptions) {
    this.options = options;
  }

  /**
   * Connect to the gateway
   */
  async connect(): Promise<any> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log("[GatewayClient] Already connected - gateway-client.ts:42");
      return;
    }

    console.log("[GatewayClient] Connecting to: - gateway-client.ts:46", this.options.url);

    return new Promise<any>((resolve, reject) => {
      // Track whether this connect() promise has already settled.
      // onerror before settle → reject the promise (catch in useGateway handles it).
      // onerror after settle  → call onError so the hook can update its state.
      let settled = false;

      try {
        this.ws = new WebSocket(this.options.url);

        this.ws.onopen = () => {
          console.log(
            "[GatewayClient] WebSocket opened, sending connect frame - gateway-client.ts:53",
          );
          this.sendConnectFrame();
        };

        this.ws.onmessage = (event) => {
          const frame: GatewayFrame = JSON.parse(event.data);
          this.handleFrame(
            frame,
            (v) => { settled = true; resolve(v); },
            (e) => { settled = true; reject(e); },
          );
        };

        this.ws.onerror = (error) => {
          console.error("[GatewayClient] WebSocket error: - gateway-client.ts:63", error);
          const err = new Error("WebSocket connection error");
          if (settled) {
            // Runtime error after connection — notify the hook directly.
            this.options.onError?.(err);
          } else {
            // Connection-phase error — let the Promise rejection propagate.
            settled = true;
            reject(err);
          }
        };

        this.ws.onclose = () => {
          console.log("[GatewayClient] WebSocket closed - gateway-client.ts:69");
          this.connected = false;
          this.options.onDisconnect?.();
          this.attemptReconnect();
        };
      } catch (error) {
        console.error("[GatewayClient] Failed to create WebSocket: - gateway-client.ts:75", error);
        reject(error);
      }
    });
  }

  private sendConnectFrame() {
    this.send({
      type: "req",
      id: "connect",
      method: "connect",
      params: {
        minProtocol: 3,
        maxProtocol: 3,
        client: {
          id: this.options.clientId || "webapp",
          displayName: this.options.displayName || "Web App",
          version: "1.0.0",
          platform: "browser",
          mode: "webapp",
        },
        auth: this.options.authToken ? { token: this.options.authToken } : undefined,
      },
    });
  }

  private handleFrame(
    frame: GatewayFrame,
    connectResolve?: (value: any) => void,
    connectReject?: (reason?: any) => void,
  ) {
    console.log("[GatewayClient] Received frame: - gateway-client.ts:106", frame.type);

    if (frame.type === "res") {
      // Handle response
      const callback = this.requestCallbacks.get(frame.id);
      if (callback) {
        callback(frame);
        this.requestCallbacks.delete(frame.id);
      }

      // Special handling for connect response
      if (frame.id === "connect") {
        if (frame.ok) {
          this.connected = true;
          this.reconnectAttempts = 0;
          console.log(
            "[GatewayClient] Connected successfully: - gateway-client.ts:121",
            frame.payload,
          );
          this.options.onConnect?.(frame.payload);
          connectResolve?.(frame.payload);
        } else {
          console.error("[GatewayClient] Connect failed: - gateway-client.ts:125", frame.error);
          const error = new Error(frame.error?.message || "Connection failed");
          this.options.onError?.(error);
          connectReject?.(error);
        }
      }
    } else if (frame.type === "event") {
      // Handle event
      console.log("[GatewayClient] Event: - gateway-client.ts:133", frame.event, frame.payload);
      const handlers = this.eventHandlers.get(frame.event);
      if (handlers) {
        handlers.forEach((handler) => handler(frame.payload));
      }
    }
  }

  private send(frame: GatewayFrame) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(frame));
    } else {
      console.error("[GatewayClient] Cannot send: WebSocket not open - gateway-client.ts:145");
      throw new Error("WebSocket not connected");
    }
  }

  /**
   * Send a request and wait for response
   */
  async request(method: string, params?: any): Promise<any> {
    if (!this.connected) {
      throw new Error("Not connected to gateway");
    }

    const id = `r${this.nextRequestId++}`;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (this.requestCallbacks.has(id)) {
          this.requestCallbacks.delete(id);
          reject(new Error("Request timeout"));
        }
      }, 30000);

      this.requestCallbacks.set(id, (frame) => {
        clearTimeout(timeout);
        if (frame.ok) {
          resolve(frame.payload);
        } else {
          reject(new Error(frame.error?.message || "Request failed"));
        }
      });

      this.send({ type: "req", id, method, params });
    });
  }

  /**
   * Subscribe to events
   */
  on(event: string, handler: (payload: any) => void) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  /**
   * Unsubscribe from events
   */
  off(event: string, handler: (payload: any) => void) {
    this.eventHandlers.get(event)?.delete(handler);
  }

  /**
   * Send a chat message
   */
  async sendChat(message: string, sessionKey: string): Promise<any> {
    if (!message || message.trim().length === 0) {
      throw new Error("Message cannot be empty");
    }
    if (!sessionKey || sessionKey.trim().length === 0) {
      throw new Error("Session key is required");
    }

    return this.request("chat.send", {
      sessionKey,
      message,
      idempotencyKey: `chat-${Date.now()}-${Math.random()}`,
    });
  }

  /**
   * Get chat history
   */
  async getHistory(sessionKey?: string): Promise<any> {
    return this.request("chat.history", { sessionKey });
  }

  /**
   * Abort a chat session
   */
  async abortChat(sessionKey: string, runId?: string): Promise<any> {
    const params: any = { sessionKey };
    if (runId) {
      params.runId = runId;
    }
    return this.request("chat.abort", params);
  }

  /**
   * Health check
   */
  async health(): Promise<any> {
    return this.request("health");
  }

  /**
   * Disconnect from gateway
   */
  disconnect() {
    this.stopped = true;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = undefined;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.connected = false;
    }

    this.requestCallbacks.clear();
    this.eventHandlers.clear();
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected && this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect() {
    if (this.stopped) return;

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log("[GatewayClient] Max reconnect attempts reached - gateway-client.ts:272");
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    console.log(
      `[GatewayClient] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
    );

    this.reconnectTimeout = window.setTimeout(() => {
      this.connect().catch((err) => {
        console.error("[GatewayClient] Reconnect failed: - gateway-client.ts:285", err);
      });
    }, delay);
  }
}
