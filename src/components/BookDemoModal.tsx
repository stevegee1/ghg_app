import React, { useState, useEffect } from 'react';
import { BookDemoCard } from './BookDemoCard';

export interface BookDemoModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const BookDemoModal: React.FC<BookDemoModalProps> = ({
  isOpen: propIsOpen,
  onClose: propOnClose,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);

  const isVisible = propIsOpen !== undefined ? propIsOpen : internalOpen;

  const handleClose = () => {
    if (propOnClose) {
      propOnClose();
    } else {
      setInternalOpen(false);
    }
  };

  useEffect(() => {
    const handleGlobalOpen = () => setInternalOpen(true);
    const handleGlobalClose = () => setInternalOpen(false);

    window.addEventListener('open-book-demo-modal', handleGlobalOpen);
    window.addEventListener('close-book-demo-modal', handleGlobalClose);

    return () => {
      window.removeEventListener('open-book-demo-modal', handleGlobalOpen);
      window.removeEventListener('close-book-demo-modal', handleGlobalClose);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        handleClose();
      }
    };

    if (isVisible) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div
      className="book-demo-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Book Demo"
    >
      <div className="book-demo-modal-dialog">
        <BookDemoCard isModal={true} onClose={handleClose} />
      </div>
    </div>
  );
};
