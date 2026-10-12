import React from 'react';
import { Link } from 'react-router-dom';

/** Routes charities and delivery partners to their application pages. */
export const MerchPartnerLinks: React.FC = () => (
  <div className="merch-partner-links">
    <Link to="/partners/charities" className="merch-partner-link">
      <span>
        <strong>Registered charity?</strong>
        <span>Apply to receive a share of every payment</span>
      </span>
      <span aria-hidden="true">→</span>
    </Link>
    <Link to="/partners/delivery" className="merch-partner-link">
      <span>
        <strong>Print or delivery business?</strong>
        <span>Apply to fulfil orders near you</span>
      </span>
      <span aria-hidden="true">→</span>
    </Link>
  </div>
);
