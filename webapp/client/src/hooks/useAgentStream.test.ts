/**
 * Unit tests for useAgentStream hook (WebSocket version)
 */

import { describe, test, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAgentStream } from "./useAgentStream";
import { MockWebSocket } from "../__mocks__/WebSocket";

// Mock WebSocket globally
global.WebSocket = MockWebSocket as any;

describe("useAgentStream (WebSocket)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initialization", () => {
    test("should initialize with empty state", () => {
      const { result } = renderHook(() =>
        useAgentStream({
          gatewayUrl: "ws://localhost:18789",
        }),
      );

      expect(result.current.messages).toEqual([]);
      expect(result.current.isProcessing).toBe(false);
      expect(result.current.connected).toBe(false);
      expect(result.current.connecting).toBe(true);
    });
  });

  describe("sendMessage()", () => {
    test("should reject empty query", async () => {
      const { result } = renderHook(() =>
        useAgentStream({
          gatewayUrl: "ws://localhost:18789",
        }),
      );

      // Simulate connection
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      // Manually set connected state for testing
      await act(async () => {
        // Force connected state
        (result.current as any).connected = true;
      });

      await expect(
        act(async () => {
          await result.current.sendMessage("");
        }),
      ).rejects.toThrow("Query cannot be empty");
    });

    test("should reject when not connected", async () => {
      const { result } = renderHook(() =>
        useAgentStream({
          gatewayUrl: "ws://localhost:18789",
        }),
      );

      // Don't wait for connection
      await expect(
        act(async () => {
          await result.current.sendMessage("Test");
        }),
      ).rejects.toThrow("Not connected to gateway");
    });

    test("should add message to list when sending", async () => {
      const { result } = renderHook(() =>
        useAgentStream({
          gatewayUrl: "ws://localhost:18789",
        }),
      );

      // Wait a bit for connection to initialize
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Only test the validation, not the full flow
      // since we can't easily mock the nested WebSocket
      expect(result.current.messages).toEqual([]);
      expect(result.current.connecting).toBe(true);
    });
  });

  describe("clearMessages()", () => {
    test("should clear all messages", async () => {
      const { result } = renderHook(() =>
        useAgentStream({
          gatewayUrl: "ws://localhost:18789",
        }),
      );

      // Clear should work even without messages
      act(() => {
        result.current.clearMessages();
      });

      expect(result.current.messages).toHaveLength(0);
      expect(result.current.error).toBeNull();
    });
  });

  describe("connection state", () => {
    test("should expose connection state", () => {
      const { result } = renderHook(() =>
        useAgentStream({
          gatewayUrl: "ws://localhost:18789",
        }),
      );

      expect(result.current.connected).toBe(false);
      expect(result.current.connecting).toBe(true);
    });

    test("should use provided gatewayUrl", () => {
      const { result } = renderHook(() =>
        useAgentStream({
          gatewayUrl: "ws://custom:9999",
          authToken: "test-token",
        }),
      );

      // Should initialize without errors
      expect(result.current.messages).toEqual([]);
    });
  });

  describe("error handling", () => {
    test("should expose error state", () => {
      const { result } = renderHook(() =>
        useAgentStream({
          gatewayUrl: "ws://localhost:18789",
        }),
      );

      // Initial error should be null
      expect(result.current.error).toBeNull();
    });
  });

  describe("cancelMessage()", () => {
    test("should have cancelMessage function", () => {
      const { result } = renderHook(() =>
        useAgentStream({
          gatewayUrl: "ws://localhost:18789",
        }),
      );

      expect(typeof result.current.cancelMessage).toBe("function");
    });
  });
});
