import { useState, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { useToast } from '../../contexts/ToastContext';
import apiClient from '../../apiClient';
import { ArrowLeft, KeyRound } from 'lucide-react';

export default function OTPVerification() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';
  const { showError, showSuccess } = useToast();

  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const inputRefs = useRef([]);

  const handleChange = (index, value) => {
    // Only allow single digit
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    // Auto-advance
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) {
      const next = [...digits];
      for (let i = 0; i < 6; i++) next[i] = pasted[i] || '';
      setDigits(next);
      inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    }
  };

  const otp = digits.join('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (otp.length < 6) { showError('Please enter the complete 6-digit code.'); return; }
    setIsLoading(true);
    try {
      const res = await apiClient.post('/auth/verify-otp', { email, otp });
      showSuccess('OTP verified!');
      navigate('/reset-password', { state: { reset_token: res.data.reset_token, email } });
    } catch (err) {
      showError(err.response?.data?.detail || 'Invalid or expired OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      await apiClient.post('/auth/forgot-password', { email });
      showSuccess('A new code has been sent to your email.');
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch {
      showError('Failed to resend code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 py-8 relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 right-0 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-20 left-0 h-96 w-96 rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="w-full max-w-md">
        <Link to="/forgot-password" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <div className="mb-6 text-center">
          <Link to="/" className="inline-block hover:opacity-80 transition-opacity">
            <img src="/logo.svg" alt="TheraAI" className="h-16 w-auto object-contain mx-auto" />
          </Link>
        </div>

        <Card className="shadow-xl border-border">
          <CardHeader className="space-y-1 pb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <KeyRound className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl" style={{ fontFamily: 'Montserrat' }}>Enter the code</CardTitle>
                <CardDescription>
                  Sent to <strong>{email || 'your email'}</strong>
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 6-digit OTP input */}
              <div className="flex justify-center gap-3" onPaste={handlePaste}>
                {digits.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => (inputRefs.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleChange(i, e.target.value)}
                    onKeyDown={e => handleKeyDown(i, e)}
                    autoFocus={i === 0}
                    className={`h-14 w-12 text-center text-2xl font-bold rounded-xl border-2 bg-background outline-none transition-all duration-200 ${
                      digit
                        ? 'border-primary text-primary'
                        : 'border-border focus:border-primary/60'
                    }`}
                  />
                ))}
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90"
                disabled={isLoading || otp.length < 6}
              >
                {isLoading ? 'Verifying...' : 'Verify code'}
              </Button>

              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Didn't receive it?{' '}
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={isResending}
                    className="text-primary hover:underline font-medium disabled:opacity-50"
                  >
                    {isResending ? 'Sending...' : 'Resend code'}
                  </button>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
