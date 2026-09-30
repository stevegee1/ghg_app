import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export interface PreparationChecklistConsoleProps {
  onProceedToDiagnostic?: () => void;
}

export const PreparationChecklistConsole: React.FC<PreparationChecklistConsoleProps> = ({
  onProceedToDiagnostic,
}) => {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [checklists, setChecklists] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChecklistId, setSelectedChecklistId] = useState<string | null>(null);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);

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

  const handleUpdateItemStatus = async (itemId: string, newStatus: string) => {
    if (!token) return;
    setUpdatingItemId(itemId);
    try {
      await api.updateChecklistItem(token, itemId, { status: newStatus });
      await fetchChecklists();
    } catch (err: any) {
      setError(err.message || 'Failed to update item status');
    } finally {
      setUpdatingItemId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#94a3b8' }}>
        <div style={{ marginBottom: '1rem', fontSize: '1rem', color: '#cbd5e1' }}>
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
  const isAnyFrameworkReady = checklists.some((c) => c.isReadyToIngest);

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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>
                Preparation & Evidence Gathering Console
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
            <p style={{ fontSize: '0.86rem', color: '#94a3b8', margin: 0, maxWidth: '620px', lineHeight: 1.5 }}>
              Prepare and organize your baseline utility bills, meters, and governance policies below. Once mandatory items are satisfied, your dossier unlocks automated ISO diagnostic screening.
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
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

      {/* Framework Selector Tabs */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {checklists.map((c) => {
          const isSelected = c.id === selectedChecklistId;
          const isReady = c.isReadyToIngest;

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
              <span>{c.recommendation?.frameworkName || 'Compliance Framework'}</span>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
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

      {/* Checklist Items List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '2rem' }}>
        {items.map((item: any) => {
          const isComplete = item.status === 'COMPLETE';
          const isWaived = item.status === 'WAIVED';
          const isInProgress = item.status === 'IN_PROGRESS';
          const isUpdating = updatingItemId === item.id;

          return (
            <div
              key={item.id}
              style={{
                background: isComplete ? 'rgba(15, 23, 42, 0.6)' : '#0d1424',
                borderRadius: '8px',
                border: `1px solid ${isComplete ? '#1e293b' : item.isMandatory ? 'rgba(56, 189, 248, 0.2)' : '#1e293b'}`,
                padding: '1.15rem 1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '1rem',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <span
                    style={{
                      fontSize: '0.92rem',
                      fontWeight: 600,
                      color: isComplete ? '#cbd5e1' : '#f8fafc',
                      textDecoration: isComplete ? 'line-through' : 'none',
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

                <div style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.4, marginBottom: '0.5rem' }}>
                  {item.plainEnglishGuidance}
                </div>

                {isWaived && item.waivedReason && (
                  <div style={{ fontSize: '0.76rem', color: '#facc15', background: 'rgba(234, 179, 8, 0.08)', padding: '0.35rem 0.65rem', borderRadius: '4px', display: 'inline-block' }}>
                    Auditor Note: {item.waivedReason}
                  </div>
                )}
              </div>

              {/* Action Dropdown / Toggle */}
              <div style={{ minWidth: '160px', textAlign: 'right' }}>
                <select
                  disabled={isUpdating || isWaived}
                  value={item.status}
                  onChange={(e) => handleUpdateItemStatus(item.id, e.target.value)}
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    background: isComplete ? 'rgba(34, 197, 94, 0.12)' : isInProgress ? 'rgba(56, 189, 248, 0.12)' : '#080c14',
                    border: `1px solid ${isComplete ? '#22c55e' : isInProgress ? '#38bdf8' : '#334155'}`,
                    color: isComplete ? '#4ade80' : isInProgress ? '#38bdf8' : '#cbd5e1',
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
              All statutory items for {recommendation?.frameworkName || 'this framework'} are complete. You can now launch automated ISO telemetry ingestion and AI audit screening.
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
            Launch Ingestion & AI Verification &rarr;
          </button>
        </div>
      )}
    </div>
  );
};
