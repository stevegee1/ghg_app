import React, { useState } from 'react';

interface BrandLogoUploaderProps {
  onLogoSelected: (logoUrl: string, logoName: string) => void;
  initialLogoUrl?: string;
  initialLogoName?: string;
}

export const BrandLogoUploader: React.FC<BrandLogoUploaderProps> = ({
  onLogoSelected,
  initialLogoUrl = '',
  initialLogoName = '',
}) => {
  const [selectedLogo, setSelectedLogo] = useState<string>(initialLogoUrl);
  const [logoName, setLogoName] = useState<string>(initialLogoName);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = (file: File) => {
    setUploadError(null);

    if (!file.type.startsWith('image/')) {
      setUploadError('Invalid file type. Please upload an image file (SVG, PNG, JPG, or WebP).');
      return;
    }

    // 5MB limit
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size exceeds 5MB limit. Please upload an optimized vector or raster asset.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      const cleanName = file.name.replace(/\.[^/.]+$/, '');
      setSelectedLogo(url);
      setLogoName(cleanName);
      onLogoSelected(url, cleanName);
    };
    reader.onerror = () => {
      setUploadError('Failed to read selected image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleClear = () => {
    setSelectedLogo('');
    setLogoName('');
    setUploadError(null);
    onLogoSelected('', '');
  };

  return (
    <div>
      <div style={{ marginBottom: '1.25rem' }}>
        {uploadError && (
          <div
            style={{
              padding: '0.65rem 0.85rem',
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid var(--google-red, #dc2626)',
              borderRadius: '8px',
              color: 'var(--google-red, #dc2626)',
              fontSize: '0.82rem',
              marginBottom: '0.75rem',
            }}
          >
            {uploadError}
          </div>
        )}

        {/* Drag & Drop Upload Zone */}
        <div
          className={`dropzone ${dragActive ? 'active' : ''}`}
          style={{
            border: '2px dashed var(--border-medium, #cbd5e1)',
            borderRadius: '10px',
            padding: '2rem 1.5rem',
            textAlign: 'center',
            backgroundColor: dragActive ? 'rgba(2, 132, 199, 0.04)' : 'var(--bg-subtle, #f8fafc)',
            cursor: 'pointer',
            transition: 'border-color 0.2s ease, background-color 0.2s ease',
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              handleFileChange(e.dataTransfer.files[0]);
            }
          }}
          onClick={() => {
            const input = document.getElementById('logo-file-input');
            input?.click();
          }}
        >
          <input
            id="logo-file-input"
            type="file"
            accept="image/png,image/svg+xml,image/jpeg,image/webp"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileChange(e.target.files[0]);
              }
            }}
          />

          <div
            style={{
              width: '44px',
              height: '44px',
              margin: '0 auto 0.75rem auto',
              borderRadius: '50%',
              backgroundColor: 'rgba(2, 132, 199, 0.08)',
              color: 'var(--color-sky-dark, #0284c7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>

          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main, #0f172a)' }}>
            Upload Official Brand Logo Asset
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #64748b)', marginTop: '0.25rem' }}>
            Drag and drop your official high-resolution logo (SVG, PNG, WebP, or JPG up to 5MB)
          </div>
        </div>
      </div>

      {/* Live Overlay Canvas Preview */}
      {selectedLogo ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label className="form-label" style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
              Live Canvas Preview: Official GHG Accountability Mark Overlay
            </label>
            <button
              type="button"
              onClick={handleClear}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--google-red, #dc2626)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '2px 6px',
              }}
            >
              Replace Asset
            </button>
          </div>

          <div className="logo-canvas-preview">
            <img src={selectedLogo} alt={logoName || 'Official Brand Logo'} className="base-logo" />
            <div className="overlay-badge">
              <span style={{ color: 'var(--accent-primary)', fontWeight: 800 }}>GHG</span> LOGO DROP VERIFIED
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: '1.25rem',
            borderRadius: '8px',
            border: '1px solid var(--border-light, #e2e8f0)',
            backgroundColor: 'var(--bg-subtle, #f8fafc)',
            textAlign: 'center',
            fontSize: '0.82rem',
            color: 'var(--text-muted, #64748b)',
          }}
        >
          No brand logo selected yet. Upload an asset above to inspect the live dual-mark verification overlay.
        </div>
      )}
    </div>
  );
};
