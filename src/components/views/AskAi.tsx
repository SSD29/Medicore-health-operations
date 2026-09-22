import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Bot,
  BrainCircuit,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Copy,
  Database,
  HelpCircle,
  Lightbulb,
  Loader2,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  Trash2,
  TrendingUp,
  User,
} from 'lucide-react';
import { useHospitalData } from '../../context/HospitalDataContext';
import { analyzeHospitalQuery, GroundedEvidence } from '../../data/aiQueryEngine';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  evidence?: GroundedEvidence;
  mode?: string;
}

const SESSION_STORAGE_KEY = 'medicore_ask_ai_chat_session_history';

const EXAMPLE_QUESTIONS = [
  'Why does Neurology have long waiting times?',
  'Which department has the highest no-show rate?',
  'Why does General Practice have a high no-show rate?',
  'Which department has the highest average waiting time?',
  'Which departments have the highest patient volume?',
  'What is the no-show rate for Cardiology?',
  'Compare Cardiology and General Medicine on waiting time and no-show rate.',
  'Which diagnostic test has the longest turnaround time?',
  'Which wards have the highest bed occupancy?',
  'What operational patterns should management investigate?',
];

const getWelcomeMessage = (recordsCount: number): ChatMessage => ({
  id: 'welcome',
  role: 'assistant',
  content: `### Finding
Welcome to the MediCore AI Operations Analyst. I assist hospital operations leadership in diagnosing workflow bottlenecks, capacity thresholds, patient flow congestion, and financial performance.

### Facts (Calculated Data)
- Active analysis dataset: **${recordsCount.toLocaleString()} verified encounter records** (March 1 – August 31, 2026).
- 8 clinical departments, 3 inpatient wards, 6 diagnostic test categories, and physician scheduling rosters.
- All numerical answers are dynamically calculated from the underlying dataset before response generation.

### Interpretation
You can ask complex operational questions regarding department no-shows, waiting times, bed occupancy strain, diagnostic turnaround delays, and monthly throughput.

### Hypotheses & Management Investigation
Select one of the suggested sample questions below or enter a custom operational query to begin your inquiry.`,
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
});

export const AskAi: React.FC = () => {
  const { filteredRecords, allRecords } = useHospitalData();
  const activeDataset = filteredRecords.length > 0 ? filteredRecords : allRecords;

  // Initialize from sessionStorage to maintain conversation history across current browser session
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to restore chat session:', e);
    }
    return [getWelcomeMessage(15000)];
  });

  const [inputQuestion, setInputQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedEvidenceId, setExpandedEvidenceId] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Persist messages to sessionStorage whenever updated
  useEffect(() => {
    if (messages.length > 0) {
      try {
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(messages));
      } catch (e) {
        console.warn('Failed to save chat to sessionStorage:', e);
      }
    }
  }, [messages]);

  const handleSend = async (queryText?: string) => {
    const question = (queryText || inputQuestion).trim();
    if (!question || isLoading) return;

    setErrorMsg(null);
    setInputQuestion('');

    const userMessageId = `user-${Date.now()}`;
    const assistantMessageId = `asst-${Date.now()}`;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Step 1: Pre-calculate grounded metrics using the shared dataset analysis layer
    const groundedEvidence = analyzeHospitalQuery(question, activeDataset);

    // Append user message immediately to the session conversation history
    setMessages((prev) => [
      ...prev,
      {
        id: userMessageId,
        role: 'user',
        content: question,
        timestamp,
      },
    ]);

    setIsLoading(true);

    try {
      // Build conversational history for context
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        content: m.content,
      }));

      // Call server-side /api/ai-analyst endpoint
      const response = await fetch('/api/ai-analyst', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          groundedEvidence,
          history: historyPayload,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();
      const responseText = data.response || '';

      // Append AI response to maintain continuous conversation history
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          role: 'assistant',
          content: responseText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          evidence: groundedEvidence,
          mode: data.mode,
        },
      ]);
    } catch (err: any) {
      console.warn('API call encountered an issue; rendering grounded evidence fallback:', err);
      // Seamless fallback using the exact pre-calculated grounded deterministic analysis
      const draft = groundedEvidence.deterministicDraft;
      const fallbackText = `### Finding\n${draft.finding}\n\n### Facts (Calculated Data)\n${draft.evidence
        .map((e) => `- ${e}`)
        .join('\n')}\n\n### Interpretation\n${draft.interpretation}\n\n### Hypotheses & Management Investigation\n${
        draft.managementInvestigation
      }`;

      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          role: 'assistant',
          content: fallbackText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          evidence: groundedEvidence,
          mode: 'grounded_deterministic',
        },
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearChat = () => {
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (e) {}
    setMessages([getWelcomeMessage(activeDataset.length)]);
    setErrorMsg(null);
  };

  // Helper to parse structured response sections (Finding, Facts, Interpretation, Hypotheses & Investigation)
  const renderStructuredSections = (content: string) => {
    const sections: { title: string; body: string }[] = [];
    const rawParts = content.split(/###\s+/);

    rawParts.forEach((part) => {
      const trimmed = part.trim();
      if (!trimmed) return;
      const lines = trimmed.split('\n');
      const title = lines[0].trim();
      const body = lines.slice(1).join('\n').trim();
      sections.push({ title, body });
    });

    if (sections.length === 0) {
      return <div className="text-xs text-slate-800 whitespace-pre-line leading-relaxed">{content}</div>;
    }

    return (
      <div className="space-y-3.5">
        {sections.map((sec, idx) => {
          const lower = sec.title.toLowerCase();
          const isFinding = lower.includes('finding');
          const isWhatDataTellsUs = lower.includes('what the data tells us') || lower.includes('data tells us');
          const isPotentialFactors = lower.includes('potential factors') || lower.includes('factors to investigate');
          const isLimitation = lower.includes('limitation');
          const isPotentialNextStep = lower.includes('potential next step') || lower.includes('next step');
          const isEvidence = lower.includes('evidence') || lower.includes('fact');
          const isInterpretation = lower.includes('interpretation');
          const isInvestigation = lower.includes('investigation') || lower.includes('management') || lower.includes('hypothes');

          let icon = <CheckCircle2 className="w-4 h-4 text-teal-600" />;
          let badgeBg = 'bg-teal-50 text-teal-800 border-teal-200';
          let borderStyle = 'border-slate-200/80 bg-white';

          if (isFinding) {
            icon = <CheckCircle2 className="w-4 h-4 text-teal-600" />;
            badgeBg = 'bg-teal-50 text-teal-800 border-teal-200';
            borderStyle = 'border-teal-200/80 bg-teal-50/20';
          } else if (isWhatDataTellsUs) {
            icon = <Database className="w-4 h-4 text-blue-600" />;
            badgeBg = 'bg-blue-50 text-blue-800 border-blue-200';
            borderStyle = 'border-blue-200/80 bg-blue-50/20';
          } else if (isPotentialFactors) {
            icon = <Search className="w-4 h-4 text-indigo-600" />;
            badgeBg = 'bg-indigo-50 text-indigo-800 border-indigo-200';
            borderStyle = 'border-indigo-200/80 bg-indigo-50/20';
          } else if (isLimitation) {
            icon = <AlertCircle className="w-4 h-4 text-amber-600" />;
            badgeBg = 'bg-amber-50 text-amber-800 border-amber-200';
            borderStyle = 'border-amber-200/80 bg-amber-50/20';
          } else if (isPotentialNextStep) {
            icon = <ArrowRight className="w-4 h-4 text-emerald-600" />;
            badgeBg = 'bg-emerald-50 text-emerald-800 border-emerald-200';
            borderStyle = 'border-emerald-200/80 bg-emerald-50/20';
          } else if (isEvidence) {
            icon = <Database className="w-4 h-4 text-blue-600" />;
            badgeBg = 'bg-blue-50 text-blue-800 border-blue-200';
            borderStyle = 'border-blue-100 bg-blue-50/20';
          } else if (isInterpretation) {
            icon = <Lightbulb className="w-4 h-4 text-amber-600" />;
            badgeBg = 'bg-amber-50 text-amber-800 border-amber-200';
            borderStyle = 'border-amber-100 bg-amber-50/20';
          } else if (isInvestigation) {
            icon = <ClipboardCheck className="w-4 h-4 text-emerald-600" />;
            badgeBg = 'bg-emerald-50 text-emerald-800 border-emerald-200';
            borderStyle = 'border-emerald-200/80 bg-emerald-50/30';
          }

          return (
            <div key={idx} className={`rounded-xl border p-3.5 ${borderStyle}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider border ${badgeBg}`}>
                  {icon}
                  <span>{sec.title}</span>
                </span>
              </div>
              <div className="text-xs text-slate-800 whitespace-pre-line leading-relaxed pl-1">
                {sec.body}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Header Banner with Grounding Indicators */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Grounded Operations Analyst</span>
            </span>
            <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-mono">
              gemini-3.8-flash
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Ask AI — Operational Intelligence Assistant
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Evidence-based Q&A grounded directly in MediCore's verified 15,000 synthetic patient encounter dataset.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={clearChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
            title="Clear conversation history"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Conversation</span>
          </button>
        </div>
      </div>

      {/* Non-Clinical Guardrail Notice */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-amber-800">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Healthcare Operations Boundary:</strong> Designed exclusively for hospital capacity, patient flow, and throughput management. Does not provide clinical diagnoses, medical advice, or treatment plans.
          </span>
        </div>
      </div>

      {/* Main Chat Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col h-[650px] overflow-hidden">
        {/* Messages List Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50/40">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            const isExpanded = expandedEvidenceId === msg.id;

            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-4xl ${isUser ? 'ml-auto justify-end' : 'mr-auto justify-start'}`}
              >
                {/* Assistant Avatar */}
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={`rounded-2xl p-4 sm:p-5 shadow-xs transition-all ${
                    isUser
                      ? 'bg-slate-900 text-white max-w-lg'
                      : 'bg-white border border-slate-200/80 text-slate-900 w-full sm:max-w-2xl'
                  }`}
                >
                  {/* Top Bar for Assistant Message */}
                  {!isUser && (
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 text-[11px] text-slate-500">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-700">MediCore AI Operations Analyst</span>
                        <span>•</span>
                        <span>{msg.timestamp}</span>
                        {msg.mode && (
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200 font-mono text-[10px]">
                            {msg.mode === 'gemini_grounded' ? 'Gemini 3.8 Flash' : 'Grounded Data Engine'}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="flex items-center gap-1 hover:text-slate-800 transition-colors cursor-pointer"
                        title="Copy to clipboard"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-600 font-semibold">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Message Content */}
                  {isUser ? (
                    <div className="text-xs font-medium leading-relaxed">{msg.content}</div>
                  ) : (
                    renderStructuredSections(msg.content)
                  )}

                  {/* Grounded Evidence Accordion (Transparency Layer) */}
                  {!isUser && msg.evidence && (
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => setExpandedEvidenceId(isExpanded ? null : msg.id)}
                        className="flex items-center justify-between w-full text-[11px] font-semibold text-slate-500 hover:text-teal-700 transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5">
                          <BrainCircuit className="w-3.5 h-3.5 text-teal-600" />
                          <span>Inspect Analytical Dataset Grounding ({msg.evidence.evidencePoints.length} verified metrics)</span>
                        </span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {isExpanded && (
                        <div className="mt-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] space-y-1.5">
                          <div className="font-bold text-slate-700">Calculated Facts in Grounded Payload:</div>
                          <ul className="space-y-1 list-disc pl-4 text-slate-600">
                            {msg.evidence.evidencePoints.map((pt, i) => (
                              <li key={i}>{pt}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* User Avatar */}
                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 shadow-xs mt-1">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex gap-3 mr-auto justify-start max-w-xl">
              <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center gap-3 text-xs text-slate-600">
                <Loader2 className="w-4 h-4 text-teal-600 animate-spin" />
                <span>Computing verified metrics across 15,000 encounter records and formulating structured analysis...</span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Quick Example Questions Carousel */}
        <div className="px-4 py-2.5 bg-slate-100/90 border-t border-slate-200 overflow-x-auto flex items-center gap-2 scrollbar-none">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Lightbulb className="w-3 h-3 text-amber-500" />
            <span>Sample Queries:</span>
          </span>
          {EXAMPLE_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              disabled={isLoading}
              className="text-xs whitespace-nowrap bg-white hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300 text-slate-700 px-3 py-1 rounded-full border border-slate-300/80 transition-colors shadow-2xs font-medium disabled:opacity-50 cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Question Input Box */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={inputQuestion}
                onChange={(e) => setInputQuestion(e.target.value)}
                placeholder="Ask an operational question (e.g. Which department has the highest no-show rate?)..."
                disabled={isLoading}
                className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:opacity-60 transition-all pr-10"
              />
            </div>

            <button
              type="submit"
              disabled={!inputQuestion.trim() || isLoading}
              className="flex items-center justify-center gap-1.5 px-4 sm:px-5 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs sm:text-sm font-semibold transition-colors shadow-xs shrink-0 cursor-pointer disabled:cursor-not-allowed"
            >
              <span>Ask AI</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-1">
            <span>Evidence dynamically grounded in MediCore's active 15,000 synthetic patient dataset</span>
            <span>Distinguishes facts vs interpretation vs investigation</span>
          </div>
        </div>
      </div>
    </div>
  );
};

