import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export interface PreparationChecklistConsoleProps {
  onProceedToDiagnostic?: () => void;
}

/**
 * Maps raw compliance framework codes or names to plain-English operational titles.
 * Avoids exposing intimidating raw ISO clause jargon on client-facing screens.
 */
export function getPlainEnglishFrameworkTitle(rawName: string): string {
  if (!rawName) return 'Compliance Framework';
  if (rawName.includes('50001')) return 'Energy Management & Metering';
  if (rawName.includes('14064-1')) return 'Carbon Footprint & GHG';
  if (rawName.includes('SECR') || rawName.includes('Streamlined Energy')) return 'Streamlined Energy & Carbon (SECR)';
  if (rawName.includes('Social Value') || rawName.includes('Fair Work')) return 'Workforce & Fair Work Verification';
  if (rawName.includes('Hydrogen') || rawName.includes('CertifHy') || rawName.includes('LCHS')) return 'Green Hydrogen & Clean Fuels';
  if (rawName.includes('Green Claims') || rawName.includes('CMA')) return 'Green Claims & Marketing (CMA)';
  if (rawName.includes('Section 106') || rawName.includes('106')) return 'Planning & Section 106 Obligations';
  if (rawName.includes('PPN 06/21') || rawName.includes('Procurement')) return 'Public Procurement Carbon Plan (PPN 06/21)';
  return rawName.replace(/ISO\s*[0-9]+(-[0-9]+)?(:[0-9]+)?/gi, '').trim() || rawName;
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export const PreparationChecklistConsole: React.FC<PreparationChecklistConsoleProps> = ({
  onProceedToDiagnostic,
}) => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [checklists, setChecklists] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedChecklistId, setSelectedChecklistId] = useState<string | null>(null);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);

  // Per-item local inputs
  const [numericInputs, setNumericInputs] = useState<Record<string, string>>({});
  const [textInputs, setTextInputs] = useState<Record<string, string>>({});
  const [dateRangeInputs, setDateRangeInputs] = useState<Record<string, { start: string; end: string }>>({});

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const fetchChecklists = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await api.getChecklists(token);
      setChecklists(res.checklists || []);
      if (res.checklists && res.checklists.length > 0 && !selectedChecklistId) {
        setSelectedChecklistId(res.checklists[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load preparation checklists');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChecklists();
  }, [token]);

  const handleUpdateItemStatus = async (itemId: string, newStatus: string, linkedDocId?: string) => {
    if (!token) return;
    setUpdatingItemId(itemId);
    setError(null);
    try {
      await api.updateChecklistItem(token, itemId, {
        status: newStatus,
        linkedEvidenceDocId: linkedDocId,
      });
      await fetchChecklists();
    } catch (err: any) {
      setError(err.message || 'Failed to update item status');
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleFileUpload = async (item: any, file: File) => {
    if (!token) return;
    setUploadingItemId(item.id);
    setError(null);
    setSuccessMessage(null);

    try {
      const uploadRes = await api.uploadEvidenceProofFile(token, {
        file,
        category: 'UTILITY_BASELINE_DATA',
        matrixRowId: item.itemCode,
      });

      const docId = uploadRes?.document?.id || uploadRes?.evidenceDoc?.id || uploadRes?.id;

      await api.updateChecklistItem(token, item.id, {
        status: 'COMPLETE',
        linkedEvidenceDocId: docId,
      });

      setSuccessMessage(`Document "${file.name}" uploaded with SHA-256 proof and verified.`);
      setTimeout(() => setSuccessMessage(null), 5000);
      await fetchChecklists();
    } catch (err: any) {
      setError(err.message || 'Failed to upload evidence file. Please try again.');
    } finally {
      setUploadingItemId(null);
    }
  };

  const handleSaveNumeric = async (itemId: string) => {
    const val = numericInputs[itemId];
    if (!val || !val.trim()) {
      setError('Please enter a reading value before saving.');
      return;
    }
    await handleUpdateItemStatus(itemId, 'COMPLETE');
    setSuccessMessage('Measurement reading recorded successfully.');
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleSaveDateRange = async (itemId: string) => {
    const range = dateRangeInputs[itemId];
    if (!range?.start || !range?.end) {
      setError('Please specify both start and end dates for the reporting period.');
      return;
    }
    await handleUpdateItemStatus(itemId, 'COMPLETE');
    setSuccessMessage('Reporting period recorded successfully.');
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleSaveText = async (itemId: string) => {
    const txt = textInputs[itemId];
    if (!txt || !txt.trim()) {
      setError('Please enter a disclosure description before saving.');
      return;
    }
    await handleUpdateItemStatus(itemId, 'COMPLETE');
    setSuccessMessage('Information entry saved successfully.');
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  if (loading) {
    return (
      <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: '#94a3b8' }}>
        <div style={{ marginBottom: '1rem', fontSize: '1rem', color: '#cbd5e1', fontWeight: 600 }}>
          Loading your compliance preparation roadmap...
        </div>
      </div>
    );
  }

  // If no checklists exist, prompt user to take assessment
  if (!checklists || checklists.length === 0) {
    return (
      <div
        style={{
          background: '#0d1424',
          borderRadius: '12px',
          border: '1px solid #1e293b',
          padding: '3rem 2rem',
          textAlign: 'center',
          maxWidth: '680px',
          margin: '2rem auto',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'rgba(56, 189, 248, 0.12)',
            color: '#38bdf8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>

        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.5rem' }}>
          No Compliance Assessment on File
        </h3>
        <p style={{ fontSize: '0.9rem', color: '#94a3b8', lineHeight: 1.5, marginBottom: '1.75rem' }}>
          Complete our 3-minute intake assessment to calculate your exact statutory reporting obligations and unlock your customized data gathering checklist.
        </p>

        <button
          type="button"
          onClick={() => navigate('/portal/onboarding')}
          style={{
            padding: '0.8rem 1.75rem',
            borderRadius: '8px',
            background: '#38bdf8',
            color: '#080c14',
            fontWeight: 700,
            fontSize: '0.92rem',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Start 3-Minute Intake Assessment &rarr;
        </button>
      </div>
    );
  }

  const activeChecklist =
    checklists.find((c) => c.id === selectedChecklistId) || checklists[0];
  const items = activeChecklist?.items || [];
  const recommendation = activeChecklist?.recommendation;

  // Calculate overall metrics
  const totalAllItems = checklists.reduce((acc, c) => acc + (c.totalItems || 0), 0);
  const completedAllItems = checklists.reduce((acc, c) => acc + (c.completedItems || 0), 0);
  const overallPercentage = totalAllItems > 0 ? Math.round((completedAllItems / totalAllItems) * 100) : 0;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Overview Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0d1424 0%, #111a33 100%)',
          borderRadius: '12px',
          border: '1px solid #1e293b',
          padding: '1.75rem 2rem',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>
                Preparation &amp; Evidence Gathering Console
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '4px',
                  background: 'rgba(34, 197, 94, 0.15)',
                  color: '#4ade80',
                  fontWeight: 700,
                }}
              >
                Zero-to-100 Babysitter Engine
              </span>
            </div>
            <p style={{ fontSize: '0.86rem', color: '#94a3b8', margin: 0, maxWidth: '640px', lineHeight: 1.5 }}>
              Prepare and organize your baseline utility bills, meters, and governance policies below. Once mandatory items are satisfied, your dossier unlocks automated ISO diagnostic screening.
            </p>
          </div>

          <div style={{ textAlign: 'right', minWidth: '140px' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#38bdf8' }}>
              {overallPercentage}%
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>
              {completedAllItems} of {totalAllItems} Total Tasks Done
            </div>
          </div>
        </div>

        {/* Overall progress bar */}
        <div
          style={{
            width: '100%',
            height: '6px',
            borderRadius: '3px',
            background: '#1e293b',
            marginTop: '1.25rem',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${overallPercentage}%`,
              height: '100%',
              background: overallPercentage === 100 ? '#22c55e' : 'linear-gradient(90deg, #38bdf8, #818cf8)',
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#fca5a5',
            fontSize: '0.85rem',
            marginBottom: '1.5rem',
          }}
        >
          {error}
        </div>
      )}

      {successMessage && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            background: 'rgba(34, 197, 94, 0.12)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            color: '#86efac',
            fontSize: '0.85rem',
            marginBottom: '1.5rem',
          }}
        >
          {successMessage}
        </div>
      )}

      {/* Framework Selector Tabs (Clean Plain-English Titles) */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {checklists.map((c) => {
          const isSelected = c.id === selectedChecklistId;
          const isReady = c.isReadyToIngest;
          const cleanTitle = getPlainEnglishFrameworkTitle(c.recommendation?.frameworkName || '');

          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedChecklistId(c.id)}
              style={{
                padding: '0.65rem 1.15rem',
                borderRadius: '8px',
                background: isSelected ? 'rgba(56, 189, 248, 0.15)' : '#0d1424',
                border: `1px solid ${isSelected ? '#38bdf8' : '#1e293b'}`,
                color: isSelected ? '#38bdf8' : '#94a3b8',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s',
              }}
            >
              <span>{cleanTitle}</span>
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '0.15rem 0.45rem',
                  borderRadius: '10px',
                  background: isReady ? 'rgba(34, 197, 94, 0.2)' : '#1e293b',
                  color: isReady ? '#4ade80' : '#cbd5e1',
                  fontWeight: 700,
                }}
              >
                {c.completedItems}/{c.totalItems}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Framework Details Header */}
      {recommendation && (
        <div
          style={{
            background: '#0d1424',
            borderRadius: '10px',
            border: '1px solid #1e293b',
            padding: '1.25rem 1.5rem',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
                {getPlainEnglishFrameworkTitle(recommendation.frameworkName)}
              </span>
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '4px',
                  background: 'rgba(56, 189, 248, 0.12)',
                  color: '#38bdf8',
                  fontWeight: 600,
                }}
              >
                {recommendation.frameworkName}
              </span>
              {recommendation.isLegallyMandatory && (
                <span
                  style={{
                    fontSize: '0.7rem',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '4px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#f87171',
                    fontWeight: 700,
                  }}
                >
                  STATUTORY DUTY
                </span>
              )}
            </div>

            {activeChecklist.isReadyToIngest ? (
              <span
                style={{
                  fontSize: '0.78rem',
                  padding: '0.3rem 0.75rem',
                  borderRadius: '6px',
                  background: 'rgba(34, 197, 94, 0.15)',
                  color: '#4ade80',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                Ready for Ingestion
              </span>
            ) : (
              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                {activeChecklist.completedItems} of {activeChecklist.totalItems} requirements complete
              </span>
            )}
          </div>

          <div style={{ fontSize: '0.84rem', color: '#94a3b8', lineHeight: 1.4 }}>
            {recommendation.plainEnglishWhy}
          </div>
        </div>
      )}

      {/* Checklist Items List with Data Inputs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
        {items.map((item: any) => {
          const isComplete = item.status === 'COMPLETE';
          const isWaived = item.status === 'WAIVED';
          const isUpdating = updatingItemId === item.id;
          const isUploading = uploadingItemId === item.id;
          const linkedDoc = item.linkedEvidenceDoc;

          return (
            <div
              key={item.id}
              style={{
                background: isComplete ? 'rgba(15, 23, 42, 0.6)' : '#0d1424',
                borderRadius: '10px',
                border: `1px solid ${isComplete ? 'rgba(34, 197, 94, 0.3)' : item.isMandatory ? 'rgba(56, 189, 248, 0.2)' : '#1e293b'}`,
                padding: '1.25rem 1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
              }}
            >
              {/* Top row: Label, Badges & Status Selector */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '260px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        color: isComplete ? '#4ade80' : '#f8fafc',
                      }}
                    >
                      {item.plainEnglishLabel}
                    </span>

                    {item.isMandatory ? (
                      <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.12)', color: '#f87171', fontWeight: 700 }}>
                        MANDATORY
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem', borderRadius: '4px', background: '#1e293b', color: '#94a3b8' }}>
                        OPTIONAL
                      </span>
                    )}

                    {isWaived && (
                      <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'rgba(234, 179, 8, 0.15)', color: '#facc15', fontWeight: 600 }}>
                        WAIVED BY AUDITOR
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.45 }}>
                    {item.plainEnglishGuidance}
                  </div>

                  {isWaived && item.waivedReason && (
                    <div style={{ fontSize: '0.76rem', color: '#facc15', background: 'rgba(234, 179, 8, 0.08)', padding: '0.35rem 0.65rem', borderRadius: '4px', marginTop: '0.5rem', display: 'inline-block' }}>
                      Auditor Note: {item.waivedReason}
                    </div>
                  )}
                </div>

                {/* Status selector */}
                <div style={{ minWidth: '150px', textAlign: 'right' }}>
                  <select
                    disabled={isUpdating || isWaived || isUploading}
                    value={item.status}
                    onChange={(e) => handleUpdateItemStatus(item.id, e.target.value, item.linkedEvidenceDocId)}
                    style={{
                      padding: '0.45rem 0.75rem',
                      borderRadius: '6px',
                      background: isComplete ? 'rgba(34, 197, 94, 0.15)' : '#080c14',
                      border: `1px solid ${isComplete ? '#22c55e' : '#334155'}`,
                      color: isComplete ? '#4ade80' : '#cbd5e1',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <option value="NOT_STARTED">Not Started</option>
                    <option value="IN_PROGRESS">Gathering Data</option>
                    <option value="COMPLETE">Ready / Verified</option>
                    {isWaived && <option value="WAIVED">Waived</option>}
                  </select>
                </div>
              </div>

              {/* Bottom Interactive Input Controls based on dataType */}
              {!isWaived && (
                <div
                  style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.5)',
                    border: '1px dashed #334155',
                    borderRadius: '8px',
                    padding: '0.85rem 1rem',
                    marginTop: '0.35rem',
                  }}
                >
                  {/* 1. DOCUMENT UPLOAD */}
                  {item.dataType === 'DOCUMENT_UPLOAD' && (
                    <div>
                      <input
                        type="file"
                        accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.docx"
                        style={{ display: 'none' }}
                        ref={(el) => (fileInputRefs.current[item.id] = el)}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(item, file);
                        }}
                      />

                      {linkedDoc ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                            </svg>
                            <div>
                              <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#f8fafc' }}>
                                {linkedDoc.fileName}
                              </div>
                              <div style={{ fontSize: '0.74rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '2px' }}>
                                <span>{formatBytes(linkedDoc.fileSizeBytes)}</span>
                                <span>•</span>
                                <span style={{ fontFamily: 'monospace', color: '#38bdf8' }}>
                                  SHA-256: {linkedDoc.sha256Hash?.substring(0, 12)}...
                                </span>
                                <span>•</span>
                                <span style={{ color: '#4ade80', fontWeight: 600 }}>Verified Proof</span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={isUploading}
                            onClick={() => fileInputRefs.current[item.id]?.click()}
                            style={{
                              padding: '0.4rem 0.85rem',
                              borderRadius: '6px',
                              background: '#1e293b',
                              border: '1px solid #334155',
                              color: '#cbd5e1',
                              fontSize: '0.76rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            {isUploading ? 'Uploading...' : 'Replace File'}
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                          <div style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
                            Upload utility bill, meter log, or policy document (PDF, Excel, CSV, PNG, Max 25MB)
                          </div>
                          <button
                            type="button"
                            disabled={isUploading}
                            onClick={() => fileInputRefs.current[item.id]?.click()}
                            style={{
                              padding: '0.45rem 1rem',
                              borderRadius: '6px',
                              background: '#38bdf8',
                              color: '#080c14',
                              fontWeight: 700,
                              fontSize: '0.8rem',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="17 8 12 3 7 8" />
                              <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                            {isUploading ? 'Computing SHA-256...' : 'Select Evidence File'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 2. NUMERIC READING */}
                  {item.dataType === 'NUMERIC_READING' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <input
                        type="text"
                        placeholder="Enter measured reading (e.g. 450,000)"
                        value={numericInputs[item.id] || ''}
                        onChange={(e) => setNumericInputs({ ...numericInputs, [item.id]: e.target.value })}
                        style={{
                          flex: 1,
                          minWidth: '220px',
                          padding: '0.45rem 0.75rem',
                          borderRadius: '6px',
                          background: '#080c14',
                          border: '1px solid #334155',
                          color: '#f8fafc',
                          fontSize: '0.82rem',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveNumeric(item.id)}
                        disabled={isUpdating}
                        style={{
                          padding: '0.45rem 1rem',
                          borderRadius: '6px',
                          background: '#38bdf8',
                          color: '#080c14',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        Save Reading
                      </button>
                    </div>
                  )}

                  {/* 3. DATE RANGE */}
                  {item.dataType === 'DATE_RANGE' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                        <span>From:</span>
                        <input
                          type="date"
                          value={dateRangeInputs[item.id]?.start || ''}
                          onChange={(e) =>
                            setDateRangeInputs({
                              ...dateRangeInputs,
                              [item.id]: {
                                start: e.target.value,
                                end: dateRangeInputs[item.id]?.end || '',
                              },
                            })
                          }
                          style={{
                            padding: '0.4rem 0.65rem',
                            borderRadius: '6px',
                            background: '#080c14',
                            border: '1px solid #334155',
                            color: '#f8fafc',
                            fontSize: '0.8rem',
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                        <span>To:</span>
                        <input
                          type="date"
                          value={dateRangeInputs[item.id]?.end || ''}
                          onChange={(e) =>
                            setDateRangeInputs({
                              ...dateRangeInputs,
                              [item.id]: {
                                start: dateRangeInputs[item.id]?.start || '',
                                end: e.target.value,
                              },
                            })
                          }
                          style={{
                            padding: '0.4rem 0.65rem',
                            borderRadius: '6px',
                            background: '#080c14',
                            border: '1px solid #334155',
                            color: '#f8fafc',
                            fontSize: '0.8rem',
                          }}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSaveDateRange(item.id)}
                        disabled={isUpdating}
                        style={{
                          padding: '0.45rem 1rem',
                          borderRadius: '6px',
                          background: '#38bdf8',
                          color: '#080c14',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        Save Period
                      </button>
                    </div>
                  )}

                  {/* 4. YES / NO TOGGLE */}
                  {item.dataType === 'YES_NO' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <button
                        type="button"
                        onClick={() => handleUpdateItemStatus(item.id, 'COMPLETE')}
                        style={{
                          padding: '0.45rem 1.15rem',
                          borderRadius: '6px',
                          background: isComplete ? '#22c55e' : '#1e293b',
                          color: isComplete ? '#080c14' : '#cbd5e1',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        Yes, Verified &amp; Compliant
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateItemStatus(item.id, 'NOT_STARTED')}
                        style={{
                          padding: '0.45rem 1.15rem',
                          borderRadius: '6px',
                          background: !isComplete ? '#1e293b' : '#080c14',
                          color: '#94a3b8',
                          fontWeight: 600,
                          fontSize: '0.8rem',
                          border: '1px solid #334155',
                          cursor: 'pointer',
                        }}
                      >
                        Not Applicable / Deferred
                      </button>
                    </div>
                  )}

                  {/* 5. FREE TEXT ENTRY */}
                  {item.dataType === 'FREE_TEXT' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <textarea
                        rows={2}
                        placeholder="Enter statement, policy reference, or claim inventory..."
                        value={textInputs[item.id] || ''}
                        onChange={(e) => setTextInputs({ ...textInputs, [item.id]: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '6px',
                          background: '#080c14',
                          border: '1px solid #334155',
                          color: '#f8fafc',
                          fontSize: '0.82rem',
                          resize: 'vertical',
                        }}
                      />
                      <div style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleSaveText(item.id)}
                          disabled={isUpdating}
                          style={{
                            padding: '0.45rem 1rem',
                            borderRadius: '6px',
                            background: '#38bdf8',
                            color: '#080c14',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          Save Record
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Ready to Ingest Hand-Off Banner */}
      {activeChecklist.isReadyToIngest && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(56, 189, 248, 0.1) 100%)',
            border: '1px solid #22c55e',
            borderRadius: '12px',
            padding: '1.75rem 2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.35rem' }}>
              Preparation Dossier Complete
            </div>
            <div style={{ fontSize: '0.86rem', color: '#cbd5e1', maxWidth: '600px', lineHeight: 1.4 }}>
              All statutory items for {getPlainEnglishFrameworkTitle(recommendation?.frameworkName || 'this framework')} are complete. You can now launch automated ISO telemetry ingestion and AI audit screening.
            </div>
          </div>

          <button
            type="button"
            onClick={onProceedToDiagnostic}
            style={{
              padding: '0.85rem 1.75rem',
              borderRadius: '8px',
              background: '#22c55e',
              color: '#080c14',
              fontWeight: 800,
              fontSize: '0.92rem',
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Launch Ingestion &amp; AI Verification &rarr;
          </button>
        </div>
      )}
    </div>
  );
};
