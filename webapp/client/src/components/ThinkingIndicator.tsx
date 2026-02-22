interface ThinkingIndicatorProps {
  message?: string;
}

export function ThinkingIndicator({ message = "Thinking..." }: ThinkingIndicatorProps) {
  return (
    <div className="flex items-center gap-2 text-gray-600 py-2">
      <div className="flex gap-1">
        <div
          className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"
          style={{ animationDelay: "0ms" }}
        />
        <div
          className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"
          style={{ animationDelay: "150ms" }}
        />
        <div
          className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"
          style={{ animationDelay: "300ms" }}
        />
      </div>
      <span className="text-sm italic">{message}</span>
    </div>
  );
}
