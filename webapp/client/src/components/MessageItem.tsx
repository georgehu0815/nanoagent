import type { Message } from "../types.js";
import { EventStream } from "./EventStream.js";
import { AnswerBox } from "./AnswerBox.js";

interface MessageItemProps {
  message: Message;
}

export function MessageItem({ message }: MessageItemProps) {
  const { query, events, answer, isProcessing, error } = message;

  return (
    <div className="py-4">
      {/* User query */}
      <div className="flex justify-end mb-3">
        <div className="max-w-2xl bg-blue-600 text-white rounded-lg px-4 py-2">
          <div className="whitespace-pre-wrap break-words">{query}</div>
        </div>
      </div>

      {/* Agent response area */}
      <div className="flex justify-start">
        <div className="max-w-3xl w-full">
          {/* Events (thinking, tool calls, etc.) - hide when we have an answer */}
          {events.length > 0 && !answer && <EventStream events={events} />}

          {/* Answer */}
          {answer && <AnswerBox text={answer} />}

          {/* Error */}
          {error && (
            <div className="mt-3 p-4 bg-red-50 border border-red-300 rounded-lg">
              <div className="text-sm font-medium text-red-800">Error</div>
              <div className="text-sm text-red-700 mt-1">{error}</div>
            </div>
          )}

          {/* Processing indicator */}
          {isProcessing && !answer && !error && events.length === 0 && (
            <div className="flex items-center gap-2 text-gray-500 py-4">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"
                  style={{ animationDelay: "150ms" }}
                />
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
              <span className="text-sm">Starting...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
