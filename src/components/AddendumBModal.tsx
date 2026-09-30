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
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
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
          background: 'var(--bg-card)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 60px rgba(15, 23, 42, 0.18)',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
              Statutory Legal Assurance &amp; Onboarding Suite
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', margin: '0.2rem 0 0 0' }}>
              MSA Addendum B Contract &amp; 30-60-90 Day Consultant Roadmap &mdash; {clientLegalName}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-light)',
              color: 'var(--text-light)',
              fontSize: '1rem',
              cursor: 'pointer',
              borderRadius: 'var(--radius-sm)',
              width: '32px',
              height: '32px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
          {[
            { key: 'ADDENDUM_B', label: 'MSA Addendum B Contract' },
            { key: 'ROADMAP_30_60_90', label: '30-60-90 Day Roadmap' },
          ].map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as any)}
                style={{
                  padding: '0.45rem 0.95rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: isActive ? '1px solid var(--accent-primary)' : '1px solid transparent',
                  background: isActive ? 'var(--accent-primary)' : 'transparent',
                  color: isActive ? '#ffffff' : 'var(--text-muted)',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-light)' }}>
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
                  {copied ? 'Copied!' : 'Copy Addendum B Markdown'}
                </button>
              </div>

              <pre
                style={{
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-light)',
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'var(--font-mono, monospace)',
                  lineHeight: 1.6,
                }}
              >
                {contractData}
              </pre>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {roadmapPhases.map((phase) => (
                <div
                  key={phase.phaseNumber}
                  style={{
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.1rem 1.25rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                      {phase.phaseName}
                    </h4>
                    <span style={{
                      fontSize: '0.7rem', padding: '2px 8px', borderRadius: 'var(--radius-xs)',
                      background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0',
                      fontWeight: 700,
                    }}>
                      {phase.status}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.4rem' }}>
                    Focus: {phase.focus}
                  </div>

                  <ul style={{ margin: '0.4rem 0', paddingLeft: '1.25rem', fontSize: '0.78rem', color: 'var(--text-light)', lineHeight: 1.6 }}>
                    {phase.deliverables.map((item: string, i: number) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>

                  <div style={{ fontSize: '0.72rem', color: 'var(--text-light)', marginTop: '0.4rem', fontFamily: 'var(--font-mono)' }}>
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
