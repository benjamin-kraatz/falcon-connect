export type IncidentSession = {
  id: string;
  name: string;
  role: "incident-commander" | "observer";
  canApprove: boolean;
};

export const incidentResponders: IncidentSession[] = [
  {
    id: "usr-lena-hart",
    name: "Lena Hart",
    role: "incident-commander",
    canApprove: true,
  },
  {
    id: "usr-rory-vale",
    name: "Rory Vale",
    role: "observer",
    canApprove: false,
  },
];

export const incidentCatalog = [
  {
    id: "inc-1784",
    title: "Edge API latency spike",
    severity: "SEV-1",
    status: "Investigating",
    serviceId: "svc-edge-api",
    summary: "95th percentile latency doubled during the rollout canary window.",
  },
  {
    id: "inc-1802",
    title: "Routing core queue lag",
    severity: "SEV-2",
    status: "Mitigating",
    serviceId: "svc-routing-core",
    summary: "Routing reconciliation is delayed while the queue is drained.",
  },
  {
    id: "inc-1830",
    title: "Policy gateway propagation delay",
    severity: "SEV-2",
    status: "Monitoring",
    serviceId: "svc-policy-gateway",
    summary: "Policy updates are taking longer than usual to reach edge workers.",
  },
];

export const serviceHealth = [
  {
    serviceId: "svc-edge-api",
    state: "degraded",
    saturation: "76%",
    note: "Retries are elevated for the shipping graph.",
  },
  {
    serviceId: "svc-routing-core",
    state: "degraded",
    saturation: "68%",
    note: "Queue drain worker pool is at elevated pressure.",
  },
  {
    serviceId: "svc-auth-bridge",
    state: "healthy",
    saturation: "42%",
    note: "No unusual identity bridge behavior.",
  },
  {
    serviceId: "svc-policy-gateway",
    state: "monitoring",
    saturation: "57%",
    note: "Propagation lag is improving after the latest deploy.",
  },
];

export const onCallRoster = [
  {
    serviceId: "svc-edge-api",
    primary: "Lena Hart",
    secondary: "Mason Iqbal",
    channel: "#edge-api-war-room",
  },
  {
    serviceId: "svc-routing-core",
    primary: "Tao Mercer",
    secondary: "Noor Sel",
    channel: "#routing-core",
  },
  {
    serviceId: "svc-policy-gateway",
    primary: "Rory Vale",
    secondary: "Mina Dahl",
    channel: "#policy-gateway",
  },
];

export const runbookCatalog = [
  {
    serviceId: "svc-edge-api",
    title: "Edge API latency containment",
    steps: ["Enable warm pool", "Reduce rollout traffic", "Re-check shipping cache hit rate"],
  },
  {
    serviceId: "svc-routing-core",
    title: "Routing backlog drain",
    steps: ["Pause noisy publishers", "Scale drain workers", "Validate dead-letter volume"],
  },
  {
    serviceId: "svc-policy-gateway",
    title: "Policy propagation recovery",
    steps: ["Inspect replication delay", "Restart failed propagators", "Re-run policy canary"],
  },
];
