import { useState } from 'react';
import SessionNoteEditor from '../Therapist/SessionNoteEditor';
import { Button } from '../ui/button';
import { StickyNote, X } from 'lucide-react';

/**
 * Therapist-only in-call notes side panel.
 * Props: appointmentId, patientId
 */
export default function InCallNotes({ appointmentId, patientId }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        size="sm"
        variant="secondary"
        className="fixed right-4 top-4 z-[60] gap-2"
        onClick={() => setOpen((o) => !o)}
      >
        <StickyNote className="h-4 w-4" /> Notes
      </Button>

      {open && (
        <div className="fixed top-0 right-0 bottom-0 w-96 z-[55] bg-background border-l border-border shadow-2xl overflow-y-auto">
          <div className="flex items-center justify-between p-3 border-b border-border">
            <p className="font-semibold text-sm">Session Notes</p>
            <Button size="icon" variant="ghost" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="p-3">
            <SessionNoteEditor appointmentId={appointmentId} patientId={patientId} />
          </div>
        </div>
      )}
    </>
  );
}
