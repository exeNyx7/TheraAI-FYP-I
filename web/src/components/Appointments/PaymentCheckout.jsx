import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { X, CreditCard, Shield, CheckCircle } from 'lucide-react';

export function PaymentCheckout({ appointment, onSuccess, onClose }) {
  const [step, setStep] = useState('payment'); // 'payment' | 'processing' | 'success'
  const [form, setForm] = useState({
    cardNumber: '',
    expiry: '',
    cvv: '',
    name: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStep('processing');
    await new Promise(r => setTimeout(r, 2000)); // Simulate payment
    setStep('success');
    setTimeout(() => onSuccess?.(), 1500);
  };

  const formatCardNumber = (v) => v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})/g, '$1 ').trim();
  const formatExpiry = (v) => {
    const clean = v.replace(/\D/g, '').slice(0, 4);
    if (clean.length > 2) return clean.slice(0, 2) + '/' + clean.slice(2);
    return clean;
  };

  if (step === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
          <CreditCard className="h-8 w-8 text-primary" />
        </div>
        <p className="text-lg font-semibold">Processing Payment...</p>
        <p className="text-muted-foreground text-sm">Please wait</p>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
          <CheckCircle className="h-10 w-10 text-green-500" />
        </div>
        <p className="text-lg font-semibold">Payment Successful!</p>
        <p className="text-muted-foreground text-sm">Your appointment has been booked.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold">Complete Payment</h3>
        <Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>
      </div>

      {appointment && (
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <p className="text-sm font-medium">Session with {appointment.therapistName}</p>
            <p className="text-xs text-muted-foreground">{appointment.date} at {appointment.time}</p>
            <p className="text-lg font-bold text-primary mt-2">PKR 3,000</p>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Cardholder Name</label>
          <Input
            placeholder="Name on card"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Card Number</label>
          <div className="relative">
            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="0000 0000 0000 0000"
              value={form.cardNumber}
              onChange={e => setForm({ ...form, cardNumber: formatCardNumber(e.target.value) })}
              className="pl-10"
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Expiry</label>
            <Input
              placeholder="MM/YY"
              value={form.expiry}
              onChange={e => setForm({ ...form, expiry: formatExpiry(e.target.value) })}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">CVV</label>
            <Input
              placeholder="123"
              value={form.cvv}
              onChange={e => setForm({ ...form, cvv: e.target.value.replace(/\D/g, '').slice(0, 3) })}
              required
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Shield className="h-4 w-4 text-green-500" />
          Your payment information is encrypted and secure.
        </div>

        <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
          Pay PKR 3,000
        </Button>
      </form>
    </div>
  );
}
