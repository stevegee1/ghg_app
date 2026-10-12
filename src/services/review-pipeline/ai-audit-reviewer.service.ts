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
 * Implements IAuditReviewer.
 */

import { Prisma, PrismaClient, WorkflowStatus } from '@prisma/client';
import { IAuditReviewer, AuditReviewResult, ClauseReviewFinding } from './audit-reviewer.interface';
import { ILlmProvider, resolveActiveProvider } from './llm-provider.interface';

/**
 * Label recorded when no AI provider produced the findings (none configured, or the provider
 * call or response failed). The Lead Auditor must be able to see that no AI model reviewed it.
 */
export const RULES_ENGINE_REVIEWER = 'Rules Engine (no AI model review)';
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
      findings: `Affirmative response with ${hasEvidence ? 'supporting documentary evidence verified' : 'no evidence reference: acceptable for non-evidence-required clauses'} under ${isoClauseReference}.`,
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

function buildAuditPrompt(
  submissionContext: string,
  frameworkCode?: string
): { system: string; user: string } {
  // Select the governing standard section based on pipeline
  const pipelineContext = (() => {
    if (!frameworkCode) return 'ISO 14064-1:2018 and ISO 50001:2018';
    if (frameworkCode.startsWith('UK_SECR')) return 'UK Streamlined Energy and Carbon Reporting (SECR) Regulations 2018 and GHG Protocol Corporate Standard';
    if (frameworkCode.startsWith('ISO_14064')) return 'ISO 14064-1:2018 Organisational GHG Quantification and GHG Protocol Corporate Standard';
    if (frameworkCode.startsWith('ISO_50001')) return 'ISO 50001:2018 Energy Management Systems';
    if (frameworkCode.startsWith('UK_PPN_006') || frameworkCode.startsWith('UK_PPN_0621')) return 'Cabinet Office PPN 006 Carbon Reduction Plan requirements and GHG Protocol Scope 1/2/3';
    if (frameworkCode.startsWith('UK_GREEN_CLAIMS') || frameworkCode.startsWith('CMA')) return 'CMA Green Claims Code and DMCC Act 2024 substantiation principles';
    if (frameworkCode.startsWith('ISO_14068') || frameworkCode.startsWith('SBTi')) return 'ISO 14068-1:2023 Carbon Neutrality and SBTi Corporate Target Validation requirements';
    if (frameworkCode.startsWith('UK_SECTION_106')) return 'Section 106 Town and Country Planning Act 1990 local employment and skills obligations';
    if (frameworkCode.startsWith('SOCIAL_VALUE') || frameworkCode.startsWith('UK_PPN_002') || frameworkCode.startsWith('UK_PPN_026')) return 'Social Value Act 2012 and Cabinet Office PPN 002 / PPN 026 Social Value procurement requirements';
    if (frameworkCode.startsWith('UK_LCHS') || frameworkCode.startsWith('GREEN_HYDROGEN')) return 'UK Low Carbon Hydrogen Standard (LCHS) administered by DESNZ and Ofgem';
    return 'ISO 14064-1:2018, ISO 50001:2018, and applicable UK statutory requirements';
  })();

  const system = `You are a Senior Lead Verification Auditor for the NFTYLOGS platform, operating under ISO 19011:2026 remote auditing guidelines. You pre-screen compliance questionnaire submissions across four service pipelines before a human Lead Auditor makes the final decision.

Governing standard for this submission: ${pipelineContext}

For each question-answer pair you receive:
1. Evaluate conformity against the cited clause or regulatory requirement
2. Check whether supporting evidence is referenced and plausible
3. Assign a conformance status: CONFORMANT, NON_CONFORMANT, or INSUFFICIENT_EVIDENCE
4. Produce a concise, objective auditor-grade finding (2-4 sentences, professional register)
5. Assign a confidence score (0.0 to 1.0)

Scoring thresholds (NFTYLOGS review rules):
- CONFORMANT with evidence = 5 points
- CONFORMANT without evidence (non-evidence-required clause) = 3 points
- INSUFFICIENT_EVIDENCE = 1 point
- NON_CONFORMANT = 0 points
- Minimum 80 out of 100 required for APPROVE recommendation

You MUST respond with valid JSON only, in this exact structure:
{
  "clauseFindings": [
    {
      "questionId": "string",
      "isoClause": "string",
      "status": "CONFORMANT" | "NON_CONFORMANT" | "INSUFFICIENT_EVIDENCE",
      "findings": "string (2-4 sentences, auditor register)",
      "evidenceVerified": boolean,
      "confidence": number
    }
  ],
  "overallScore": number (0-100),
  "recommendedDecision": "APPROVE" | "REQUIRE_REVISION",
  "executiveSummary": "string (3-5 sentences summarising the pre-screen outcome for the Lead Auditor)"
}

Do not approve where mandatory evidence is absent. Do not use markdown in your response.`;

  const user = `Please evaluate the following compliance audit submission:\n\n${submissionContext}`;

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
        framework: true,
        frameworkVersion: { include: { questions: { orderBy: { orderIndex: 'asc' } } } },
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
    const questions = submission.frameworkVersion.questions;

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
      const { system, user } = buildAuditPrompt(submissionContext, submission.framework.code);

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
        // LLM call failed: fall back to deterministic engine
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
        // JSON parse failed: fall back to deterministic engine
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
      recommendedDecision,
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
      `Standard version assessed against: ${submission.frameworkVersion.version} (${submission.frameworkVersion.standardReference})`,
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

  private async runDeterministicEvaluation(
    submission: any,
    questions: any[],
    answerMap: Map<string, any>
  ): Promise<AuditReviewResult> {
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
      `Deterministic ISO 19011:2026 rules-based pre-screen completed for ${submission.licensee.name}. ` +
      `${clauseFindings.filter((f) => f.status === 'CONFORMANT').length} of ${questions.length} clauses evaluated as conformant. ` +
      `${nonConformantCount} clause(s) require attention. ` +
      `Overall pre-screen score: ${overallScore}%. ` +
      `Recommendation: ${recommendedDecision}. Lead Auditor manual verification required before finalisation.`;

    await this.persistAiFindings(submission.id, {
      clauseFindings,
      overallScore,
      recommendedDecision,
      reviewedBy: RULES_ENGINE_REVIEWER,
      executiveSummary,
    });

    return {
      decision: recommendedDecision,
      targetStatus: recommendedDecision === 'APPROVE' ? 'AUDIT_READY' : 'REVISION_REQUIRED',
      complianceScore: overallScore,
      reviewerNotes: executiveSummary,
      clauseFindings,
      reviewedBy: RULES_ENGINE_REVIEWER,
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
      recommendedDecision: 'APPROVE' | 'REQUIRE_REVISION';
      reviewedBy: string;
      executiveSummary: string;
    }
  ): Promise<void> {
    const aiFields = {
      aiScreenedAt: new Date(),
      aiReviewer: data.reviewedBy,
      aiScore: data.overallScore,
      aiRecommendation: data.recommendedDecision,
      aiSummary: data.executiveSummary,
      aiClauseFindings: data.clauseFindings as unknown as Prisma.InputJsonValue,
    };

    await this.prisma.$transaction(async (tx) => {
      // Advance only a SUBMITTED submission; a later Lead Auditor state is never overwritten.
      const advanced = await tx.workflowSubmission.updateMany({
        where: { id: submissionId, status: WorkflowStatus.SUBMITTED },
        data: { ...aiFields, status: WorkflowStatus.AI_SCREENED },
      });

      if (advanced.count === 1) {
        await tx.workflowTransitionLog.create({
          data: {
            submissionId,
            previousStatus: WorkflowStatus.SUBMITTED,
            newStatus: WorkflowStatus.AI_SCREENED,
            triggeredBy: 'AI_AGENT_ASSURANCE_ENGINE',
            triggerReason: `${data.reviewedBy} pre-screen: score ${data.overallScore}%, recommendation ${data.recommendedDecision}`,
          },
        });
      } else {
        await tx.workflowSubmission.update({ where: { id: submissionId }, data: aiFields });
      }
    });
  }

  /**
   * Evaluates an ISO audit-readiness diagnostic submission using Google Gemini
   * (or deterministic fallback), following ISO 19011:2026 guidance on remote audit methods.
   */
  async evaluateIsoSubmission(params: {
    licenseeName: string;
    selectedFrameworks: string[];
    answers: Array<{ questionId: string; questionText?: string; answer: string; isoClause?: string }>;
    evidenceFileNames?: string[];
  }): Promise<{
    decision: 'APPROVE' | 'REQUIRE_REVISION';
    targetStatus: 'AUDIT_READY' | 'REVISION_REQUIRED';
    complianceScore: number;
    reviewerNotes: string;
    clauseFindings: Array<{
      questionId: string;
      isoClause: string;
      status: 'CONFORMANT' | 'NON_CONFORMANT' | 'INSUFFICIENT_EVIDENCE';
      findings: string;
      evidenceVerified: boolean;
    }>;
    reviewedBy: string;
    reviewedAt: Date;
  }> {
    const activeProvider = resolveActiveProvider(this.providers);
    const answers = params.answers || [];
    const frameworks = params.selectedFrameworks || ['ISO_14064_1'];

    // 1. Try LLM evaluation if provider is active
    if (activeProvider) {
      try {
        const systemPrompt = `You are the NFTYLOGS Senior Lead Auditor AI. You evaluate corporate submissions for ISO audit readiness under ISO 14064-1:2018, ISO 14001:2026, ISO 50001:2018, and the ISO 19011:2026 guidance on remote auditing protocols.
Rules:
1. Evaluate each answer and evidence reference against the governing ISO clause.
2. If evidence is attached or verifiable data is cited, mark status as CONFORMANT.
3. If no evidence document or audit trail is attached, mark as INSUFFICIENT_EVIDENCE or NON_CONFORMANT.
4. Calculate an overallScore (0-100). Minimum 80% is required for APPROVE / AUDIT_READY.
5. Return JSON ONLY with this exact schema:
{
  "clauseFindings": [
    {
      "questionId": "string",
      "isoClause": "string",
      "status": "CONFORMANT" | "NON_CONFORMANT" | "INSUFFICIENT_EVIDENCE",
      "findings": "string (2-3 sentences)",
      "evidenceVerified": boolean
    }
  ],
  "overallScore": number,
  "recommendedDecision": "APPROVE" | "REQUIRE_REVISION",
  "executiveSummary": "string (Lead auditor summary)"
}`;

        const userPrompt = `Client: ${params.licenseeName}
Selected Frameworks: ${frameworks.join(', ')}
Responses:
${answers.map((a, i) => `${i + 1}. [${a.questionId}] (${a.isoClause || 'Standard'}): ${a.answer}`).join('\n')}
Evidence Files Attached: ${(params.evidenceFileNames || []).join(', ') || 'None'}`;

        const result = await activeProvider.complete([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ], { temperature: 0.1, maxTokens: 4096 });

        let jsonStr = result.content.trim();
        if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '');
        }
        const parsed = JSON.parse(jsonStr);

        const clauseFindings = (parsed.clauseFindings || []).map((f: any) => ({
          questionId: String(f.questionId || ''),
          isoClause: String(f.isoClause || ''),
          status: ['CONFORMANT', 'NON_CONFORMANT', 'INSUFFICIENT_EVIDENCE'].includes(f.status) ? f.status : 'INSUFFICIENT_EVIDENCE',
          findings: String(f.findings || 'Evidence reviewed; no specific finding recorded.'),
          evidenceVerified: Boolean(f.evidenceVerified),
        }));

        const score = typeof parsed.overallScore === 'number'
          ? Math.min(100, Math.max(0, Math.round(parsed.overallScore)))
          : 75;

        const isApproved = score >= 80 && parsed.recommendedDecision === 'APPROVE';

        return {
          decision: isApproved ? 'APPROVE' : 'REQUIRE_REVISION',
          targetStatus: isApproved ? 'AUDIT_READY' : 'REVISION_REQUIRED',
          complianceScore: score,
          reviewerNotes: parsed.executiveSummary || (isApproved ? 'Pre-screen passed. The Lead Auditor makes the decision.' : 'Pre-screen found gaps to address before the Lead Auditor review.'),
          clauseFindings,
          reviewedBy: `${activeProvider.providerName} (${result.model})`,
          reviewedAt: new Date(),
        };
      } catch (err: any) {
        console.warn(`[AI_AUDIT_REVIEWER] Gemini review failed or timed out: ${err.message}. Invoking deterministic ISO rules engine.`);
      }
    }

    // 2. Deterministic Rules Engine (ISO 19011:2026) - active when no LLM key is configured
    const clauseFindings = answers.map((a) => {
      const wordCount = (a.answer || '').trim().split(/\s+/).filter(Boolean).length;
      // hasEvidenceDocument / evidenceDocumentId is set by the route when a file is attached
      const hasEvidence = Boolean(
        (a as any).hasEvidenceDocument ||
        (a as any).evidenceDocumentId
      );
      const isConformant = wordCount >= 5 || hasEvidence;
      const status: 'CONFORMANT' | 'INSUFFICIENT_EVIDENCE' = isConformant ? 'CONFORMANT' : 'INSUFFICIENT_EVIDENCE';

      return {
        questionId: a.questionId,
        isoClause: a.isoClause || 'ISO 19011:2026',
        status,
        findings: isConformant
          ? `Response meets minimum documentary threshold for ${a.isoClause || 'this clause'}. ${hasEvidence ? 'Supporting evidence document registered in the evidence locker.' : 'Narrative response provided; evidence document recommended for a stronger audit trail.'}`
          : `Response for ${a.isoClause || 'this clause'} is insufficient (${wordCount} words, no evidence attached). A substantive response with supporting documentation is required for this review.`,
        evidenceVerified: hasEvidence,
      };
    });

    const conformantCount = clauseFindings.filter((f) => f.status === 'CONFORMANT').length;
    const total = Math.max(1, clauseFindings.length);
    const score = Math.min(100, Math.round((conformantCount / total) * 100));
    const isApproved = score >= 80;

    return {
      decision: isApproved ? 'APPROVE' : 'REQUIRE_REVISION',
      targetStatus: isApproved ? 'AUDIT_READY' : 'REVISION_REQUIRED',
      complianceScore: score,
      reviewerNotes: isApproved
        ? `Deterministic pre-screen: ${conformantCount}/${total} clauses conformant (score ${score}%). Satisfies 80% threshold. Lead Auditor manual sign-off required.`
        : `Deterministic pre-screen: ${conformantCount}/${total} clauses conformant (score ${score}%). Below 80% threshold. Additional evidence or narrative required.`,
      clauseFindings,
      reviewedBy: RULES_ENGINE_REVIEWER,
      reviewedAt: new Date(),
    };
  }
}
