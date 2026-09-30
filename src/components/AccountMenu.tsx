import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

/**
 * Dropdown that opens from the page header's right-side icon. Shows:
 *  - Logout (clears local session, OTP not required next time)
 *  - Logout (require OTP) (clears local session AND server-side device token)
 *  - SMTP Settings (admin only)
 */
export const AccountMenu: React.FC<{ trigger: React.ReactNode }> = ({ trigger }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const handleLogout = () => {
    authService.logout();
    navigate('/login', { replace: true });
  };

  const handleLogoutOtp = async () => {
    if (!window.confirm('Sign out and require OTP at next login?')) return;
    setBusy(true);
    try {
      await authService.logoutOtp();
    } finally {
      setBusy(false);
      navigate('/login', { replace: true });
    }
  };

  const handleSmtpSettings = () => {
    setOpen(false);
    navigate('/admin/smtp');
  };

  return (
    <div className="account-menu" ref={wrapperRef}>
      <button
        type="button"
        className="icon-btn"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {trigger}
      </button>

      {open && (
        <div className="account-menu-pop" role="menu">
          <button className="account-menu-item" onClick={handleLogout} disabled={busy}>
            <span className="ami-title">Logout</span>
            <span className="ami-sub">End this session</span>
          </button>
          <button className="account-menu-item" onClick={handleLogoutOtp} disabled={busy}>
            <span className="ami-title">Logout (require OTP)</span>
            <span className="ami-sub">Force OTP at next login</span>
          </button>
        
        </div>
      )}
    </div>
  );
};
