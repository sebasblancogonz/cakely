import React, { useEffect, useRef } from 'react';

function Modal({ isOpen, onClose, children }: { isOpen: boolean; onClose: () => void; children: React.ReactNode }) {
  const modalRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;
  
    return (
      <div 
      ref={modalRef}
      tabIndex={-1} className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
        <div className="max-h-[80vh] overflow-y-auto bg-white rounded-lg shadow-lg p-6 w-full max-w-xl"  onClick={(e) => e.stopPropagation()}>
          {children}
        </div>
      </div>
    );
  }

export default Modal;