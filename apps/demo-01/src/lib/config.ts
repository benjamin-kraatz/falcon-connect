export const sourceDemoConfig = {
  appName: "Project Hub",
  appRole: "Source App",
  appId: "project-hub-demo",
  keyId: "project-hub-demo-key-1",
  falconBaseUrl: "http://localhost:3000",
  sourceBaseUrl: "http://localhost:4101",
  targetBaseUrl: "http://localhost:4102",
  targetAppId: "incident-ops-demo",
  callbackUrl: "http://localhost:4101/connect-flow/callback",
  defaultWorkspaceId: "ws-red-cliff",
  defaultScopes: ["incidents:read", "services:read", "oncall:read", "runbooks:read"],
} as const;
