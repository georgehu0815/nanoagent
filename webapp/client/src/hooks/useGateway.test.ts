/**
 * Unit tests for useGateway hook
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useGateway } from "./useGateway";
import { MockWebSocket } from "../__mocks__/WebSocket";

// Mock WebSocket globally
global.WebSocket = MockWebSocket as any;

describe("useGateway", () => {
  let mockWs: MockWebSocket;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe("connection lifecycle", () => {
    test("should auto-connect on mount", async () => {
      const { result } = renderHook(() =>
        useGateway({
          url: "ws://localhost:18789",
          autoConnect: true,
        }),
      );

      expect(result.current.connecting).toBe(true);
      expect(result.current.connected).toBe(false);

      // Wait for WebSocket to open
      await waitFor(() => {
        expect(result.current.client).not.toBeNull();
      });

      // Simulate connection
      await act(async () => {
        mockWs = (result.current.client as any)?.ws as MockWebSocket;
        mockWs.simulateMessage(
          JSON.stringify({
            type: "res",
            id: "connect",
            ok: true,
            payload: { type: "hello-ok", protocol: 3 },
          }),
        );
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
        expect(result.current.connecting).toBe(false);
      });
    });

    test("should not auto-connect when autoConnect is false", () => {
      const { result } = renderHook(() =>
        useGateway({
          url: "ws://localhost:18789",
          autoConnect: false,
        }),
      );

      expect(result.current.connecting).toBe(false);
      expect(result.current.connected).toBe(false);
      expect(result.current.client).toBeNull();
    });

    test("should connect manually", async () => {
      const { result } = renderHook(() =>
        useGateway({
          url: "ws://localhost:18789",
          autoConnect: false,
        }),
      );

      expect(result.current.connected).toBe(false);

      // Connect manually
      await act(async () => {
        await result.current.connect();
      });

      await waitFor(() => {
        expect(result.current.client).not.toBeNull();
      });

      // Simulate connection
      await act(async () => {
        mockWs = (result.current.client as any)?.ws as MockWebSocket;
        mockWs.simulateMessage(
          JSON.stringify({
            type: "res",
            id: "connect",
            ok: true,
            payload: { type: "hello-ok", protocol: 3 },
          }),
        );
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });
    });

    test("should disconnect", async () => {
      const { result } = renderHook(() =>
        useGateway({
          url: "ws://localhost:18789",
          autoConnect: true,
        }),
      );

      // Wait for connection
      await waitFor(() => {
        expect(result.current.client).not.toBeNull();
      });

      await act(async () => {
        mockWs = (result.current.client as any)?.ws as MockWebSocket;
        mockWs.simulateMessage(
          JSON.stringify({
            type: "res",
            id: "connect",
            ok: true,
            payload: { type: "hello-ok", protocol: 3 },
          }),
        );
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      // Disconnect
      act(() => {
        result.current.disconnect();
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(false);
        expect(result.current.client).toBeNull();
      });
    });

    test("should reconnect", async () => {
      const { result } = renderHook(() =>
        useGateway({
          url: "ws://localhost:18789",
          autoConnect: true,
        }),
      );

      // Wait for initial connection
      await waitFor(() => {
        expect(result.current.client).not.toBeNull();
      });

      await act(async () => {
        mockWs = (result.current.client as any)?.ws as MockWebSocket;
        mockWs.simulateMessage(
          JSON.stringify({
            type: "res",
            id: "connect",
            ok: true,
            payload: { type: "hello-ok", protocol: 3 },
          }),
        );
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      // Reconnect
      await act(async () => {
        await result.current.reconnect();
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(false);
      });

      // Simulate new connection
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        mockWs = (result.current.client as any)?.ws as MockWebSocket;
        mockWs.simulateMessage(
          JSON.stringify({
            type: "res",
            id: "connect",
            ok: true,
            payload: { type: "hello-ok", protocol: 3 },
          }),
        );
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });
    });
  });

  describe("error handling", () => {
    test("should handle connection error", async () => {
      const { result } = renderHook(() =>
        useGateway({
          url: "ws://localhost:18789",
          autoConnect: true,
        }),
      );

      await waitFor(() => {
        expect(result.current.client).not.toBeNull();
      });

      // Simulate connection error
      await act(async () => {
        mockWs = (result.current.client as any)?.ws as MockWebSocket;
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
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      await waitFor(() => {
        expect(result.current.error).toContain("Authentication failed");
        expect(result.current.connected).toBe(false);
      });
    });
  });

  describe("configuration", () => {
    test("should use custom clientId and displayName", async () => {
      const { result } = renderHook(() =>
        useGateway({
          url: "ws://localhost:18789",
          clientId: "custom-client",
          displayName: "Custom App",
          autoConnect: true,
        }),
      );

      await waitFor(() => {
        expect(result.current.client).not.toBeNull();
      });

      await act(async () => {
        mockWs = (result.current.client as any)?.ws as MockWebSocket;
        const sentMessage = JSON.parse(mockWs.getLastSentMessage()!);

        expect(sentMessage.params.client.id).toBe("custom-client");
        expect(sentMessage.params.client.displayName).toBe("Custom App");

        mockWs.simulateMessage(
          JSON.stringify({
            type: "res",
            id: "connect",
            ok: true,
            payload: { type: "hello-ok", protocol: 3 },
          }),
        );
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });
    });

    test("should include auth token", async () => {
      const { result } = renderHook(() =>
        useGateway({
          url: "ws://localhost:18789",
          authToken: "test-token-123",
          autoConnect: true,
        }),
      );

      await waitFor(() => {
        expect(result.current.client).not.toBeNull();
      });

      await act(async () => {
        mockWs = (result.current.client as any)?.ws as MockWebSocket;
        const sentMessage = JSON.parse(mockWs.getLastSentMessage()!);

        expect(sentMessage.params.auth.token).toBe("test-token-123");

        mockWs.simulateMessage(
          JSON.stringify({
            type: "res",
            id: "connect",
            ok: true,
            payload: { type: "hello-ok", protocol: 3 },
          }),
        );
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });
    });
  });

  describe("cleanup", () => {
    test("should disconnect on unmount", async () => {
      const { result, unmount } = renderHook(() =>
        useGateway({
          url: "ws://localhost:18789",
          autoConnect: true,
        }),
      );

      await waitFor(() => {
        expect(result.current.client).not.toBeNull();
      });

      await act(async () => {
        mockWs = (result.current.client as any)?.ws as MockWebSocket;
        mockWs.simulateMessage(
          JSON.stringify({
            type: "res",
            id: "connect",
            ok: true,
            payload: { type: "hello-ok", protocol: 3 },
          }),
        );
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      // Unmount
      unmount();

      // Client should be disconnected
      expect(mockWs.readyState).toBe(MockWebSocket.CLOSED);
    });
  });
});
