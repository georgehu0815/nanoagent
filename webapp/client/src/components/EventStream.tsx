import { useMemo } from "react";
import type {
  AgentEvent,
  ToolStartEvent,
  ToolProgressEvent,
  ToolEndEvent,
  ToolErrorEvent,
} from "../types.js";
import { ThinkingIndicator } from "./ThinkingIndicator.js";
import { ToolCallView } from "./ToolCallView.js";

interface EventStreamProps {
  events: AgentEvent[];
}

interface ToolExecution {
  tool: string;
  startEvent?: ToolStartEvent;
  progressEvents: ToolProgressEvent[];
  endEvent?: ToolEndEvent;
  errorEvent?: ToolErrorEvent;
}

export function EventStream({ events }: EventStreamProps) {
  // Group tool events by tool name
  const toolExecutions = useMemo(() => {
    const tools = new Map<string, ToolExecution>();

    for (const event of events) {
      switch (event.type) {
        case "tool_start":
          tools.set(event.tool, {
            tool: event.tool,
            startEvent: event,
            progressEvents: [],
          });
          break;

        case "tool_progress":
          if (!tools.has(event.tool)) {
            tools.set(event.tool, { tool: event.tool, progressEvents: [] });
          }
          tools.get(event.tool)!.progressEvents.push(event);
          break;

        case "tool_end":
          if (tools.has(event.tool)) {
            const exec = tools.get(event.tool)!;
            exec.endEvent = event;
          }
          break;

        case "tool_error":
          if (tools.has(event.tool)) {
            const exec = tools.get(event.tool)!;
            exec.errorEvent = event;
          }
          break;
      }
    }

    return Array.from(tools.values());
  }, [events]);

  // Get latest thinking message
  const latestThinking = useMemo(() => {
    const thinkingEvents = events.filter((e) => e.type === "thinking");
    return thinkingEvents.length > 0 ? thinkingEvents[thinkingEvents.length - 1] : null;
  }, [events]);

  // Check if done
  const isDone = events.some((e) => e.type === "done");

  return (
    <div className="space-y-2">
      {/* Thinking indicator (show only if not done and has thinking) */}
      {!isDone && latestThinking && <ThinkingIndicator message={latestThinking.message} />}

      {/* Tool executions */}
      {toolExecutions.map((exec, i) => (
        <ToolCallView
          key={`${exec.tool}-${i}`}
          tool={exec.tool}
          startEvent={exec.startEvent}
          progressEvents={exec.progressEvents}
          endEvent={exec.endEvent}
          errorEvent={exec.errorEvent}
        />
      ))}

      {/* Context cleared message */}
      {events
        .filter((e) => e.type === "context_cleared")
        .map((event, i) => (
          <div
            key={`context-${i}`}
            className="p-2 bg-yellow-50 border border-yellow-300 rounded text-sm text-yellow-800"
          >
            ⚠️ {event.message}
          </div>
        ))}

      {/* Tool limit message */}
      {events
        .filter((e) => e.type === "tool_limit")
        .map((event, i) => (
          <div
            key={`limit-${i}`}
            className="p-2 bg-orange-50 border border-orange-300 rounded text-sm text-orange-800"
          >
            ⚠️ {event.message}
          </div>
        ))}
    </div>
  );
}
