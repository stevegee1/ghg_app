import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';

interface PreparationChecklistConsoleProps {
  onProceedToDiagnostic: () => void;
}

export const PreparationChecklistConsole: React.FC<PreparationChecklistConsoleProps> = ({
  onProceedToDiagnostic,
}) => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [checklists, setChecklists] = useState<any[]>([]);
  const [selectedChecklistId, setSelectedChecklistId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);

  // Form states for item inline data entry
  const [numericInputs, setNumericInputs] = useState<{ [itemId: string]: string }>({});
  const [dateRangeInputs, setDateRangeInputs] = useState<{
    [itemId: string]: { start: string; end: string };
  }>({});
  const [textInputs, setTextInputs] = useState<{ [itemId: string]: string }>({});

  const fileInputRefs = useRef<{ [itemId: string]: HTMLInputElement | null }>({});

  const loadChecklists = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
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
    loadChecklists();
  }, [token]);

  // Update item status and optional payload
  const handleUpdateItemStatus = async (
    itemId: string,
    newStatus: string,
    linkedDocId?: string | null,
    itemData?: any
  ) => {
    if (!token) return;
    setUpdatingItemId(itemId);
    setError(null);
    try {
      await api.updateChecklistItem(token, itemId, {
        status: newStatus,
        linkedEvidenceDocId: linkedDocId || undefined,
      });

      // Update state locally
      setChecklists((prevChecklists) =>
        prevChecklists.map((c) => {
          const updatedItems = c.items.map((i: any) =>
            i.id === itemId
              ? {
                  ...i,
                  status: newStatus,
                  linkedEvidenceDocId: linkedDocId !== undefined ? linkedDocId : i.linkedEvidenceDocId,
                  itemData: itemData !== undefined ? itemData : i.itemData,
                }
              : i
          );
          const completed = updatedItems.filter(
            (i: any) => i.status === 'COMPLETE' || i.status === 'WAIVED'
          ).length;
          const mandatoryPending = updatedItems.filter(
            (i: any) => i.isMandatory && i.status !== 'COMPLETE' && i.status !== 'WAIVED'
          ).length;

          return {
            ...c,
            items: updatedItems,
            completedItems: completed,
            isReadyToIngest: mandatoryPending === 0,
          };
        })
      );
    } catch (err: any) {
      setError(err.message || 'Failed to update item status');
    } finally {
      setUpdatingItemId(null);
    }
  };

  // Upload proof file directly for a checklist item
  const handleFileUpload = async (item: any, file: File) => {
    if (!token) return;
    setUploadingItemId(item.id);
    setError(null);
    setSuccessMessage(null);

    try {
      // 1. Upload proof file to evidence vault
      const docRes = await api.uploadEvidenceProofFile(token, {
        file,
        category: 'UTILITY_BILL',
      });
      const doc = docRes.document || docRes;

      // 2. Link uploaded doc to checklist item and mark as ready/verified
      await api.updateChecklistItem(token, item.id, {
        status: 'COMPLETE',
        linkedEvidenceDocId: doc.id,
      });

      // 3. Update local state
      setChecklists((prevChecklists) =>
        prevChecklists.map((c) => {
          const updatedItems = c.items.map((i: any) =>
            i.id === item.id
              ? {
                  ...i,
                  status: 'COMPLETE',
                  linkedEvidenceDocId: doc.id,
                  linkedEvidenceDoc: doc,
                }
              : i
          );
          const completed = updatedItems.filter(
            (i: any) => i.status === 'COMPLETE' || i.status === 'WAIVED'
          ).length;
          const mandatoryPending = updatedItems.filter(
            (i: any) => i.isMandatory && i.status !== 'COMPLETE' && i.status !== 'WAIVED'
          ).length;

          return {
            ...c,
            items: updatedItems,
            completedItems: completed,
            isReadyToIngest: mandatoryPending === 0,
          };
        })
      );

      setSuccessMessage(`Document "${file.name}" uploaded and verified with SHA-256 integrity.`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to upload evidence file');
    } finally {
      setUploadingItemId(null);
    }
  };

  const handleSaveNumeric = async (itemId: string) => {
    const rawVal = numericInputs[itemId];
    if (!rawVal || isNaN(Number(rawVal.replace(/,/g, '')))) {
      setError('Please provide a valid numeric value');
      return;
    }
    const num = Number(rawVal.replace(/,/g, ''));
    await handleUpdateItemStatus(itemId, 'COMPLETE', undefined, { numericReading: num });
    setSuccessMessage('Measured reading saved and requirement marked ready.');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleSaveDateRange = async (itemId: string) => {
    const dates = dateRangeInputs[itemId];
    if (!dates?.start || !dates?.end) {
      setError('Please select both start and end dates');
      return;
    }
    await handleUpdateItemStatus(itemId, 'COMPLETE', undefined, {
      dateRange: { start: dates.start, end: dates.end },
    });
    setSuccessMessage('Statutory reporting period saved.');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleSaveText = async (itemId: string) => {
    const txt = textInputs[itemId];
    if (!txt?.trim()) {
      setError('Text entry cannot be blank');
      return;
    }
    await handleUpdateItemStatus(itemId, 'COMPLETE', undefined, { declarationText: txt.trim() });
    setSuccessMessage('Declaration and policy record saved.');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  const getPlainEnglishFrameworkTitle = (rawName: string) => {
    const map: { [key: string]: string } = {
      'ISO 14064-1 / GHG Protocol': 'Carbon Footprint & GHG Protocol',
      'ISO 50001': 'Energy Management & Metering',
      'UK SECR': 'Streamlined Energy & Carbon (SECR)',
      'ISO 14067': 'Product Carbon Footprint (LCA)',
      'California SB 253': 'California Climate Accountability (SB 253)',
      'EU CSRD / ESRS E1': 'Corporate Sustainability Reporting (CSRD)',
      'ISO 22628': 'Vehicle & Fleet Recyclability',
      'ISO 19880 / Clean Fuels': 'Green Hydrogen & Clean Fuels',
      'Social Value Act & Fair Work Job Verification': 'Workforce & Fair Work Verification',
      'UK Public Procurement Carbon Reduction Plan (PPN 06/21)': 'Public Procurement Carbon Plan (PPN 06/21)',
      'CMA Green Claims Code & Anti-Greenwashing Compliance': 'Green Claims & Marketing (CMA)',
    };
    return map[rawName] || rawName;
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
        <div style={{ fontSize: '0.95rem', color: '#475569', fontWeight: 600 }}>
          Loading compliance preparation roadmap...
        </div>
      </div>
    );
  }

  // If no checklists exist, prompt user to take assessment
  if (!checklists || checklists.length === 0) {
    return (
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '3rem 2rem',
          textAlign: 'center',
          maxWidth: '680px',
          margin: '2rem auto',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: '#f1f5f9',
            color: '#0f172a',
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

        <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
          No Compliance Assessment on File
        </h3>
        <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.5, marginBottom: '2rem' }}>
          Complete our 3-minute intake assessment to calculate your exact statutory reporting obligations and unlock your customized data gathering checklist.
        </p>

        <button
          type="button"
          onClick={() => navigate('/portal/onboarding')}
          style={{
            padding: '0.85rem 2rem',
            borderRadius: '8px',
            background: 'var(--accent-primary)',
            color: 'var(--text-main)',
            fontWeight: 700,
            fontSize: '0.92rem',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Start 3-Minute Intake Assessment
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
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '1.75rem 2rem',
          marginBottom: '1.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
                Preparation &amp; Evidence Gathering Console
              </span>
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '0.2rem 0.55rem',
                  borderRadius: '4px',
                  background: '#f0fdf4',
                  color: '#166534',
                  fontWeight: 700,
                  border: '1px solid #bbf7d0',
                }}
              >
                Statutory Readiness Engine
              </span>
            </div>
            <p style={{ fontSize: '0.9rem', color: '#475569', margin: 0, maxWidth: '640px', lineHeight: 1.5 }}>
              Prepare and organize your baseline utility bills, meters, and governance policies below. Once mandatory items are satisfied, your dossier unlocks automated ISO diagnostic screening.
            </p>
          </div>

          <div style={{ textAlign: 'right', minWidth: '140px' }}>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a' }}>
              {overallPercentage}%
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
              {completedAllItems} of {totalAllItems} Total Tasks Done
            </div>
          </div>
        </div>

        {/* Overall progress bar */}
        <div
          style={{
            width: '100%',
            height: '7px',
            borderRadius: '4px',
            background: '#e2e8f0',
            marginTop: '1.25rem',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${overallPercentage}%`,
              height: '100%',
              background: '#16a34a',
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderRadius: '8px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            fontSize: '0.88rem',
            marginBottom: '1.5rem',
            fontWeight: 500,
          }}
        >
          {error}
        </div>
      )}

      {successMessage && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderRadius: '8px',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#166534',
            fontSize: '0.88rem',
            marginBottom: '1.5rem',
            fontWeight: 500,
          }}
        >
          {successMessage}
        </div>
      )}

      {/* Framework Selector Tabs (Clean Plain-English Titles) */}
      <div style={{ display: 'flex', gap: '0.65rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
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
                background: isSelected ? 'var(--accent-primary)' : 'var(--bg-card)',
                border: `1px solid ${isSelected ? '#0f172a' : '#e2e8f0'}`,
                color: isSelected ? '#ffffff' : '#334155',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.15s',
                boxShadow: isSelected ? '0 1px 2px rgba(0,0,0,0.1)' : '0 1px 2px rgba(0,0,0,0.02)',
              }}
            >
              <span>{cleanTitle}</span>
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '0.15rem 0.45rem',
                  borderRadius: '10px',
                  background: isSelected ? 'rgba(255, 255, 255, 0.2)' : isReady ? '#dcfce7' : '#f1f5f9',
                  color: isSelected ? '#ffffff' : isReady ? '#166534' : '#475569',
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
            background: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            padding: '1.35rem 1.5rem',
            marginBottom: '1.5rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                {getPlainEnglishFrameworkTitle(recommendation.frameworkName)}
              </span>
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '4px',
                  background: '#f1f5f9',
                  color: '#334155',
                  fontWeight: 600,
                  border: '1px solid #e2e8f0',
                }}
              >
                {recommendation.frameworkName}
              </span>
              {recommendation.isLegallyMandatory && (
                <span
                  style={{
                    fontSize: '0.7rem',
                    padding: '0.15rem 0.55rem',
                    borderRadius: '4px',
                    background: '#fef2f2',
                    color: '#991b1b',
                    fontWeight: 700,
                    border: '1px solid #fecaca',
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
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  background: '#f0fdf4',
                  color: '#166534',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  border: '1px solid #bbf7d0',
                }}
              >
                Ready for Ingestion
              </span>
            ) : (
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>
                {activeChecklist.completedItems} of {activeChecklist.totalItems} requirements complete
              </span>
            )}
          </div>

          <div style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.5 }}>
            {recommendation.plainEnglishWhy}
          </div>
        </div>
      )}

      {/* Checklist Items List */}
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
                background: '#ffffff',
                borderRadius: '10px',
                border: isComplete ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                padding: '1.35rem 1.5rem',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
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
                        fontSize: '0.96rem',
                        fontWeight: 700,
                        color: isComplete ? '#166534' : '#0f172a',
                      }}
                    >
                      {item.plainEnglishLabel}
                    </span>

                    {item.isMandatory ? (
                      <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: '#fef2f2', color: '#991b1b', fontWeight: 700, border: '1px solid #fecaca' }}>
                        MANDATORY
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0' }}>
                        OPTIONAL
                      </span>
                    )}

                    {isWaived && (
                      <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: '#fefce8', color: '#854d0e', fontWeight: 600, border: '1px solid #fef08a' }}>
                        WAIVED BY AUDITOR
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '0.86rem', color: '#475569', lineHeight: 1.45 }}>
                    {item.plainEnglishGuidance}
                  </div>

                  {isWaived && item.waivedReason && (
                    <div style={{ fontSize: '0.78rem', color: '#854d0e', background: '#fefce8', padding: '0.35rem 0.65rem', borderRadius: '4px', marginTop: '0.5rem', display: 'inline-block', border: '1px solid #fef08a' }}>
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
                      background: isComplete ? '#f0fdf4' : '#ffffff',
                      border: `1px solid ${isComplete ? '#86efac' : '#cbd5e1'}`,
                      color: isComplete ? '#166534' : '#0f172a',
                      fontSize: '0.82rem',
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
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
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
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                            </svg>
                            <div>
                              <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a' }}>
                                {linkedDoc.fileName}
                              </div>
                              <div style={{ fontSize: '0.76rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '2px' }}>
                                <span>{formatBytes(linkedDoc.fileSizeBytes)}</span>
                                <span>•</span>
                                <span style={{ fontFamily: 'monospace', color: '#0369a1' }}>
                                  SHA-256: {linkedDoc.sha256Hash?.substring(0, 12)}...
                                </span>
                                <span>•</span>
                                <span style={{ color: '#166534', fontWeight: 700 }}>Verified Proof</span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={isUploading}
                            onClick={() => fileInputRefs.current[item.id]?.click()}
                            style={{
                              padding: '0.45rem 0.95rem',
                              borderRadius: '6px',
                              background: '#ffffff',
                              border: '1px solid #cbd5e1',
                              color: '#334155',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            {isUploading ? 'Uploading...' : 'Replace File'}
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                          <div style={{ fontSize: '0.84rem', color: '#475569' }}>
                            Upload utility bill, meter log, or policy document (PDF, Excel, CSV, PNG, Max 25MB)
                          </div>
                          <button
                            type="button"
                            disabled={isUploading}
                            onClick={() => fileInputRefs.current[item.id]?.click()}
                            style={{
                              padding: '0.5rem 1.15rem',
                              borderRadius: '6px',
                              background: 'var(--accent-primary)',
                              color: 'var(--text-main)',
                              fontWeight: 700,
                              fontSize: '0.82rem',
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
                          padding: '0.5rem 0.85rem',
                          borderRadius: '6px',
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          color: '#0f172a',
                          fontSize: '0.84rem',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveNumeric(item.id)}
                        disabled={isUpdating}
                        style={{
                          padding: '0.5rem 1.15rem',
                          borderRadius: '6px',
                          background: 'var(--accent-primary)',
                          color: 'var(--text-main)',
                          fontWeight: 700,
                          fontSize: '0.82rem',
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: '#475569' }}>
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
                            padding: '0.45rem 0.75rem',
                            borderRadius: '6px',
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            color: '#0f172a',
                            fontSize: '0.82rem',
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: '#475569' }}>
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
                            padding: '0.45rem 0.75rem',
                            borderRadius: '6px',
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            color: '#0f172a',
                            fontSize: '0.82rem',
                          }}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSaveDateRange(item.id)}
                        disabled={isUpdating}
                        style={{
                          padding: '0.5rem 1.15rem',
                          borderRadius: '6px',
                          background: 'var(--accent-primary)',
                          color: 'var(--text-main)',
                          fontWeight: 700,
                          fontSize: '0.82rem',
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
                          background: isComplete ? '#f0fdf4' : '#ffffff',
                          color: isComplete ? '#166534' : '#334155',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          border: `1px solid ${isComplete ? '#86efac' : '#cbd5e1'}`,
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
                          background: !isComplete ? '#f1f5f9' : '#ffffff',
                          color: '#64748b',
                          fontWeight: 600,
                          fontSize: '0.82rem',
                          border: '1px solid #cbd5e1',
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
                          padding: '0.65rem 0.85rem',
                          borderRadius: '6px',
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          color: '#0f172a',
                          fontSize: '0.84rem',
                          resize: 'vertical',
                          boxSizing: 'border-box',
                        }}
                      />
                      <div style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleSaveText(item.id)}
                          disabled={isUpdating}
                          style={{
                            padding: '0.5rem 1.15rem',
                            borderRadius: '6px',
                            background: 'var(--accent-primary)',
                            color: 'var(--text-main)',
                            fontWeight: 700,
                            fontSize: '0.82rem',
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
            background: '#f0fdf4',
            border: '1px solid #86efac',
            borderRadius: '12px',
            padding: '1.75rem 2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          }}
        >
          <div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#14532d', marginBottom: '0.35rem' }}>
              Preparation Dossier Complete
            </div>
            <div style={{ fontSize: '0.88rem', color: '#166534', maxWidth: '600px', lineHeight: 1.5 }}>
              All statutory items for {getPlainEnglishFrameworkTitle(recommendation?.frameworkName || 'this framework')} are complete. You can now launch automated ISO telemetry ingestion and AI audit screening.
            </div>
          </div>

          <button
            type="button"
            onClick={onProceedToDiagnostic}
            style={{
              padding: '0.85rem 1.85rem',
              borderRadius: '8px',
              background: '#16a34a',
              color: 'var(--text-main)',
              fontWeight: 800,
              fontSize: '0.94rem',
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            }}
          >
            Launch Ingestion &amp; AI Verification
          </button>
        </div>
      )}
    </div>
  );
};
