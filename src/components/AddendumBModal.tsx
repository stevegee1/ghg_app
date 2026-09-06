import React, { useState } from 'react';

interface AddendumBModalProps {
  licenseeId: string;
  clientLegalName: string;
  isOpen: boolean;
  onClose: () => void;
}

export const AddendumBModal: React.FC<AddendumBModalProps> = ({
  licenseeId,
  clientLegalName,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'ADDENDUM_B' | 'ROADMAP_30_60_90'>('ADDENDUM_B');
  const [copied, setCopied] = useState<boolean>(false);
  const [contractData, setContractData] = useState<string>('');
  const [roadmapPhases, setRoadmapPhases] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  React.useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    // Fetch Addendum B & Roadmap concurrently
    Promise.all([
      fetch(`/api/iso/legal/addendum-b?licenseeId=${licenseeId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      })
        .then((res) => res.json())
        .then((data) => setContractData(data.addendum?.contractMarkdown || '')),
      fetch(`/api/iso/consulting/onboarding-roadmap?licenseeId=${licenseeId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      })
        .then((res) => res.json())
        .then((data) => setRoadmapPhases(data.roadmap?.phases || [])),
    ]).finally(() => setLoading(false));
  }, [isOpen, licenseeId]);

  if (!isOpen) return null;

  const handleCopyContract = () => {
    navigator.clipboard.writeText(contractData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '780px',
          maxHeight: '90vh',
          backgroundColor: '#0f172a',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9)',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
              Statutory Legal Assurance & Onboarding Suite
            </h2>
            <p style={{ fontSize: '0.8125rem', color: '#38bdf8', margin: '0.25rem 0 0 0' }}>
              Master Services Agreement Addendum B & 30-60-90 Day Consultant Roadmap
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1.5rem',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-medium)', paddingBottom: '0.75rem' }}>
          <button
            type="button"
            onClick={() => setActiveTab('ADDENDUM_B')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8125rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              backgroundColor: activeTab === 'ADDENDUM_B' ? 'var(--accent-primary)' : 'transparent',
              color: '#ffffff',
            }}
          >
            MSA Addendum B Contract
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ROADMAP_30_60_90')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8125rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              backgroundColor: activeTab === 'ROADMAP_30_60_90' ? 'var(--accent-primary)' : 'transparent',
              color: '#ffffff',
            }}
          >
            30-60-90 Day Consultant Roadmap
          </button>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading legal documents...
            </div>
          ) : activeTab === 'ADDENDUM_B' ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
                <button
                  type="button"
                  onClick={handleCopyContract}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8125rem', padding: '0.4rem 0.85rem' }}
                >
                  {copied ? '✅ Copied to Clipboard!' : '📋 Copy Addendum B Markdown'}
                </button>
              </div>

              <pre
                style={{
                  backgroundColor: '#020617',
                  border: '1px solid #334155',
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  color: '#e2e8f0',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                  lineHeight: 1.5,
                }}
              >
                {contractData}
              </pre>
            </div>
          ) : (
            <div>
              {roadmapPhases.map((phase) => (
                <div
                  key={phase.phaseNumber}
                  style={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: 'var(--radius-sm)',
                    padding: '1.25rem',
                    marginBottom: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0, color: '#38bdf8' }}>
                      {phase.phaseName}
                    </h4>
                    <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#0f172a', color: '#10b981', fontWeight: 700 }}>
                      {phase.status}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.8125rem', color: '#ffffff', fontWeight: 600, marginBottom: '0.5rem' }}>
                    Focus: {phase.focus}
                  </div>

                  <ul style={{ margin: '0.5rem 0', paddingLeft: '1.25rem', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    {phase.deliverables.map((item: string, i: number) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>

                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                    ISO Standard Alignment: {phase.isoClauses.join(', ')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
