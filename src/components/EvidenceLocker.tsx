import React, { useState } from 'react';

export interface EvidenceDocumentItem {
  id: string;
  reportId?: string | null;
  matrixRowId?: string | null;
  fileName: string;
  category: 'SCADA_TELEMETRY' | 'WATER_TRADE_EFFLUENT_PERMIT' | 'LAB_GAS_PURITY_CERT' | 'STAGING_PAYROLL_REGISTER' | 'CALIBRATION_CERTIFICATE' | 'OTHER_AUDIT_PROOF';
  fileUrl: string;
  fileSizeBytes: number;
  mimeType: string;
  sha256Hash: string;
  uploadedBy: string;
  createdAt: string;
}

interface EvidenceLockerProps {
  documents: EvidenceDocumentItem[];
  onUploadEvidence: (fileData: { fileName: string; category: EvidenceDocumentItem['category']; fileSizeBytes: number; mimeType: string }) => Promise<void>;
}

const CATEGORY_LABEL: Record<string, string> = {
  SCADA_TELEMETRY: 'SCADA',
  WATER_TRADE_EFFLUENT_PERMIT: 'PERMIT',
  LAB_GAS_PURITY_CERT: 'PURITY',
  STAGING_PAYROLL_REGISTER: 'PAYROLL',
  CALIBRATION_CERTIFICATE: 'CALIB',
  OTHER_AUDIT_PROOF: 'DOC',
};

export const EvidenceLocker: React.FC<EvidenceLockerProps> = ({ documents, onUploadEvidence }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadCategory, setUploadCategory] = useState<EvidenceDocumentItem['category']>('SCADA_TELEMETRY');
  const [fileName, setFileName] = useState<string>('');

  const filteredDocs = selectedCategory === 'ALL'
    ? documents
    : documents.filter((d) => d.category === selectedCategory);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName.trim()) return;

    setIsUploading(true);
    try {
      await onUploadEvidence({
        fileName: fileName.trim(),
        category: uploadCategory,
        fileSizeBytes: 1024 * 145,
        mimeType: fileName.endsWith('.csv') ? 'text/csv' : 'application/pdf',
      });
      setFileName('');
    } finally {
      setIsUploading(false);
    }
  };

  const FILTER_TABS = [
    { key: 'ALL', label: 'All Files' },
    { key: 'SCADA_TELEMETRY', label: 'SCADA Telemetry' },
    { key: 'WATER_TRADE_EFFLUENT_PERMIT', label: 'Water Permits' },
    { key: 'LAB_GAS_PURITY_CERT', label: 'Gas Purity Certs' },
    { key: 'STAGING_PAYROLL_REGISTER', label: 'Payroll / Jobs' },
    { key: 'CALIBRATION_CERTIFICATE', label: 'Calibration' },
  ];

  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', border: '1px solid var(--border-light)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
            Audit Evidence Locker
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', margin: '0.2rem 0 0 0' }}>
            ISO 14065 Objective Evidence Repository — SHA-256 Chain of Custody
          </p>
        </div>
        <span style={{
          fontSize: '0.75rem', padding: '0.3rem 0.7rem',
          background: 'var(--bg-subtle)', border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-pill)', color: 'var(--text-muted)',
          fontWeight: 600, fontFamily: 'var(--font-mono, monospace)',
        }}>
          {documents.length} document{documents.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Category Filter Pills */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem', overflowX: 'auto', paddingBottom: '0.25rem', flexWrap: 'nowrap' }}>
        {FILTER_TABS.map((tab) => {
          const isActive = selectedCategory === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSelectedCategory(tab.key)}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: isActive ? '1px solid var(--accent-primary)' : '1px solid var(--border-medium)',
                background: isActive ? 'var(--accent-primary)' : 'var(--bg-card)',
                color: isActive ? '#ffffff' : 'var(--text-muted)',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Upload Form */}
      <form
        onSubmit={handleUploadSubmit}
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr auto',
          gap: '0.75rem',
          background: 'var(--bg-subtle)',
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem',
          border: '1px solid var(--border-light)',
        }}
      >
        <input
          type="text"
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          placeholder="e.g. SCADA_Q3_Power_Telemetry.csv"
          className="form-input"
          style={{ fontSize: '0.8125rem' }}
          required
        />

        <select
          value={uploadCategory}
          onChange={(e) => setUploadCategory(e.target.value as any)}
          className="form-input"
          style={{ fontSize: '0.8125rem' }}
        >
          <option value="SCADA_TELEMETRY">SCADA Telemetry (.csv / .json)</option>
          <option value="WATER_TRADE_EFFLUENT_PERMIT">Water Trade Effluent Permit (.pdf)</option>
          <option value="LAB_GAS_PURITY_CERT">Laboratory Gas Purity Certificate (.pdf)</option>
          <option value="STAGING_PAYROLL_REGISTER">Staging Payroll Register (.xlsx / .pdf)</option>
          <option value="CALIBRATION_CERTIFICATE">Certificate of Calibration (.pdf)</option>
          <option value="OTHER_AUDIT_PROOF">Other Objective Audit Proof</option>
        </select>

        <button
          type="submit"
          disabled={isUploading}
          className="btn btn-primary"
          style={{ fontSize: '0.8125rem', whiteSpace: 'nowrap' }}
        >
          {isUploading ? 'Hashing...' : 'Upload & Hash'}
        </button>
      </form>

      {/* Document Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
        {filteredDocs.length === 0 ? (
          <div style={{
            gridColumn: '1 / -1', padding: '2.5rem 1rem',
            textAlign: 'center',
            border: '1.5px dashed var(--border-light)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-subtle)',
          }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', margin: 0, fontWeight: 500 }}>No evidence documents in this category.</p>
          </div>
        ) : (
          filteredDocs.map((doc) => (
            <div
              key={doc.id}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '0.5rem',
                boxShadow: 'var(--shadow-xs)',
                transition: 'border-color 0.15s ease',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                  <span style={{
                    fontSize: '0.65rem', fontFamily: 'var(--font-mono)', fontWeight: 700,
                    padding: '0.15rem 0.4rem', borderRadius: 'var(--radius-xs)',
                    background: 'var(--bg-subtle)', border: '1px solid var(--border-light)',
                    color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>
                    {CATEGORY_LABEL[doc.category] || 'DOC'}
                  </span>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)', wordBreak: 'break-word', lineHeight: 1.3 }}>
                    {doc.fileName}
                  </div>
                </div>

                <div style={{ fontSize: '0.72rem', color: 'var(--text-light)', marginBottom: '0.4rem' }}>
                  {doc.category.replace(/_/g, ' ')}
                </div>

                <div style={{
                  fontSize: '0.65rem', color: 'var(--text-light)',
                  fontFamily: 'var(--font-mono, monospace)',
                  background: 'var(--bg-subtle)',
                  padding: '0.35rem 0.5rem',
                  borderRadius: 'var(--radius-xs)',
                  wordBreak: 'break-all',
                  border: '1px solid var(--border-light)',
                }}>
                  SHA-256: {doc.sha256Hash}
                </div>
              </div>

              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                paddingTop: '0.5rem', borderTop: '1px solid var(--border-light)',
                fontSize: '0.72rem', color: 'var(--text-light)',
              }}>
                <span>{(doc.fileSizeBytes / 1024).toFixed(0)} KB</span>
                <span>{new Date(doc.createdAt).toLocaleDateString('en-GB')}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
