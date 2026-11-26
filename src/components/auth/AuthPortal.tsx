import {signInWithPopup} from 'firebase/auth';
import {ArrowRight, LockKeyhole, ShieldCheck} from 'lucide-react';
import {useState} from 'react';
import {auth, googleAuthProvider} from '../../lib/firebase';

interface AuthPortalProps {
  clinicName: string;
  onEnterDemoWorkspace: () => void;
  onSignedIn: () => void;
}

export function AuthPortal({
  clinicName,
  onEnterDemoWorkspace,
  onSignedIn,
}: AuthPortalProps) {
  const [signingIn, setSigningIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setSigningIn(true);
    try {
      await signInWithPopup(auth, googleAuthProvider);
      onSignedIn();
    } catch (error: unknown) {
      const code =
        typeof error === 'object' && error !== null && 'code' in error
          ? String((error as {code?: string}).code)
          : '';
      if (code === 'auth/popup-closed-by-user') {
        setErrorMessage('Sign-in popup was closed before completing.');
      } else if (code === 'auth/popup-blocked') {
        setErrorMessage(
          'Your browser blocked the sign-in popup. Please allow popups for this site and try again.',
        );
      } else {
        setErrorMessage('Unable to complete Google Sign-In. Please try again.');
      }
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F7F2] px-4 py-8 sm:px-6 lg:px-8 flex flex-col justify-center">
      <div className="mx-auto w-full max-w-5xl grid grid-cols-1 overflow-hidden rounded-2xl border border-[#E6EAE7] bg-white shadow-[0_8px_30px_rgba(32,51,68,0.06)] lg:grid-cols-12">
        <div className="flex flex-col justify-between bg-[#174C4F] p-8 text-white lg:col-span-5 lg:p-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#DCE9E2]/20 ring-1 ring-white/20">
                <ShieldCheck className="h-5 w-5 text-[#DCE9E2]" />
              </div>
              <span className="font-display text-lg font-bold tracking-tight">
                Dental Loop
              </span>
            </div>

            <h1 className="mt-8 font-display text-2xl font-bold leading-snug text-white">
              Nothing important falls through the cracks.
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[#DCE9E2]/90">
              Keep your dental team aligned on patient follow-ups, unbooked treatments,
              missed appointments, and clinic-scheduled routine recalls.
            </p>
          </div>

          <div className="mt-8 space-y-4 border-t border-white/15 pt-6">
            <div className="flex items-start gap-3">
              <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-[#DCE9E2]" />
              <div className="text-xs leading-relaxed text-[#DCE9E2]/90">
                <span className="font-semibold text-white">Team Account Sync:</span>{' '}
                Sign in with your Google account to save your clinic profile, patient
                follow-ups, treatment plans, and recall schedules across sessions.
              </div>
            </div>
            <div className="text-xs text-[#DCE9E2]/75">
              Active clinic workspace: {clinicName}
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between p-8 lg:col-span-7 lg:p-10">
          <div>
            <div className="flex items-center justify-between gap-4 border-b border-[#E6EAE7] pb-5">
              <div>
                <h2 className="font-display text-lg font-bold text-[#203344]">
                  Staff Sign In
                </h2>
                <p className="mt-0.5 text-xs text-[#7B8588]">
                  Access your clinic workspace or preview in demonstration mode.
                </p>
              </div>

              <button
                type="button"
                onClick={onEnterDemoWorkspace}
                className="text-xs font-semibold text-[#174C4F] hover:text-[#123D40] whitespace-nowrap"
              >
                Back to Workspace
              </button>
            </div>

            <div className="mt-8 space-y-5">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={signingIn}
                className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#174C4F] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#123D40] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#174C4F]"
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27c3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10c5.35 0 9.25-3.67 9.25-9.09c0-1.15-.15-1.81-.15-1.81Z"
                  />
                </svg>
                <span>{signingIn ? 'Signing in...' : 'Sign in with Google'}</span>
              </button>

              {errorMessage && (
                <div
                  role="alert"
                  className="rounded-lg border border-[#C75C5C]/30 bg-[#C75C5C]/10 px-3.5 py-2.5 text-sm text-[#A64444]"
                >
                  {errorMessage}
                </div>
              )}

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-[#E6EAE7]" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-[#7B8588]">or</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onEnterDemoWorkspace}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#E6EAE7] bg-[#F8F7F2]/60 px-4 py-2.5 text-sm font-medium text-[#203344] transition-colors hover:bg-[#F8F7F2]"
              >
                Continue to Demo Workspace
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <p className="mt-8 text-xs leading-relaxed text-[#7B8588]">
            Demo workspace records are strictly fictional and intended for clinic
            workflow review only.
          </p>
        </div>
      </div>
    </div>
  );
}
