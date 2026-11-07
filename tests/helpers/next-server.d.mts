export function startIsolatedApp(): Promise<{
  origin: string;
  sandbox: string;
  mock: {
    url: string;
    state: {
      mode: "success" | "delay" | "offline" | "malformed" | "markup";
      requests: Array<Record<string, unknown>>;
    };
    close(): Promise<void>;
  };
  restart(): Promise<void>;
  close(): Promise<void>;
}>;
