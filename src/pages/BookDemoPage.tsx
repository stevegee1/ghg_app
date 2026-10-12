import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookDemoCard } from '../components/BookDemoCard';

export const BookDemoPage: React.FC = () => {
  useEffect(() => {
    document.title = 'Schedule an Enterprise Assurance Demo - NFTYLOGS';
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
            &larr; Back to Overview
          </Link>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-current">Schedule Enterprise Demo</span>
        </div>

        {/* Persefoni-style Split Bento Layout */}
        <div className="book-demo-standalone-wrapper">
          <BookDemoCard isModal={false} />
        </div>

        {/* What the service does, stated plainly */}
        <div className="book-demo-trust-footer">
          <div className="trust-item">
            <span className="trust-dot">&bull;</span>
            <span>Reviews against ISO 14064-1, SECR and the Green Claims Code</span>
          </div>
          <div className="trust-item">
            <span className="trust-dot">&bull;</span>
            <span>Remote review following ISO 19011:2026 guidance</span>
          </div>
          <div className="trust-item">
            <span className="trust-dot">&bull;</span>
            <span>Mutual NDA available before the demo</span>
          </div>
          <div className="trust-item">
            <span className="trust-dot">&bull;</span>
            <span>Credentials anyone can check online</span>
          </div>
        </div>
      </div>
    </div>
  );
};
