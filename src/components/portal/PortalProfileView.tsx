import React from 'react';

interface PortalProfileViewProps {
  user: any;
  displayName: string;
  profileSuccess: string | null;
  profileError: string | null;
  profileSaving: boolean;
  profileFirstName: string;
  setProfileFirstName: (v: string) => void;
  profileLastName: string;
  setProfileLastName: (v: string) => void;
  profileCompanyName: string;
  setProfileCompanyName: (v: string) => void;
  profileRegNo: string;
  setProfileRegNo: (v: string) => void;
  profileJobTitle: string;
  setProfileJobTitle: (v: string) => void;
  profilePrimaryRole: string;
  setProfilePrimaryRole: (v: string) => void;
  profileCountry: string;
  setProfileCountry: (v: string) => void;
  profileIndustry: string;
  setProfileIndustry: (v: string) => void;
  profileWebsiteUrl: string;
  setProfileWebsiteUrl: (v: string) => void;
  handleSaveProfile: (e: React.FormEvent) => void;
}

export const PortalProfileView: React.FC<PortalProfileViewProps> = ({
  user,
  displayName,
  profileSuccess,
  profileError,
  profileSaving,
  profileFirstName,
  setProfileFirstName,
  profileLastName,
  setProfileLastName,
  profileCompanyName,
  setProfileCompanyName,
  profileRegNo,
  setProfileRegNo,
  profileJobTitle,
  setProfileJobTitle,
  profilePrimaryRole,
  setProfilePrimaryRole,
  profileCountry,
  setProfileCountry,
  profileIndustry,
  setProfileIndustry,
  profileWebsiteUrl,
  setProfileWebsiteUrl,
  handleSaveProfile,
}) => {
  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
          gap: '1.5rem',
          marginBottom: '1.75rem',
        }}
      >
        {/* Account Identity Card */}
        <div className="persefoni-card" style={{ padding: '1.75rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            Client Profile &amp; Organization
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-subtle)',
                color: 'var(--color-sky)',
                border: '1px solid var(--border-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                <path d="M9 22v-4h6v4" />
                <path d="M8 6h.01" />
                <path d="M16 6h.01" />
                <path d="M8 10h.01" />
                <path d="M16 10h.01" />
                <path d="M8 14h.01" />
                <path d="M16 14h.01" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {displayName}
              </div>
              {user?.licenseeId && (
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                  ID: {user.licenseeId}
                </div>
              )}
              <div style={{ fontSize: '0.78rem', color: 'var(--color-green)', fontWeight: 600, marginTop: '2px' }}>
                ● Verified Statutory Licensee
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.82rem', borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)' }}>Registered Email:</span>
              <div style={{ textAlign: 'right' }}>
                <strong style={{ color: 'var(--text-main)', display: 'block' }}>{user?.email || 'N/A'}</strong>
                <span style={{ fontSize: '0.72rem', color: user?.emailVerified ? '#16a34a' : '#d97706', fontWeight: 600 }}>
                  {user?.emailVerified ? '● Verified Work Email' : '● Verification Pending'}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Security Role:</span>
              <strong style={{ color: 'var(--text-main)' }}>{user?.role || 'PARTNER'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Transport Security:</span>
              <span style={{ color: 'var(--color-sky)', fontWeight: 600 }}>256-bit TLS Encrypted</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Assurance Standard:</span>
              <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>ISO 19011:2026 Ready</span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Organization Profile Form Card */}
      <div className="persefoni-card" style={{ padding: '1.75rem', marginBottom: '1.75rem' }}>
        <div style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.85rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 0.25rem 0', color: 'var(--text-main)' }}>
            Organization &amp; Compliance Officer Profile
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
            Update your statutory entity information, regulatory role, and business registration numbers.
          </p>
        </div>

        {profileSuccess && (
          <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#16a34a', fontSize: '0.84rem', fontWeight: 600, marginBottom: '1.25rem' }}>
            {profileSuccess}
          </div>
        )}

        {profileError && (
          <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#dc2626', fontSize: '0.84rem', fontWeight: 600, marginBottom: '1.25rem' }}>
            {profileError}
          </div>
        )}

        <form onSubmit={handleSaveProfile}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                First Name
              </label>
              <input
                type="text"
                value={profileFirstName}
                onChange={(e) => setProfileFirstName(e.target.value)}
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-light)', background: 'var(--bg-subtle)', color: 'var(--text-main)', fontSize: '0.85rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                Last Name
              </label>
              <input
                type="text"
                value={profileLastName}
                onChange={(e) => setProfileLastName(e.target.value)}
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-light)', background: 'var(--bg-subtle)', color: 'var(--text-main)', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                Company / Organization Name
              </label>
              <input
                type="text"
                required
                value={profileCompanyName}
                onChange={(e) => setProfileCompanyName(e.target.value)}
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-light)', background: 'var(--bg-subtle)', color: 'var(--text-main)', fontSize: '0.85rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                Company Registration Number (e.g. Companies House)
              </label>
              <input
                type="text"
                placeholder="e.g. 12345678"
                value={profileRegNo}
                onChange={(e) => setProfileRegNo(e.target.value)}
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-light)', background: 'var(--bg-subtle)', color: 'var(--text-main)', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                Job Title
              </label>
              <input
                type="text"
                placeholder="e.g. Head of Sustainability &amp; Assurance"
                value={profileJobTitle}
                onChange={(e) => setProfileJobTitle(e.target.value)}
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-light)', background: 'var(--bg-subtle)', color: 'var(--text-main)', fontSize: '0.85rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                Primary Assurance Role
              </label>
              <select
                value={profilePrimaryRole}
                onChange={(e) => setProfilePrimaryRole(e.target.value)}
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-light)', background: 'var(--bg-subtle)', color: 'var(--text-main)', fontSize: '0.85rem' }}
              >
                <option value="COMPLIANCE_OFFICER">Compliance / Legal Officer</option>
                <option value="SUSTAINABILITY_DIRECTOR">Sustainability Director / ESG Lead</option>
                <option value="MANAGING_DIRECTOR">Managing Director / C-Suite Executive</option>
                <option value="OPERATIONS_MANAGER">Operations / Facility Manager</option>
                <option value="AUDITOR">Internal / External Auditor</option>
                <option value="OTHER">Other Authorized Representative</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                Jurisdiction / Country
              </label>
              <select
                value={profileCountry}
                onChange={(e) => setProfileCountry(e.target.value)}
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-light)', background: 'var(--bg-subtle)', color: 'var(--text-main)', fontSize: '0.85rem' }}
              >
                <option value="GB">United Kingdom (GB)</option>
                <option value="US">United States (US)</option>
                <option value="DE">Germany (DE)</option>
                <option value="FR">France (FR)</option>
                <option value="NL">Netherlands (NL)</option>
                <option value="AE">United Arab Emirates (AE)</option>
                <option value="OTHER">Other International Jurisdiction</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                Industry Sector
              </label>
              <select
                value={profileIndustry}
                onChange={(e) => setProfileIndustry(e.target.value)}
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-light)', background: 'var(--bg-subtle)', color: 'var(--text-main)', fontSize: '0.85rem' }}
              >
                <option value="MANUFACTURING">Manufacturing &amp; Heavy Industry</option>
                <option value="ENERGY">Energy, Utilities &amp; Clean Tech</option>
                <option value="CONSTRUCTION">Construction &amp; Real Estate Development</option>
                <option value="TRANSPORT">Transport, Logistics &amp; Fleet</option>
                <option value="TECH">Technology, Software &amp; Data Centers</option>
                <option value="PROFESSIONAL_SERVICES">Professional Services &amp; Consultancy</option>
                <option value="PUBLIC_SECTOR">Public Sector &amp; Local Authorities</option>
                <option value="RETAIL">Retail &amp; Consumer Goods</option>
                <option value="AGRICULTURE">Agriculture, Food &amp; Land Use</option>
                <option value="OTHER">Other Specialized Sector</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
              Official Corporate Website
            </label>
            <input
              type="url"
              placeholder="https://example.com"
              value={profileWebsiteUrl}
              onChange={(e) => setProfileWebsiteUrl(e.target.value)}
              style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-light)', background: 'var(--bg-subtle)', color: 'var(--text-main)', fontSize: '0.85rem' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={profileSaving}
              className="btn btn-primary"
              style={{ fontSize: '0.85rem', padding: '0.6rem 1.5rem', fontWeight: 700 }}
            >
              {profileSaving ? 'Saving Changes...' : 'Save Organization Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
