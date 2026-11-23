import React, { useState } from 'react';
import { AlertTriangle, Trash2, X, Check, RefreshCw } from 'lucide-react';

interface ConfirmActionModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  sqlStatement?: string;
  confirmButtonLabel?: string;
  isDestructive?: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const ConfirmActionModal: React.FC<ConfirmActionModalProps> = ({
  isOpen,
  title,
  description,
  sqlStatement,
  confirmButtonLabel = 'Execute',
  isDestructive = true,
  onClose,
  onConfirm,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirm();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 font-sans select-none"
      onClick={onClose}
    >
      <div
        className="bg-[#252526] border border-[#3c3c3c] rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#2d2d2d] border-b border-[#3c3c3c]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            <h3 className="font-bold text-white text-sm">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#858585] hover:text-white rounded hover:bg-[#3c3c3c]"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3">
          <p className="text-[#cccccc] leading-relaxed">{description}</p>

          {sqlStatement && (
            <div>
              <span className="block text-[11px] text-[#858585] mb-1 font-mono">
                SQL Statement:
              </span>
              <pre className="bg-[#111111] border border-[#333333] rounded p-2.5 text-rose-300 font-mono text-xs select-text overflow-x-auto">
                {sqlStatement}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 bg-[#2d2d2d] border-t border-[#3c3c3c]">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-3 py-1.5 bg-[#333333] hover:bg-[#3c3c3c] text-white rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isProcessing}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded font-medium text-white transition-colors ${
              isDestructive
                ? 'bg-rose-700 hover:bg-rose-600'
                : 'bg-[#007acc] hover:bg-[#0062a3]'
            }`}
          >
            {isProcessing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : isDestructive ? (
              <Trash2 className="w-3.5 h-3.5" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            <span>{isProcessing ? 'Executing...' : confirmButtonLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
