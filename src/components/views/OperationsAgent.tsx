import React, { useState } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Download,
  Eye,
  FileCheck,
  FileText,
  HelpCircle,
  Layers,
  ListChecks,
  Play,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Stethoscope,
  UserCheck,
  X,
  XCircle,
} from 'lucide-react';
import { useHospitalData } from '../../context/HospitalDataContext';
import {
  AgentStatus,
  ApprovedActionPlanItem,
  InvestigationFindings,
  InvestigationPlan,
  InvestigationTrailEvent,
  PotentialAction,
  ProposedAnalysis,
  ToolExecutionRecord,
} from '../../types';
import {
  executeApprovedInvestigation,
  generateInvestigationPlan,
} from '../../data/operationsAgentEngine';

export const OperationsAgent: React.FC = () => {
  const { filteredRecords } = useHospitalData();

  // Agent State
  const [objective, setObjective] = useState<string>('Investigate the major patient-flow bottlenecks.');
  const [status, setStatus] = useState<AgentStatus>('IDLE');
  const [plan, setPlan] = useState<InvestigationPlan | null>(null);
  const [executedTools, setExecutedTools] = useState<ToolExecutionRecord[]>([]);
  const [findings, setFindings] = useState<InvestigationFindings | null>(null);
  const [recommendations, setRecommendations] = useState<PotentialAction[]>([]);
  const [approvedActionPlan, setApprovedActionPlan] = useState<ApprovedActionPlanItem[]>([]);
  const [trail, setTrail] = useState<InvestigationTrailEvent[]>([]);

  // Modification Form State
  const [isModifyingPlan, setIsModifyingPlan] = useState<boolean>(false);
  const [modificationFeedback, setModificationFeedback] = useState<string>('');
  const [isTrailExpanded, setIsTrailExpanded] = useState<boolean>(false);
  const [activeTabToolIndex, setActiveTabToolIndex] = useState<number>(0);
  const [copiedPlan, setCopiedPlan] = useState<boolean>(false);

  // Example objectives
  const exampleObjectives = [
    'Investigate the major patient-flow bottlenecks.',
    'Investigate why outpatient waiting times may be high.',
    'Identify operational areas that management should investigate.',
    'Investigate capacity pressures across the hospital.',
    'Analyse factors associated with appointment no-shows.',
  ];

  // Helper to add trail event
  const addTrailEvent = (
    stage: InvestigationTrailEvent['stage'],
    title: string,
    description: string,
    details?: Record<string, any>
  ) => {
    const event: InvestigationTrailEvent = {
      timestamp: new Date().toLocaleTimeString(),
      stage,
      title,
      description,
      details,
    };
    setTrail((prev) => [...prev, event]);
  };

  // Step 1 -> Step 2: Create Investigation Plan
  const handleCreatePlan = async (feedbackText?: string) => {
    if (!objective.trim()) return;

    setStatus('PLANNING');
    setIsModifyingPlan(false);

    addTrailEvent(
      feedbackText ? 'Human Feedback Received' : 'Objective Defined',
      feedbackText ? 'Investigation Plan Modification Requested' : 'Investigation Objective Established',
      feedbackText ? `Modification instruction: "${feedbackText}"` : `Objective: "${objective}"`
    );

    try {
      const response = await fetch('/api/agent/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objective,
          userFeedback: feedbackText,
          previousPlan: plan,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.plan) {
          setPlan(data.plan);
          setStatus('AWAITING_INVESTIGATION_APPROVAL');
          addTrailEvent(
            'Plan Proposed',
            `Investigation Plan (v${data.plan.version}) Formulated`,
            `Agent proposed ${data.plan.proposedAnalyses.length} analytical tools to evaluate the objective.`
          );
          return;
        }
      }
    } catch (err) {
      console.warn('API plan endpoint unavailable, using deterministic engine fallback');
    }

    // Deterministic fallback
    const localPlan = generateInvestigationPlan(objective, feedbackText, plan || undefined);
    setPlan(localPlan);
    setStatus('AWAITING_INVESTIGATION_APPROVAL');
    addTrailEvent(
      'Plan Proposed',
      `Investigation Plan (v${localPlan.version}) Formulated`,
      `Agent proposed ${localPlan.proposedAnalyses.length} analytical tools to evaluate the objective.`
    );
  };

  // Step 3 -> Step 4: Human Approves Investigation
  const handleApproveInvestigation = async () => {
    if (!plan) return;

    setStatus('INVESTIGATING');
    addTrailEvent(
      'Human Plan Approved',
      'Investigation Plan Approved by Human Manager',
      'Authorized agent to execute analytical tools against the 15,000-record dataset.'
    );

    try {
      const response = await fetch('/api/agent/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.executedTools && data.findings && data.recommendations) {
          setExecutedTools(data.executedTools);
          setFindings(data.findings);
          setRecommendations(data.recommendations);
          setStatus('AWAITING_ACTION_APPROVAL');

          data.executedTools.forEach((tool: ToolExecutionRecord) => {
            addTrailEvent(
              'Tool Executed',
              `Executed: ${tool.displayName}`,
              tool.resultSummary
            );
          });

          addTrailEvent(
            'Findings Synthesized',
            'Analytical Findings & Hypotheses Generated',
            `Synthesized ${data.findings.observedFindings.length} observed findings, ${data.findings.hypotheses.length} hypotheses, and ${data.recommendations.length} potential management actions.`
          );
          return;
        }
      }
    } catch (err) {
      console.warn('API execute endpoint unavailable, running client-side execution');
    }

    // Client-side deterministic execution
    const executionResult = executeApprovedInvestigation(plan, filteredRecords);
    setExecutedTools(executionResult.executedTools);
    setFindings(executionResult.findings);
    setRecommendations(executionResult.recommendations);
    setStatus('AWAITING_ACTION_APPROVAL');

    executionResult.executedTools.forEach((tool) => {
      addTrailEvent('Tool Executed', `Executed: ${tool.displayName}`, tool.resultSummary);
    });

    addTrailEvent(
      'Findings Synthesized',
      'Analytical Findings & Hypotheses Generated',
      `Synthesized ${executionResult.findings.observedFindings.length} observed findings, ${executionResult.findings.hypotheses.length} hypotheses, and ${executionResult.recommendations.length} potential management actions.`
    );
  };

  // Step 7: Human Action Approval / Rejection
  const handleApproveAction = (actionId: string) => {
    const action = recommendations.find((r) => r.id === actionId);
    if (!action) return;

    // Update recommendation status
    setRecommendations((prev) =>
      prev.map((r) => (r.id === actionId ? { ...r, status: 'approved', decisionTimestamp: new Date().toISOString() } : r))
    );

    // Add to approved management action plan
    const planItem: ApprovedActionPlanItem = {
      id: action.id,
      approvedAction: action.action,
      evidenceSupporting: action.evidence,
      intendedObjective: action.expectedObjective,
      informationRequired: action.additionalInfoNeeded,
      suggestedOwner: action.suggestedOwner,
      suggestedNextStep: action.suggestedNextStep,
      approvedAt: new Date().toLocaleTimeString(),
    };

    setApprovedActionPlan((prev) => {
      const exists = prev.some((p) => p.id === actionId);
      if (exists) return prev;
      return [...prev, planItem];
    });

    addTrailEvent(
      'Action Approved',
      `Action Approved for Action Plan: "${action.action}"`,
      `Assigned to ${action.suggestedOwner}. Note: AI has executed no autonomous change.`
    );
  };

  const handleRejectAction = (actionId: string) => {
    const action = recommendations.find((r) => r.id === actionId);
    if (!action) return;

    setRecommendations((prev) =>
      prev.map((r) => (r.id === actionId ? { ...r, status: 'rejected', decisionTimestamp: new Date().toISOString() } : r))
    );

    // Remove from approved action plan if it was previously there
    setApprovedActionPlan((prev) => prev.filter((p) => p.id !== actionId));

    addTrailEvent(
      'Action Rejected',
      `Action Rejected: "${action.action}"`,
      'Recommendation declined by human operations manager.'
    );
  };

  // Reset agent
  const handleReset = () => {
    setStatus('IDLE');
    setPlan(null);
    setExecutedTools([]);
    setFindings(null);
    setRecommendations([]);
    setIsModifyingPlan(false);
    setModificationFeedback('');
    addTrailEvent('Objective Defined', 'Session Reset', 'Reset agent workspace for a new operational investigation.');
  };

  // Copy Action Plan to clipboard
  const handleCopyActionPlan = () => {
    if (approvedActionPlan.length === 0) return;
    const text = [
      '==================================================',
      'MEDICORE HOSPITAL OPERATIONS — APPROVED MANAGEMENT ACTION PLAN',
      'Human-approved action plan — no operational changes have been executed by the AI.',
      `Date: ${new Date().toLocaleDateString()} | Encounters Audited: ${filteredRecords.length.toLocaleString()}`,
      '==================================================\n',
      ...approvedActionPlan.map(
        (item, idx) =>
          `${idx + 1}. ACTION: ${item.approvedAction}\n` +
          `   - Intended Objective: ${item.intendedObjective}\n` +
          `   - Supporting Evidence: ${item.evidenceSupporting}\n` +
          `   - Suggested Owner: ${item.suggestedOwner}\n` +
          `   - Next Step: ${item.suggestedNextStep}\n` +
          `   - Additional Info Required: ${item.informationRequired}\n` +
          `   - Approved At: ${item.approvedAt}\n`
      ),
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopiedPlan(true);
    setTimeout(() => setCopiedPlan(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header & Agent Role Banner */}
      <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0 shadow-inner">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  MediCore Operations Analyst
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  <ShieldCheck className="w-3 h-3" />
                  Read-Only Advisory Agent
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  <UserCheck className="w-3 h-3" />
                  Human-In-The-Loop
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Dedicated analytical assistant for the hospital operations manager. Formulates structured investigation plans, calls grounded analytical tools against MediCore&apos;s 15,000 encounters, tests operational hypotheses, and proposes non-autonomous management actions for human approval.
              </p>
            </div>
          </div>

          {/* Current Workflow Status Indicator */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-slate-800/80 border border-slate-700/70 rounded-xl px-4 py-3">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Agent State:
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  status === 'IDLE'
                    ? 'bg-slate-400'
                    : status === 'PLANNING'
                    ? 'bg-amber-400 animate-pulse'
                    : status === 'AWAITING_INVESTIGATION_APPROVAL'
                    ? 'bg-yellow-400 animate-pulse'
                    : status === 'INVESTIGATING'
                    ? 'bg-teal-400 animate-pulse'
                    : status === 'AWAITING_ACTION_APPROVAL'
                    ? 'bg-emerald-400'
                    : 'bg-indigo-400'
                }`}
              />
              <span className="text-xs font-bold text-white uppercase tracking-wide">
                {status === 'IDLE' && 'Idle / Awaiting Objective'}
                {status === 'PLANNING' && 'Formulating Investigation Plan...'}
                {status === 'AWAITING_INVESTIGATION_APPROVAL' && 'Awaiting Investigation Approval'}
                {status === 'INVESTIGATING' && 'Executing Analytical Tools (Phase 2)...'}
                {status === 'AWAITING_ACTION_APPROVAL' && 'Investigation Complete / Awaiting Action Approval'}
                {status === 'COMPLETED' && 'Action Plan Finalized'}
              </span>
            </div>
            {status !== 'IDLE' && (
              <button
                onClick={handleReset}
                className="text-[11px] font-medium text-slate-400 hover:text-white underline ml-2 cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Safety Principles Ribbon */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center gap-2 text-[11px] text-slate-400">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>Safety Mandate:</strong> The agent does not modify records, assign beds, adjust clinician rosters, or execute actions autonomously. All calculations use the verified dataset; management recommendations require human approval before inclusion in the action plan.
          </span>
        </div>
      </div>

      {/* STEP 1: USER OBJECTIVE INPUT */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 text-xs font-bold flex items-center justify-center">
              1
            </span>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Define Operational Investigation Objective
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Step 1 of Human-in-the-Loop Workflow
          </span>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <input
              type="text"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="e.g. Investigate the major patient-flow bottlenecks."
              disabled={status === 'PLANNING' || status === 'INVESTIGATING'}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium"
            />
          </div>

          {/* Quick Objective Suggestions */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Example Objectives:
            </span>
            <div className="flex flex-wrap gap-2">
              {exampleObjectives.map((ex, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setObjective(ex)}
                  disabled={status === 'PLANNING' || status === 'INVESTIGATING'}
                  className={`text-xs px-3 py-1.5 rounded-lg border text-left transition-colors cursor-pointer ${
                    objective === ex
                      ? 'bg-teal-50 border-teal-300 text-teal-800 font-semibold'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                  }`}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Agent will first propose an investigation plan for your review before executing any tools.
            </div>
            <button
              onClick={() => handleCreatePlan()}
              disabled={!objective.trim() || status === 'PLANNING' || status === 'INVESTIGATING'}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold tracking-wide transition-all shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {status === 'PLANNING' ? (
                <>
                  <Activity className="w-4 h-4 animate-spin" />
                  <span>Formulating Plan...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Create Investigation Plan</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* STEP 2 & 3: AGENT INVESTIGATION PLAN & HUMAN APPROVAL */}
      {plan && (
        <div className="bg-white rounded-2xl border-2 border-teal-500/40 p-6 shadow-sm space-y-5 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center">
                2
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Agent Investigation Plan (Version {plan.version})
                </h3>
                <span className="text-[11px] text-slate-500">
                  Formulated at {new Date(plan.createdAt).toLocaleTimeString()} • Requires Human Approval Prior to Execution
                </span>
              </div>
            </div>

            {/* Status Badge */}
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 self-start sm:self-auto ${
                status === 'AWAITING_INVESTIGATION_APPROVAL'
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              }`}
            >
              {status === 'AWAITING_INVESTIGATION_APPROVAL' ? (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  Awaiting Human Approval
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Plan Approved
                </>
              )}
            </span>
          </div>

          {/* Concise Restatement of Objective */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Investigation Objective:
            </span>
            <p className="text-sm font-semibold text-slate-900">
              {plan.objective}
            </p>
          </div>

          {/* Proposed Analyses List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Proposed Analytical Tools ({plan.proposedAnalyses.length})
              </span>
              <span className="text-[11px] text-slate-500">
                All tools are strictly READ-ONLY and execute on active hospital records
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {plan.proposedAnalyses.map((analysis, idx) => (
                <div
                  key={analysis.id || idx}
                  className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        {analysis.displayName}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                        {analysis.toolName}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 space-y-1 mt-2">
                      <p>
                        <strong className="text-slate-700">Calculates:</strong> {analysis.whatItCalculates}
                      </p>
                      <p>
                        <strong className="text-teal-800">Relevance:</strong> {analysis.whyRelevant}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Expected Output */}
          <div className="bg-teal-50/60 rounded-xl p-3.5 border border-teal-200/70 text-xs text-teal-900">
            <span className="font-bold uppercase tracking-wide block mb-0.5">
              Expected Output:
            </span>
            <span>{plan.expectedOutput}</span>
          </div>

          {/* Limitations & Analytical Boundaries */}
          {plan.limitations && (
            <div className="bg-slate-100/80 rounded-xl p-3.5 border border-slate-200 text-xs text-slate-700">
              <span className="font-bold uppercase tracking-wide block mb-1 text-slate-700 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                Limitations & Scope Boundaries (What This Plan Cannot Establish):
              </span>
              {Array.isArray(plan.limitations) ? (
                <ul className="list-disc pl-5 space-y-0.5 text-slate-600">
                  {plan.limitations.map((lim: string, idx: number) => (
                    <li key={idx}>{lim}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-600 leading-relaxed">{plan.limitations}</p>
              )}
            </div>
          )}

          {/* Human Modification Input (Conditional) */}
          {isModifyingPlan && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-4 h-4 text-amber-700" />
                  Provide Human Guidance to Revise Plan
                </span>
                <button
                  onClick={() => setIsModifyingPlan(false)}
                  className="text-amber-700 hover:text-amber-900 text-xs"
                >
                  Cancel
                </button>
              </div>
              <textarea
                value={modificationFeedback}
                onChange={(e) => setModificationFeedback(e.target.value)}
                placeholder='e.g. "Don&apos;t analyse diagnostics", "Also investigate bed occupancy", "Focus only on outpatient operations"'
                rows={2}
                className="w-full bg-white border border-amber-300 rounded-lg p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => handleCreatePlan(modificationFeedback)}
                  disabled={!modificationFeedback.trim() || status === 'PLANNING'}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Update & Revise Plan
                </button>
              </div>
            </div>
          )}

          {/* Action Approval Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-teal-600" />
              <span>
                Strict Human-in-the-Loop: No analytical functions or queries run until approved.
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              {!isModifyingPlan && status === 'AWAITING_INVESTIGATION_APPROVAL' && (
                <button
                  onClick={() => setIsModifyingPlan(true)}
                  className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Modify Plan
                </button>
              )}

              {status === 'AWAITING_INVESTIGATION_APPROVAL' && (
                <button
                  onClick={handleApproveInvestigation}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Approve Investigation</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STEP 4 & 5: INVESTIGATION PROGRESS & EXECUTED TOOLS */}
      {executedTools.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center">
                3
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Executed Analytical Tools & Multi-Step Evidence ({executedTools.length})
                </h3>
                <span className="text-[11px] text-slate-500">
                  All tools executed with read-only access against active dataset ({filteredRecords.length.toLocaleString()} encounters)
                </span>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
              Verified Calculations
            </span>
          </div>

          {/* Interactive Tool Results Tabs */}
          <div className="space-y-3">
            <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none">
              {executedTools.map((tool, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveTabToolIndex(idx)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTabToolIndex === idx
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                  <span>{tool.displayName}</span>
                </button>
              ))}
            </div>

            {/* Active Selected Tool Details */}
            {executedTools[activeTabToolIndex] && (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      {executedTools[activeTabToolIndex].displayName}
                    </span>
                    <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600">
                      {executedTools[activeTabToolIndex].toolName}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Executed at {new Date(executedTools[activeTabToolIndex].executedAt).toLocaleTimeString()}
                  </span>
                </div>

                <div className="bg-white rounded-lg p-3 border border-slate-200/80 text-xs font-medium text-slate-800">
                  <strong className="text-teal-900 block mb-1">Calculated Findings:</strong>
                  {executedTools[activeTabToolIndex].resultSummary}
                </div>

                <div className="text-[11px] text-slate-500">
                  <strong>Analytical Rationale:</strong> {executedTools[activeTabToolIndex].relevanceRationale}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 6: INVESTIGATION RESULTS & STRUCTURED REPORT */}
      {findings && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center">
                4
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Investigation Summary
                </h3>
                <span className="text-[11px] text-slate-500">
                  Strictly Distinguishing Verified Facts from Hypotheses and Explanations
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Confidence: {findings.confidence}
              </span>
            </div>
          </div>

          {/* 1. Observed Findings (Verified Facts) */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>1. Observed Findings (Calculated Facts)</span>
            </div>
            <ul className="space-y-1.5 pl-5 list-disc text-xs text-slate-800 font-medium leading-relaxed">
              {findings.observedFindings.map((finding, idx) => (
                <li key={idx}>{finding}</li>
              ))}
            </ul>
          </div>

          {/* 2. Supporting Evidence */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              <Layers className="w-4 h-4 text-teal-600" />
              <span>2. Supporting Evidence (Computed Metrics)</span>
            </div>
            <div className="space-y-2">
              {findings.supportingEvidence.map((ev, idx) => (
                <div key={idx} className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs text-slate-700 font-mono">
                  {ev}
                </div>
              ))}
            </div>
          </div>

          {/* 3. Interpretation */}
          <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 uppercase tracking-wider mb-1.5">
              <BrainCircuit className="w-4 h-4 text-indigo-600" />
              <span>3. Operational Interpretation</span>
            </div>
            <p className="text-xs text-indigo-950 leading-relaxed font-medium">
              {findings.interpretation}
            </p>
          </div>

          {/* 4. Hypotheses / Possible Explanations */}
          <div className="bg-amber-50/50 rounded-xl p-4 border border-amber-200/70">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase tracking-wider mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>4. Hypotheses / Possible Explanations (Warranting Management Audit)</span>
            </div>
            <ul className="space-y-2 pl-5 list-disc text-xs text-amber-950 font-medium">
              {findings.hypotheses.map((hypo, idx) => (
                <li key={idx}>{hypo}</li>
              ))}
            </ul>
          </div>

          {/* 5. Confidence & Evidence Strength */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <span className="text-slate-600">
              <strong>5. Evidence Strength:</strong> {findings.evidenceStrengthRationale}
            </span>
            <span className="font-bold text-teal-800 bg-teal-100/80 px-2 py-0.5 rounded">
              Status: {findings.confidence}
            </span>
          </div>

          {/* 6. What the Data Cannot Establish (Limitations) */}
          <div className="bg-slate-100/80 rounded-xl p-4 border border-slate-200 text-xs text-slate-600">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              <HelpCircle className="w-4 h-4 text-slate-500" />
              <span>6. What the Data Cannot Establish (Methodological Boundaries)</span>
            </div>
            <ul className="space-y-1 pl-5 list-disc text-[11px] leading-relaxed text-slate-600">
              {findings.limitations.map((lim, idx) => (
                <li key={idx}>{lim}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* STEP 7: POTENTIAL ACTIONS TO CONSIDER & HUMAN APPROVAL */}
      {recommendations.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center">
                5
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Potential Actions to Consider
                </h3>
                <span className="text-[11px] text-slate-500">
                  Presented as Advisory Proposals — Requires Human Decision to Include in Action Plan
                </span>
              </div>
            </div>

            <div className="text-xs text-slate-500">
              Approved: <strong className="text-emerald-600">{approvedActionPlan.length}</strong> / {recommendations.length}
            </div>
          </div>

          {/* Action Cards */}
          <div className="grid grid-cols-1 gap-4">
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className={`rounded-xl border p-4.5 transition-all ${
                  rec.status === 'approved'
                    ? 'bg-emerald-50/40 border-emerald-300'
                    : rec.status === 'rejected'
                    ? 'bg-slate-50/50 border-slate-200 opacity-60'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-900">
                        {rec.action}
                      </h4>
                      {rec.status === 'approved' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Approved for Action Plan
                        </span>
                      )}
                      {rec.status === 'rejected' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700 border border-slate-300 flex items-center gap-1">
                          <X className="w-3 h-3" />
                          Declined
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-600 mt-2">
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
                        <strong className="text-slate-800 block mb-0.5">Evidence Supporting:</strong>
                        <span>{rec.evidence}</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
                        <strong className="text-slate-800 block mb-0.5">Expected Objective:</strong>
                        <span>{rec.expectedObjective}</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
                        <strong className="text-slate-800 block mb-0.5">Additional Information Needed:</strong>
                        <span>{rec.additionalInfoNeeded}</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
                        <strong className="text-slate-800 block mb-0.5">Risks & Trade-offs:</strong>
                        <span>{rec.risksAndTradeoffs}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1">
                      <span>
                        <strong>Suggested Owner:</strong> {rec.suggestedOwner}
                      </span>
                      <span>•</span>
                      <span>
                        <strong>Next Step:</strong> {rec.suggestedNextStep}
                      </span>
                    </div>
                  </div>

                  {/* Approval / Rejection Controls */}
                  <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
                    <button
                      onClick={() => handleRejectAction(rec.id)}
                      disabled={rec.status === 'rejected'}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                        rec.status === 'rejected'
                          ? 'bg-slate-200 text-slate-500'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>

                    <button
                      onClick={() => handleApproveAction(rec.id)}
                      disabled={rec.status === 'approved'}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm ${
                        rec.status === 'approved'
                          ? 'bg-emerald-700 text-white'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{rec.status === 'approved' ? 'Approved' : 'Approve for Action Plan'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HUMAN-APPROVED MANAGEMENT ACTION PLAN */}
      {approvedActionPlan.length > 0 && (
        <div className="bg-emerald-900 text-white rounded-2xl border border-emerald-800 p-6 shadow-sm space-y-4 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-800/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Approved Management Action Plan
                </h3>
                <span className="text-xs text-emerald-200/90 font-medium">
                  {approvedActionPlan.length} Human-Authorized Initiative{approvedActionPlan.length > 1 ? 's' : ''}
                </span>
              </div>
            </div>

            <button
              onClick={handleCopyActionPlan}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-emerald-100 text-xs font-semibold border border-emerald-700/60 transition-colors cursor-pointer self-start sm:self-auto"
            >
              {copiedPlan ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Plan</span>
                </>
              )}
            </button>
          </div>

          {/* Prominent Safety Label */}
          <div className="bg-emerald-950/60 border border-emerald-500/30 rounded-xl px-4 py-2.5 text-xs text-emerald-200/90 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Human-approved action plan:</strong> No operational changes have been executed by the AI. These approved initiatives represent authorized next steps for hospital operations management.
            </span>
          </div>

          {/* Action Items */}
          <div className="space-y-3">
            {approvedActionPlan.map((item, idx) => (
              <div
                key={item.id || idx}
                className="bg-emerald-950/40 border border-emerald-800/70 rounded-xl p-4 text-xs space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] flex items-center justify-center font-bold">
                      {idx + 1}
                    </span>
                    {item.approvedAction}
                  </span>
                  <span className="text-[10px] text-emerald-300 font-mono">
                    Approved {item.approvedAt}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-emerald-100/80 pl-7">
                  <p>
                    <strong className="text-emerald-200">Intended Objective:</strong> {item.intendedObjective}
                  </p>
                  <p>
                    <strong className="text-emerald-200">Supporting Evidence:</strong> {item.evidenceSupporting}
                  </p>
                  <p>
                    <strong className="text-emerald-200">Suggested Owner:</strong> {item.suggestedOwner}
                  </p>
                  <p>
                    <strong className="text-emerald-200">Next Step:</strong> {item.suggestedNextStep}
                  </p>
                  <p className="md:col-span-2">
                    <strong className="text-emerald-200">Information Still Required:</strong> {item.informationRequired}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AGENT TRANSPARENCY: INVESTIGATION TRAIL */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <button
          onClick={() => setIsTrailExpanded(!isTrailExpanded)}
          className="w-full flex items-center justify-between text-left cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Agent Investigation Trail & Transparency Log
              </h3>
              <span className="text-xs text-slate-500">
                {trail.length} Recorded Steps • Full Human-in-the-Loop Audit Trail
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span>{isTrailExpanded ? 'Hide Trail' : 'View Audit Trail'}</span>
            {isTrailExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {isTrailExpanded && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-3 animate-in fade-in duration-200">
            <p className="text-xs text-slate-500 leading-relaxed">
              This log displays user-facing explanations of every decision, plan proposal, tool execution, and human approval without exposing hidden or private reasoning.
            </p>

            {trail.length === 0 ? (
              <div className="text-xs text-slate-400 italic py-3 text-center">
                No investigation steps logged yet.
              </div>
            ) : (
              <div className="relative border-l-2 border-slate-200 ml-4 pl-4 space-y-4 text-xs">
                {trail.map((evt, idx) => (
                  <div key={idx} className="relative">
                    <span className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-teal-500 border-2 border-white" />
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900">
                        {evt.title}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {evt.timestamp} • {evt.stage}
                      </span>
                    </div>
                    <p className="text-slate-600 mt-0.5">
                      {evt.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
