-- Create function to enforce FinancialSplit sum equals parent Transaction grossAmountCents
CREATE OR REPLACE FUNCTION check_financial_split_sum()
RETURNS TRIGGER AS $$
DECLARE
  gross INT;
BEGIN
  SELECT "grossAmountCents" INTO gross FROM "Transaction" WHERE id = NEW."transactionId";
  IF NEW."licensorRoyaltyCents" + NEW."charityGiftCents" != gross THEN
    RAISE EXCEPTION 'FinancialSplit sum (%) does not equal Transaction grossAmountCents (%)',
      NEW."licensorRoyaltyCents" + NEW."charityGiftCents", gross;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger executing check_financial_split_sum BEFORE INSERT OR UPDATE on FinancialSplit
CREATE TRIGGER enforce_financial_split_sum
BEFORE INSERT OR UPDATE ON "FinancialSplit"
FOR EACH ROW EXECUTE FUNCTION check_financial_split_sum();