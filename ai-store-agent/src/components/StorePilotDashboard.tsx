"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  FileImage,
  LoaderCircle,
  Rocket,
  Sparkles,
  Target,
  Trash2,
  Workflow,
} from "lucide-react";
import { toast } from "sonner";

import { CAPABILITIES } from "@/lib/capabilities";
import { SAMPLE_AGENT_RESPONSE } from "@/lib/sample-plan";
import type { AgentResponse, MediaAttachment } from "@/types/agent";

const focusOptions = [
  { label: "Catalog", value: "catalog" },
  { label: "Sales", value: "sales" },
  { label: "Aeon Money", value: "loyalty" },
  { label: "SU / SEO", value: "seo" },
  { label: "Automation", value: "automation" },
  { label: "Ads", value: "ads" },
  { label: "Support", value: "support" },
 ] as const;

const channelOptions = [
  { label: "Instagram", value: "instagram" },
  { label: "TikTok", value: "tiktok" },
  { label: "YouTube", value: "youtube" },
  { label: "Email", value: "email" },
  { label: "Meta Ads", value: "meta-ads" },
  { label: "Google Ads", value: "google-ads" },
  { label: "Marketplace", value: "marketplace" },
  { label: "In-store", value: "instore" },
 ] as const;

type FocusKey = (typeof focusOptions)[number]["value"];
type ChannelKey = (typeof channelOptions)[number]["value"];

const taskLibrary = [
  "List new arrivals with price testing",
  "Launch Meta and Google campaigns",
  "Schedule daily social drops",
  "Refresh Aeon Money rewards",
  "Draft weekly growth report",
  "Monitor inventory gaps",
  "Escalate support tickets",
  "Coordinate influencer outreach",
];

const toneOptions = [
  "Energetic merchandiser",
  "Luxury concierge",
  "Playful trendsetter",
  "Data-first strategist",
  "Calm professional",
];

interface FormState {
  objective: string;
  focusAreas: FocusKey[];
  targetChannels: ChannelKey[];
  tasks: string[];
  tone: string;
  constraints: string;
  budgetAmount: string;
  budgetCurrency: string;
  budgetCadence: "daily" | "weekly" | "monthly";
  budgetPlatform: "meta" | "google" | "both" | "";
  customTask: string;
  media: MediaAttachment[];
}

const initialState: FormState = {
  objective: "",
  focusAreas: ["catalog", "sales", "loyalty"],
  targetChannels: ["instagram", "google-ads", "meta-ads"],
  tasks: ["List new arrivals with price testing"],
  tone: toneOptions[0],
  constraints: "Respect brand tone, stay compliant, and surface approvals as needed.",
  budgetAmount: "5000",
  budgetCurrency: "USD",
  budgetCadence: "monthly",
  budgetPlatform: "both",
  customTask: "",
  media: [],
};

const budgetCadenceLabels: Record<FormState["budgetCadence"], string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

export function StorePilotDashboard() {
  const [form, setForm] = useState<FormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [agentResponse, setAgentResponse] = useState<AgentResponse | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  const hasObjective = form.objective.trim().length > 10;

  const derivedStats = useMemo(() => {
    const mediaImages = form.media.filter((item) => item.kind === "image");
    const mediaVideos = form.media.filter((item) => item.kind === "video");
    return {
      mediaCount: form.media.length,
      imageCount: mediaImages.length,
      videoCount: mediaVideos.length,
    };
  }, [form.media]);

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleSelection = <T,>(list: T[], value: T) => {
    return list.includes(value)
      ? list.filter((item) => item !== value)
      : [...list, value];
  };

  const handleMediaUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const loaders = Array.from(files).map(
      (file) =>
        new Promise<MediaAttachment>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result;
            if (typeof dataUrl !== "string") {
              reject(new Error("Unable to read asset"));
              return;
            }

            const kind = file.type.startsWith("video") ? "video" : "image";

            resolve({
              id: crypto.randomUUID(),
              name: file.name,
              kind,
              dataUrl,
              notes: kind === "video" ? "Auto-trim to 15s snippets" : "Ensure alt text references Aeon Money.",
            });
          };
          reader.onerror = () => reject(reader.error ?? new Error("File read error"));
          reader.readAsDataURL(file);
        })
    );

    try {
      const assets = await Promise.all(loaders);
      setForm((prev) => ({ ...prev, media: [...prev.media, ...assets] }));
      toast.success(`${assets.length} asset(s) staged for the agent.`);
    } catch (error) {
      console.error(error);
      toast.error("Could not parse one of the files.");
    }
  };

  const handleSubmit = async () => {
    if (!hasObjective) {
      toast.error("Describe what you need the agent to accomplish.");
      return;
    }

    setSubmitting(true);
    setShowRaw(false);

    const payload = {
      objective: form.objective,
      focusAreas: form.focusAreas,
      targetChannels: form.targetChannels,
      tasks: form.tasks,
      tone: form.tone,
      constraints: form.constraints,
      budget:
        form.budgetAmount.trim() === ""
          ? undefined
          : {
              amount: Number(form.budgetAmount),
              currency: form.budgetCurrency || "USD",
              cadence: form.budgetCadence,
              platform: form.budgetPlatform === "" ? undefined : form.budgetPlatform,
            },
      media: form.media.map((item) => ({
        id: item.id,
        name: item.name,
        kind: item.kind,
        dataUrl: item.dataUrl,
        notes: item.notes,
      })),
    };

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Agent returned an error");
      }

      const data = (await res.json()) as AgentResponse;
      setAgentResponse(data);
      toast.success(
        data.usedSample
          ? "Sample blueprint ready. Add your API key for live runs."
          : "StorePilot run complete."
      );
    } catch (error) {
      console.error(error);
      toast.error("Could not reach the agent. A sample plan has been loaded.");
      setAgentResponse(
        JSON.parse(JSON.stringify(SAMPLE_AGENT_RESPONSE)) as AgentResponse
      );
    } finally {
      setSubmitting(false);
    }
  };

  const removeMedia = (id: string) => {
    setForm((prev) => ({
      ...prev,
      media: prev.media.filter((item) => item.id !== id),
    }));
  };

  const addTask = (task: string) => {
    if (!task.trim()) return;
    if (form.tasks.includes(task)) return;
    setForm((prev) => ({ ...prev, tasks: [...prev.tasks, task], customTask: "" }));
  };

  const removeTask = (task: string) => {
    setForm((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((item) => item !== task),
    }));
  };

  return (
    <div className="flex min-h-screen flex-col gap-8 px-6 py-10 lg:px-12">
      <header className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-3 text-sm uppercase tracking-[0.35em] text-slate-400">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-600/50 px-4 py-1">
            <Sparkles className="size-4" /> StorePilot Autonomous Stack
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-600/50 px-4 py-1">
            <Workflow className="size-4" /> SU + Ads + Loyalty
          </span>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl space-y-3">
            <h1 className="text-3xl font-semibold text-white md:text-4xl">
              Deploy an AI operator that ships listings, campaigns, and Aeon Money flows on autopilot.
            </h1>
            <p className="text-base text-slate-300 md:text-lg">
              Feed StorePilot your objectives, media, and guardrails. It will plan catalog tasks, schedule
              SU pushes, launch Meta / Google ads, and keep Aeon Money loyalty humming even when you are offline.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-700/60"
          >
            {submitting ? (
              <>
                <LoaderCircle className="size-4 animate-spin" />
                Thinking
              </>
            ) : (
              <>
                Launch Run
                <ArrowRight className="size-4" />
              </>
            )}
          </button>
        </div>
      </header>

      <main className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <section className="glass-panel flex flex-col gap-6 rounded-3xl p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Target className="size-5 text-emerald-400" /> Agent Brief
          </h2>

          <label className="flex flex-col gap-2 text-sm">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Objective
            </span>
            <textarea
              value={form.objective}
              onChange={(event) => updateForm("objective", event.target.value)}
              placeholder="e.g. Launch our winter drop, scale ROAS to 4x, and move 500 units while growing Aeon Money sign-ups."
              className="min-h-[120px] rounded-2xl border border-slate-700/60 bg-slate-900/40 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-400"
            />
          </label>

          <div className="flex flex-col gap-4">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Focus Areas
            </span>
            <div className="flex flex-wrap gap-2">
              {focusOptions.map((option) => {
                const active = form.focusAreas.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateForm("focusAreas", toggleSelection(form.focusAreas, option.value))}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition ${
                      active
                        ? "border-emerald-400 bg-emerald-400/10 text-emerald-200"
                        : "border-slate-600/50 text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    {active && <Check className="size-3" />}
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Target Channels
            </span>
            <div className="flex flex-wrap gap-2">
              {channelOptions.map((option) => {
                const active = form.targetChannels.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateForm("targetChannels", toggleSelection(form.targetChannels, option.value))}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition ${
                      active
                        ? "border-indigo-400 bg-indigo-400/10 text-indigo-100"
                        : "border-slate-600/50 text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    {active && <Check className="size-3" />}
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Tasks to delegate
            </span>
            <div className="flex flex-wrap gap-2">
              {taskLibrary.map((task) => {
                const active = form.tasks.includes(task);
                return (
                  <button
                    key={task}
                    type="button"
                    onClick={() =>
                      active ? removeTask(task) : updateForm("tasks", [...form.tasks, task])
                    }
                    className={`rounded-full border px-3 py-1.5 text-xs transition ${
                      active
                        ? "border-amber-400 bg-amber-400/10 text-amber-100"
                        : "border-slate-600/50 text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    {task}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <input
                value={form.customTask}
                onChange={(event) => updateForm("customTask", event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addTask(form.customTask);
                  }
                }}
                placeholder="Add custom task and press enter"
                className="flex-1 rounded-full border border-slate-600/50 bg-slate-900/40 px-4 py-2 text-xs text-slate-100 outline-none focus:border-emerald-400"
              />
              <button
                type="button"
                onClick={() => addTask(form.customTask)}
                className="rounded-full border border-slate-500 px-3 py-2 text-xs text-slate-200 transition hover:border-emerald-400 hover:text-emerald-200"
              >
                Add Task
              </button>
            </div>
            {form.tasks.length > 0 && (
              <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                {form.tasks.map((task) => (
                  <span
                    key={task}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-600/50 px-3 py-1"
                  >
                    {task}
                    <button
                      type="button"
                      onClick={() => removeTask(task)}
                      className="text-slate-500 transition hover:text-red-400"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-xs">
              <span className="font-medium uppercase tracking-wide text-slate-400">Tone</span>
              <select
                value={form.tone}
                onChange={(event) => updateForm("tone", event.target.value)}
                className="rounded-xl border border-slate-600/50 bg-slate-900/40 px-4 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
              >
                {toneOptions.map((tone) => (
                  <option key={tone} value={tone} className="bg-slate-900 text-slate-100">
                    {tone}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-xs">
              <span className="font-medium uppercase tracking-wide text-slate-400">
                Constraints & approvals
              </span>
              <textarea
                value={form.constraints}
                onChange={(event) => updateForm("constraints", event.target.value)}
                className="min-h-[80px] rounded-xl border border-slate-600/50 bg-slate-900/40 px-4 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
              />
            </label>
          </div>

          <div className="grid gap-4 rounded-2xl border border-slate-700/60 bg-slate-900/30 p-4 text-xs">
            <span className="font-semibold uppercase tracking-wide text-slate-400">
              Budget guidance
            </span>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-slate-500">Amount</span>
                <input
                  type="number"
                  value={form.budgetAmount}
                  onChange={(event) => updateForm("budgetAmount", event.target.value)}
                  className="rounded-full border border-slate-600/50 bg-slate-950 px-4 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-slate-500">Currency</span>
                <input
                  value={form.budgetCurrency}
                  onChange={(event) => updateForm("budgetCurrency", event.target.value.toUpperCase())}
                  className="rounded-full border border-slate-600/50 bg-slate-950 px-4 py-2 text-sm uppercase text-slate-100 outline-none focus:border-emerald-400"
                />
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-slate-500">Cadence</span>
                <select
                  value={form.budgetCadence}
                  onChange={(event) =>
                    updateForm("budgetCadence", event.target.value as FormState["budgetCadence"])
                  }
                  className="rounded-full border border-slate-600/50 bg-slate-950 px-4 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
                >
                  {Object.entries(budgetCadenceLabels).map(([key, label]) => (
                    <option key={key} value={key} className="bg-slate-900 text-slate-100">
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-slate-500">Ad platforms</span>
                <select
                  value={form.budgetPlatform}
                  onChange={(event) =>
                    updateForm(
                      "budgetPlatform",
                      event.target.value as FormState["budgetPlatform"]
                    )
                  }
                  className="rounded-full border border-slate-600/50 bg-slate-950 px-4 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
                >
                  <option value="" className="bg-slate-900 text-slate-100">
                    Agent decide
                  </option>
                  <option value="meta" className="bg-slate-900 text-slate-100">
                    Meta only
                  </option>
                  <option value="google" className="bg-slate-900 text-slate-100">
                    Google only
                  </option>
                  <option value="both" className="bg-slate-900 text-slate-100">
                    Meta + Google
                  </option>
                </select>
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Media staging
            </span>
            <label
              className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-600/60 bg-slate-900/30 px-6 py-10 text-center text-sm text-slate-400 transition hover:border-emerald-400"
            >
              <FileImage className="size-8 text-emerald-400" />
              <span>Drop campaign images or video snippets</span>
              <span className="text-xs text-slate-500">JPEG, PNG, MP4 up to 25MB each</span>
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={(event) => handleMediaUpload(event.target.files)}
              />
            </label>

            {form.media.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>
                    {derivedStats.mediaCount} asset(s) staged • {derivedStats.imageCount} images · {derivedStats.videoCount}
                    {" "}
                    videos
                  </span>
                  <button
                    type="button"
                    className="text-red-300 transition hover:text-red-200"
                    onClick={() => updateForm("media", [])}
                  >
                    Clear all
                  </button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {form.media.map((asset) => (
                    <div
                      key={asset.id}
                      className="group relative overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/50"
                    >
                      <div className="absolute right-2 top-2 z-10 flex gap-2">
                        <span className="rounded-full bg-slate-950/80 px-2 py-1 text-[10px] uppercase tracking-wide text-slate-300">
                          {asset.kind}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeMedia(asset.id)}
                          className="rounded-full bg-slate-950/80 p-1 text-slate-300 transition hover:text-red-400"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                      <div className="aspect-video w-full overflow-hidden bg-slate-950/80">
                        {asset.kind === "image" ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={asset.dataUrl}
                            alt={asset.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <video
                            src={asset.dataUrl}
                            className="h-full w-full object-cover"
                            playsInline
                            muted
                            autoPlay
                            loop
                          />
                        )}
                      </div>
                      <div className="space-y-1 p-4 text-xs">
                        <p className="font-medium text-slate-100">{asset.name}</p>
                        {asset.notes && <p className="text-slate-400">{asset.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="flex flex-col gap-6">
          <div className="glass-panel rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                <Rocket className="size-5 text-indigo-400" /> Operating Canvas
              </h2>
              <span className="rounded-full border border-slate-700/60 px-3 py-1 text-xs text-slate-400">
                {form.focusAreas.length} focus lanes active
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-300">
              The agent combines these playbooks to deliver a full-funnel growth plan. Bring your stack
              (Shopify, Woo, custom) and StorePilot will orchestrate via workflows and webhooks.
            </p>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {CAPABILITIES.map((capability) => (
                <article
                  key={capability.id}
                  className="rounded-3xl border border-slate-700/60 bg-slate-900/30 p-4"
                >
                  <h3 className="text-sm font-semibold text-slate-100">{capability.title}</h3>
                  <p className="mt-1 text-xs text-slate-400">{capability.description}</p>
                  <div className="mt-3 space-y-2 text-xs text-slate-300">
                    <div>
                      <span className="font-semibold text-slate-200">Outcomes</span>
                      <ul className="mt-1 space-y-1 text-slate-400">
                        {capability.outcomes.map((item) => (
                          <li key={item} className="flex items-start gap-2">
                            <BadgeCheck className="mt-0.5 size-3 text-emerald-400" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-200">Automations</span>
                      <ul className="mt-1 space-y-1 text-slate-400">
                        {capability.automations.map((item) => (
                          <li key={item} className="flex items-start gap-2">
                            <Workflow className="mt-0.5 size-3 text-indigo-400" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                <Sparkles className="size-5 text-emerald-400" /> Agent Blueprint
              </h2>
              {agentResponse && (
                <button
                  type="button"
                  onClick={() => setShowRaw((prev) => !prev)}
                  className="text-xs text-slate-400 underline-offset-4 transition hover:text-emerald-200 hover:underline"
                >
                  {showRaw ? "Hide raw JSON" : "View raw JSON"}
                </button>
              )}
            </div>

            {!agentResponse ? (
              <div className="mt-4 grid gap-4 rounded-2xl border border-dashed border-slate-600 p-6 text-sm text-slate-400">
                <p>
                  Launch the agent run to receive a structured plan covering catalog, sales ops, SU content,
                  Meta/Google ads, and Aeon Money loyalty accelerators.
                </p>
                <p className="text-xs text-slate-500">
                  Provide your OpenAI API key as `OPENAI_API_KEY` during deployment for live execution. Without it we
                  stage a sample response so you can explore the interface.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-6">
                <section className="rounded-2xl border border-slate-700/60 bg-slate-900/30 p-5 text-sm text-slate-200">
                  <h3 className="text-base font-semibold text-white">Executive Summary</h3>
                  <p className="mt-2 text-slate-300">{agentResponse.plan.executiveSummary}</p>
                </section>

                <section className="rounded-2xl border border-slate-700/60 bg-slate-900/30 p-5 text-sm text-slate-200">
                  <h3 className="text-base font-semibold text-white">Task Matrix</h3>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {agentResponse.plan.taskMatrix.map((task) => (
                      <div key={task.title} className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-4">
                        <p className="font-semibold text-slate-100">{task.title}</p>
                        <p className="mt-2 text-xs text-slate-400">Owner: {task.owner}</p>
                        <p className="text-xs text-slate-400">Cadence: {task.cadence}</p>
                        <p className="mt-2 text-xs text-emerald-300">
                          Success metric: {task.successMetric}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-700/60 bg-slate-900/30 p-5 text-sm text-slate-200">
                  <h3 className="text-base font-semibold text-white">Automations</h3>
                  <div className="mt-3 space-y-3">
                    {agentResponse.plan.automations.map((automation) => (
                      <div key={automation.title} className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-4">
                        <p className="font-semibold text-slate-100">{automation.title}</p>
                        <p className="mt-2 text-xs text-slate-400">{automation.description}</p>
                        <p className="mt-2 text-xs text-indigo-300">Trigger: {automation.trigger}</p>
                        <p className="text-xs text-emerald-300">Action: {automation.action}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-700/60 bg-slate-900/30 p-5 text-sm text-slate-200">
                  <h3 className="text-base font-semibold text-white">Channel Playbooks</h3>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {agentResponse.plan.channelPlaybooks.map((playbook) => (
                      <div key={playbook.channel} className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-4">
                        <p className="font-semibold text-slate-100">{playbook.channel}</p>
                        <p className="mt-2 text-xs text-slate-400">{playbook.content}</p>
                        <p className="mt-2 text-xs text-emerald-300">Cadence: {playbook.cadence}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-700/60 bg-slate-900/30 p-5 text-sm text-slate-200">
                  <h3 className="text-base font-semibold text-white">Paid Media Strategy</h3>
                  <div className="mt-3 space-y-3">
                    {agentResponse.plan.adStrategy.map((ad) => (
                      <div key={ad.platform} className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-4">
                        <p className="font-semibold text-slate-100">{ad.platform}</p>
                        <p className="mt-2 text-xs text-slate-400">Audience: {ad.audience}</p>
                        <p className="text-xs text-slate-400">Creatives: {ad.creatives}</p>
                        <p className="mt-2 text-xs text-emerald-300">Budget: {ad.budgetNotes}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-700/60 bg-slate-900/30 p-5 text-sm text-slate-200">
                    <h3 className="text-base font-semibold text-white">SU / SEO</h3>
                    <p className="mt-2 text-slate-300">{agentResponse.plan.seoPlan}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-700/60 bg-slate-900/30 p-5 text-sm text-slate-200">
                    <h3 className="text-base font-semibold text-white">Aeon Money Loyalty</h3>
                    <p className="mt-2 text-slate-300">{agentResponse.plan.loyaltyPlan}</p>
                  </div>
                </section>

                {showRaw && (
                  <pre className="scroll-shadow-y max-h-[320px] overflow-y-auto rounded-2xl border border-slate-700/60 bg-slate-950/80 p-4 text-xs text-slate-300">
                    {agentResponse.raw}
                  </pre>
                )}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
