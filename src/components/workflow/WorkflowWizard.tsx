import React, { useState, useEffect, useCallback, useId } from 'react';
import { useAuth } from '../../context/AuthContext';

export interface WorkflowFramework {
  id: string;
  workflowType: 'CARBON' | 'JOB';
  code: string;
  name: string;
  governingBody?: string | null;
  jurisdiction?: string | null;
  description?: string | null;
  questions: WorkflowQuestion[];
}

export interface WorkflowQuestion {
  id: string;
  frameworkId: string;
  orderIndex: number;
  text: string;
  answerType: 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'SELECT';
  options: string[];
  evidenceRequired: boolean;
  isoClauseReference: string;
  guidanceNotes?: string | null;
}

export interface WorkflowSubmission {
  id: string;
  licenseeId: string;
  workflowType: 'CARBON' | 'JOB';
  frameworkId: string;
  status:
    | 'DRAFT'
    | 'SUBMITTED'
    | 'AI_SCREENED'
    | 'UNDER_REVIEW'
    | 'APPROVED'
    | 'REJECTED'
    | 'PAID'
    | 'BADGE_ISSUED'
    | 'MINTED';
  submittedAt?: string | null;
  reviewedAt?: string | null;
  reviewerId?: string | null;
  complianceScore?: number | null;
  paidAt?: string | null;
  stripeSessionId?: string | null;
  clientMessage?: string | null;
  clientLogoUrl?: string | null;
  compositeBadgeUrl?: string | null;
  tokenId?: string | null;
  contractAddress?: string | null;
  transactionHash?: string | null;
  openSeaUrl?: string | null;
  mintedAt?: string | null;
  framework: {
    id: string;
    code: string;
    name: string;
    questions?: WorkflowQuestion[];
  };
  answers: {
    id?: string;
    questionId: string;
    value: string;
    evidenceDocumentId?: string | null;
    evidenceDocument?: {
      id: string;
      fileName: string;
      sha256Hash: string;
    } | null;
  }[];
  reviewDecision?: {
    overallDecision: 'APPROVED' | 'REJECTED';
    overallScore: number;
    perQuestionDecisions: {
      questionId: string;
      accepted: boolean;
      reasonIfRejected?: string | null;
    }[];
    reviewerNotes?: string | null;
  } | null;
}

interface WorkflowWizardProps {
  initialWorkflowType?: 'CARBON' | 'JOB';
  initialSubmissionId?: string | null;
  onBackToDashboard?: () => void;
}

export const WorkflowWizard: React.FC<WorkflowWizardProps> = ({
  initialWorkflowType = 'CARBON',
  initialSubmissionId = null,
  onBackToDashboard,
}) => {
  const { token, user } = useAuth();
  const fileInputId = useId();

  // Wizard Navigation: Screens 2 to 11
  // 2: Framework Selection
  // 3: Onboarding / Welcome
  // 4: Compliance Questionnaire
  // 5: Post-Submission / Waiting State
  // 6: Decision State (6a: REJECTED, 6b: APPROVED)
  // 7: Stripe Checkout
  // 8: Badge Setup Form
  // 9: Badge Generated & Minting
  // 10: Dashboard "My Badges"
  // 11: Telemetry API Access
  const [currentScreen, setCurrentScreen] = useState<number>(2);
  const [workflowType, setWorkflowType] = useState<'CARBON' | 'JOB'>(initialWorkflowType);
  const [frameworks, setFrameworks] = useState<WorkflowFramework[]>([]);
  const [selectedFrameworkId, setSelectedFrameworkId] = useState<string>('');
  const [submission, setSubmission] = useState<WorkflowSubmission | null>(null);

  // Questionnaire State (Screen 4)
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [answersMap, setAnswersMap] = useState<Record<string, { value: string; evidenceDocumentId?: string | null; fileName?: string }>>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isReviewSummary, setIsReviewSummary] = useState<boolean>(false);
  const [uploadingEvidence, setUploadingEvidence] = useState<boolean>(false);

  // Checkout State (Screen 7)
  const [checkoutData, setCheckoutData] = useState<{
    grossAmountCents: number;
    charitySplitCents: number;
    softwareFeeCents: number;
    checkoutUrl?: string | null;
    stripeSessionId?: string | null;
  } | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);

  // Badge Setup State (Screen 8)
  const [clientMessage, setClientMessage] = useState<string>('');
  const [clientLogoUrl, setClientLogoUrl] = useState<string>('');
  const [isGeneratingBadge, setIsGeneratingBadge] = useState<boolean>(false);

  // Minting State (Screen 9)
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [walletError, setWalletError] = useState<string | null>(null);
  const [isMinting, setIsMinting] = useState<boolean>(false);

  // Telemetry API Keys State (Screen 11)
  const [telemetryKeys, setTelemetryKeys] = useState<{
    id: string;
    workflowType: string;
    maskedKey: string;
    name?: string;
    createdAt: string;
  }[]>([]);
  const [newlyGeneratedKey, setNewlyGeneratedKey] = useState<string | null>(null);
  const [keyModalOpen, setKeyModalOpen] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [activeDocTab, setActiveDocTab] = useState<'curl' | 'schema'>('curl');

  // Loading & Global Errors
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch Frameworks
  const fetchFrameworks = useCallback(async (type: 'CARBON' | 'JOB') => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/workflow/frameworks?type=${type}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch frameworks.');
      setFrameworks(data.frameworks || []);
      if (data.frameworks?.length > 0 && !selectedFrameworkId) {
        setSelectedFrameworkId(data.frameworks[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching frameworks');
    } finally {
      setLoading(false);
    }
  }, [token, selectedFrameworkId]);

  // Load existing submission if initialSubmissionId provided
  const loadSubmission = useCallback(async (subId: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/workflow/submissions/${subId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load submission.');

      const sub: WorkflowSubmission = data.submission;
      setSubmission(sub);
      setWorkflowType(sub.workflowType);
      setSelectedFrameworkId(sub.frameworkId);

      // Prepopulate answers
      const map: Record<string, { value: string; evidenceDocumentId?: string | null; fileName?: string }> = {};
      sub.answers?.forEach((a) => {
        map[a.questionId] = {
          value: a.value,
          evidenceDocumentId: a.evidenceDocumentId,
          fileName: a.evidenceDocument?.fileName,
        };
      });
      setAnswersMap(map);

      if (sub.clientMessage) setClientMessage(sub.clientMessage);
      if (sub.clientLogoUrl) setClientLogoUrl(sub.clientLogoUrl);

      // Route to correct screen based on state machine status
      switch (sub.status) {
        case 'DRAFT':
          setCurrentScreen(4);
          break;
        case 'SUBMITTED':
        case 'AI_SCREENED':
        case 'UNDER_REVIEW':
          setCurrentScreen(5);
          break;
        case 'REJECTED':
          setCurrentScreen(6);
          break;
        case 'APPROVED':
          setCurrentScreen(6);
          break;
        case 'PAID':
          setCurrentScreen(8);
          break;
        case 'BADGE_ISSUED':
          setCurrentScreen(9);
          break;
        case 'MINTED':
          setCurrentScreen(10);
          break;
        default:
          setCurrentScreen(4);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading submission');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (initialSubmissionId) {
      loadSubmission(initialSubmissionId);
    } else {
      fetchFrameworks(workflowType);
    }
  }, [initialSubmissionId, workflowType, fetchFrameworks, loadSubmission]);

  // Autosave answer change (Screen 4)
  const handleAnswerChange = async (questionId: string, value: string, evidenceDocId?: string | null, fileName?: string) => {
    const updatedMap = {
      ...answersMap,
      [questionId]: {
        value,
        evidenceDocumentId: evidenceDocId !== undefined ? evidenceDocId : answersMap[questionId]?.evidenceDocumentId,
        fileName: fileName !== undefined ? fileName : answersMap[questionId]?.fileName,
      },
    };
    setAnswersMap(updatedMap);

    if (!submission?.id) return;

    try {
      setSaveStatus('saving');
      const res = await fetch(`/api/workflow/submissions/${submission.id}/answers`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          answers: [
            {
              questionId,
              value,
              evidenceDocumentId: updatedMap[questionId]?.evidenceDocumentId || null,
            },
          ],
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Autosave failed');
      }
      setSaveStatus('saved');
    } catch (err) {
      console.warn('[AUTOSAVE WARN]', err);
      setSaveStatus('error');
    }
  };

  // Upload Evidence File (Screen 4)
  const handleEvidenceUpload = async (questionId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingEvidence(true);
      setError(null);

      const reader = new FileReader();
      reader.onload = async () => {
        const base64String = (reader.result as string).split(',')[1];
        const res = await fetch('/api/workflow/evidence/upload', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            licenseeId: user?.licenseeId,
            fileName: file.name,
            mimeType: file.type || 'application/pdf',
            fileSizeBytes: file.size,
            fileBufferBase64: base64String,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to upload evidence file.');

        const docId = data.evidenceDocument.id;
        const currentVal = answersMap[questionId]?.value || '';
        await handleAnswerChange(questionId, currentVal, docId, file.name);
        setUploadingEvidence(false);
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      setError(err.message || 'Error uploading evidence');
      setUploadingEvidence(false);
    }
  };

  // Create Draft Submission (Screen 2 -> Screen 3)
  const handleCreateDraft = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/workflow/draft', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workflowType,
          frameworkId: selectedFrameworkId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create audit draft.');

      setSubmission(data.submission);
      // Move to Screen 3 (Onboarding / Welcome)
      setCurrentScreen(3);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize draft');
    } finally {
      setLoading(false);
    }
  };

  // Submit Questionnaire for Review (Screen 4 -> Screen 5)
  const handleSubmitQuestionnaire = async () => {
    if (!submission?.id) return;

    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/workflow/submissions/${submission.id}/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.missingQuestions && data.missingQuestions.length > 0) {
          throw new Error(
            `Missing required evidence files for: ${data.missingQuestions.map((q: any) => q.clause).join(', ')}`
          );
        }
        throw new Error(data.error || 'Submission failed');
      }

      setSubmission(data.submission);
      setCurrentScreen(5);
    } catch (err: any) {
      setError(err.message || 'Error submitting questionnaire');
    } finally {
      setLoading(false);
    }
  };

  // Proceed to Checkout (Screen 6b -> Screen 7)
  const handleProceedToCheckout = async () => {
    if (!submission?.id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/workflow/submissions/${submission.id}/checkout-session`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to initiate checkout session.');

      setCheckoutData(data);
      setCurrentScreen(7);
    } catch (err: any) {
      setError(err.message || 'Error loading checkout session');
    } finally {
      setLoading(false);
    }
  };

  // Confirm / Settle Payment (Screen 7 -> Screen 8)
  const handleConfirmPayment = async () => {
    if (!submission?.id) return;
    try {
      setIsProcessingPayment(true);
      setError(null);
      const res = await fetch(`/api/workflow/submissions/${submission.id}/pay`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stripeSessionId: checkoutData?.stripeSessionId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payment confirmation failed.');

      setSubmission(data.submission);
      setCurrentScreen(8);
    } catch (err: any) {
      setError(err.message || 'Error processing payment settlement');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Badge Setup Form Submit (Screen 8 -> Screen 9)
  const handleBadgeSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submission?.id) return;

    if (!clientMessage || clientMessage.trim().length === 0) {
      setError('Please provide an attestation message.');
      return;
    }

    if (clientMessage.length > 100) {
      setError('Attestation message cannot exceed 100 characters.');
      return;
    }

    try {
      setIsGeneratingBadge(true);
      setError(null);
      const res = await fetch(`/api/workflow/submissions/${submission.id}/badge-setup`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientMessage: clientMessage.trim(),
          clientLogoUrl: clientLogoUrl || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Badge generation failed.');

      setSubmission(data.submission);
      setCurrentScreen(9);
    } catch (err: any) {
      setError(err.message || 'Error generating badge composite');
    } finally {
      setIsGeneratingBadge(false);
    }
  };

  // Mint Badge to Polygon Wallet (Screen 9 -> Screen 10)
  const handleMintBadge = async () => {
    if (!submission?.id) return;

    const ethRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!walletAddress || !ethRegex.test(walletAddress.trim())) {
      setWalletError('Please enter a valid 42-character 0x-prefixed Polygon wallet address.');
      return;
    }
    setWalletError(null);

    try {
      setIsMinting(true);
      setError(null);
      const res = await fetch(`/api/workflow/submissions/${submission.id}/mint`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientAddress: walletAddress.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Minting failed.');

      setSubmission(data.submission);
      // Advance to Screen 10 (My Badges view)
      setCurrentScreen(10);
    } catch (err: any) {
      setError(err.message || 'Error executing on-chain mint');
    } finally {
      setIsMinting(false);
    }
  };

  // Generate Scoped Telemetry Key (Screen 11)
  const handleGenerateTelemetryKey = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/workflow/telemetry-keys', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workflowType,
          name: `${workflowType} Live Telemetry Feed Ingestion`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate telemetry key.');

      setNewlyGeneratedKey(data.key.apiKey);
      setKeyModalOpen(true);
      fetchTelemetryKeys();
    } catch (err: any) {
      setError(err.message || 'Error generating telemetry key');
    } finally {
      setLoading(false);
    }
  };

  const fetchTelemetryKeys = useCallback(async () => {
    try {
      const res = await fetch('/api/workflow/telemetry-keys', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.keys) {
        setTelemetryKeys(data.keys);
      }
    } catch {
      // Non-blocking telemetry key retrieval
    }
  }, [token]);

  useEffect(() => {
    if (currentScreen === 11) {
      fetchTelemetryKeys();
    }
  }, [currentScreen, fetchTelemetryKeys]);

  // Current Framework Questions
  const currentFramework = frameworks.find((f) => f.id === selectedFrameworkId) || submission?.framework;
  const questions: WorkflowQuestion[] = (currentFramework as any)?.questions || [];
  const currentQuestion = questions[currentQuestionIdx];

  // Validation: Screen 4 Next/Submit Gating on Required Evidence
  const isCurrentQuestionAnswered = Boolean(answersMap[currentQuestion?.id]?.value?.trim());
  const isEvidenceMissing = currentQuestion?.evidenceRequired && !answersMap[currentQuestion?.id]?.evidenceDocumentId;
  const canAdvanceQuestion = isCurrentQuestionAnswered && !isEvidenceMissing;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 text-slate-100 font-sans pb-16">
      {/* ── Screen Progress Navigation Bar ─────────────────────────────────────────── */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3 mb-3">
          <div className="flex items-center space-x-3">
            <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-full uppercase tracking-wider">
              {workflowType === 'CARBON' ? 'Carbon Audit' : 'Job Assurance'}
            </span>
            <span className="text-sm font-semibold text-slate-300">
              Screen {currentScreen} of 11:
              {currentScreen === 2 && ' Framework Selection'}
              {currentScreen === 3 && ' Onboarding & Statutory Notice'}
              {currentScreen === 4 && ' Compliance Questionnaire'}
              {currentScreen === 5 && ' Dossier Under Review'}
              {currentScreen === 6 && (submission?.status === 'REJECTED' ? ' Review Findings' : ' Audit Verification Approved')}
              {currentScreen === 7 && ' Stripe Assurance Checkout'}
              {currentScreen === 8 && ' Badge Customization'}
              {currentScreen === 9 && ' Composite Preview & Minting'}
              {currentScreen === 10 && ' My Verified Badges'}
              {currentScreen === 11 && ' Telemetry API Ingestion'}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {onBackToDashboard && (
              <button
                type="button"
                onClick={onBackToDashboard}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700/60"
              >
                Return to Dashboard
              </button>
            )}
            <button
              type="button"
              onClick={() => setCurrentScreen(11)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                currentScreen === 11
                  ? 'bg-emerald-600 border-emerald-500 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
              }`}
            >
              Telemetry API
            </button>
          </div>
        </div>

        {/* Horizontal Mini Step Progress Track */}
        <div className="grid grid-cols-10 gap-1.5 pt-1">
          {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((stepNum) => (
            <div
              key={stepNum}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                stepNum === currentScreen
                  ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]'
                  : stepNum < currentScreen
                  ? 'bg-emerald-600/70'
                  : 'bg-slate-800'
              }`}
              title={`Screen ${stepNum}`}
            />
          ))}
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-sm flex items-start space-x-3 shadow-lg animate-in fade-in">
          <svg className="w-5 h-5 text-rose-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="flex-1 font-medium">{error}</div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          SCREEN 2: Framework Selection
          Single framework per submission
      ───────────────────────────────────────────────────────────────────────────── */}
      {currentScreen === 2 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="space-y-2">
            <div className="inline-block px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-semibold rounded-full border border-emerald-500/30 uppercase tracking-wider">
              Step 1 of Assurance Pipeline
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Select Compliance Framework</h2>
            <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
              Select exactly one statutory framework for this verification submission. Badges and warranty covenants
              are evaluated specifically against criteria established by standard committees.
            </p>
          </div>

          {/* Workflow Type Toggle */}
          <div className="flex rounded-xl bg-slate-950/70 p-1 border border-slate-800 max-w-sm">
            <button
              type="button"
              onClick={() => {
                setWorkflowType('CARBON');
                fetchFrameworks('CARBON');
              }}
              className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                workflowType === 'CARBON'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Carbon Emission Audit
            </button>
            <button
              type="button"
              onClick={() => {
                setWorkflowType('JOB');
                fetchFrameworks('JOB');
              }}
              className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                workflowType === 'JOB'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Job Reporting Audit
            </button>
          </div>

          {/* Framework Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {frameworks.map((fw) => {
              const isSelected = selectedFrameworkId === fw.id;
              return (
                <div
                  key={fw.id}
                  onClick={() => setSelectedFrameworkId(fw.id)}
                  className={`cursor-pointer rounded-xl p-5 border transition-all duration-200 flex flex-col justify-between ${
                    isSelected
                      ? 'bg-emerald-950/20 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/50'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-950/60'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {fw.code}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">{fw.jurisdiction || 'International'}</span>
                    </div>
                    <h3 className="text-lg font-bold text-white leading-snug">{fw.name}</h3>
                    <p className="text-xs text-slate-400 line-clamp-3">{fw.description || 'Statutory assurance framework.'}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Governing Body: {fw.governingBody || 'ISO Technical Committee'}</span>
                    <span className={`font-semibold ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {isSelected ? '✓ Selected' : 'Select'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              type="button"
              disabled={loading || !selectedFrameworkId}
              onClick={handleCreateDraft}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-emerald-900/30 flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Initializing Draft...</span>
                </>
              ) : (
                <>
                  <span>Create Audit Draft & Proceed</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          SCREEN 3: Onboarding / Welcome
          Intro + verbatim disclaimer copy from Part D.1
      ───────────────────────────────────────────────────────────────────────────── */}
      {currentScreen === 3 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-10 space-y-8 shadow-2xl">
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <div className="inline-flex p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 mb-2">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">Audit Readiness Onboarding</h2>
            <p className="text-base text-slate-300 leading-relaxed font-normal">
              You'll answer a short set of compliance questions and attach supporting evidence for each. This helps
              us assess your readiness: it does not replace formal ISO certification.
            </p>
          </div>

          {/* Mandatory Statutory Notice per Part D.1 */}
          <div className="bg-amber-950/20 border border-amber-500/40 rounded-xl p-5 sm:p-6 space-y-2 text-amber-200">
            <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Statutory Compliance Notice (Part D.1)</span>
            </div>
            <p className="text-sm text-amber-100/90 leading-relaxed italic">
              "GHG Platform provides independent verification and compliance tracking. Verification badges issued
              through this platform reflect compliance with the selected framework criteria and do not replace formal
              ISO certification by an accredited certification body."
            </p>
          </div>

          {/* Highlights of Process */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-xl space-y-1.5">
              <div className="text-emerald-400 text-xs font-mono font-bold">01. Questionnaire</div>
              <h4 className="text-sm font-semibold text-white">Criterion-by-Criterion</h4>
              <p className="text-xs text-slate-400 leading-relaxed">Each question maps to standard clauses with guidance notes.</p>
            </div>
            <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-xl space-y-1.5">
              <div className="text-emerald-400 text-xs font-mono font-bold">02. Evidence Proof</div>
              <h4 className="text-sm font-semibold text-white">Cryptographic Locker</h4>
              <p className="text-xs text-slate-400 leading-relaxed">Upload verified proof files hashed via SHA-256 integrity checks.</p>
            </div>
            <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-xl space-y-1.5">
              <div className="text-emerald-400 text-xs font-mono font-bold">03. Auditor Review</div>
              <h4 className="text-sm font-semibold text-white">Structured Evaluation</h4>
              <p className="text-xs text-slate-400 leading-relaxed">Audited with structured per-question findings and 100% compliance scoring.</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setCurrentScreen(2)}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              ← Back to Frameworks
            </button>
            <button
              type="button"
              onClick={() => setCurrentScreen(4)}
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition-all shadow-xl shadow-emerald-900/40"
            >
              Begin Assessment
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          SCREEN 4: Compliance Questionnaire
          One question per screen with progress bar, autosave, evidence upload gating
      ───────────────────────────────────────────────────────────────────────────── */}
      {currentScreen === 4 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
          {!isReviewSummary ? (
            <>
              {/* Question Header & Step Tracker */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider">
                      Question {currentQuestionIdx + 1} of {questions.length}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                      {currentQuestion?.isoClauseReference}
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    {currentQuestion?.text}
                  </h3>
                </div>

                {/* Autosave Status Indicator */}
                <div className="flex items-center space-x-2 text-xs font-mono">
                  {saveStatus === 'saving' && (
                    <span className="text-amber-400 flex items-center space-x-1">
                      <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      <span>Autosaving...</span>
                    </span>
                  )}
                  {saveStatus === 'saved' && (
                    <span className="text-emerald-400 flex items-center space-x-1">
                      <span>✓ Autosaved</span>
                    </span>
                  )}
                  {saveStatus === 'error' && (
                    <span className="text-rose-400 font-bold">Autosave failed</span>
                  )}
                </div>
              </div>

              {/* Guidance Notes Callout */}
              {currentQuestion?.guidanceNotes && (
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-400 space-y-1">
                  <div className="font-semibold text-slate-300">Auditor Guidance & Framework Reference:</div>
                  <p className="leading-relaxed">{currentQuestion.guidanceNotes}</p>
                </div>
              )}

              {/* Answer Input Section */}
              <div className="space-y-4 py-2">
                <label className="block text-sm font-semibold text-slate-300">Your Assessed Response:</label>

                {currentQuestion?.answerType === 'TEXT' && (
                  <textarea
                    rows={4}
                    value={answersMap[currentQuestion.id]?.value || ''}
                    onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                    placeholder="Provide detailed compliance description and methodologies utilized..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl p-3.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                )}

                {currentQuestion?.answerType === 'NUMBER' && (
                  <input
                    type="number"
                    value={answersMap[currentQuestion.id]?.value || ''}
                    onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                    placeholder="Enter numerical metric..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl p-3.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                )}

                {currentQuestion?.answerType === 'BOOLEAN' && (
                  <div className="flex space-x-3">
                    {['YES', 'NO'].map((opt) => {
                      const isSel = (answersMap[currentQuestion.id]?.value || '').toUpperCase() === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleAnswerChange(currentQuestion.id, opt)}
                          className={`flex-1 py-3 px-4 rounded-xl border text-sm font-semibold transition-all ${
                            isSel
                              ? 'bg-emerald-600 border-emerald-500 text-white shadow-md'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                          }`}
                        >
                          {opt === 'YES' ? '✓ Fully Implemented (Yes)' : '✗ Not Implemented (No)'}
                        </button>
                      );
                    })}
                  </div>
                )}

                {currentQuestion?.answerType === 'SELECT' && (
                  <select
                    value={answersMap[currentQuestion.id]?.value || ''}
                    onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl p-3.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">Select verified tier / option...</option>
                    {currentQuestion.options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Evidence Upload Section (Gated if evidenceRequired) */}
              <div className={`p-4 sm:p-5 rounded-xl border space-y-3 ${
                currentQuestion?.evidenceRequired
                  ? 'bg-emerald-950/10 border-emerald-500/30'
                  : 'bg-slate-950/40 border-slate-800'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <span className="text-xs font-semibold text-slate-200">
                      Supporting Evidence Document
                    </span>
                  </div>
                  {currentQuestion?.evidenceRequired ? (
                    <span className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10px] font-bold uppercase rounded">
                      Required for Clause
                    </span>
                  ) : (
                    <span className="text-slate-500 text-[10px]">Optional Evidence</span>
                  )}
                </div>

                {/* Attached File Indicator */}
                {answersMap[currentQuestion?.id]?.evidenceDocumentId ? (
                  <div className="p-3 bg-emerald-950/30 border border-emerald-500/40 rounded-lg flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2 truncate">
                      <span className="text-emerald-400">✓</span>
                      <span className="text-emerald-200 font-medium truncate">
                        {answersMap[currentQuestion?.id]?.fileName || 'Verified Evidence File'}
                      </span>
                    </div>
                    <label
                      htmlFor={`replace-file-${currentQuestion?.id}`}
                      className="text-slate-400 hover:text-white cursor-pointer underline text-[11px]"
                    >
                      Replace
                    </label>
                    <input
                      id={`replace-file-${currentQuestion?.id}`}
                      type="file"
                      className="hidden"
                      onChange={(e) => handleEvidenceUpload(currentQuestion.id, e)}
                    />
                  </div>
                ) : (
                  <div>
                    <label
                      htmlFor={fileInputId}
                      className="cursor-pointer border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-xl p-4 text-center block transition-colors"
                    >
                      {uploadingEvidence ? (
                        <div className="flex items-center justify-center space-x-2 text-emerald-400 text-xs font-medium">
                          <div className="w-3.5 h-3.5 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
                          <span>Computing SHA-256 hash & uploading...</span>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400">
                          <span className="text-emerald-400 font-semibold">Click to upload evidence file</span> (PDF, DOCX, CSV)
                        </div>
                      )}
                    </label>
                    <input
                      id={fileInputId}
                      type="file"
                      disabled={uploadingEvidence}
                      className="hidden"
                      onChange={(e) => handleEvidenceUpload(currentQuestion.id, e)}
                    />
                  </div>
                )}

                {isEvidenceMissing && (
                  <p className="text-xs text-rose-400 font-medium">
                    ⚠ This criterion strictly requires supporting evidence. You cannot proceed without attaching a document.
                  </p>
                )}
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <button
                  type="button"
                  disabled={currentQuestionIdx === 0}
                  onClick={() => setCurrentQuestionIdx((p) => Math.max(0, p - 1))}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                >
                  ← Previous Question
                </button>

                {currentQuestionIdx < questions.length - 1 ? (
                  <button
                    type="button"
                    disabled={!canAdvanceQuestion}
                    onClick={() => setCurrentQuestionIdx((p) => Math.min(questions.length - 1, p + 1))}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold rounded-xl text-sm transition-all shadow-md shadow-emerald-900/30"
                  >
                    Next Question →
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!canAdvanceQuestion}
                    onClick={() => setIsReviewSummary(true)}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold rounded-xl text-sm transition-all shadow-md shadow-emerald-900/30"
                  >
                    Review Assessment Summary →
                  </button>
                )}
              </div>
            </>
          ) : (
            /* Final Assessment Review Summary before Submission */
            <div className="space-y-6">
              <div className="space-y-1">
                <h3 className="text-2xl font-bold text-white tracking-tight">Review Your Answers</h3>
                <p className="text-sm text-slate-400">
                  Verify all responses and attached evidence documents before submitting for Lead Auditor review.
                </p>
              </div>

              <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                {questions.map((q, idx) => {
                  const ans = answersMap[q.id];
                  return (
                    <div key={q.id} className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-emerald-400 font-semibold">
                          {idx + 1}. [{q.isoClauseReference}]
                        </span>
                        {q.evidenceRequired && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                            ans?.evidenceDocumentId ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {ans?.evidenceDocumentId ? 'Evidence Attached' : 'Missing Evidence'}
                          </span>
                        )}
                      </div>
                      <p className="font-medium text-slate-200">{q.text}</p>
                      <div className="pt-1 text-slate-300">
                        <span className="text-slate-500">Answer: </span>
                        {ans?.value || <span className="text-rose-400 italic">No answer provided</span>}
                      </div>
                      {ans?.fileName && (
                        <div className="text-[11px] text-emerald-400/90 font-mono">
                          Attached File: {ans.fileName}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsReviewSummary(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                >
                  ← Back to Questionnaire
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSubmitQuestionnaire}
                  className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition-all shadow-xl shadow-emerald-900/40 flex items-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Submitting Dossier...</span>
                    </>
                  ) : (
                    <span>Submit for Review</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          SCREEN 5: Post-Submission / Waiting State
          Status badge: "Under Review", SLA notice, read-only answers
      ───────────────────────────────────────────────────────────────────────────── */}
      {currentScreen === 5 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-10 space-y-6 shadow-2xl">
          {/* Status header changes based on exact workflow state */}
          {submission?.status === 'AI_SCREENED' ? (
            /* AI_SCREENED: AI agent finished, waiting for Lead Auditor */
            <div className="text-center space-y-4">
              <div className="inline-flex p-4 bg-blue-500/10 border border-blue-500/30 rounded-2xl text-blue-400 mb-2">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
                </svg>
              </div>
              <div className="space-y-2 max-w-xl mx-auto">
                <div className="inline-block px-3 py-1 bg-blue-500/10 text-blue-400 text-xs font-bold rounded-full border border-blue-500/30 uppercase tracking-wider">
                  AI Pre-Screen Completed
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  AI Assurance Agent Review Complete
                </h2>
                <p className="text-sm text-slate-400 leading-relaxed">
                  The AI Assurance Engine has evaluated your submission against ISO 14064-1:2018 and ISO 50001:2018 clauses.
                  A structured findings docket has been prepared for the Lead Auditor.
                </p>
              </div>

              {/* AI Findings Docket Preview */}
              {submission?.reviewDecision && (
                <div className="bg-slate-950/70 border border-blue-500/20 rounded-xl p-5 text-left space-y-4 max-w-2xl mx-auto">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div>
                      <div className="text-xs font-bold text-blue-300 uppercase tracking-wider">AI Pre-Screen Docket</div>
                      <div className="text-xs text-slate-500 mt-0.5">Per-Clause Conformity Findings</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-white">
                        {submission.complianceScore ?? submission.reviewDecision?.overallScore ?? 0}%
                      </div>
                      <div className="text-xs text-slate-400">Pre-Screen Score</div>
                    </div>
                  </div>

                  {Array.isArray(submission.reviewDecision?.perQuestionDecisions) && submission.reviewDecision.perQuestionDecisions.length > 0 ? (
                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {(submission.reviewDecision.perQuestionDecisions as any[]).map((finding: any, idx: number) => {
                        const questionObj = questions.find((q) => q.id === finding.questionId);
                        const isConformant = finding.status === 'CONFORMANT' || finding.accepted === true;
                        const status = finding.status || (finding.accepted ? 'CONFORMANT' : 'NON_CONFORMANT');
                        return (
                          <div
                            key={finding.questionId || idx}
                            className={`flex items-start space-x-3 p-3 rounded-lg border text-xs ${
                              status === 'CONFORMANT'
                                ? 'bg-emerald-950/20 border-emerald-700/30'
                                : status === 'INSUFFICIENT_EVIDENCE'
                                ? 'bg-amber-950/20 border-amber-700/30'
                                : 'bg-rose-950/20 border-rose-700/30'
                            }`}
                          >
                            <div className={`flex-shrink-0 mt-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                              status === 'CONFORMANT' ? 'bg-emerald-500 text-white' :
                              status === 'INSUFFICIENT_EVIDENCE' ? 'bg-amber-500 text-white' :
                              'bg-rose-500 text-white'
                            }`}>
                              {status === 'CONFORMANT' ? '✓' : status === 'INSUFFICIENT_EVIDENCE' ? '?' : '✗'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-mono text-slate-400 text-[10px] mb-0.5">
                                {finding.isoClause || questionObj?.isoClauseReference || `Clause ${idx + 1}`}
                              </div>
                              <div className={`font-medium truncate ${
                                status === 'CONFORMANT' ? 'text-emerald-300' :
                                status === 'INSUFFICIENT_EVIDENCE' ? 'text-amber-300' :
                                'text-rose-300'
                              }`}>
                                {finding.findings || finding.reasonIfRejected || questionObj?.text || `Finding ${idx + 1}`}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}

                  {submission.reviewDecision.reviewerNotes && (
                    <div className="pt-3 border-t border-slate-800 text-xs text-slate-500">
                      {submission.reviewDecision.reviewerNotes.split('\n')[0]}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : submission?.status === 'UNDER_REVIEW' ? (
            /* UNDER_REVIEW: Lead Auditor is actively reviewing */
            <div className="text-center space-y-4">
              <div className="inline-flex p-4 bg-violet-500/10 border border-violet-500/30 rounded-2xl text-violet-400 mb-2">
                <svg className="w-10 h-10 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <div className="space-y-2 max-w-xl mx-auto">
                <div className="inline-block px-3 py-1 bg-violet-500/10 text-violet-400 text-xs font-bold rounded-full border border-violet-500/30 uppercase tracking-wider">
                  Lead Auditor Review in Progress
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  Under Active Lead Auditor Review
                </h2>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Your dossier has been assigned to the Lead Auditor team under ISO 19011:2018 Annex A remote
                  verification guidelines. A formal decision will be communicated shortly.
                </p>
              </div>
            </div>
          ) : (
            /* SUBMITTED: Waiting for AI screening */
            <div className="text-center space-y-4">
              <div className="inline-flex p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-400 mb-2">
                <svg className="w-10 h-10 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="space-y-2 max-w-xl mx-auto">
                <div className="inline-block px-3 py-1 bg-amber-500/10 text-amber-400 text-xs font-bold rounded-full border border-amber-500/30 uppercase tracking-wider">
                  Submitted for AI Pre-Screen
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  Audit Dossier Submitted Successfully
                </h2>
                <p className="text-sm text-slate-400 leading-relaxed">
                  The AI Assurance Agent is evaluating your questionnaire answers and evidence documents against the
                  ISO framework clauses. This typically completes within 60 seconds.
                </p>
              </div>
            </div>
          )}

          {/* Common bottom: submission metadata and refresh */}
          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-400 max-w-lg mx-auto space-y-1.5 text-left">
            <div><span className="text-slate-500">Submission ID:</span> <span className="font-mono text-slate-300">{submission?.id}</span></div>
            <div><span className="text-slate-500">Framework:</span> <span className="text-slate-300">{submission?.framework?.name}</span></div>
            <div><span className="text-slate-500">Status:</span> <span className={`font-semibold ${
              submission?.status === 'AI_SCREENED' ? 'text-blue-400' :
              submission?.status === 'UNDER_REVIEW' ? 'text-violet-400' :
              'text-amber-400'
            }`}>{submission?.status?.replace('_', ' ')}</span></div>
            <div><span className="text-slate-500">Submitted:</span> <span className="text-slate-300">{submission?.submittedAt ? new Date(submission.submittedAt).toLocaleString() : 'Just now'}</span></div>
            {submission?.complianceScore !== null && submission?.complianceScore !== undefined && (
              <div><span className="text-slate-500">Pre-Screen Score:</span> <span className="text-slate-300 font-semibold">{submission.complianceScore}%</span></div>
            )}
          </div>

          <div className="pt-4 flex justify-center gap-3">
            {onBackToDashboard && (
              <button
                type="button"
                onClick={onBackToDashboard}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition-colors"
              >
                Return to Dashboard
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (submission?.id) loadSubmission(submission.id);
              }}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              Refresh Status
            </button>
          </div>
        </div>
      )}



      {/* ─────────────────────────────────────────────────────────────────────────────
          SCREEN 6a / 6b: Rejection / Approval State
      ───────────────────────────────────────────────────────────────────────────── */}
      {currentScreen === 6 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-10 space-y-6 shadow-2xl">
          {submission?.status === 'REJECTED' ? (
            /* Screen 6a: Structured Rejection */
            <div className="space-y-6">
              <div className="flex items-center space-x-3 text-rose-400 border-b border-rose-900/40 pb-4">
                <div className="p-2 bg-rose-500/10 rounded-xl border border-rose-500/30">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Audit Review Findings: Action Required</h3>
                  <p className="text-xs text-rose-300/90">
                    Lead Auditor has returned structured feedback on specific criterion answers.
                  </p>
                </div>
              </div>

              {/* Per-Question Structured Findings */}
              <div className="space-y-3">
                {submission.reviewDecision?.perQuestionDecisions?.map((dec, idx) => {
                  const questionObj = questions.find((q) => q.id === dec.questionId);
                  return (
                    <div
                      key={dec.questionId || idx}
                      className={`p-4 rounded-xl border text-xs space-y-1.5 ${
                        dec.accepted
                          ? 'bg-emerald-950/10 border-emerald-500/30 text-emerald-200'
                          : 'bg-rose-950/20 border-rose-500/50 text-rose-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold">
                          {questionObj?.isoClauseReference || `Item #${idx + 1}`}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          dec.accepted ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          {dec.accepted ? '✓ Accepted' : '✗ Action Required'}
                        </span>
                      </div>
                      <p className="font-medium text-white">{questionObj?.text}</p>
                      {!dec.accepted && dec.reasonIfRejected && (
                        <div className="p-2 bg-rose-950/50 border border-rose-800/60 rounded text-rose-300 text-xs font-mono">
                          Auditor Feedback: {dec.reasonIfRejected}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCurrentScreen(4)}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg"
                >
                  Edit and Resubmit Questionnaire →
                </button>
              </div>
            </div>
          ) : (
            /* Screen 6b: Approval State */
            <div className="space-y-6 text-center">
              <div className="inline-flex p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 mb-2">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              <div className="space-y-2 max-w-xl mx-auto">
                <div className="inline-block px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/30 uppercase tracking-wider">
                  100% Conformance Verified
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  Audit Review Approved
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Your compliance dossier has achieved full conformance with {submission?.framework?.name}.
                  Proceed to flat-fee assurance checkout to disburse ESG charity allocations and unlock your warranty badge.
                </p>
              </div>

              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-400 max-w-md mx-auto space-y-1 text-left">
                <div><span className="text-slate-500">Framework:</span> <span className="text-slate-300 font-semibold">{submission?.framework?.name}</span></div>
                <div><span className="text-slate-500">Compliance Score:</span> <span className="text-emerald-400 font-bold">100% Verified</span></div>
                <div><span className="text-slate-500">Reviewed By:</span> <span className="text-slate-300 font-mono">Lead Auditor Sign-Off</span></div>
              </div>

              <div className="pt-4 flex justify-center">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleProceedToCheckout}
                  className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition-all shadow-xl shadow-emerald-900/40"
                >
                  Proceed to Checkout →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          SCREEN 7: Stripe Checkout
          Flat-fee checkout session with transparent 15% ESG split preview
      ───────────────────────────────────────────────────────────────────────────── */}
      {currentScreen === 7 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-10 space-y-6 shadow-2xl max-w-2xl mx-auto">
          <div className="space-y-2 border-b border-slate-800 pb-4">
            <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider font-bold">
              Screen 7 • Statutory Fee Settlement
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Assurance & Warranty Checkout</h2>
            <p className="text-sm text-slate-400">
              Statutory flat software & assurance fee. Never priced per carbon credit or metric tonne.
            </p>
          </div>

          {/* Invoice Summary Box */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Statutory Audit Fee:</span>
              <span className="text-white font-mono font-bold">£1,500.00 GBP</span>
            </div>

            {/* 15% ESG Charity Split Breakdown */}
            <div className="p-3.5 bg-emerald-950/20 border border-emerald-500/30 rounded-lg space-y-2 text-xs">
              <div className="flex items-center justify-between text-emerald-400 font-bold">
                <div className="flex items-center space-x-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span>15% Direct Statutory ESG Charity Allocation</span>
                </div>
                <span className="font-mono">£225.00</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Directly disbursed to active registered UK charity partners through the automated Stripe Connect ESG Split Engine.
              </p>
            </div>

            <div className="flex justify-between items-center text-sm border-t border-slate-800 pt-3">
              <span className="text-slate-400">Platform Assurance & Software:</span>
              <span className="text-slate-300 font-mono">£1,275.00 GBP</span>
            </div>

            <div className="flex justify-between items-center text-base font-bold border-t border-slate-700/80 pt-3 text-white">
              <span>Total Amount Due:</span>
              <span className="text-emerald-400 font-mono text-lg">£1,500.00 GBP</span>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {checkoutData?.checkoutUrl && !checkoutData.checkoutUrl.includes('simulated=true') && (
              <a
                href={checkoutData.checkoutUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg flex items-center justify-center space-x-2"
              >
                <span>Pay via Stripe Hosted Checkout</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}

            <button
              type="button"
              disabled={isProcessingPayment}
              onClick={handleConfirmPayment}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition-all shadow-xl shadow-emerald-900/40 flex items-center justify-center space-x-2"
            >
              {isProcessingPayment ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Settling Payment...</span>
                </>
              ) : (
                <span>Confirm Settlement & Advance to Badge Setup →</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          SCREEN 8: Badge Setup Form
          Message (max 100 chars) + logo upload
      ───────────────────────────────────────────────────────────────────────────── */}
      {currentScreen === 8 && (
        <form onSubmit={handleBadgeSetupSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-10 space-y-6 shadow-2xl max-w-2xl mx-auto">
          <div className="space-y-2 border-b border-slate-800 pb-4">
            <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider font-bold">
              Screen 8 • Credential Setup
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Configure Your Warranty Badge</h2>
            <p className="text-sm text-slate-400">
              Provide an attestation statement and upload your corporate mark. This will be composited into your official
              verification badge and embedded into the on-chain mint metadata.
            </p>
          </div>

          <div className="space-y-4">
            {/* Attestation Message (Max 100 chars) */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="font-semibold text-slate-300">Client Attestation Message:</label>
                <span className={`font-mono ${clientMessage.length > 100 ? 'text-rose-400' : 'text-slate-400'}`}>
                  {clientMessage.length} / 100 characters
                </span>
              </div>
              <input
                type="text"
                maxLength={100}
                value={clientMessage}
                onChange={(e) => setClientMessage(e.target.value)}
                placeholder="e.g. Committed to Net Zero operations across UK manufacturing facilities."
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl p-3.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-slate-500">
                Short message (max 100 chars) embedded permanently in composite visual seal and ERC-1155 token metadata.
              </p>
            </div>

            {/* Corporate Logo Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">Corporate Logo (PNG / SVG):</label>
              <input
                type="text"
                value={clientLogoUrl}
                onChange={(e) => setClientLogoUrl(e.target.value)}
                placeholder="Enter logo image URL or base64 data URI..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl p-3.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono text-xs"
              />
              <p className="text-[11px] text-slate-500">
                High-resolution corporate logo composited side-by-side with the official GHG Trade Mark.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={isGeneratingBadge || !clientMessage.trim() || clientMessage.length > 100}
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all shadow-xl shadow-emerald-900/40 flex items-center space-x-2"
            >
              {isGeneratingBadge ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Compositing Badge...</span>
                </>
              ) : (
                <span>Generate My Badge →</span>
              )}
            </button>
          </div>
        </form>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          SCREEN 9: Badge Generated & Minting
          Composite badge preview, mint to wallet address, download PDF proof
      ───────────────────────────────────────────────────────────────────────────── */}
      {currentScreen === 9 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-10 space-y-6 shadow-2xl">
          <div className="space-y-2 border-b border-slate-800 pb-4">
            <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider font-bold">
              Screen 9 • Verification Credential Issued
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Audit Warranty Badge Issued</h2>
            <p className="text-sm text-slate-400">
              Your composite verification seal has been composited and cryptographically sealed. Mint to your Polygon wallet
              or download the executive boardroom PDF report.
            </p>
          </div>

          {/* Badge Preview Box */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 text-center space-y-4">
            {submission?.compositeBadgeUrl ? (
              <img
                src={submission.compositeBadgeUrl}
                alt="Audit Warranty Badge"
                className="max-h-72 mx-auto rounded-xl shadow-2xl border border-slate-800"
              />
            ) : (
              <div className="h-56 flex items-center justify-center text-slate-500 text-sm">
                Composite Badge Preview
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-mono text-slate-400">
              <div>Framework: <span className="text-white">{submission?.framework?.name}</span></div>
              <div>•</div>
              <div>Warranty: <span className="text-emerald-400">1-Year Active Coverage</span></div>
              <div>•</div>
              <div>Audit Date: <span className="text-white">{new Date().toLocaleDateString('en-GB')}</span></div>
            </div>
          </div>

          {/* Mint to Wallet Section */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 space-y-3">
            <h4 className="text-sm font-bold text-white">Mint ERC-1155 Token to Polygon PoS</h4>
            <div className="space-y-2">
              <label className="block text-xs text-slate-400">Recipient Polygon Wallet Address (0x...):</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={walletAddress}
                  onChange={(e) => {
                    setWalletAddress(e.target.value);
                    setWalletError(null);
                  }}
                  placeholder="0x71C...49A"
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  disabled={isMinting || !walletAddress.trim()}
                  onClick={handleMintBadge}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-semibold rounded-xl text-sm transition-all shadow-lg flex items-center justify-center space-x-2"
                >
                  {isMinting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Minting on Polygon...</span>
                    </>
                  ) : (
                    <span>Mint to Wallet</span>
                  )}
                </button>
              </div>
              {walletError && (
                <p className="text-xs text-rose-400 font-medium">{walletError}</p>
              )}
            </div>
          </div>

          {/* Actions: PDF Download & Dashboard */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800">
            <a
              href={`/api/workflow/submissions/${submission?.id}/pdf`}
              download
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-sm font-semibold transition-colors flex items-center space-x-2 border border-slate-700"
            >
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Download PDF Proof of Audit</span>
            </a>

            <button
              type="button"
              onClick={() => setCurrentScreen(10)}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg"
            >
              View in My Badges →
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          SCREEN 10: Dashboard "My Badges" View
          Badge image, framework, audit date, mint status, on-chain link, PDF download
      ───────────────────────────────────────────────────────────────────────────── */}
      {currentScreen === 10 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-10 space-y-6 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="space-y-1">
              <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider font-bold">
                Screen 10 • Verified Credentials Vault
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">My Verified Audit Badges</h2>
            </div>

            <button
              type="button"
              onClick={() => setCurrentScreen(11)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors"
            >
              Configure Telemetry Ingestion API →
            </button>
          </div>

          {/* Active Badge Card */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-5 text-center">
              {submission?.compositeBadgeUrl ? (
                <img
                  src={submission.compositeBadgeUrl}
                  alt="Verified Badge"
                  className="rounded-xl shadow-xl max-h-56 mx-auto border border-slate-800"
                />
              ) : (
                <div className="w-full h-48 bg-slate-900 rounded-xl flex items-center justify-center text-slate-500 text-xs">
                  Active Warranty Seal
                </div>
              )}
            </div>

            <div className="md:col-span-7 space-y-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-full uppercase tracking-wider font-mono">
                    {submission?.status === 'MINTED' ? 'Minted (ERC-1155)' : 'Badge Issued'}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    Audit Date: {new Date().toLocaleDateString('en-GB')}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white">{submission?.framework?.name}</h3>
                <p className="text-xs text-slate-400 font-mono">
                  1-Year Statutory Warranty • ISO 19011:2026 Audit Lineage
                </p>
              </div>

              {/* On-chain commitment details */}
              {submission?.tokenId && (
                <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl text-xs space-y-1 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Polygon Token ID:</span>
                    <span className="text-purple-400 font-bold">#{submission.tokenId}</span>
                  </div>
                  {submission.openSeaUrl && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">OpenSea Registry:</span>
                      <a
                        href={submission.openSeaUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-400 hover:underline"
                      >
                        View On-Chain Item ↗
                      </a>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-3 pt-2">
                <a
                  href={`/api/workflow/submissions/${submission?.id}/pdf`}
                  download
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center space-x-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Download PDF Certificate</span>
                </a>
                {onBackToDashboard && (
                  <button
                    type="button"
                    onClick={onBackToDashboard}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
                  >
                    Return to Profile Shell
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          SCREEN 11: Telemetry API Access
          Scoped key generation, one-time reveal modal, masked list, static API docs
      ───────────────────────────────────────────────────────────────────────────── */}
      {currentScreen === 11 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-10 space-y-6 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="space-y-1">
              <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider font-bold">
                Screen 11 • Telemetry API Integration
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Telemetry Ingestion API Keys</h2>
              <p className="text-sm text-slate-400">
                Generate cryptographically secure API keys scoped to Carbon or Job telemetry feeds.
              </p>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={handleGenerateTelemetryKey}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-lg flex items-center space-x-1.5"
            >
              <span>+ Generate Scoped Key</span>
            </button>
          </div>

          {/* Active Keys List */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono uppercase text-slate-400 font-bold">Active Licensee Keys:</h4>
            {telemetryKeys.length === 0 ? (
              <div className="p-6 bg-slate-950/40 border border-slate-800 rounded-xl text-center text-slate-500 text-xs">
                No telemetry API keys generated yet. Click "Generate Scoped Key" to authorize IoT or ERP ingestion.
              </div>
            ) : (
              <div className="space-y-2">
                {telemetryKeys.map((k) => (
                  <div key={k.id} className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-emerald-400 font-bold">{k.maskedKey}</span>
                        <span className="px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded text-[10px] uppercase font-mono">
                          {k.workflowType}
                        </span>
                      </div>
                      <p className="text-slate-400">{k.name || 'Statutory Telemetry Key'}</p>
                    </div>
                    <div className="text-right text-[11px] text-slate-500 font-mono">
                      Created: {new Date(k.createdAt).toLocaleDateString('en-GB')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Static API Docs Panel */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                <span>Telemetry Ingestion Specification (v1)</span>
              </h4>

              <div className="flex space-x-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveDocTab('curl')}
                  className={`px-3 py-1 rounded font-mono ${activeDocTab === 'curl' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
                >
                  cURL
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDocTab('schema')}
                  className={`px-3 py-1 rounded font-mono ${activeDocTab === 'schema' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
                >
                  JSON Schema
                </button>
              </div>
            </div>

            {activeDocTab === 'curl' ? (
              <pre className="p-4 bg-slate-900 rounded-xl text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed border border-slate-800/80">
{`curl -X POST https://ghgapp.railway.app/api/telemetry/ingest \\
  -H "Authorization: Bearer <YOUR_API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "metric": "CO2_EQUIVALENT_KG",
    "value": 142.50,
    "timestamp": "${new Date().toISOString()}",
    "facilityId": "FAC-LON-01",
    "sensorCalibrationSeal": "SHA256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069"
  }'`}
              </pre>
            ) : (
              <pre className="p-4 bg-slate-900 rounded-xl text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed border border-slate-800/80">
{`{
  "type": "object",
  "required": ["metric", "value", "timestamp", "facilityId"],
  "properties": {
    "metric": { "type": "string", "enum": ["CO2_EQUIVALENT_KG", "ENERGY_KWH", "JOB_HOURS_VERIFIED"] },
    "value": { "type": "number", "minimum": 0 },
    "timestamp": { "type": "string", "format": "date-time" },
    "facilityId": { "type": "string" },
    "sensorCalibrationSeal": { "type": "string" }
  }
}`}
              </pre>
            )}

            <p className="text-[11px] text-slate-400">
              Note: Telemetry payloads exceeding a 15% drift from established baselines automatically trigger ISO Clause 10.2
              non-conformance incident logging and temporary export lock pending supervisor resolution.
            </p>
          </div>
        </div>
      )}

      {/* ── Screen 11: One-Time Key Reveal Modal ────────────────────────────────────── */}
      {keyModalOpen && newlyGeneratedKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="space-y-1">
              <span className="text-xs font-mono text-amber-400 font-bold uppercase tracking-wider">
                ⚠ Security Notice: One-Time Key Reveal
              </span>
              <h3 className="text-xl font-bold text-white">Save Your API Key Now</h3>
              <p className="text-xs text-slate-400">
                This secret API key will NOT be displayed again in full. If you lose this key, you must generate a new one.
              </p>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <div className="font-mono text-xs text-emerald-400 break-all select-all p-2 bg-slate-900 rounded border border-slate-800">
                {newlyGeneratedKey}
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(newlyGeneratedKey);
                  setCopiedKey(true);
                  setTimeout(() => setCopiedKey(false), 2000);
                }}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center space-x-2"
              >
                <span>{copiedKey ? '✓ Copied to Clipboard!' : 'Copy API Key'}</span>
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setKeyModalOpen(false);
                  setNewlyGeneratedKey(null);
                }}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors"
              >
                I Have Saved My Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
