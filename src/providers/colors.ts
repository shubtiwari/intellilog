import { IntelliLogConfig } from "./types";

export type LogType = "log" | "error" | "warn" | "info" | "debug" | "table" | "time";

export function getPrefix(type: LogType, config: IntelliLogConfig): string {
  if (!config.useColorIcons) {
    return config.prefix;
  }

  switch (type) {
    case "error":
      return "🟥";
    case "warn":
      return "🟨";
    case "info":
      return "🟩";
    case "debug":
      return "🟪";
    case "table":
      return "📊";
    case "time":
      return "⏱️";
    case "log":
    default:
      return "🟦";
  }
}
