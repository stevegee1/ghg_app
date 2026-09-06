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
        fileSizeBytes: 1024 * 145, // mock 145 KB
        mimeType: fileName.endsWith('.csv') ? 'text/csv' : 'application/pdf',
      });
      setFileName('');
    } finally {
      setIsUploading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'SCADA_TELEMETRY':
        return 'SCADA';
      case 'WATER_TRADE_EFFLUENT_PERMIT':
        return 'PERMIT';
      case 'LAB_GAS_PURITY_CERT':
        return 'PURITY';
      case 'STAGING_PAYROLL_REGISTER':
        return 'PAYROLL';
      case 'CALIBRATION_CERTIFICATE':
        return 'CALIB';
      default:
        return 'DOC';
    }
  };

  return (
    <div style={{ backgroundColor: '#1e293b', borderRadius: 'var(--radius-md)', padding: '1.5rem', border: '1px solid var(--border-medium)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
            Audit Evidence Locker
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
            ISO 14065 Objective Evidence Repository & Cryptographic SHA-256 Chain of Custody
          </p>
        </div>

        <span style={{ fontSize: '0.8125rem', padding: '0.35rem 0.75rem', backgroundColor: '#0f172a', borderRadius: '20px', color: '#38bdf8' }}>
          {documents.length} Verified Document(s)
        </span>
      </div>

      {/* Category Filter Pills */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        {[
          { key: 'ALL', label: 'All Files' },
          { key: 'SCADA_TELEMETRY', label: 'SCADA Telemetry' },
          { key: 'WATER_TRADE_EFFLUENT_PERMIT', label: 'Water Permits' },
          { key: 'LAB_GAS_PURITY_CERT', label: 'Gas Purity Certs' },
          { key: 'STAGING_PAYROLL_REGISTER', label: 'Payroll / Jobs' },
          { key: 'CALIBRATION_CERTIFICATE', label: 'Calibration' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setSelectedCategory(tab.key)}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: selectedCategory === tab.key ? '1px solid var(--accent-primary)' : '1px solid #334155',
              backgroundColor: selectedCategory === tab.key ? 'var(--accent-primary)' : '#0f172a',
              color: '#ffffff',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Upload Form Box */}
      <form onSubmit={handleUploadSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.75rem', backgroundColor: '#0f172a', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', border: '1px solid #334155' }}>
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
          <div style={{ gridColumn: '1 / -1', padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            No evidence documents found in this category.
          </div>
        ) : (
          filteredDocs.map((doc) => (
            <div
              key={doc.id}
              style={{
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: 'var(--radius-sm)',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>{getCategoryIcon(doc.category)}</span>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#f8fafc', wordBreak: 'break-word' }}>
                    {doc.fileName}
                  </div>
                </div>

                <div style={{ fontSize: '0.75rem', color: '#38bdf8', marginBottom: '0.5rem' }}>
                  {doc.category}
                </div>

                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace', backgroundColor: '#020617', padding: '0.4rem', borderRadius: '4px', wordBreak: 'break-all' }}>
                  SHA-256: {doc.sha256Hash}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #1e293b', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                <span>{(doc.fileSizeBytes / 1024).toFixed(0)} KB</span>
                <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
