export type DemoWorkspace = {
  id: string;
  label: string;
  organizationId: string;
  falconSubjectId: string;
  summary: string;
  projectCount: number;
  primaryServiceIds: string[];
  riskWindow: string;
};

export type DemoProject = {
  id: string;
  workspaceId: string;
  name: string;
  owner: string;
  tier: "tier-1" | "tier-2";
  summary: string;
  serviceIds: string[];
  watchItems: string[];
};

export const demoWorkspaces: DemoWorkspace[] = [
  {
    id: "ws-red-cliff",
    label: "Red Cliff Shipping Rollout",
    organizationId: "org-red-cliff",
    falconSubjectId: "subj-red-cliff-platform",
    summary: "A delivery-critical workspace that needs live incident context before every release.",
    projectCount: 3,
    primaryServiceIds: ["svc-edge-api", "svc-routing-core"],
    riskWindow: "Every weekday from 14:00 to 18:00 CET",
  },
  {
    id: "ws-atlas-migrate",
    label: "Atlas Identity Migration",
    organizationId: "org-atlas",
    falconSubjectId: "subj-atlas-identity",
    summary: "Identity and access work that depends on target-side auth and roster visibility.",
    projectCount: 2,
    primaryServiceIds: ["svc-auth-bridge", "svc-policy-gateway"],
    riskWindow: "Tuesday change window",
  },
];

export const demoProjects: DemoProject[] = [
  {
    id: "proj-rollout",
    workspaceId: "ws-red-cliff",
    name: "Global carrier rollout",
    owner: "Ava Solis",
    tier: "tier-1",
    summary:
      "Launch planning for the new carrier routing path used across checkout, shipping, and tracking.",
    serviceIds: ["svc-edge-api", "svc-routing-core"],
    watchItems: ["Fulfillment latency", "Webhook retry pressure", "Misrouted tracking updates"],
  },
  {
    id: "proj-returns",
    workspaceId: "ws-red-cliff",
    name: "Returns command center",
    owner: "Noah Kim",
    tier: "tier-2",
    summary:
      "Automates return label retries and keeps the returns team aware of degraded dependencies.",
    serviceIds: ["svc-routing-core", "svc-queue-drain"],
    watchItems: ["Retry queue age", "Warehouse sync lag"],
  },
  {
    id: "proj-identity",
    workspaceId: "ws-atlas-migrate",
    name: "Zero-downtime identity cutover",
    owner: "Mina Dahl",
    tier: "tier-1",
    summary: "Moves project teams onto the new policy gateway while preserving federation paths.",
    serviceIds: ["svc-auth-bridge", "svc-policy-gateway"],
    watchItems: ["Token exchange latency", "Policy propagation lag", "Pager coverage"],
  },
];

export const scopeNarrative = [
  {
    name: "incidents:read",
    category: "Required by the flow",
    why: "Project Hub needs incident summaries to show whether delivery milestones are already at risk.",
  },
  {
    name: "services:read",
    category: "Required by the flow",
    why: "Service health powers the release readiness panel in the workspace dashboard.",
  },
  {
    name: "oncall:read",
    category: "Optional",
    why: "Project owners can see the current responder before escalating launch blockers.",
  },
  {
    name: "runbooks:read",
    category: "Optional",
    why: "Project managers can jump straight to response playbooks during a launch incident.",
  },
];
