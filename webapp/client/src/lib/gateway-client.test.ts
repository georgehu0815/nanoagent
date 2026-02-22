/**
 * Unit tests for GatewayClient
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { GatewayClient } from "./gateway-client";
import { MockWebSocket } from "../__mocks__/WebSocket";

// Mock WebSocket globally
global.WebSocket = MockWebSocket as any;

describe("GatewayClient", () => {
  let client: GatewayClient;
  let mockWs: MockWebSocket;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (client) {
      client.disconnect();
    }
  });

  describe("connect()", () => {
    test("should connect to gateway successfully", async () => {
      const onConnect = vi.fn();

      client = new GatewayClient({
        url: "ws://localhost:18789",
        clientId: "test-client",
        onConnect,
      });

      const connectPromise = client.connect();

      // Wait for WebSocket to open
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Get the mock WebSocket instance
      mockWs = (client as any).ws as MockWebSocket;

      // Simulate hello-ok response
      mockWs.simulateMessage(
        JSON.stringify({
          type: "res",
          id: "connect",
          ok: true,
          payload: {
            type: "hello-ok",
            protocol: 3,
            server: { version: "test", connId: "test-1" },
          },
        }),
      );

      const result = await connectPromise;

      expect(result.type).toBe("hello-ok");
      expect(onConnect).toHaveBeenCalledWith({
        type: "hello-ok",
        protocol: 3,
        server: { version: "test", connId: "test-1" },
      });
      expect(client.isConnected()).toBe(true);
    });

    test("should send correct connect frame", async () => {
      client = new GatewayClient({
        url: "ws://localhost:18789",
        clientId: "webapp",
        displayName: "Test App",
        authToken: "test-token",
      });

      const connectPromise = client.connect();
      await new Promise((resolve) => setTimeout(resolve, 10));

      mockWs = (client as any).ws as MockWebSocket;
      const sentMessage = JSON.parse(mockWs.getLastSentMessage()!);

      expect(sentMessage).toEqual({
        type: "req",
        id: "connect",
        method: "connect",
        params: {
          minProtocol: 3,
          maxProtocol: 3,
          client: {
            id: "webapp",
            displayName: "Test App",
            version: "1.0.0",
            platform: "browser",
            mode: "webapp",
          },
          auth: { token: "test-token" },
        },
      });

      // Complete connection
      mockWs.simulateMessage(
        JSON.stringify({
          type: "res",
          id: "connect",
          ok: true,
          payload: { type: "hello-ok", protocol: 3 },
        }),
      );

      await connectPromise;
    });

    test("should reject on connection error", async () => {
      const onError = vi.fn();

      client = new GatewayClient({
        url: "ws://localhost:18789",
        onError,
      });

      const connectPromise = client.connect();
      await new Promise((resolve) => setTimeout(resolve, 10));

      mockWs = (client as any).ws as MockWebSocket;

      // Simulate connection failure
      mockWs.simulateMessage(
        JSON.stringify({
          type: "res",
          id: "connect",
          ok: false,
          error: {
            code: "AUTH_FAILED",
            message: "Authentication failed",
          },
        }),
      );

      await expect(connectPromise).rejects.toThrow("Authentication failed");
      expect(onError).toHaveBeenCalled();
    });

    test("should not connect if already connected", async () => {
      client = new GatewayClient({
        url: "ws://localhost:18789",
      });

      const connectPromise = client.connect();
      await new Promise((resolve) => setTimeout(resolve, 10));

      mockWs = (client as any).ws as MockWebSocket;
      mockWs.simulateMessage(
        JSON.stringify({
          type: "res",
          id: "connect",
          ok: true,
          payload: { type: "hello-ok", protocol: 3 },
        }),
      );

      await connectPromise;

      // Try to connect again
      const secondConnect = await client.connect();
      expect(secondConnect).toBeUndefined();
    });
  });

  describe("request()", () => {
    beforeEach(async () => {
      client = new GatewayClient({
        url: "ws://localhost:18789",
      });

      const connectPromise = client.connect();
      await new Promise((resolve) => setTimeout(resolve, 10));

      mockWs = (client as any).ws as MockWebSocket;
      mockWs.simulateMessage(
        JSON.stringify({
          type: "res",
          id: "connect",
          ok: true,
          payload: { type: "hello-ok", protocol: 3 },
        }),
      );

      await connectPromise;
      mockWs.clearMessageQueue();
    });

    test("should send request and receive response", async () => {
      const requestPromise = client.request("health");

      // Check request frame
      const sentMessage = JSON.parse(mockWs.getLastSentMessage()!);
      expect(sentMessage.type).toBe("req");
      expect(sentMessage.method).toBe("health");
      expect(sentMessage.id).toMatch(/^r\d+$/);

      // Simulate response
      mockWs.simulateMessage(
        JSON.stringify({
          type: "res",
          id: sentMessage.id,
          ok: true,
          payload: { ok: true },
        }),
      );

      const result = await requestPromise;
      expect(result).toEqual({ ok: true });
    });

    test("should handle request with params", async () => {
      const requestPromise = client.request("chat.send", {
        text: "Hello",
        idempotencyKey: "test-123",
      });

      const sentMessage = JSON.parse(mockWs.getLastSentMessage()!);
      expect(sentMessage.params).toEqual({
        text: "Hello",
        idempotencyKey: "test-123",
      });

      // Simulate response
      mockWs.simulateMessage(
        JSON.stringify({
          type: "res",
          id: sentMessage.id,
          ok: true,
          payload: { sessionId: "test-session" },
        }),
      );

      const result = await requestPromise;
      expect(result.sessionId).toBe("test-session");
    });

    test("should reject on error response", async () => {
      const requestPromise = client.request("chat.send", { text: "Hello" });

      const sentMessage = JSON.parse(mockWs.getLastSentMessage()!);

      // Simulate error response
      mockWs.simulateMessage(
        JSON.stringify({
          type: "res",
          id: sentMessage.id,
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid params",
          },
        }),
      );

      await expect(requestPromise).rejects.toThrow("Invalid params");
    });

    test("should timeout if no response", async () => {
      vi.useFakeTimers();

      const requestPromise = client.request("health");

      // Fast-forward time
      vi.advanceTimersByTime(30001);

      await expect(requestPromise).rejects.toThrow("Request timeout");

      vi.useRealTimers();
    });

    test("should throw if not connected", async () => {
      client.disconnect();

      await expect(client.request("health")).rejects.toThrow("Not connected to gateway");
    });
  });

  describe("sendChat()", () => {
    beforeEach(async () => {
      client = new GatewayClient({
        url: "ws://localhost:18789",
      });

      const connectPromise = client.connect();
      await new Promise((resolve) => setTimeout(resolve, 10));

      mockWs = (client as any).ws as MockWebSocket;
      mockWs.simulateMessage(
        JSON.stringify({
          type: "res",
          id: "connect",
          ok: true,
          payload: { type: "hello-ok", protocol: 3 },
        }),
      );

      await connectPromise;
      mockWs.clearMessageQueue();
    });

    test("should send chat message", async () => {
      const chatPromise = client.sendChat("What is TypeScript?", "agent:main:test-user");

      const sentMessage = JSON.parse(mockWs.getLastSentMessage()!);
      expect(sentMessage.method).toBe("chat.send");
      expect(sentMessage.params.message).toBe("What is TypeScript?");
      expect(sentMessage.params.idempotencyKey).toMatch(/^chat-\d+-/);

      // Simulate response
      mockWs.simulateMessage(
        JSON.stringify({
          type: "res",
          id: sentMessage.id,
          ok: true,
          payload: { sessionId: "test-session" },
        }),
      );

      const result = await chatPromise;
      expect(result.sessionId).toBe("test-session");
    });

    test("should include sessionKey if provided", async () => {
      const chatPromise = client.sendChat("Hello", "my-session");

      const sentMessage = JSON.parse(mockWs.getLastSentMessage()!);
      expect(sentMessage.params.sessionKey).toBe("my-session");

      mockWs.simulateMessage(
        JSON.stringify({
          type: "res",
          id: sentMessage.id,
          ok: true,
          payload: {},
        }),
      );

      await chatPromise;
    });
  });

  describe("event handling", () => {
    beforeEach(async () => {
      client = new GatewayClient({
        url: "ws://localhost:18789",
      });

      const connectPromise = client.connect();
      await new Promise((resolve) => setTimeout(resolve, 10));

      mockWs = (client as any).ws as MockWebSocket;
      mockWs.simulateMessage(
        JSON.stringify({
          type: "res",
          id: "connect",
          ok: true,
          payload: { type: "hello-ok", protocol: 3 },
        }),
      );

      await connectPromise;
    });

    test("should handle events", () => {
      const handler = vi.fn();
      client.on("agent", handler);

      mockWs.simulateMessage(
        JSON.stringify({
          type: "event",
          event: "agent",
          payload: { type: "thinking", message: "Processing..." },
        }),
      );

      expect(handler).toHaveBeenCalledWith({
        type: "thinking",
        message: "Processing...",
      });
    });

    test("should support multiple handlers", () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      client.on("agent", handler1);
      client.on("agent", handler2);

      mockWs.simulateMessage(
        JSON.stringify({
          type: "event",
          event: "agent",
          payload: { type: "done", answer: "Test" },
        }),
      );

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    test("should remove event handlers", () => {
      const handler = vi.fn();
      client.on("agent", handler);
      client.off("agent", handler);

      mockWs.simulateMessage(
        JSON.stringify({
          type: "event",
          event: "agent",
          payload: { type: "thinking" },
        }),
      );

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("disconnect()", () => {
    test("should disconnect cleanly", async () => {
      const onDisconnect = vi.fn();

      client = new GatewayClient({
        url: "ws://localhost:18789",
        onDisconnect,
      });

      const connectPromise = client.connect();
      await new Promise((resolve) => setTimeout(resolve, 10));

      mockWs = (client as any).ws as MockWebSocket;
      mockWs.simulateMessage(
        JSON.stringify({
          type: "res",
          id: "connect",
          ok: true,
          payload: { type: "hello-ok", protocol: 3 },
        }),
      );
      await connectPromise;

      client.disconnect();

      expect(client.isConnected()).toBe(false);
      expect((client as any).ws).toBeNull();
    });
  });

  describe("helper methods", () => {
    beforeEach(async () => {
      client = new GatewayClient({
        url: "ws://localhost:18789",
      });

      const connectPromise = client.connect();
      await new Promise((resolve) => setTimeout(resolve, 10));

      mockWs = (client as any).ws as MockWebSocket;
      mockWs.simulateMessage(
        JSON.stringify({
          type: "res",
          id: "connect",
          ok: true,
          payload: { type: "hello-ok", protocol: 3 },
        }),
      );

      await connectPromise;
      mockWs.clearMessageQueue();
    });

    test("getHistory() should work", async () => {
      const historyPromise = client.getHistory("test-session");

      const sentMessage = JSON.parse(mockWs.getLastSentMessage()!);
      expect(sentMessage.method).toBe("chat.history");
      expect(sentMessage.params.sessionKey).toBe("test-session");

      mockWs.simulateMessage(
        JSON.stringify({
          type: "res",
          id: sentMessage.id,
          ok: true,
          payload: { messages: [] },
        }),
      );

      await historyPromise;
    });

    test("abortChat() should work", async () => {
      const abortPromise = client.abortChat("test-session");

      const sentMessage = JSON.parse(mockWs.getLastSentMessage()!);
      expect(sentMessage.method).toBe("chat.abort");
      expect(sentMessage.params.sessionKey).toBe("test-session");

      mockWs.simulateMessage(
        JSON.stringify({
          type: "res",
          id: sentMessage.id,
          ok: true,
          payload: {},
        }),
      );

      await abortPromise;
    });

    test("health() should work", async () => {
      const healthPromise = client.health();

      const sentMessage = JSON.parse(mockWs.getLastSentMessage()!);
      expect(sentMessage.method).toBe("health");

      mockWs.simulateMessage(
        JSON.stringify({
          type: "res",
          id: sentMessage.id,
          ok: true,
          payload: { ok: true },
        }),
      );

      const result = await healthPromise;
      expect(result.ok).toBe(true);
    });
  });
});
