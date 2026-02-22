import type { ToolStartEvent, ToolProgressEvent, ToolEndEvent, ToolErrorEvent } from "../types.js";

interface ToolCallViewProps {
  tool: string;
  startEvent?: ToolStartEvent;
  progressEvents?: ToolProgressEvent[];
  endEvent?: ToolEndEvent;
  errorEvent?: ToolErrorEvent;
}

export function ToolCallView({
  tool,
  startEvent,
  progressEvents = [],
  endEvent,
  errorEvent,
}: ToolCallViewProps) {
  const isInProgress = !endEvent && !errorEvent;
  const hasError = !!errorEvent;

  return (
    <div
      className={`border rounded-lg p-3 my-2 ${
        hasError
          ? "border-red-300 bg-red-50"
          : isInProgress
            ? "border-blue-300 bg-blue-50"
            : "border-green-300 bg-green-50"
      }`}
    >
      {/* Tool header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-mono px-2 py-1 rounded ${
              hasError
                ? "bg-red-200 text-red-800"
                : isInProgress
                  ? "bg-blue-200 text-blue-800"
                  : "bg-green-200 text-green-800"
            }`}
          >
            {tool}
          </span>
          {isInProgress && (
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
              <div
                className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"
                style={{ animationDelay: "150ms" }}
              />
              <div
                className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"
                style={{ animationDelay: "300ms" }}
              />
            </div>
          )}
        </div>
        {endEvent && (
          <span className="text-xs text-gray-500">{(endEvent.duration / 1000).toFixed(2)}s</span>
        )}
      </div>

      {/* Tool arguments (collapsed if too large) */}
      {startEvent && Object.keys(startEvent.args).length > 0 && (
        <details className="mb-2">
          <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
            Arguments ({Object.keys(startEvent.args).length})
          </summary>
          <pre className="text-xs bg-white p-2 rounded mt-1 overflow-x-auto">
            {JSON.stringify(startEvent.args, null, 2)}
          </pre>
        </details>
      )}

      {/* Progress messages */}
      {progressEvents.length > 0 && (
        <div className="space-y-1">
          {progressEvents.map((event, i) => (
            <div key={i} className="text-sm text-gray-700 flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">→</span>
              <span>{event.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Result */}
      {endEvent && (
        <div className="mt-2">
          <details>
            <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
              Result ({endEvent.result.length} characters)
            </summary>
            <pre className="text-xs bg-white p-2 rounded mt-1 overflow-x-auto max-h-40">
              {endEvent.result}
            </pre>
          </details>
        </div>
      )}

      {/* Error */}
      {errorEvent && (
        <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded">
          <div className="text-sm text-red-800 font-medium">Error:</div>
          <div className="text-sm text-red-700 mt-1">{errorEvent.error}</div>
        </div>
      )}
    </div>
  );
}
