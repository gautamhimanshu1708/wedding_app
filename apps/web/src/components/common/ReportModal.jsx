import React, { useState } from 'react';
import { X, Flag, AlertCircle } from 'lucide-react';
import { REPORT_REASONS } from '@wedding/shared';

export function ReportModal({ photo, onClose, onSubmit }) {
  const [selectedReason, setSelectedReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!photo) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(photo._id, selectedReason, details);
      onClose();
    } catch (err) {
      alert('Failed to submit report: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-royal-lg border border-gold/40 relative animate-scaleIn">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-deepBrown rounded-full"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-burgundy mb-2">
          <Flag className="w-5 h-5" />
          <h3 className="font-royal text-lg font-bold">Report Photo</h3>
        </div>

        <p className="text-xs text-gray-600 mb-4">
          Help maintain our royal wedding memories respectful and joyful.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-deepBrown mb-1">
              Reason for reporting
            </label>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gold bg-ivory/50"
            >
              {REPORT_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-deepBrown mb-1">
              Additional Details (Optional)
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              placeholder="Provide any helpful context for the wedding administrators..."
              className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gold bg-ivory/50 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-burgundy hover:bg-burgundyLight rounded-xl shadow-royal transition"
            >
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
