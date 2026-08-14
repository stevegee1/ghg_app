import React, { useState } from 'react';

interface BrandLogoUploaderProps {
  onLogoSelected: (logoUrl: string, logoName: string) => void;
}

const DEFAULT_PARTNERS = [
  {
    id: 'lic_itm_power',
    name: 'ITM Power CleanTech',
    logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'lic_jcb_test',
    name: 'JCB Industrial',
    logoUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'lic_arsenal_fc',
    name: 'Arsenal FC Merchandise',
    logoUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=300&q=80',
  },
];

export const BrandLogoUploader: React.FC<BrandLogoUploaderProps> = ({ onLogoSelected }) => {
  const [selectedLogo, setSelectedLogo] = useState<string>(DEFAULT_PARTNERS[0].logoUrl);
  const [logoName, setLogoName] = useState<string>(DEFAULT_PARTNERS[0].name);
  const [dragActive, setDragActive] = useState<boolean>(false);

  const handleFileChange = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, SVG, JPG).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setSelectedLogo(url);
      setLogoName(file.name.replace(/\.[^/.]+$/, ''));
      onLogoSelected(url, file.name);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <label className="form-label">Select Pre-loaded Partner Brand or Upload Custom Logo</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
          {DEFAULT_PARTNERS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setSelectedLogo(p.logoUrl);
                setLogoName(p.name);
                onLogoSelected(p.logoUrl, p.name);
              }}
              className="btn btn-secondary"
              style={{
                fontSize: '0.75rem',
                padding: '0.5rem',
                borderColor: selectedLogo === p.logoUrl ? 'var(--accent-primary)' : 'var(--border-medium)',
                backgroundColor: selectedLogo === p.logoUrl ? 'var(--accent-light)' : 'var(--bg-subtle)',
              }}
            >
              {p.name}
            </button>
          ))}
        </div>

        {/* Drag & Drop Upload Zone */}
        <div
          className={`dropzone ${dragActive ? 'active' : ''}`}
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
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileChange(e.target.files[0]);
              }
            }}
          />
          <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>📁</div>
          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Drag & Drop Official Brand Logo Image</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Supports high-res PNG, SVG, JPG</div>
        </div>
      </div>

      {/* Live Overlay Canvas Preview */}
      <div>
        <label className="form-label" style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          Live Canvas Preview: Official GHG Accountability Mark Overlay
        </label>
        <div className="logo-canvas-preview">
          <img src={selectedLogo} alt={logoName} className="base-logo" />
          <div className="overlay-badge">
            <span style={{ color: 'var(--accent-emerald)' }}>⚡</span> GHG LOGO DROP VERIFIED
          </div>
        </div>
      </div>
    </div>
  );
};
