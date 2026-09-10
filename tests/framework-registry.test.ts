/**
 * framework-registry.test.ts
 *
 * Unit and integration tests for FrameworkRegistryService:
 *  - 8 international carbon accounting frameworks
 *  - Master 5-pillar deduplication logic
 *  - Clause mapping and dynamic diagnostic bundle assembly
 */

import { FrameworkRegistryService } from '../src/services/framework-registry.service';

describe('FrameworkRegistryService', () => {
  describe('getAllFrameworks', () => {
    it('returns all 8 international carbon compliance frameworks', () => {
      const frameworks = FrameworkRegistryService.getAllFrameworks();
      expect(frameworks).toBeInstanceOf(Array);
      expect(frameworks).toHaveLength(8);

      const frameworkIds = frameworks.map((f) => f.id);
      expect(frameworkIds).toContain('ISO_14064_1');
      expect(frameworkIds).toContain('ISO_50001');
      expect(frameworkIds).toContain('GHG_PROTOCOL');
      expect(frameworkIds).toContain('UK_SECR');
      expect(frameworkIds).toContain('EU_CSRD_ESRS_E1');
      expect(frameworkIds).toContain('US_CA_SB253');
      expect(frameworkIds).toContain('UK_CMA_GREEN_CLAIMS');
      expect(frameworkIds).toContain('ISO_14067');
    });

    it('contains valid statutory jurisdiction and standard clauses for each framework', () => {
      const frameworks = FrameworkRegistryService.getAllFrameworks();
      for (const fw of frameworks) {
        expect(fw.name).toBeDefined();
        expect(fw.code).toBeDefined();
        expect(fw.governingBody).toBeDefined();
        expect(fw.jurisdiction).toBeDefined();
        expect(fw.badgeTag).toBeDefined();
        expect(fw.standardClauses.length).toBeGreaterThan(0);
      }
    });
  });

  describe('getDiagnosticBundle', () => {
    it('defaults to ISO 14064-1, ISO 50001, and UK SECR when empty array provided', () => {
      const bundle = FrameworkRegistryService.getDiagnosticBundle([]);
      expect(bundle.selectedFrameworks.map((f) => f.id)).toEqual(['ISO_14064_1', 'ISO_50001', 'UK_SECR']);
      expect(bundle.pillars).toHaveLength(5);
      expect(bundle.totalQuestions).toBeGreaterThan(0);
    });

    it('organizes questions across 5 master pillars when multiple frameworks selected', () => {
      const multiFwBundle = FrameworkRegistryService.getDiagnosticBundle([
        'ISO_14064_1',
        'ISO_50001',
        'UK_SECR',
        'EU_CSRD_ESRS_E1',
        'US_CA_SB253',
      ]);

      expect(multiFwBundle.pillars).toHaveLength(5);

      // Pillar titles must follow the 5-pillar master framework
      const pillarTitles = multiFwBundle.pillars.map((p) => p.title);
      expect(pillarTitles).toContain('Organizational & Reporting Boundaries');
      expect(pillarTitles).toContain('Primary Activity Data & Sensor Provenance');
      expect(pillarTitles).toContain('Sensor & Meter Calibration (ISO 17025)');
      expect(pillarTitles).toContain('Emission Factor Lineage & Methodology');
      expect(pillarTitles).toContain('Governance, Anomaly Controls & Disclosures');

      // Verify questions map to specific clauses and guidance notes
      const governanceQuestions = multiFwBundle.pillars[0].questions;
      const boundaryQuestion = governanceQuestions.find((q) => q.questionId === 'P1-Q1');
      expect(boundaryQuestion).toBeDefined();
      expect(boundaryQuestion?.isoClause).toBeDefined();
      expect(boundaryQuestion?.legalMandate).toBeDefined();
      expect(boundaryQuestion?.guidanceNotes).toBeDefined();
    });

    it('includes specific questions for California SB 253 and EU CSRD when selected', () => {
      const bundle = FrameworkRegistryService.getDiagnosticBundle(['EU_CSRD_ESRS_E1', 'US_CA_SB253']);
      const p2Pillar = bundle.pillars.find((p) => p.pillarId === 'P2');
      expect(p2Pillar).toBeDefined();
      const p2QuestionIds = p2Pillar?.questions.map((q) => q.questionId);
      expect(p2QuestionIds).toContain('P2-Q2');

      const p4Pillar = bundle.pillars.find((p) => p.pillarId === 'P4');
      expect(p4Pillar).toBeDefined();
      const p4QuestionIds = p4Pillar?.questions.map((q) => q.questionId);
      expect(p4QuestionIds).toContain('P4-Q1');
    });

    it('returns total question count matching sum of pillar question counts', () => {
      const bundle = FrameworkRegistryService.getDiagnosticBundle([
        'ISO_14064_1',
        'ISO_50001',
        'GHG_PROTOCOL',
        'UK_SECR',
        'EU_CSRD_ESRS_E1',
      ]);

      const sumQuestions = bundle.pillars.reduce((acc, p) => acc + p.questions.length, 0);
      expect(bundle.totalQuestions).toBe(sumQuestions);
      expect(bundle.totalQuestions).toBeGreaterThan(5);
    });
  });
});
