import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

function LoginOctopusBrand() {
  return (
    <div className="flex flex-col items-center">
      <style>{`
        .login-geometric-octopus {
          width: 120px;
          height: 120px;
          animation: login-ocean-pulse 3s ease-in-out infinite;
        }

        @keyframes login-ocean-pulse {
          0%, 100% {
            transform: scale(0.96);
            filter: drop-shadow(0 0 8px rgba(14, 165, 233, 0.4));
          }
          50% {
            transform: scale(1.04);
            filter: drop-shadow(0 0 20px rgba(14, 165, 233, 0.8));
          }
        }

        .login-tentacle-path {
          stroke-dasharray: 100;
          stroke-dashoffset: 100;
          animation: login-draw-tentacles 2.5s ease-in-out infinite alternate;
        }

        .login-tp-1 { animation-delay: 0s; }
        .login-tp-2 { animation-delay: 0.2s; }
        .login-tp-3 { animation-delay: 0.4s; }
        .login-tp-4 { animation-delay: 0.6s; }

        @keyframes login-draw-tentacles {
          0% { stroke-dashoffset: 100; opacity: 0.4; }
          100% { stroke-dashoffset: 0; opacity: 1; }
        }
      `}</style>

      <svg
        className="login-geometric-octopus"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M50 15C33.5 15 25 26 25 42C25 50 31 56 42 56H58C69 56 75 50 75 42C75 26 66.5 15 50 15Z"
          stroke="#38bdf8"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M34 38C34 26 42 22 50 22C58 22 66 26 66 38"
          stroke="#0284c7"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.7"
        />
        <path
          className="login-tentacle-path login-tp-1"
          d="M 32,54 C 18,58 10,74 22,86 C 30,92 40,82 36,70 C 34,64 36,56 42,56"
          stroke="#38bdf8"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          className="login-tentacle-path login-tp-2"
          d="M 44,56 C 38,68 28,78 38,88 C 44,92 48,84 46,76"
          stroke="#0284c7"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          className="login-tentacle-path login-tp-3"
          d="M 56,56 C 62,68 72,78 62,88 C 56,92 52,84 54,76"
          stroke="#0284c7"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          className="login-tentacle-path login-tp-4"
          d="M 68,54 C 82,58 90,74 78,86 C 70,92 60,82 64,70 C 66,64 64,56 58,56"
          stroke="#38bdf8"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <span className="-mt-1 text-2xl font-bold tracking-tight">
        <span className="text-slate-600 dark:text-slate-300">Octu</span>
        <span className="text-sky-500 dark:text-sky-400">plus</span>
      </span>
    </div>
  );
}

export function LoginPage() {
  const { login } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [resetStep, setResetStep] = useState(1);
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password, rememberMe);
    } catch (err: any) {
      setError(err.message || t('login.loginFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendResetCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resetEmail || !/\S+@\S+\.\S+/.test(resetEmail)) {
      setResetError(t('reset.invalidEmail'));
      return;
    }

    setIsLoading(true);
    setResetError('');

    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      });

      if (!response.ok) {
        throw new Error(t('reset.sendCodeFailed'));
      }

      setResetStep(2);
    } catch (err: any) {
      setResetError(err.message || t('reset.sendCodeFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resetCode || resetCode.length !== 6) {
      setResetError(t('reset.invalidCodeLength'));
      return;
    }

    setIsLoading(true);
    setResetError('');

    try {
      const response = await fetch(
        `${API_BASE_URL}/auth/verify-reset-code?email=${resetEmail}&code=${resetCode}`,
        { method: 'POST' }
      );

      if (!response.ok) {
        throw new Error(t('reset.invalidCode'));
      }

      setResetStep(3);
    } catch (err: any) {
      setResetError(err.message || t('reset.invalidCode'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || newPassword.length < 4) {
      setResetError(t('reset.newPasswordTooShort'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetError(t('reset.passwordMismatch'));
      return;
    }

    setIsLoading(true);
    setResetError('');

    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: resetEmail,
          code: resetCode,
          new_password: newPassword,
        }),
      });

      if (!response.ok) {
        throw new Error(t('reset.resetFailed'));
      }

      setResetSuccess(true);
    } catch (err: any) {
      setResetError(err.message || t('reset.resetFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseForgotPassword = () => {
    setShowForgotPassword(false);
    setResetStep(1);
    setResetEmail('');
    setResetCode('');
    setNewPassword('');
    setConfirmPassword('');
    setResetError('');
    setResetSuccess(false);
  };

  if (showForgotPassword) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-gray-50 p-4 dark:bg-slate-950">
        <div className="absolute right-4 top-4 flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-4">
            <LoginOctopusBrand />
            <CardTitle>
              {resetStep === 1 && t('reset.titleStep1')}
              {resetStep === 2 && t('reset.titleStep2')}
              {resetStep === 3 && t('reset.titleStep3')}
              {resetSuccess && t('reset.titleSuccess')}
            </CardTitle>
            <CardDescription>
              {resetStep === 1 && t('reset.descStep1')}
              {resetStep === 2 && t('reset.descStep2', { email: resetEmail })}
              {resetStep === 3 && t('reset.descStep3')}
              {resetSuccess && t('reset.descSuccess')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!resetSuccess ? (
              <>
                {resetError && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertDescription>{resetError}</AlertDescription>
                  </Alert>
                )}

                {resetStep === 1 && (
                  <form onSubmit={handleSendResetCode} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="resetEmail">{t('reset.emailLabel')}</Label>
                      <Input
                        id="resetEmail"
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder={t('reset.emailPlaceholder')}
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCloseForgotPassword}
                        className="w-1/2"
                      >
                        {t('reset.cancel')}
                      </Button>
                      <Button type="submit" disabled={isLoading} className="w-1/2 bg-blue-600 text-white hover:bg-blue-700">
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('reset.sendCode')}
                      </Button>
                    </div>
                  </form>
                )}

                {resetStep === 2 && (
                  <form onSubmit={handleVerifyCode} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="resetCode">{t('reset.codeLabel')}</Label>
                      <Input
                        id="resetCode"
                        type="text"
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder={t('reset.codePlaceholder')}
                        maxLength={6}
                        autoFocus
                        className="text-center text-2xl tracking-widest"
                      />
                      <p className="text-sm text-muted-foreground">{t('reset.codeHint')}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setResetStep(1)}
                        className="w-1/2"
                      >
                        {t('reset.back')}
                      </Button>
                      <Button type="submit" disabled={isLoading} className="w-1/2 bg-blue-600 text-white hover:bg-blue-700">
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('reset.verify')}
                      </Button>
                    </div>
                  </form>
                )}

                {resetStep === 3 && (
                  <form onSubmit={handleSetNewPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">{t('reset.newPasswordLabel')}</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder={t('reset.newPasswordPlaceholder')}
                        autoFocus
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">{t('reset.confirmPasswordLabel')}</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder={t('reset.confirmPasswordPlaceholder')}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setResetStep(2)}
                        className="w-1/2"
                      >
                        {t('reset.back')}
                      </Button>
                      <Button type="submit" disabled={isLoading} className="w-1/2 bg-blue-600 text-white hover:bg-blue-700">
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('reset.submit')}
                      </Button>
                    </div>
                  </form>
                )}
              </>
            ) : (
              <div className="space-y-4 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-muted-foreground">{t('reset.successMessage')}</p>
                <Button onClick={handleCloseForgotPassword} className="w-full bg-blue-600 text-white hover:bg-blue-700">
                  {t('reset.backToLogin')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gray-50 p-4 dark:bg-slate-950">
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <LoginOctopusBrand />
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">{t('login.emailLabel')}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('login.emailPlaceholder')}
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('login.passwordLabel')}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('login.passwordPlaceholder')}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-700"
                  aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>{t('login.rememberMe')}</span>
              </label>
              <Button
                type="button"
                variant="link"
                className="px-0"
                onClick={() => setShowForgotPassword(true)}
              >
                {t('login.forgotPassword')}
              </Button>
            </div>

            <Button type="submit" className="w-full bg-blue-600 text-white hover:bg-blue-700" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('login.submit')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
