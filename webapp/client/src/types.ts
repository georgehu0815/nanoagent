/**
 * Agent event types (matching backend)
 */
export type AgentEventType =
  | "thinking"
  | "tool_start"
  | "tool_progress"
  | "tool_end"
  | "tool_error"
  | "tool_limit"
  | "context_cleared"
  | "done";

export interface BaseAgentEvent {
  type: AgentEventType;
}

export interface ThinkingEvent extends BaseAgentEvent {
  type: "thinking";
  message: string;
}

export interface ToolStartEvent extends BaseAgentEvent {
  type: "tool_start";
  tool: string;
  args: Record<string, unknown>;
}

export interface ToolProgressEvent extends BaseAgentEvent {
  type: "tool_progress";
  tool: string;
  message: string;
}

export interface ToolEndEvent extends BaseAgentEvent {
  type: "tool_end";
  tool: string;
  result: string;
  duration: number;
}

export interface ToolErrorEvent extends BaseAgentEvent {
  type: "tool_error";
  tool: string;
  error: string;
}

export interface ToolLimitEvent extends BaseAgentEvent {
  type: "tool_limit";
  tool: string;
  message: string;
}

export interface ContextClearedEvent extends BaseAgentEvent {
  type: "context_cleared";
  message: string;
}

export interface DoneEvent extends BaseAgentEvent {
  type: "done";
  answer: string;
  iterations: number;
  totalTime: number;
}

export type AgentEvent =
  | ThinkingEvent
  | ToolStartEvent
  | ToolProgressEvent
  | ToolEndEvent
  | ToolErrorEvent
  | ToolLimitEvent
  | ContextClearedEvent
  | DoneEvent;

/**
 * Message in chat history
 */
export interface Message {
  id: string;
  query: string;
  userId: string;
  timestamp: number;
  events: AgentEvent[];
  answer?: string;
  isProcessing: boolean;
  error?: string;
}

/**
 * API types
 */
export interface ChatRequest {
  query: string;
  userId?: string;
  model?: string;
  modelProvider?: string;
}

export interface ChatResponse {
  sessionId: string;
  streamUrl: string;
}

export interface HealthResponse {
  status: "ok" | "error";
  timestamp: number;
  uptime: number;
}
