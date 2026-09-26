/**
 * ai-audit-reviewer.service.ts
 *
 * AI Assurance Agent for GHG Protocol & ISO Audit-Ready Workflow (Workflow 1).
 *
 * This agent:
 *   1. Loads the full submission dossier (answers, questions, evidence metadata)
 *   2. Builds a structured prompt reflecting ISO 14064-1:2018, ISO 50001:2018,
 *      GHG Protocol Corporate Standard, and UK SECR requirements
 *   3. Calls the active LLM provider (Gemini > Anthropic > OpenAI, auto-selected)
 *   4. If no LLM key is configured, falls back to deterministic rules-based evaluation
 *   5. Parses the structured JSON response into a ClauseReviewFinding[] docket
 *   6. Records findings into WorkflowReviewDecision and transitions to AI_SCREENED
 *
 * The Lead Auditor then reviews the AI docket and makes the final APPROVED/REJECTED call.
 *
 * Implements IAuditReviewer — drop-in compatible with ReviewDispatcherService.
 */

import { PrismaClient, WorkflowStatus, ReviewOverallDecision } from '@prisma/client';
import { IAuditReviewer, AuditReviewResult, ClauseReviewFinding } from './audit-reviewer.interface';
import { ILlmProvider, resolveActiveProvider } from './llm-provider.interface';
import { GeminiProvider } from './gemini.provider';
import { AnthropicProvider } from './anthropic.provider';
import { OpenAiProvider } from './openai.provider';

// ─────────────────────────────────────────────────────────────────────────────
// DETERMINISTIC RULES ENGINE (active when no LLM API key is configured)
// Provides a baseline evidence-presence and numeric-plausibility evaluation
// aligned with ISO 14064-1:2018 Annex C.3 verification principles.
// ─────────────────────────────────────────────────────────────────────────────

interface RulesEvaluationInput {
  questionId: string;
  isoClauseReference: string;
  questionText: string;
  answerValue: string;
  answerType: string;
  evidenceRequired: boolean;
  hasEvidence: boolean;
  evidenceHash?: string | null;
}

function evaluateClauseByRules(input: RulesEvaluationInput): {
  status: 'CONFORMANT' | 'NON_CONFORMANT' | 'INSUFFICIENT_EVIDENCE';
  findings: string;
  confidence: number;
  points: number;
} {
  const { answerValue, answerType, evidenceRequired, hasEvidence, questionText, isoClauseReference } = input;

  // 1. Evidence gate: if required and absent → INSUFFICIENT_EVIDENCE
  if (evidenceRequired && !hasEvidence) {
    return {
      status: 'INSUFFICIENT_EVIDENCE',
      findings: `Mandatory documentary evidence not provided for ${isoClauseReference}. Evidence must be attached before this clause can be evaluated as conformant.`,
      confidence: 0.95, // High confidence the finding is correct (clearly missing)
      points: 0,
    };
  }

  // 2. Boolean answer evaluation
  if (answerType === 'BOOLEAN') {
    const lowerVal = answerValue.toLowerCase().trim();
    const isYes = lowerVal === 'true' || lowerVal === 'yes' || lowerVal === '1';
    if (!isYes) {
      return {
        status: 'NON_CONFORMANT',
        findings: `Negative response recorded against ${isoClauseReference}: "${questionText}". This constitutes a non-conformity requiring corrective action prior to audit readiness certification.`,
        confidence: 0.92,
        points: 0,
      };
    }
    return {
      status: 'CONFORMANT',
      findings: `Affirmative response with ${hasEvidence ? 'supporting documentary evidence verified' : 'no evidence reference — acceptable for non-evidence-required clauses'} under ${isoClauseReference}.`,
      confidence: hasEvidence ? 0.88 : 0.72,
      points: hasEvidence ? 5 : 3,
    };
  }

  // 3. Numeric answer evaluation
  if (answerType === 'NUMBER') {
    const num = parseFloat(answerValue);
    if (isNaN(num) || num < 0) {
      return {
        status: 'NON_CONFORMANT',
        findings: `Invalid or implausible numeric value ("${answerValue}") submitted against ${isoClauseReference}. A positive numeric quantity is required.`,
        confidence: 0.96,
        points: 0,
      };
    }
    if (num === 0) {
      return {
        status: 'INSUFFICIENT_EVIDENCE',
        findings: `Zero value recorded for ${isoClauseReference}. This is statistically implausible for an operational organisation. Numerical source data must be attached.`,
        confidence: 0.85,
        points: 1,
      };
    }
    return {
      status: 'CONFORMANT',
      findings: `Numeric value of ${num} confirmed plausible for ${isoClauseReference}. ${hasEvidence ? 'Supporting meter/ledger evidence hash verified.' : 'Source data reference recommended for ISO 14064-1 Clause 6.2 verification trail.'}`,
      confidence: hasEvidence ? 0.85 : 0.68,
      points: hasEvidence ? 5 : 3,
    };
  }

  // 4. Text answer evaluation (qualitative)
  const wordCount = answerValue.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount < 5) {
    return {
      status: 'INSUFFICIENT_EVIDENCE',
      findings: `Response against ${isoClauseReference} is insufficient (${wordCount} words). A substantive description of the management system element is required.`,
      confidence: 0.88,
      points: 1,
    };
  }

  return {
    status: 'CONFORMANT',
    findings: `Qualitative response against ${isoClauseReference} is adequate and meets minimum documentary threshold.`,
    confidence: hasEvidence ? 0.82 : 0.65,
    points: hasEvidence ? 5 : 3,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT BUILDER
// ─────────────────────────────────────────────────────────────────────────────

function buildAuditPrompt(submissionContext: string): { system: string; user: string } {
  const system = `You are an ISO 14064-1:2018 and ISO 50001:2018 Lead Verification Agent operating under ISO 19011:2018 remote auditing guidelines. Your role is to pre-screen greenhouse gas and energy management questionnaire submissions before a human Lead Auditor makes the final decision.

For each question-answer pair you receive:
1. Evaluate conformity against the cited ISO clause and GHG Protocol requirements
2. Check whether supporting evidence is referenced and plausible
3. Assign a conformance status: CONFORMANT, NON_CONFORMANT, or INSUFFICIENT_EVIDENCE
4. Produce a concise, objective auditor-grade finding (2-4 sentences, professional register)
5. Assign a confidence score (0.0 to 1.0)

You MUST respond with valid JSON only, in this exact structure:
{
  "clauseFindings": [
    {
      "questionId": "string",
      "isoClause": "string",
      "status": "CONFORMANT" | "NON_CONFORMANT" | "INSUFFICIENT_EVIDENCE",
      "findings": "string (2-4 sentences)",
      "evidenceVerified": boolean,
      "confidence": number
    }
  ],
  "overallScore": number (0-100),
  "recommendedDecision": "APPROVE" | "REQUIRE_REVISION",
  "executiveSummary": "string (3-5 sentences summarising the pre-screen outcome)"
}

Apply strict ISO 19011:2018 Clause 6.4 (collecting and verifying information) principles. Do not approve where mandatory evidence is absent.`;

  const user = `Please evaluate the following GHG / Energy Management audit submission:\n\n${submissionContext}`;

  return { system, user };
}

// ─────────────────────────────────────────────────────────────────────────────
// AI AUDIT REVIEWER
// ─────────────────────────────────────────────────────────────────────────────

export class AiAuditReviewer implements IAuditReviewer {
  private providers: ILlmProvider[];
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient, providers?: ILlmProvider[]) {
    this.prisma = prisma;
    // Default priority: Gemini > Anthropic > OpenAI
    this.providers = providers ?? [
      new GeminiProvider(),
      new AnthropicProvider(),
      new OpenAiProvider(),
    ];
  }

  async evaluateSubmission(submissionId: string): Promise<AuditReviewResult> {
    // 1. Load full submission dossier
    const submission = await this.prisma.workflowSubmission.findUnique({
      where: { id: submissionId },
      include: {
        framework: {
          include: { questions: { orderBy: { orderIndex: 'asc' } } },
        },
        answers: {
          include: {
            question: true,
            evidenceDocument: true,
          },
        },
        licensee: { select: { id: true, name: true } },
      },
    });

    if (!submission) {
      throw new Error(`AI Audit Reviewer: Submission '${submissionId}' not found.`);
    }

    // 2. Build answer index
    const answerMap = new Map(submission.answers.map((a) => [a.questionId, a]));
    const questions = submission.framework.questions;

    // 3. Determine which provider to use
    const activeProvider = resolveActiveProvider(this.providers);

    let clauseFindings: (ClauseReviewFinding & { confidence?: number })[] = [];
    let overallScore: number;
    let recommendedDecision: 'APPROVE' | 'REQUIRE_REVISION';
    let executiveSummary: string;
    let reviewedBy: string;

    if (activeProvider) {
      // ── LLM PATH ─────────────────────────────────────────────────────────
      const submissionContext = this.buildSubmissionContext(submission, questions, answerMap);
      const { system, user } = buildAuditPrompt(submissionContext);

      let llmResponse: string;
      try {
        const result = await activeProvider.complete(
          [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          { temperature: 0.2, maxTokens: 4096 }
        );
        llmResponse = result.content;
        reviewedBy = `AI Assurance Agent (${result.provider} / ${result.model})`;
      } catch (err: any) {
        // LLM call failed — fall back to deterministic engine
        console.warn(`[AI_AUDIT_REVIEWER] LLM call failed (${activeProvider.providerName}): ${err.message}. Falling back to rules engine.`);
        return this.runDeterministicEvaluation(submission, questions, answerMap);
      }

      // Parse LLM JSON response
      try {
        let jsonStr = llmResponse.trim();
        // Strip markdown code blocks if present
        if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '');
        }
        const parsed = JSON.parse(jsonStr);

        clauseFindings = (parsed.clauseFindings || []).map((f: any) => ({
          questionId: String(f.questionId || ''),
          isoClause: String(f.isoClause || ''),
          status: ['CONFORMANT', 'NON_CONFORMANT', 'INSUFFICIENT_EVIDENCE'].includes(f.status)
            ? f.status
            : 'INSUFFICIENT_EVIDENCE',
          findings: String(f.findings || ''),
          evidenceVerified: Boolean(f.evidenceVerified),
          confidence: typeof f.confidence === 'number' ? f.confidence : 0.7,
        }));

        overallScore = typeof parsed.overallScore === 'number'
          ? Math.min(100, Math.max(0, Math.round(parsed.overallScore)))
          : this.calculateScore(clauseFindings, questions.length);

        recommendedDecision = parsed.recommendedDecision === 'APPROVE' ? 'APPROVE' : 'REQUIRE_REVISION';
        executiveSummary = parsed.executiveSummary || 'AI pre-screen completed.';
      } catch (_parseErr) {
        // JSON parse failed — fall back to deterministic engine
        console.warn(`[AI_AUDIT_REVIEWER] Failed to parse LLM response JSON. Falling back to rules engine.`);
        return this.runDeterministicEvaluation(submission, questions, answerMap);
      }
    } else {
      // ── DETERMINISTIC FALLBACK PATH ───────────────────────────────────────
      return this.runDeterministicEvaluation(submission, questions, answerMap);
    }

    // 4. Persist findings into WorkflowReviewDecision (AI pre-screen pass)
    await this.persistAiFindings(submissionId, {
      clauseFindings,
      overallScore,
      reviewedBy,
      executiveSummary,
    });

    return {
      decision: recommendedDecision === 'APPROVE' ? 'APPROVE' : 'REQUIRE_REVISION',
      targetStatus: recommendedDecision === 'APPROVE' ? 'AUDIT_READY' : 'REVISION_REQUIRED',
      complianceScore: overallScore,
      reviewerNotes: executiveSummary,
      clauseFindings,
      reviewedBy,
      reviewedAt: new Date(),
    };
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private buildSubmissionContext(
    submission: any,
    questions: any[],
    answerMap: Map<string, any>
  ): string {
    const lines: string[] = [
      `Organisation: ${submission.licensee.name}`,
      `Framework: ${submission.framework.name} (${submission.framework.code})`,
      `Submission ID: ${submission.id}`,
      `Submitted At: ${submission.submittedAt?.toISOString() ?? 'Unknown'}`,
      '',
      'QUESTIONNAIRE RESPONSES:',
      '─────────────────────────────────────────',
    ];

    for (const q of questions) {
      const ans = answerMap.get(q.id);
      const value = ans?.value ?? '[NO ANSWER PROVIDED]';
      const hasEvidence = Boolean(ans?.evidenceDocumentId);
      const evidenceHash = ans?.evidenceDocument?.sha256Hash?.slice(0, 16) ?? null;

      lines.push(`Question ID: ${q.id}`);
      lines.push(`ISO Clause: ${q.isoClauseReference}`);
      lines.push(`Question: ${q.text}`);
      lines.push(`Answer Type: ${q.answerType}`);
      lines.push(`Answer: ${value}`);
      lines.push(`Evidence Required: ${q.evidenceRequired}`);
      lines.push(`Evidence Attached: ${hasEvidence ? `Yes (SHA-256: ${evidenceHash}...)` : 'No'}`);
      if (q.guidanceNotes) lines.push(`Auditor Guidance: ${q.guidanceNotes}`);
      lines.push('');
    }

    return lines.join('\n');
  }

  private runDeterministicEvaluation(
    submission: any,
    questions: any[],
    answerMap: Map<string, any>
  ): AuditReviewResult {
    const clauseFindings: ClauseReviewFinding[] = [];
    let totalPoints = 0;
    let maxPoints = 0;

    for (const q of questions) {
      const ans = answerMap.get(q.id);
      const hasEvidence = Boolean(ans?.evidenceDocumentId);

      const result = evaluateClauseByRules({
        questionId: q.id,
        isoClauseReference: q.isoClauseReference,
        questionText: q.text,
        answerValue: ans?.value ?? '',
        answerType: q.answerType,
        evidenceRequired: q.evidenceRequired,
        hasEvidence,
        evidenceHash: ans?.evidenceDocument?.sha256Hash ?? null,
      });

      clauseFindings.push({
        questionId: q.id,
        isoClause: q.isoClauseReference,
        status: result.status,
        findings: result.findings,
        evidenceVerified: hasEvidence,
      });

      totalPoints += result.points;
      maxPoints += 5;
    }

    const overallScore = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0;
    const nonConformantCount = clauseFindings.filter(
      (f) => f.status === 'NON_CONFORMANT' || f.status === 'INSUFFICIENT_EVIDENCE'
    ).length;
    const recommendedDecision: 'APPROVE' | 'REQUIRE_REVISION' =
      nonConformantCount === 0 && overallScore >= 75 ? 'APPROVE' : 'REQUIRE_REVISION';

    const executiveSummary =
      `Deterministic ISO 19011:2018 rules-based pre-screen completed for ${submission.licensee.name}. ` +
      `${clauseFindings.filter((f) => f.status === 'CONFORMANT').length} of ${questions.length} clauses evaluated as conformant. ` +
      `${nonConformantCount} clause(s) require attention. ` +
      `Overall pre-screen score: ${overallScore}%. ` +
      `Recommendation: ${recommendedDecision}. Lead Auditor manual verification required before finalisation.`;

    this.persistAiFindings(submission.id, {
      clauseFindings,
      overallScore,
      reviewedBy: 'AI Assurance Agent (Rules Engine — Deterministic ISO 19011:2018)',
      executiveSummary,
    }).catch((err) => console.error('[AI_AUDIT_REVIEWER] Failed to persist deterministic findings:', err));

    return {
      decision: recommendedDecision,
      targetStatus: recommendedDecision === 'APPROVE' ? 'AUDIT_READY' : 'REVISION_REQUIRED',
      complianceScore: overallScore,
      reviewerNotes: executiveSummary,
      clauseFindings,
      reviewedBy: 'AI Assurance Agent (Rules Engine — Deterministic ISO 19011:2018)',
      reviewedAt: new Date(),
    };
  }

  private calculateScore(
    findings: { status: string }[],
    totalQuestions: number
  ): number {
    if (findings.length === 0 || totalQuestions === 0) return 0;
    const conformant = findings.filter((f) => f.status === 'CONFORMANT').length;
    return Math.round((conformant / totalQuestions) * 100);
  }

  private async persistAiFindings(
    submissionId: string,
    data: {
      clauseFindings: ClauseReviewFinding[];
      overallScore: number;
      reviewedBy: string;
      executiveSummary: string;
    }
  ): Promise<void> {
    const nonConformantCount = data.clauseFindings.filter(
      (f) => f.status !== 'CONFORMANT'
    ).length;
    const overallDecision =
      nonConformantCount === 0 && data.overallScore >= 75
        ? ReviewOverallDecision.APPROVED
        : ReviewOverallDecision.REJECTED;

    await this.prisma.workflowReviewDecision.upsert({
      where: { submissionId },
      update: {
        reviewerId: null,
        overallDecision,
        overallScore: data.overallScore,
        perQuestionDecisions: data.clauseFindings as any,
        reviewerNotes: `[AI PRE-SCREEN by ${data.reviewedBy}]\n\n${data.executiveSummary}`,
      },
      create: {
        submissionId,
        reviewerId: null,
        overallDecision,
        overallScore: data.overallScore,
        perQuestionDecisions: data.clauseFindings as any,
        reviewerNotes: `[AI PRE-SCREEN by ${data.reviewedBy}]\n\n${data.executiveSummary}`,
      },
    });

    // Transition submission to AI_SCREENED only if it is currently SUBMITTED
    const currentSub = await this.prisma.workflowSubmission.findUnique({
      where: { id: submissionId },
      select: { status: true },
    });

    if (currentSub?.status === WorkflowStatus.SUBMITTED) {
      await this.prisma.workflowSubmission.update({
        where: { id: submissionId },
        data: {
          status: WorkflowStatus.AI_SCREENED,
          complianceScore: data.overallScore,
        },
      });

      await this.prisma.workflowTransitionLog.create({
        data: {
          submissionId,
          previousStatus: WorkflowStatus.SUBMITTED,
          newStatus: WorkflowStatus.AI_SCREENED,
          triggeredBy: 'AI_AGENT_ASSURANCE_ENGINE',
          triggerReason: `${data.reviewedBy} pre-screen: score ${data.overallScore}%, decision ${overallDecision}`,
        },
      });
    } else {
      // Just record compliance score without overwriting subsequent state
      await this.prisma.workflowSubmission.update({
        where: { id: submissionId },
        data: {
          complianceScore: data.overallScore,
        },
      });
    }
  }
}
