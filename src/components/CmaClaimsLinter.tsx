import React, { useState } from 'react';

interface FlaggedPhrase {
  phrase: string;
  reason: string;
  severity: 'CRITICAL_PROHIBITED' | 'WARNING_UNGROUNDED';
  suggestedReplacement: string;
}

interface CmaValidationResponse {
  isValid: boolean;
  score: number;
  flaggedPhrases: FlaggedPhrase[];
  suggestedCompliantText: string;
  legalGuidance: string;
}

interface CmaClaimsLinterProps {
  initialText?: string;
  onApplyCompliantText?: (text: string) => void;
}

export const CmaClaimsLinter: React.FC<CmaClaimsLinterProps> = ({
  initialText = '',
  onApplyCompliantText,
}) => {
  const [inputText, setInputText] = useState<string>(initialText);
  const [validationResult, setValidationResult] = useState<CmaValidationResponse | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);

  const handleValidate = async () => {
    if (!inputText.trim()) return;

    setIsValidating(true);
    try {
      const res = await fetch('/api/iso/cma/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText }),
      });
      const data = await res.json();
      setValidationResult(data);
    } catch (e) {
      console.error('CMA validation error:', e);
    } finally {
      setIsValidating(false);
    }
  };

  const handleApplyAll = () => {
    if (validationResult?.suggestedCompliantText) {
      setInputText(validationResult.suggestedCompliantText);
      if (onApplyCompliantText) {
        onApplyCompliantText(validationResult.suggestedCompliantText);
      }
      setValidationResult(null);
    }
  };

  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #dadce0', padding: '1.75rem', boxShadow: '0 1px 2px 0 rgba(60,64,67,0.08)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0, color: '#202124' }}>
            UK CMA Green Claims Code & ISO 14021 Copy Linter
          </h3>
          <p style={{ fontSize: '0.8125rem', color: '#5f6368', margin: '0.2rem 0 0 0' }}>
            Automated verification ensuring marketing copy meets CMA Rule 1 (Substantiation) and Rule 2 (Accuracy).
          </p>
        </div>

        {validationResult && (
          <span
            style={{
              padding: '0.35rem 0.85rem',
              borderRadius: '16px',
              fontSize: '0.75rem',
              fontWeight: 600,
              backgroundColor: validationResult.isValid ? '#e6f4ea' : '#fce8e6',
              color: validationResult.isValid ? '#137333' : '#c5221f',
              border: `1px solid ${validationResult.isValid ? '#ceead6' : '#fad2cf'}`,
            }}
          >
            CMA Compliance Score: {validationResult.score} / 100
          </span>
        )}
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <textarea
          rows={3}
          value={inputText}
          onChange={(e) => {
            setInputText(e.target.value);
            if (validationResult) setValidationResult(null);
          }}
          placeholder="Enter marketing or product copy (e.g. '100% Green Derby Hoodie with Zero Emissions Steel')..."
          style={{
            width: '100%',
            padding: '0.85rem',
            borderRadius: '4px',
            border: validationResult && !validationResult.isValid ? '1px solid #c5221f' : '1px solid #dadce0',
            backgroundColor: '#f8f9fa',
            color: '#202124',
            fontSize: '0.875rem',
            lineHeight: 1.5,
            fontFamily: 'inherit',
            outline: 'none',
          }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
        <button
          type="button"
          onClick={handleValidate}
          disabled={isValidating || !inputText.trim()}
          style={{
            backgroundColor: '#1a73e8',
            color: '#ffffff',
            border: 'none',
            borderRadius: '4px',
            padding: '0.625rem 1.25rem',
            fontSize: '0.8125rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {isValidating ? 'Validating against CMA Rules...' : 'Verify CMA Compliance'}
        </button>
      </div>

      {validationResult && (
        <div style={{ backgroundColor: '#f8f9fa', padding: '1.25rem', borderRadius: '6px', border: '1px solid #dadce0' }}>
          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: validationResult.isValid ? '#137333' : '#b06000', marginBottom: '0.5rem' }}>
            {validationResult.legalGuidance}
          </div>

          {validationResult.flaggedPhrases.length > 0 && (
            <div style={{ marginTop: '0.75rem' }}>
              <div style={{ fontSize: '0.75rem', color: '#c5221f', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Flagged Prohibited Terms ({validationResult.flaggedPhrases.length})
              </div>

              {validationResult.flaggedPhrases.map((flag, idx) => (
                <div key={idx} style={{ backgroundColor: '#ffffff', padding: '0.85rem', borderRadius: '4px', marginBottom: '0.5rem', borderLeft: '3px solid #c5221f', borderTop: '1px solid #e8eaed', borderRight: '1px solid #e8eaed', borderBottom: '1px solid #e8eaed' }}>
                  <div style={{ color: '#c5221f', fontWeight: 600, fontSize: '0.8125rem' }}>
                    "{flag.phrase}"
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#5f6368', margin: '0.2rem 0' }}>
                    {flag.reason}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#137333' }}>
                    Suggested Phrasing: <em>"{flag.suggestedReplacement}"</em>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleApplyAll}
                style={{
                  width: '100%',
                  marginTop: '0.75rem',
                  backgroundColor: '#137333',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '0.625rem',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Apply Suggested Legal Phrasing
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
