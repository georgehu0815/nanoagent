/**
 * React hook for managing Gateway WebSocket connection
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { GatewayClient, type GatewayClientOptions } from "../lib/gateway-client";

export interface UseGatewayOptions {
  url: string;
  clientId?: string;
  displayName?: string;
  authToken?: string;
  autoConnect?: boolean;
}

export function useGateway(options: UseGatewayOptions) {
  const [client, setClient] = useState<GatewayClient | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<GatewayClient | null>(null);

  const { url, clientId, displayName, authToken, autoConnect = true } = options;

  /**
   * Initialize client and connect
   */
  const connect = useCallback(async () => {
    if (connecting || clientRef.current?.isConnected()) {
      console.log("[useGateway] Already connected or connecting");
      return;
    }

    console.log("[useGateway] Connecting to gateway...");
    setConnecting(true);
    setError(null);

    try {
      const clientOptions: GatewayClientOptions = {
        url,
        clientId,
        displayName,
        authToken,
        onConnect: (payload) => {
          console.log("[useGateway] Connected:", payload);
          setConnected(true);
          setConnecting(false);
        },
        onDisconnect: () => {
          console.log("[useGateway] Disconnected");
          setConnected(false);
        },
        onError: (err) => {
          console.error("[useGateway] Error:", err);
          setError(err.message);
          setConnected(false);
          setConnecting(false);
        },
      };

      const newClient = new GatewayClient(clientOptions);
      clientRef.current = newClient;
      setClient(newClient);
      await newClient.connect();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("[useGateway] Connection failed:", errorMessage);
      setError(errorMessage);
      setConnected(false);
      setConnecting(false);
    }
  }, [url, clientId, displayName, authToken, connecting]);

  /**
   * Disconnect from gateway
   */
  const disconnect = useCallback(() => {
    console.log("[useGateway] Disconnecting...");
    if (clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current = null;
    }
    setClient(null);
    setConnected(false);
    setConnecting(false);
  }, []);

  /**
   * Reconnect to gateway
   */
  const reconnect = useCallback(async () => {
    disconnect();
    await connect();
  }, [connect, disconnect]);

  /**
   * Auto-connect on mount
   */
  useEffect(() => {
    if (autoConnect) {
      void connect();
    }

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only on mount/unmount

  return {
    client,
    connected,
    connecting,
    error,
    connect,
    disconnect,
    reconnect,
  };
}
