import { useState } from 'react';

/**
 * Account drawer — passwordless (magic-link) sign-in.
 *
 * Signed out: enter an email, we send a one-click sign-in link.
 * Signed in: shows the email + a sign-out button.
 * If the cloud isn't configured on this build, it explains that recipes are
 * saved on this device.
 */
export default function Account({ user, cloudConfigured, onSignIn, onSignOut }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!email.trim()) return;
    setSending(true); setError('');
    try {
      await onSignIn(email.trim());
      setSent(true);
    } catch (e) {
      setError(e?.message || 'Could not send the link. Try again.');
    }
    setSending(false);
  };

  return (
    <div>
      {!cloudConfigured && (
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '8px 0 0', lineHeight: 1.6 }}>
          Sync isn&apos;t switched on yet, so your recipes and settings live on this device. Once accounts are connected, sign in here to keep them with you everywhere.
        </p>
      )}

      {cloudConfigured && user && (
        <div>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '8px 0 16px' }}>
            Signed in as <strong style={{ color: 'var(--text-primary)' }}>{user.email}</strong>. Your recipes and brews sync across your devices.
          </p>
          <button onClick={onSignOut} className="notion-button-secondary" style={{ padding: '12px 18px', fontSize: '15px' }}>
            Sign out
          </button>
        </div>
      )}

      {cloudConfigured && !user && (
        <div>
          {sent ? (
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '8px 0 0', lineHeight: 1.6 }}>
              Check your email — we sent a sign-in link to <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>. Open it on this device and you&apos;re in.
            </p>
          ) : (
            <>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '8px 0 14px' }}>
                Enter your email and we&apos;ll send a one-click sign-in link — no password to remember.
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submit()}
                  className="notion-input"
                  style={{ flex: 1, padding: '12px 14px', fontSize: '15px', borderRadius: 'var(--radius-md)' }}
                />
                <button onClick={submit} disabled={sending || !email.trim()} className="notion-button-primary" style={{ padding: '12px 18px', fontSize: '15px' }}>
                  {sending ? 'Sending…' : 'Send link'}
                </button>
              </div>
              {error && <p style={{ fontSize: '13px', color: 'var(--danger)', margin: '10px 0 0' }}>{error}</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
