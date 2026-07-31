import { PrismaClient, VerificationSource, TransactionStatus } from '@prisma/client';
import { TransactionService } from '../src/services/transaction.service';
import { seed } from '../prisma/seed';

const prisma = new PrismaClient();
const transactionService = new TransactionService(prisma);

describe('Milestone 1 Core Schema & Service Layer Tests', () => {
  beforeAll(async () => {
    await seed();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // Assertion 1: A Transaction cannot be created without a linked TriggerEvent having a non-null verificationSource and a FinancialSplit
  describe('Assertion 1: Mandatory TriggerEvent with non-null verificationSource and FinancialSplit', () => {
    test('should reject creating a transaction when triggerEvent is missing or verificationSource is null', async () => {
      const invalidInput: any = {
        licenseeId: 'lic_itm_power',
        grossAmountCents: 1000,
        triggerEvent: null,
        financialSplit: {
          licensorRoyaltyCents: 800,
          charityGiftCents: 200,
        },
      };

      await expect(
        transactionService.createTransactionWithTrigger(invalidInput)
      ).rejects.toThrow('TriggerEvent with a non-null verificationSource is mandatory');

      const invalidInput2: any = {
        licenseeId: 'lic_itm_power',
        grossAmountCents: 1000,
        triggerEvent: {
          verificationSource: null,
        },
        financialSplit: {
          licensorRoyaltyCents: 800,
          charityGiftCents: 200,
        },
      };

      await expect(
        transactionService.createTransactionWithTrigger(invalidInput2)
      ).rejects.toThrow('TriggerEvent with a non-null verificationSource is mandatory');
    });

    test('should reject creating a transaction when financialSplit is missing', async () => {
      const invalidInput3: any = {
        licenseeId: 'lic_itm_power',
        grossAmountCents: 1000,
        triggerEvent: {
          verificationSource: VerificationSource.THIRD_PARTY_API,
        },
        financialSplit: null,
      };

      await expect(
        transactionService.createTransactionWithTrigger(invalidInput3)
      ).rejects.toThrow('FinancialSplit is mandatory');
    });

    test('should successfully create a transaction with valid triggerEvent and financialSplit', async () => {
      const validTx = await transactionService.createTransactionWithTrigger({
        licenseeId: 'lic_itm_power',
        grossAmountCents: 5000,
        currency: 'GBP',
        status: TransactionStatus.PENDING,
        triggerEvent: {
          verificationSource: VerificationSource.THIRD_PARTY_API,
          eventType: 'SOLAR_CHECK',
        },
        financialSplit: {
          licensorRoyaltyCents: 4000,
          charityGiftCents: 1000,
        },
      });

      expect(validTx).toBeDefined();
      expect(validTx.id).toBeTruthy();
      expect(validTx.triggerEvent).toBeDefined();
      expect(validTx.triggerEvent?.verificationSource).toBe(VerificationSource.THIRD_PARTY_API);
      expect(validTx.financialSplit).toBeDefined();
      expect(validTx.financialSplit?.licensorRoyaltyCents).toBe(4000);
      expect(validTx.financialSplit?.charityGiftCents).toBe(1000);
    });
  });

  // Assertion 2: FinancialSplit sum equals Transaction.grossAmountCents (Application & Database enforcement)
  describe('Assertion 2: FinancialSplit sum equality check (App-layer & Database Trigger)', () => {
    test('service layer should reject financial split creation when sum != grossAmountCents', async () => {
      await expect(
        transactionService.createTransactionWithTrigger({
          licenseeId: 'lic_jcb_test',
          grossAmountCents: 10000,
          triggerEvent: {
            verificationSource: VerificationSource.MANUAL_ATTESTATION,
          },
          financialSplit: {
            licensorRoyaltyCents: 7000,
            charityGiftCents: 2000, // Sum = 9000 != 10000
          },
        })
      ).rejects.toThrow('FinancialSplit sum (7000 + 2000 = 9000) does not equal Transaction grossAmountCents (10000)');
    });

    test('service layer should allow financial split creation when sum == grossAmountCents', async () => {
      const validTx = await transactionService.createTransactionWithTrigger({
        licenseeId: 'lic_jcb_test',
        grossAmountCents: 10000,
        triggerEvent: {
          verificationSource: VerificationSource.MANUAL_ATTESTATION,
        },
        financialSplit: {
          licensorRoyaltyCents: 8000,
          charityGiftCents: 2000, // Sum = 10000 == 10000
        },
      });

      expect(validTx.financialSplit).toBeDefined();
      expect(validTx.financialSplit?.licensorRoyaltyCents).toBe(8000);
      expect(validTx.financialSplit?.charityGiftCents).toBe(2000);
      expect(
        validTx.financialSplit!.licensorRoyaltyCents + validTx.financialSplit!.charityGiftCents
      ).toBe(validTx.grossAmountCents);
    });

    test('Postgres DB trigger should reject raw SQL insert into FinancialSplit when sum does not match Transaction grossAmountCents', async () => {
      // Create transaction directly in DB to bypass app-layer validation
      const rawTx = await prisma.transaction.create({
        data: {
          licenseeId: 'lic_itm_power',
          grossAmountCents: 20000, // £200.00
          triggerEvent: {
            create: {
              verificationSource: VerificationSource.THIRD_PARTY_API,
            },
          },
        },
      });

      // Insert invalid FinancialSplit directly via raw SQL (10000 + 5000 = 15000 != 20000)
      const invalidSplitId = 'split_raw_bad_sum';
      const rawSql = `
        INSERT INTO "FinancialSplit" ("id", "transactionId", "licensorRoyaltyCents", "charityGiftCents", "createdAt")
        VALUES ('${invalidSplitId}', '${rawTx.id}', 10000, 5000, NOW());
      `;

      await expect(prisma.$executeRawUnsafe(rawSql)).rejects.toThrow(
        /FinancialSplit sum \(15000\) does not equal Transaction grossAmountCents \(20000\)/
      );
    });
  });

  // Assertion 3: Seed script runs idempotently
  describe('Assertion 3: Idempotent Seed Script', () => {
    test('running seed script twice should not duplicate records or crash', async () => {
      const countTxBefore = await prisma.transaction.count();
      const countLicBefore = await prisma.licensee.count();

      // Run seed second time
      await expect(seed()).resolves.not.toThrow();

      const countTxAfter = await prisma.transaction.count();
      const countLicAfter = await prisma.licensee.count();

      expect(countLicAfter).toBe(countLicBefore);
      expect(countTxAfter).toBe(countTxBefore);
    });
  });

  // Assertion 4: Querying transactions by licenseeId returns only that licensee's rows
  describe('Assertion 4: Querying transactions by licenseeId', () => {
    test('returns strictly the transactions belonging to the requested licenseeId', async () => {
      const itmTransactions = await transactionService.getTransactionsByLicensee('lic_itm_power');
      expect(itmTransactions.length).toBeGreaterThan(0);
      expect(itmTransactions.every((tx) => tx.licenseeId === 'lic_itm_power')).toBe(true);

      const jcbTransactions = await transactionService.getTransactionsByLicensee('lic_jcb_test');
      expect(jcbTransactions.length).toBeGreaterThan(0);
      expect(jcbTransactions.every((tx) => tx.licenseeId === 'lic_jcb_test')).toBe(true);

      const itmTxIds = new Set(itmTransactions.map((tx) => tx.id));
      const hasOverlap = jcbTransactions.some((tx) => itmTxIds.has(tx.id));
      expect(hasOverlap).toBe(false);
    });
  });
});
