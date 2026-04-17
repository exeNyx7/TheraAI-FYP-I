import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';

export function EscalationModal({ open, onOpenChange }) {
  const navigate = useNavigate();

  const handleBook = () => {
    onOpenChange?.(false);
    navigate('/therapists', { state: { fromEscalation: true } });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>We're here to help</DialogTitle>
          <DialogDescription>
            It sounds like you're going through a difficult time. Would you like to book a session
            with a therapist? Your first session is free.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange?.(false)}>
            Not Now
          </Button>
          <Button className="bg-primary hover:bg-primary/90" onClick={handleBook}>
            Book Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default EscalationModal;
