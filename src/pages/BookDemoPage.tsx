import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookDemoCard } from '../components/BookDemoCard';

export const BookDemoPage: React.FC = () => {
  useEffect(() => {
    document.title = 'Book a Demo — GHGEmissionLogs Continuous Statutory Assurance';
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="book-demo-page-container">
      {/* Background ambient lighting */}
      <div className="book-demo-ambient-glow" aria-hidden="true" />

      <div className="book-demo-page-content">
        {/* Navigation Breadcrumb */}
        <div className="book-demo-breadcrumb">
          <Link to="/" className="breadcrumb-link">
            ← Back to Overview
          </Link>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-current">Book Architecture Demo</span>
        </div>

        {/* Centered Dark Card matching screenshot */}
        <div className="book-demo-standalone-wrapper">
          <BookDemoCard isModal={false} />
        </div>

        {/* Enterprise trust badges below */}
        <div className="book-demo-trust-footer">
          <div className="trust-item">
            <span className="trust-dot">●</span>
            <span>UK CMA Green Claims Code Conforming</span>
          </div>
          <div className="trust-item">
            <span className="trust-dot">●</span>
            <span>ISO 14064 & 50001 Verified Ledger</span>
          </div>
          <div className="trust-item">
            <span className="trust-dot">●</span>
            <span>Strict Pre-Audit Mutual NDA Protection</span>
          </div>
        </div>
      </div>
    </div>
  );
};
