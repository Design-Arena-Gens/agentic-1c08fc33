export type MediaKind = "image" | "video";

export interface MediaAttachment {
  id: string;
  name: string;
  kind: MediaKind;
  dataUrl: string;
  notes?: string;
}

export type AgentFocus =
  | "catalog"
  | "sales"
  | "loyalty"
  | "seo"
  | "automation"
  | "ads"
  | "support";

export interface CampaignBudget {
  amount: number;
  currency: string;
  cadence: "daily" | "weekly" | "monthly";
  platform?: "meta" | "google" | "both";
}

export interface AgentBrief {
  objective: string;
  focusAreas: AgentFocus[];
  tone?: string;
  constraints?: string;
  targetChannels: string[];
  tasks: string[];
  media: MediaAttachment[];
  budget?: CampaignBudget;
}

export interface AgentOutput {
  executiveSummary: string;
  taskMatrix: Array<{
    title: string;
    owner: string;
    cadence: string;
    successMetric: string;
  }>;
  automations: Array<{
    title: string;
    description: string;
    trigger: string;
    action: string;
  }>;
  channelPlaybooks: Array<{
    channel: string;
    content: string;
    cadence: string;
  }>;
  adStrategy: Array<{
    platform: string;
    audience: string;
    creatives: string;
    budgetNotes: string;
  }>;
  seoPlan: string;
  loyaltyPlan: string;
}

export interface AgentResponse {
  plan: AgentOutput;
  raw: string;
  usedSample: boolean;
}
