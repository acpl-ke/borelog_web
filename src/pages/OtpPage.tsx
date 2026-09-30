import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

const OTP_LENGTH = 4;
const RESEND_COOLDOWN_SECONDS = 30;

export const OtpPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const navState = location.state as { emailHint?: string; loginId?: string } | null;

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [rememberDevice, setRememberDevice] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(RESEND_COOLDOWN_SECONDS);

  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Bounce back to login if there's no pending OTP session (page refresh / direct hit)
  useEffect(() => {
    if (!authService.hasPendingOtp()) {
      navigate('/login', { replace: true });
    }
    // Auto-focus first box
    inputRefs.current[0]?.focus();
  }, [navigate]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = window.setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(t);
  }, [resendIn]);

  const setDigit = (idx: number, value: string) => {
    // Accept only single digit 0-9
    const cleaned = value.replace(/\D/g, '').slice(0, 1);
    setDigits((prev) => {
      const next = [...prev];
      next[idx] = cleaned;
      return next;
    });
    // Auto-advance to next box
    if (cleaned && idx < OTP_LENGTH - 1) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      // Move focus back when backspacing an empty box
      inputRefs.current[idx - 1]?.focus();
    } else if (e.key === 'Enter') {
      handleVerify();
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    } else if (e.key === 'ArrowRight' && idx < OTP_LENGTH - 1) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  // Paste handler - lets user paste the full 4-digit code at once
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (pasted.length === 0) return;
    e.preventDefault();
    const next = Array(OTP_LENGTH).fill('');
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
  };

  const handleVerify = async () => {
    const otp = digits.join('');
    if (otp.length !== OTP_LENGTH) {
      setError(`Please enter the ${OTP_LENGTH}-digit OTP.`);
      return;
    }
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const result = await authService.verifyOtp(otp, rememberDevice);
      if (!result.isSuccess) {
        setError(result.msg || 'Invalid OTP. Please try again.');
        // Clear and refocus
        setDigits(Array(OTP_LENGTH).fill(''));
        inputRefs.current[0]?.focus();
        return;
      }
      navigate('/find-pile', { state: { userId: result.id ?? null } });
    } catch (err: any) {
      setError(err.response?.data?.msg || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendIn > 0) return;
    setError(null);
    setInfo(null);
    try {
      const res = await authService.resendOtp();
      if (res.isSuccess) {
        setInfo('A new OTP has been sent to your email.');
        setResendIn(RESEND_COOLDOWN_SECONDS);
      } else {
        setError(res.msg || 'Could not resend OTP.');
      }
    } catch (err: any) {
      setError(err.response?.data?.msg || 'Could not resend OTP.');
    }
  };

  const handleCancel = () => {
    authService.logout(); // clear pending session
    navigate('/login', { replace: true });
  };

  // Mask the email for display: r****@example.com
  const maskedEmail = (() => {
    const email = navState?.emailHint ?? '';
    if (!email || !email.includes('@')) return '';
    const [local, domain] = email.split('@');
    const visible = local.slice(0, 1);
    return `${visible}${'*'.repeat(Math.max(1, local.length - 1))}@${domain}`;
  })();

  const allFilled = digits.every((d) => d !== '');

  return (
    <div id="otp" className="screen active">
      <div className="login-inner">
        <div className="login-brand">
          <div className="brand-mark">F</div>
          <div>
            <div className="b1">Foundation Engg. Co.</div>
            <div className="b2">Bore Log System</div>
          </div>
        </div>

        <div className="login-hero">
          <div className="eyebrow">Verify your identity</div>
          <h1>
            Enter the <em>4-digit code.</em>
          </h1>
          <p>
            We sent a verification code to{' '}
            {maskedEmail ? (
              <strong style={{ color: '#fff' }}>{maskedEmail}</strong>
            ) : (
              'your registered email'
            )}
            . Enter it below to continue.
          </p>
        </div>

        <div className="login-form">
          <div className="otp-boxes" onPaste={handlePaste}>
            {digits.map((d, idx) => (
              <input
                key={idx}
                ref={(el) => (inputRefs.current[idx] = el)}
                className="otp-box"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={d}
                onChange={(e) => setDigit(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                aria-label={`Digit ${idx + 1}`}
                autoComplete="one-time-code"
              />
            ))}
          </div>

          <div className="row-between" style={{ marginTop: 18 }}>
            <label>
              <input
                type="checkbox"
                checked={rememberDevice}
                onChange={(e) => setRememberDevice(e.target.checked)}
                style={{ accentColor: 'var(--accent)' }}
              />{' '}
              Remember this device
            </label>
            <button
              type="button"
              className="link-btn"
              disabled={resendIn > 0}
              onClick={handleResend}
            >
              {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend OTP'}
            </button>
          </div>

          {info && <div className="info-msg">{info}</div>}
          {error && <div className="error-msg">{error}</div>}

          <button
            type="button"
            className="btn btn-primary"
            disabled={loading || !allFilled}
            onClick={handleVerify}
          >
            {loading ? 'Verifying…' : 'Verify & Continue →'}
          </button>

          <button
            type="button"
            className="link-btn cancel-link"
            onClick={handleCancel}
          >
            ← Use a different account
          </button>
        </div>
      </div>
    </div>
  );
};
