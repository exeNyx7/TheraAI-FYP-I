import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { useToast } from '../../contexts/ToastContext';
import apiClient from '../../apiClient';
import { ArrowLeft, Lock, CheckCircle2 } from 'lucide-react';

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const reset_token = location.state?.reset_token || '';
  const email = location.state?.email || '';
  const { showError, showSuccess } = useToast();

  const [newPass, setNewPass]       = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [isLoading, setIsLoading]   = useState(false);
  const [done, setDone]             = useState(false);

  if (!reset_token) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Invalid or expired reset link.</p>
          <Link to="/forgot-password" className="text-primary hover:underline">Request a new one</Link>
        </div>
      </main>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPass !== confirmPass) { showError('Passwords do not match.'); return; }
    if (newPass.length < 8)      { showError('Password must be at least 8 characters.'); return; }
    setIsLoading(true);
    try {
      await apiClient.post('/auth/reset-password', {
        reset_token,
        new_password: newPass,
        confirm_password: confirmPass,
      });
      setDone(true);
      showSuccess('Password reset successfully!');
    } catch (err) {
      showError(err.response?.data?.detail || 'Failed to reset password. The link may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 py-8 relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 right-0 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-20 left-0 h-96 w-96 rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="w-full max-w-md">
        {!done && (
          <Link to="/otp-verification" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        )}

        <Card className="shadow-xl border-border">
          <CardHeader className="space-y-1 pb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl" style={{ fontFamily: 'Montserrat' }}>
                  {done ? 'Password reset!' : 'Set new password'}
                </CardTitle>
                <CardDescription>
                  {done ? 'You can now log in with your new password.' : `For ${email || 'your account'}`}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {done ? (
              <div className="space-y-4 text-center py-4">
                <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
                <p className="text-muted-foreground text-sm">
                  Your password has been updated. Please log in with your new credentials.
                </p>
                <Button className="w-full bg-primary hover:bg-primary/90" onClick={() => navigate('/login')}>
                  Go to login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">New password</label>
                  <Input
                    type="password"
                    placeholder="Min 8 chars, uppercase, digit"
                    value={newPass}
                    onChange={e => setNewPass(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Confirm new password</label>
                  <Input
                    type="password"
                    placeholder="Repeat your password"
                    value={confirmPass}
                    onChange={e => setConfirmPass(e.target.value)}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90"
                  disabled={isLoading || !newPass || !confirmPass}
                >
                  {isLoading ? 'Resetting...' : 'Reset password'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
