import { useState, useCallback, useRef, useEffect } from "react";
import { useGateway } from "./useGateway.js";
import type { Message, AgentEvent } from "../types.js";

export interface UseAgentStreamOptions {
  gatewayUrl: string;
  authToken?: string;
  sessionKey?: string;
  userId?: string;
}

export function useAgentStream(options: UseAgentStreamOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentMessageIdRef = useRef<string | null>(null);
  const currentSessionIdRef = useRef<string | null>(null);

  // Generate or use provided session key
  // Format: agent:main:<userId>
  const [sessionKey] = useState<string>(
    () => options.sessionKey || `agent:main:${options.userId || "webapp-" + Date.now()}`,
  );

  // Connect to gateway
  const {
    client,
    connected,
    connecting,
    error: gatewayError,
  } = useGateway({
    url: options.gatewayUrl,
    clientId: "webapp",
    displayName: "Dexter Web App",
    authToken: options.authToken,
    autoConnect: true,
  });

  /**
   * Map gateway agent events to UI AgentEvent format
   * Backend sends: {stream, data, ...} where stream can be "assistant", "tool", or "lifecycle"
   */
  const mapGatewayEvent = useCallback((gatewayPayload: any): AgentEvent | null => {
    const stream = gatewayPayload.stream;
    const data = gatewayPayload.data || {};

    // Handle different stream types
    if (stream === "assistant") {
      // Assistant text stream - ignore these, we'll use chat events for text
      // The assistant stream events are internal, chat events contain the assembled text
      const text = data.text || data.delta || "";
      console.log(
        "[useAgentStream] Assistant stream (ignoring)  text: - useAgentStream.ts:48",
        text,
        "length:",
        text.length,
      );
      return null;
    }

    if (stream === "tool") {
      const phase = data.phase;
      const name = data.name || "unknown";

      if (phase === "start") {
        return {
          type: "tool_start",
          tool: name,
          args: data.args || {},
        };
      }

      if (phase === "end") {
        return {
          type: "tool_end",
          tool: name,
          result: data.result || data.output || "",
          duration: data.duration || 0,
        };
      }

      if (data.isError) {
        return {
          type: "tool_error",
          tool: name,
          error: data.error || data.message || "Tool error",
        };
      }

      // Tool progress
      return {
        type: "tool_progress",
        tool: name,
        message: data.meta || data.message || "Processing...",
      };
    }

    if (stream === "lifecycle") {
      const phase = data.phase;

      if (phase === "start") {
        return {
          type: "thinking",
          message: "Starting...",
        };
      }

      if (phase === "end") {
        // Don't treat lifecycle 'end' as done - the final chat event will handle completion
        // Just show a thinking message
        return {
          type: "thinking",
          message: "Finishing...",
        };
      }

      if (phase === "error") {
        return {
          type: "tool_error",
          tool: "agent",
          error: data.error || "An error occurred",
        };
      }

      // Other lifecycle events
      return {
        type: "thinking",
        message: phase || "Processing...",
      };
    }

    // Unknown stream type
    console.warn("[useAgentStream] Unknown stream type: - useAgentStream.ts:124", stream, data);
    return null;
  }, []);

  /**
   * Handle incoming agent events from gateway
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleAgentEvent = useCallback(
    (payload: any) => {
      console.log("[useAgentStream] Gateway agent event: - useAgentStream.ts:133", payload);

      const messageId = currentMessageIdRef.current;
      if (!messageId) {
        console.warn(
          "[useAgentStream] Received event but no current message - useAgentStream.ts:137",
        );
        return;
      }

      // Map gateway event to UI event format
      // Payload structure: {runId, stream, data, sessionKey, seq, ts}
      const event = mapGatewayEvent(payload);
      if (!event) return;

      console.log("[useAgentStream] Mapped event: - useAgentStream.ts:146", event);

      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== messageId) return msg;

          // Add event to message
          const updatedMsg = {
            ...msg,
            events: [...msg.events, event],
          };

          // If done, extract answer and mark as complete
          if (event.type === "done") {
            updatedMsg.answer = event.answer;
            updatedMsg.isProcessing = false;
          }

          // If error, mark as complete with error
          if (event.type === "tool_error") {
            updatedMsg.error = event.error;
            updatedMsg.isProcessing = false;
          }

          return updatedMsg;
        }),
      );

      // Stop processing when done
      if (event.type === "done" || event.type === "tool_error") {
        setIsProcessing(false);
        currentMessageIdRef.current = null;
        currentSessionIdRef.current = null;
      }
    },
    [mapGatewayEvent],
  );

  /**
   * Handle incoming chat events from gateway (contains the actual message text)
   */
  const handleChatEvent = useCallback((payload: unknown) => {
    console.log("[useAgentStream] Chat event: - useAgentStream.ts:186", payload);

    const messageId = currentMessageIdRef.current;
    if (!messageId) return;

    // Chat events have: {runId, sessionKey, seq, state, message}
    // state can be 'delta' or 'final'
    // message structure: { role: "assistant", content: [{ type: "text", text: "..." }], timestamp: number }
    const chatPayload = payload as {
      state?: string;
      message?:
        | {
            role?: string;
            content?: Array<{ type: string; text: string }>;
          }
        | string;
    };
    const state = chatPayload.state;

    console.log("[useAgentStream] Chat payload state: - useAgentStream.ts:203", state);
    console.log(
      "[useAgentStream] Chat payload message type: - useAgentStream.ts:204",
      typeof chatPayload.message,
    );
    console.log(
      "[useAgentStream] Chat payload message: - useAgentStream.ts:205",
      chatPayload.message,
    );

    // Extract text from message.content[0].text
    let text = "";
    if (typeof chatPayload.message === "string") {
      console.log("[useAgentStream] Message is string:", chatPayload.message);
      text = chatPayload.message;
    } else if (chatPayload.message?.content && Array.isArray(chatPayload.message.content)) {
      console.log("[useAgentStream] Message content array:", chatPayload.message.content);
      const textContent = chatPayload.message.content.find((c) => c.type === "text");
      console.log("[useAgentStream] Found text content:", textContent);
      text = textContent?.text || "";
    } else {
      console.warn("[useAgentStream] Unexpected message structure:", chatPayload.message);
    }

    console.log("[useAgentStream] 🎯 FINAL EXTRACTED TEXT:", text);
    console.log("[useAgentStream] Text length:", text.length);

    if (!text) return;

    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg;

        // Update answer with the text
        const updatedMsg = {
          ...msg,
          answer: text,
        };

        // If final, mark as complete
        if (state === "final") {
          updatedMsg.isProcessing = false;
          setIsProcessing(false);
          currentMessageIdRef.current = null;
          currentSessionIdRef.current = null;
        }

        return updatedMsg;
      }),
    );
  }, []);

  /**
   * Subscribe to chat and agent events when client is available
   */
  useEffect(() => {
    if (!client) return;

    console.log("[useAgentStream] Subscribing to events - useAgentStream.ts:250");
    client.on("agent", handleAgentEvent);
    client.on("chat", handleChatEvent);

    return () => {
      console.log("[useAgentStream] Unsubscribing from events - useAgentStream.ts:255");
      client.off("agent", handleAgentEvent);
      client.off("chat", handleChatEvent);
    };
  }, [client, handleAgentEvent, handleChatEvent]);

  /**
   * Send a new message to the agent via gateway
   */
  const sendMessage = useCallback(
    async (query: string, userId?: string) => {
      console.log(
        "[useAgentStream] ═══════════════════════════════════════ - useAgentStream.ts:265",
      );
      console.log("[useAgentStream] 📤 sendMessage called - useAgentStream.ts:266");
      console.log("[useAgentStream]    Query: - useAgentStream.ts:267", query);
      console.log("[useAgentStream]    UserId: - useAgentStream.ts:268", userId || "anonymous");
      console.log("[useAgentStream]    isProcessing: - useAgentStream.ts:269", isProcessing);
      console.log("[useAgentStream]    connected: - useAgentStream.ts:270", connected);
      console.log(
        "[useAgentStream] ═══════════════════════════════════════ - useAgentStream.ts:271",
      );

      if (isProcessing) {
        console.error("[useAgentStream] ❌ Already processing a message - useAgentStream.ts:274");
        throw new Error("Already processing a message");
      }

      if (!client || !connected) {
        console.error("[useAgentStream] ❌ Not connected to gateway - useAgentStream.ts:279");
        throw new Error("Not connected to gateway");
      }

      if (!query.trim()) {
        console.error("[useAgentStream] ❌ Query is empty - useAgentStream.ts:284");
        throw new Error("Query cannot be empty");
      }

      setError(null);
      setIsProcessing(true);

      // Create new message
      const messageId = `msg-${Date.now()}`;
      const newMessage: Message = {
        id: messageId,
        query: query.trim(),
        userId: userId || "anonymous",
        timestamp: Date.now(),
        events: [],
        isProcessing: true,
      };

      setMessages((prev) => [...prev, newMessage]);
      currentMessageIdRef.current = messageId;

      console.log("[useAgentStream] ✅ Message created: - useAgentStream.ts:305", messageId);

      try {
        // Send chat.send request to gateway
        console.log("[useAgentStream] 🚀 Sending chat.send to gateway... - useAgentStream.ts:309");
        console.log("[useAgentStream]    Session key: - useAgentStream.ts:310", sessionKey);

        const response = await client.sendChat(query.trim(), sessionKey);

        console.log("[useAgentStream] ✅ chat.send response: - useAgentStream.ts:314", response);

        // Store session ID if provided
        if (response.sessionId) {
          currentSessionIdRef.current = response.sessionId;
        }

        // Agent events will arrive via the "agent" event subscription
      } catch (err) {
        console.error(
          "[useAgentStream] ❌❌❌ Failed to send message: - useAgentStream.ts:323",
          err,
        );

        const errorMessage = err instanceof Error ? err.message : String(err);

        setError(errorMessage);
        setIsProcessing(false);
        currentMessageIdRef.current = null;
        currentSessionIdRef.current = null;

        // Update message with error
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId ? { ...msg, error: errorMessage, isProcessing: false } : msg,
          ),
        );
      }
    },
    [isProcessing, client, connected, sessionKey],
  );

  /**
   * Cancel the current running message
   */
  const cancelMessage = useCallback(async () => {
    if (!sessionKey || !client) return;

    try {
      await client.abortChat(sessionKey);
      console.log("[useAgentStream] Cancelled session: - useAgentStream.ts:351", sessionKey);
    } catch (err) {
      console.error("[useAgentStream] Failed to cancel: - useAgentStream.ts:353", err);
    }

    setIsProcessing(false);
    currentSessionIdRef.current = null;

    // Mark current message as cancelled
    if (currentMessageIdRef.current) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === currentMessageIdRef.current
            ? { ...msg, error: "Cancelled by user", isProcessing: false }
            : msg,
        ),
      );
      currentMessageIdRef.current = null;
    }
  }, [client, sessionKey]);

  /**
   * Clear all messages
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isProcessing,
    error: error || gatewayError,
    connected,
    connecting,
    sendMessage,
    cancelMessage,
    clearMessages,
  };
}
