import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { generateHospitalDataset } from './src/data/syntheticGenerator';
import { analyzeHospitalQuery, isWhyQuestion } from './src/data/aiQueryEngine';
import {
  generateInvestigationPlan,
  executeApprovedInvestigation,
  executeAnalyticalTool,
  ANALYTICAL_TOOLS_CATALOG,
} from './src/data/operationsAgentEngine';
import { PatientVisitRecord, InvestigationPlan } from './src/types';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

// Cached hospital records for server-side queries
let cachedServerRecords: PatientVisitRecord[] | null = null;
function getServerRecords(): PatientVisitRecord[] {
  if (!cachedServerRecords) {
    cachedServerRecords = generateHospitalDataset(15000);
  }
  return cachedServerRecords;
}

// Initialize GoogleGenAI SDK
let aiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  aiClient = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'MediCore Hospital Operations Intelligence API',
    hasApiKey: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// POST /api/ai-analyst - Server-side Gemini AI operations analyst endpoint
app.post('/api/ai-analyst', async (req, res) => {
  try {
    const { question, groundedEvidence, history } = req.body;

    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Question string is required' });
    }

    // Ensure grounded evidence is always present by computing it from the shared dataset if not provided
    let effectiveEvidence = groundedEvidence;
    if (!effectiveEvidence || !effectiveEvidence.evidencePoints || effectiveEvidence.evidencePoints.length === 0) {
      effectiveEvidence = analyzeHospitalQuery(question, getServerRecords());
    }

    // Determine if question is a why/causal question
    const isWhy = Boolean(effectiveEvidence?.isWhyQuestion || isWhyQuestion(question));

    const formatResponse = (draft: any) => {
      if (isWhy && draft?.whatDataTellsUs) {
        return `### Finding\n${draft.finding}\n\n### What the data tells us\n${draft.whatDataTellsUs}\n\n### Potential factors to investigate\n${draft.potentialFactorsToInvestigate}\n\n### Limitation\n${draft.limitation}\n\n### Potential next step\n${draft.potentialNextStep}`;
      }
      return `### Finding\n${draft.finding}\n\n### Facts (Calculated Data)\n${(draft.evidence || [])
        .map((e: string) => `- ${e}`)
        .join('\n')}\n\n### Interpretation\n${draft.interpretation}\n\n### Hypotheses & Management Investigation\n${
        draft.managementInvestigation
      }`;
    };

    // If Gemini API key is missing or SDK not initialized, fall back to grounded deterministic output
    if (!aiClient || !process.env.GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY not found; using grounded deterministic response.');
      const draft = effectiveEvidence?.deterministicDraft;
      if (draft) {
        return res.json({
          response: formatResponse(draft),
          grounded: true,
          mode: 'grounded_deterministic',
        });
      }
      return res.status(500).json({ error: 'No analytical evidence provided and API key missing.' });
    }

    // Build the system prompt
    let systemInstruction = '';
    if (isWhy) {
      systemInstruction = `You are the AI Operations Analyst for MediCore Health Network, an enterprise hospital operations management platform.
Your user is a hospital operations manager.
Your role is to analyze operational hospital data and provide rigorous, evidence-based answers.

==================================================
WHY-QUESTION CRITICAL RULE
==================================================
When a user asks "Why does X have a high/low value?" or any equivalent causal/explanatory question:
You must determine whether the dataset actually contains variables that can support an explanation.
If the available data only establishes that X has a particular value, but does NOT establish what caused that value, you MUST explicitly say so.

==================================================
REQUIRED RESPONSE STRUCTURE
==================================================
For "why" questions, you MUST strictly format your answer using these five exact markdown headers:

### Finding
State the directly observed fact (the specific metric, department/test/ward, and comparison to benchmark).

### What the data tells us
State what can legitimately be concluded from the available calculated data.
Explicitly state that the data establishes that X has this value, but does not by itself establish why.

### Potential factors to investigate
List variables that are actually present in the dataset and could reasonably be examined as potential contributors.
Do not claim that these factors are responsible unless the available analysis establishes this.

### Limitation
Explicitly state what the current data cannot establish.
Explicitly state that current analysis does not establish that any particular factor caused this value.

### Potential next step
Suggest what additional analysis could be performed using variables present in the dataset.

==================================================
HYPOTHESIS RULE
==================================================
A hypothesis must be based on an actual variable or pattern available in the dataset:
- doctor availability (staff availability, on-duty status)
- patient volume (department encounter counts)
- consultation duration (consultation time in minutes)
- arrival patterns (appointment hour, arrival time, day of week, month)
- appointment type (scheduled vs walk-in)
- visit type (OPD, Emergency, Follow-up)
- patient age cohort / demographics
- insurance coverage type
- length of stay
- diagnostic test turnaround time
- discharge delay status

Do NOT introduce hypothetical factors that the dataset does not contain.
For example, the dataset does NOT contain:
- transportation information
- socioeconomic information
- patient satisfaction scores
- registration desk processing time
Do not suggest these as evidence-based explanations. They may be mentioned only as examples of additional data that would be needed.

==================================================
RECOMMENDATION RULE
==================================================
Do not jump directly from "X has a high value" to "Implement intervention Y."
Follow this progression:
Observed finding -> Potential contributing factors -> Additional analysis -> Potential intervention to consider
Recommendations must remain advisory.

==================================================
REFERENCE EXAMPLE
==================================================
Question: "Why does Neurology have long waiting times?"

### Finding
Neurology has an average waiting time of 63.6 minutes, compared with a hospital-wide average of 54.7 minutes.

### What the data tells us
The available data establishes that Neurology has relatively high waiting time. It does not by itself establish why the waiting time is higher.

### Potential factors to investigate
The dataset contains variables such as doctor availability, patient volume, consultation duration and arrival patterns. These could be analysed to determine whether any are associated with the higher waiting time.

### Limitation
The current analysis does not establish that any particular factor caused Neurology's higher waiting time.

### Potential next step
Analyse waiting time against doctor availability, patient volume, consultation duration and arrival patterns to identify whether any measurable relationships exist.

Do NOT say: "Neurology's waiting time is likely caused by registration delays, complex consultations and concentrated patient arrivals."
Do not generate explanations that are not supported by variables or analyses in the dataset.`;
    } else {
      systemInstruction = `You are the AI Operations Analyst for MediCore Health Network, an enterprise hospital operations management platform.
Your user is a hospital operations manager.
Your role is to analyze operational hospital data (patient flow, waiting times, bed occupancy, diagnostic turnaround times, appointment no-shows, and financial metrics) and provide clear, evidence-based answers.

CRITICAL RULES:
1. STRICT GROUNDING IN CALCULATED DATA:
   You are provided with VERIFIED, PRE-CALCULATED NUMERICAL METRICS computed directly from the hospital's actual 15,000-record dataset.
   You MUST use these exact metrics. You are STRICTLY FORBIDDEN from inventing, guessing, or fabricating any numbers, percentages, or statistics.
   All relevant hospital data (including department-level no-show rates, wait times, volumes, bed occupancies, and diagnostic turnaround times) IS PROVIDED in the Verified Evidence.
   You must NEVER respond that department-level or test-level data is unavailable when it is present in the provided evidence.

2. CLEARLY DISTINGUISH FACT, INTERPRETATION, AND HYPOTHESIS:
   - FACT: Cite the exact numbers, rates, and counts calculated from the dataset. State the specific department(s) and actual percentage(s) or number(s) explicitly.
   - INTERPRETATION: Explain what the observed operational pattern indicates regarding patient flow, capacity strain, or resource utilization.
   - HYPOTHESIS / INVESTIGATION: Offer possible operational explanations that require further management investigation and concrete next steps.

3. MANDATORY FORMAT: Your response MUST be structured with these four exact markdown headers:
### Finding
[State a concise, direct answer to the user's question, including the specific department, test, or ward and the exact calculated percentage or metric]

### Facts (Calculated Data)
[Bullet points listing the exact calculated metrics, rates, counts, and benchmarks from the verified evidence provided]

### Interpretation
[An operational explanation of what the calculated pattern indicates regarding clinical workflows, appointment adherence, or bottlenecks]

### Hypotheses & Management Investigation
[Possible explanations requiring on-the-ground investigation and actionable next steps for hospital operations management]

4. NON-CLINICAL SAFETY: Do NOT provide clinical diagnoses, medical advice, patient treatment recommendations, or medication prescriptions. Keep all discussions strictly focused on healthcare operations, staffing, capacity, logistics, patient flow, and resource utilization.`;
    }

    // Construct the context prompt with grounded calculated facts
    const evidenceText = effectiveEvidence?.evidencePoints?.length
      ? effectiveEvidence.evidencePoints.map((pt: string) => `- ${pt}`).join('\n')
      : '- General hospital baseline available across 15,000 records.';

    let promptText = '';
    if (isWhy) {
      promptText = `User Question: "${question}"

VERIFIED CALCULATED DATASET EVIDENCE (Computed dynamically from hospital dataset):
Topic: ${effectiveEvidence?.topic || 'Hospital Operations'}
Intent Identified: ${effectiveEvidence?.intent || 'Causal Inquiry'}
Calculated Metrics & Evidence:
${evidenceText}

Deterministic Reference:
- Finding: ${effectiveEvidence?.deterministicDraft?.finding || 'N/A'}
- What the data tells us: ${effectiveEvidence?.deterministicDraft?.whatDataTellsUs || 'N/A'}
- Potential factors to investigate: ${effectiveEvidence?.deterministicDraft?.potentialFactorsToInvestigate || 'N/A'}
- Limitation: ${effectiveEvidence?.deterministicDraft?.limitation || 'N/A'}
- Potential next step: ${effectiveEvidence?.deterministicDraft?.potentialNextStep || 'N/A'}

Respond strictly using the 5 required markdown headers for "why" questions:
### Finding
### What the data tells us
### Potential factors to investigate
### Limitation
### Potential next step

Follow the WHY-QUESTION RULE, HYPOTHESIS RULE, and RECOMMENDATION RULE. Clearly distinguish:
1. What is known from the data
2. What could be investigated (using variables actually present in the dataset)
3. What cannot currently be established
Do NOT claim that any factor caused the observed value. Use ONLY variables actually present in the dataset.`;
    } else {
      promptText = `User Question: "${question}"

VERIFIED CALCULATED DATASET EVIDENCE (Computed dynamically from hospital dataset):
Topic: ${effectiveEvidence?.topic || 'Hospital Operations'}
Intent Identified: ${effectiveEvidence?.intent || 'General Analytics'}
Calculated Metrics & Rankings:
${evidenceText}

Deterministic Analysis Reference:
- Finding: ${effectiveEvidence?.deterministicDraft?.finding || 'N/A'}
- Evidence: ${effectiveEvidence?.deterministicDraft?.evidence?.join('; ') || 'N/A'}
- Interpretation: ${effectiveEvidence?.deterministicDraft?.interpretation || 'N/A'}
- Investigation: ${effectiveEvidence?.deterministicDraft?.managementInvestigation || 'N/A'}

Provide the comprehensive analysis adhering strictly to the 4 required headers:
### Finding
### Facts (Calculated Data)
### Interpretation
### Hypotheses & Management Investigation

Do NOT state that data is unavailable, because the verified dataset calculations are provided above. Always display the specific department and actual percentage/value. Use ONLY the supplied numbers.`;
    }

    const contents: any[] = [];

    // Append prior conversational turns if provided (max 4 turns for context)
    if (Array.isArray(history) && history.length > 0) {
      const recentHistory = history.slice(-4);
      for (const turn of recentHistory) {
        if (turn.role === 'user' || turn.role === 'model') {
          contents.push({
            role: turn.role,
            parts: [{ text: turn.content }],
          });
        }
      }
    }

    contents.push({
      role: 'user',
      parts: [{ text: promptText }],
    });

    // Execute model generation with gemini-3.1-flash-lite first, then gemini-3.8-flash and gemini-flash-latest
    let answer = '';
    const modelsToTry = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];
    let lastErr: any = null;

    for (let i = 0; i < modelsToTry.length; i++) {
      const model = modelsToTry[i];
      try {
        const response = await aiClient.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
            temperature: 0.2, // Low temperature for factual precision
          },
        });
        answer = response.text || '';
        if (answer) break;
      } catch (err: any) {
        lastErr = err;
        // Non-blocking fallback across models without noisy console output
        if (i < modelsToTry.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    }

    // If Gemini model response was generated, return it
    if (answer) {
      return res.json({
        response: answer,
        grounded: true,
        mode: 'gemini_grounded',
      });
    }

    // If external models are unreachable (e.g. temporary quota or 503 high demand), smoothly serve verified grounded analysis
    const draft = effectiveEvidence?.deterministicDraft;
    if (draft) {
      return res.json({
        response: formatResponse(draft),
        grounded: true,
        mode: 'grounded_deterministic',
      });
    }

    return res.status(500).json({
      error: 'Analysis temporarily unavailable',
      details: lastErr?.message || 'High demand on AI models',
    });
  } catch (error: any) {
    // Graceful fallback to verified deterministic draft in case of any unexpected exception
    try {
      const q = req.body?.question || 'Operational query';
      const fallbackEvidence = analyzeHospitalQuery(q, getServerRecords());
      const draft = fallbackEvidence.deterministicDraft;
      const isWhy = Boolean(fallbackEvidence.isWhyQuestion || isWhyQuestion(q));
      let text = '';
      if (isWhy && draft?.whatDataTellsUs) {
        text = `### Finding\n${draft.finding}\n\n### What the data tells us\n${draft.whatDataTellsUs}\n\n### Potential factors to investigate\n${draft.potentialFactorsToInvestigate}\n\n### Limitation\n${draft.limitation}\n\n### Potential next step\n${draft.potentialNextStep}`;
      } else {
        text = `### Finding\n${draft.finding}\n\n### Facts (Calculated Data)\n${(draft.evidence || [])
          .map((e: string) => `- ${e}`)
          .join('\n')}\n\n### Interpretation\n${draft.interpretation}\n\n### Hypotheses & Management Investigation\n${
          draft.managementInvestigation
        }`;
      }
      return res.json({
        response: text,
        grounded: true,
        mode: 'grounded_deterministic',
      });
    } catch (innerErr) {
      return res.status(500).json({
        error: 'Analysis temporarily unavailable',
        details: error?.message || 'Internal error',
      });
    }
  }
});

// ==========================================
// Operations Analyst Agent Endpoints
// ==========================================

// POST /api/agent/plan - Generate an initial or revised investigation plan (READ-ONLY)
app.post('/api/agent/plan', async (req, res) => {
  try {
    const { objective, userFeedback, previousPlan } = req.body;
    if (!objective || typeof objective !== 'string') {
      return res.status(400).json({ error: 'Objective is required' });
    }

    // Always generate deterministic plan as verified baseline
    const deterministicPlan = generateInvestigationPlan(objective, userFeedback, previousPlan);

    // If Gemini is available, we can consult it to refine or validate the plan
    if (aiClient && process.env.GEMINI_API_KEY) {
      try {
        const catalogText = ANALYTICAL_TOOLS_CATALOG.map(
          (t) => `- ${t.toolName} (${t.displayName}): ${t.whatItCalculates}`
        ).join('\n');

        const prompt = `You are the INVESTIGATION PLANNER for MediCore Operations Analyst, an advisory assistant for a hospital operations manager.
CRITICAL CONSTRAINT: You are in PHASE 1 (Investigation Planning).
- You DO NOT have access to analytical tools or database execution.
- You must NOT calculate any metrics.
- You must NOT generate findings, facts, interpretations, hypotheses, or recommendations.
- Your ONLY purpose is to create an investigation plan.

User Objective: "${objective}"
${userFeedback ? `User Modification Request: "${userFeedback}"` : ''}

Available Analytical Tool Catalog (reference only):
${catalogText}

Task:
Create an investigation plan.
Select between 2 and 4 of the most relevant analytical tools for this objective.
For each selected tool, describe what it would calculate and why it is relevant.
Also state the expected output of the investigation and known limitations.

Return ONLY a JSON object matching this exact structure:
{
  "objective": "Concise restatement of objective",
  "proposedAnalyses": [
    {
      "toolName": "exactToolNameFromCatalog",
      "displayName": "Exact Display Name",
      "whatItCalculates": "what it will calculate",
      "whyRelevant": "why it is relevant to the objective"
    }
  ],
  "expectedOutput": "Explain what the investigation is intended to establish upon execution.",
  "limitations": "Specific known limitations of observational hospital records regarding this objective."
}`;

        const modelsToTry = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];
        for (const model of modelsToTry) {
          try {
            const aiRes = await aiClient.models.generateContent({
              model,
              contents: prompt,
              config: {
                temperature: 0.1,
                responseMimeType: 'application/json',
              },
            });
            const text = aiRes.text;
            if (text) {
              const parsed = JSON.parse(text);
              if (parsed.proposedAnalyses && Array.isArray(parsed.proposedAnalyses) && parsed.proposedAnalyses.length > 0) {
                // Ensure all proposed tool names exist in catalog
                const validAnalyses = parsed.proposedAnalyses
                  .filter((a: any) => ANALYTICAL_TOOLS_CATALOG.some((c) => c.toolName === a.toolName))
                  .map((a: any, idx: number) => {
                    const matched = ANALYTICAL_TOOLS_CATALOG.find((c) => c.toolName === a.toolName)!;
                    return {
                      id: `plan-${idx + 1}`,
                      toolName: matched.toolName,
                      displayName: matched.displayName,
                      whatItCalculates: a.whatItCalculates || matched.whatItCalculates,
                      whyRelevant: a.whyRelevant || matched.defaultRelevance,
                    };
                  });

                if (validAnalyses.length > 0) {
                  return res.json({
                    plan: {
                      objective: parsed.objective || objective,
                      proposedAnalyses: validAnalyses,
                      expectedOutput: parsed.expectedOutput || deterministicPlan.expectedOutput,
                      limitations: parsed.limitations || deterministicPlan.limitations,
                      createdAt: new Date().toISOString(),
                      version: previousPlan ? previousPlan.version + 1 : 1,
                    },
                    source: 'gemini_planner',
                  });
                }
              }
            }
          } catch (modelErr) {
            // try next model or fallback
          }
        }
      } catch (geminiErr) {
        // Fall through to deterministic plan
      }
    }

    return res.json({
      plan: deterministicPlan,
      source: 'deterministic_planner',
    });
  } catch (error: any) {
    console.error('Error generating investigation plan:', error);
    return res.status(500).json({ error: 'Failed to create plan', details: error?.message });
  }
});

// POST /api/agent/execute - Execute approved investigation tools and synthesize findings (READ-ONLY)
app.post('/api/agent/execute', async (req, res) => {
  try {
    const { plan } = req.body;
    if (!plan || !plan.proposedAnalyses || !Array.isArray(plan.proposedAnalyses)) {
      return res.status(400).json({ error: 'Valid approved investigation plan is required' });
    }

    const records = getServerRecords();

    // 1. Execute tools deterministically on the verified 15,000-record dataset
    const result = executeApprovedInvestigation(plan, records);

    // 2. If Gemini is available, synthesize custom narrative while strictly retaining calculated metrics
    if (aiClient && process.env.GEMINI_API_KEY) {
      try {
        const evidenceLines = result.executedTools.map((t) => `- [${t.displayName}]: ${t.resultSummary}`).join('\n');
        const prompt = `You are the MediCore Operations Analyst Agent.
You have executed the following analytical tools on the hospital's verified 15,000-record dataset for the objective: "${plan.objective}".

CALCULATED EVIDENCE:
${evidenceLines}

CRITICAL RULES:
1. READ-ONLY: Never modify records or execute operational changes.
2. NO FABRICATION: Use ONLY the exact calculated numbers from the provided evidence.
3. CLEARLY DISTINGUISH FACTS FROM HYPOTHESES.
4. RECOMMENDATIONS MUST BE PROPOSED AS "POTENTIAL ACTIONS TO CONSIDER", NOT INSTRUCTIONS.

Generate a structured JSON output matching:
{
  "observedFindings": ["Exact observed findings citing specific departments and numbers"],
  "supportingEvidence": ["The exact tool calculation results provided"],
  "interpretation": "Operational interpretation explaining capacity, flow, or scheduling dynamics",
  "hypotheses": ["Operational hypotheses and possible explanations that warrant management investigation"],
  "confidence": "High",
  "evidenceStrengthRationale": "Why the calculated evidence supports this confidence level",
  "limitations": ["What the available data cannot establish (e.g. causality, clinical severity)"],
  "recommendations": [
    {
      "id": "rec-1",
      "action": "Proposed action name",
      "evidence": "Specific evidence supporting it",
      "expectedObjective": "Intended operational outcome",
      "additionalInfoNeeded": "Information still required before implementation",
      "risksAndTradeoffs": "Potential operational risks or trade-offs",
      "suggestedOwner": "Role or department head responsible",
      "suggestedNextStep": "Immediate concrete next step for management to take",
      "status": "pending"
    }
  ]
}`;

        const modelsToTry = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];
        for (const model of modelsToTry) {
          try {
            const aiRes = await aiClient.models.generateContent({
              model,
              contents: prompt,
              config: {
                temperature: 0.1,
                responseMimeType: 'application/json',
              },
            });
            const text = aiRes.text;
            if (text) {
              const parsed = JSON.parse(text);
              if (parsed.observedFindings && parsed.recommendations) {
                return res.json({
                  executedTools: result.executedTools,
                  findings: {
                    observedFindings: parsed.observedFindings,
                    supportingEvidence: parsed.supportingEvidence || result.findings.supportingEvidence,
                    interpretation: parsed.interpretation || result.findings.interpretation,
                    hypotheses: parsed.hypotheses || result.findings.hypotheses,
                    confidence: parsed.confidence || 'High',
                    evidenceStrengthRationale: parsed.evidenceStrengthRationale || result.findings.evidenceStrengthRationale,
                    limitations: parsed.limitations || result.findings.limitations,
                  },
                  recommendations: parsed.recommendations.map((r: any, i: number) => ({
                    ...r,
                    id: r.id || `rec-${i + 1}`,
                    status: 'pending',
                  })),
                  source: 'gemini_synthesized',
                });
              }
            }
          } catch (modelErr) {
            // try next model
          }
        }
      } catch (geminiErr) {
        // Fall through to deterministic execution
      }
    }

    return res.json({
      executedTools: result.executedTools,
      findings: result.findings,
      recommendations: result.recommendations,
      source: 'deterministic_engine',
    });
  } catch (error: any) {
    console.error('Error executing approved investigation:', error);
    return res.status(500).json({ error: 'Failed to execute investigation', details: error?.message });
  }
});

// Configure Vite middleware in development vs static serving in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MediCore Server running on port ${PORT}`);
  });
}

startServer();
