import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Reset flow states
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
      setError(err.message || 'Échec de la connexion. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendResetCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resetEmail || !/\S+@\S+\.\S+/.test(resetEmail)) {
      setResetError('Veuillez entrer une adresse e-mail valide');
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

      if (!response.ok) throw new Error('Échec de l\'envoi du code de réinitialisation');

      setResetStep(2);
    } catch (err: any) {
      setResetError(err.message || 'Échec de l\'envoi du code de réinitialisation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resetCode || resetCode.length !== 6) {
      setResetError('Veuillez entrer le code à 6 chiffres');
      return;
    }

    setIsLoading(true);
    setResetError('');

    try {
      const response = await fetch(
        `${API_BASE_URL}/auth/verify-reset-code?email=${resetEmail}&code=${resetCode}`,
        { method: 'POST' }
      );

      if (!response.ok) throw new Error('Code invalide ou expiré');

      setResetStep(3);
    } catch (err: any) {
      setResetError(err.message || 'Code invalide ou expiré');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || newPassword.length < 4) {
      setResetError('Le mot de passe doit contenir au moins 4 caractères');
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetError('Les mots de passe ne correspondent pas');
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

      if (!response.ok) throw new Error('Échec de la réinitialisation du mot de passe');

      setResetSuccess(true);
    } catch (err: any) {
      setResetError(err.message || 'Échec de la réinitialisation du mot de passe');
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>
              {resetStep === 1 && 'Réinitialiser le mot de passe'}
              {resetStep === 2 && 'Entrer le code de vérification'}
              {resetStep === 3 && 'Définir un nouveau mot de passe'}
              {resetSuccess && 'Réinitialisation du mot de passe terminée'}
            </CardTitle>
            <CardDescription>
              {resetStep === 1 && 'Entrez votre adresse e-mail pour recevoir un code de vérification'}
              {resetStep === 2 && `Entrez le code à 6 chiffres envoyé à ${resetEmail}`}
              {resetStep === 3 && 'Créez un nouveau mot de passe pour votre compte'}
              {resetSuccess && 'Votre mot de passe a été réinitialisé avec succès'}
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
                      <Label htmlFor="resetEmail">Adresse e-mail</Label>
                      <Input
                        id="resetEmail"
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="Entrez votre adresse e-mail"
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
                        Annuler
                      </Button>
                      <Button type="submit" disabled={isLoading} className="w-1/2 bg-blue-600 hover:bg-blue-700 text-white">
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Envoyer le code
                      </Button>
                    </div>
                  </form>
                )}

                {resetStep === 2 && (
                  <form onSubmit={handleVerifyCode} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="resetCode">Code de vérification</Label>
                      <Input
                        id="resetCode"
                        type="text"
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        maxLength={6}
                        autoFocus
                        className="text-center text-2xl tracking-widest"
                      />
                      <p className="text-sm text-muted-foreground">
                        Entrez le code à 6 chiffres de votre e-mail
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setResetStep(1)}
                        className="w-1/2"
                      >
                        Retour
                      </Button>
                      <Button type="submit" disabled={isLoading} className="w-1/2 bg-blue-600 hover:bg-blue-700 text-white">
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Vérifier
                      </Button>
                    </div>
                  </form>
                )}

                {resetStep === 3 && (
                  <form onSubmit={handleSetNewPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Entrez le nouveau mot de passe"
                        autoFocus
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirmez le nouveau mot de passe"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setResetStep(2)}
                        className="w-1/2"
                      >
                        Retour
                      </Button>
                      <Button type="submit" disabled={isLoading} className="w-1/2 bg-blue-600 hover:bg-blue-700 text-white">
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Réinitialiser le mot de passe
                      </Button>
                    </div>
                  </form>
                )}
              </>
            ) : (
              <div className="space-y-4 text-center">
                <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-muted-foreground">
                  Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
                </p>
                <Button onClick={handleCloseForgotPassword} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  Retour à la connexion
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Portail de connexion</CardTitle>
          <CardDescription>Connectez-vous pour accéder à l'application</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Adresse e-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Entrez votre mot de passe"
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Se souvenir de moi</span>
              </label>
              <Button
                type="button"
                variant="link"
                className="px-0"
                onClick={() => setShowForgotPassword(true)}
              >
                Mot de passe oublié ?
              </Button>
            </div>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Se connecter
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
