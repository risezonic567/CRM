import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { StickyNote, X, Loader2 } from 'lucide-react';
import { useAddCallNoteMutation } from '../../../REDUX_FEATURES/REDUX_SLICES/Call_api/callApi';
import { CALL_DISPOSITIONS } from '../../../constants/dispositions';
import Can from '../../shared/Can';
import { can } from '../../roles';
import { getErrorMessage } from '../../../utils/getErrorMessage';

const labelFor = (value) =>
  CALL_DISPOSITIONS.find((d) => d.value === value)?.label || value;

const noteAuthor = (note) => {
  const u = note?.addedBy;
  if (!u || typeof u === 'string') return 'Agent';
  return `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Agent';
};

/**
 * View locked remarks + append-only follow-up notes for a call.
 */
const CallNotesModal = ({ open, call, onClose }) => {
  const [text, setText] = useState('');
  const [addCallNote, { isLoading }] = useAddCallNoteMutation();

  useEffect(() => {
    if (open) setText('');
  }, [open, call?._id]);

  if (!open || !call) return null;

  const notes = Array.isArray(call.followUpNotes) ? [...call.followUpNotes] : [];
  notes.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  const handleClose = () => onClose?.();

  const handleAdd = async () => {
    if (!can('call.create')) {
      toast.error('Viewers cannot add notes');
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) {
      toast.error('Please enter a note');
      return;
    }

    try {
      await addCallNote({ id: call._id, text: trimmed }).unwrap();
      toast.success('Note added');
      setText('');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to add note'));
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="call-notes-title"
      >
        <div className="p-4 sm:px-6 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 shrink-0">
              <StickyNote className="w-4 h-4" strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <h2
                id="call-notes-title"
                className="text-base font-bold text-slate-900 truncate"
              >
                Call notes
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {labelFor(call.disposition)}
                {call.callerName ? ` · ${call.callerName}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 w-7 h-7 rounded-md flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Original remarks
            </p>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-700 whitespace-pre-wrap">
              {call.remarks?.trim() ? call.remarks : '— No remarks captured —'}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Locked — cannot be edited</p>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Follow-up notes ({notes.length})
            </p>
            {notes.length === 0 ? (
              <p className="text-xs text-slate-500 border border-dashed border-slate-200 rounded-lg px-3 py-4 text-center">
                No follow-up notes yet. Add anything you remembered after the call.
              </p>
            ) : (
              <ul className="space-y-2">
                {notes.map((note) => (
                  <li
                    key={note._id || `${note.createdAt}-${note.text?.slice(0, 12)}`}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2.5"
                  >
                    <p className="text-xs text-slate-800 whitespace-pre-wrap">{note.text}</p>
                    <p className="text-[10px] text-slate-400 mt-1.5">
                      {noteAuthor(note)}
                      {note.createdAt
                        ? ` · ${new Date(note.createdAt).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}`
                        : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Can do="call.create">
            <div>
              <label
                htmlFor="call-follow-up-note"
                className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block"
              >
                Add follow-up note
              </label>
              <textarea
                id="call-follow-up-note"
                rows={3}
                maxLength={2000}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Details you remembered later…"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600 resize-y min-h-[72px]"
              />
            </div>
          </Can>
        </div>

        <div className="py-3 px-4 sm:px-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="px-3.5 py-2 text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            Close
          </button>
          <Can do="call.create">
            <button
              type="button"
              disabled={isLoading || !text.trim()}
              onClick={handleAdd}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg border border-slate-900 transition-colors shadow-xs cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving…
                </>
              ) : (
                'Add note'
              )}
            </button>
          </Can>
        </div>
      </div>
    </div>
  );
};

export default CallNotesModal;
