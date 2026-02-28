import { useEffect } from 'react';

interface SignatureViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  client: string;
  driver: string;
}

export default function SignatureViewerModal({
  isOpen,
  onClose,
  clientName,
  client,
  driver
}: SignatureViewerModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const renderSignature = (signature: string, label: string) => {
    return (
      <div className="flex flex-col items-center">
        <p className="mb-3 text-sm font-semibold text-slate-700">{label}</p>
        <div className="flex h-56 w-full items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white p-4">
          {signature ? (
            <img
              src={signature}
              alt={label}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <span className="text-sm italic text-slate-400">Липсва подпис</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="signature-modal-title"
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-slate-100 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2
            id="signature-modal-title"
            className="text-xl font-bold text-slate-900"
          >
            📝 Подписи за доставка
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
            aria-label="Затвори"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Client Name - Centered and bold */}
        <div className="mb-6 rounded-lg bg-white p-5 shadow-sm">
          <p className="text-center text-2xl font-extrabold text-slate-900">
            {clientName}
          </p>
        </div>

        {/* Signature boxes - Large and clear */}
        <div className="grid gap-6 md:grid-cols-2">
          {renderSignature(client, 'Подпис на клиент')}
          {renderSignature(driver, 'Подпис на шофьор')}
        </div>

        {/* Close button - Centered at bottom */}
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-700 px-12 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-slate-600 hover:shadow-lg active:scale-95"
          >
            Затвори
          </button>
        </div>
      </div>
    </div>
  );
}
