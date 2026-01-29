import { useEffect } from 'react';

interface SignatureViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  client: string;
  driver: string;
  timestamp: string;
}

export default function SignatureViewerModal({
  isOpen,
  onClose,
  clientName,
  client,
  driver,
  timestamp
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

  // Force extract timestamp - ignores text like 'Доставено и подписано', searches for ISO date
  const formatTimestamp = (ts: string): string => {
    // Try multiple regex patterns to find a date/time
    const patterns = [
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?/,  // Full ISO with time
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,              // ISO without milliseconds
      /\d{4}-\d{2}-\d{2}T[\d:.]+Z?/,                       // ISO partial
      /\d{2}\.\d{2}\.\d{4}/,                               // DD.MM.YYYY format
    ];

    let extractedDate: Date | null = null;

    for (const pattern of patterns) {
      const match = ts?.match(pattern);
      if (match) {
        const parsed = new Date(match[0]);
        if (!Number.isNaN(parsed.getTime())) {
          extractedDate = parsed;
          break;
        }
      }
    }

    // Fallback to current date if no valid date found
    if (!extractedDate) {
      extractedDate = new Date();
    }

    return formatDateObject(extractedDate);
  };

  const formatDateObject = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${day}.${month}.${year} г. в ${hours}:${minutes}:${seconds} ч.`;
  };

  const renderSignature = (signature: string, label: string) => {
    return (
      <div className="flex flex-col items-center">
        <p className="mb-2 text-sm font-semibold text-slate-700">{label}</p>
        <div className="flex h-48 w-full items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-white p-3">
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

  const formattedTime = formatTimestamp(timestamp);

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

        <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
          {/* Client Name - Larger and bolder */}
          <p className="text-center text-2xl font-extrabold text-slate-900">
            {clientName}
          </p>

          {/* Time Badge */}
          <div className="mt-4 flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm font-black text-blue-700">
                {formattedTime}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {renderSignature(client, 'Подпис на клиент')}
          {renderSignature(driver, 'Подпис на шофьор')}
        </div>

        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-700 px-10 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-slate-600 hover:shadow-lg active:scale-95"
          >
            Затвори
          </button>
        </div>
      </div>
    </div>
  );
}
