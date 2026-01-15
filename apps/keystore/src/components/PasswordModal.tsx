import { useEffect, useRef, useState } from 'react';

type PasswordModalProps = {
  title: string;
  confirmText: string;
  onCancel: () => void;
  onConfirm: (password: string) => void | Promise<void>;
  busy?: boolean;
  error?: string | null;
};

export function PasswordModal({
  title,
  confirmText,
  onCancel,
  onConfirm,
  busy = false,
  error = null,
}: PasswordModalProps) {
  const [password, setPassword] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    queueMicrotask(() => inputRef.current?.focus());
  }, []);

  const submit = () => {
    if (busy) return;
    onConfirm(password);
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-title">{title}</div>
        <div className="input-group" style={{ marginTop: '0.75rem' }}>
          <label className="label" htmlFor="password-input">
            密码
          </label>
          <input
            id="password-input"
            ref={inputRef}
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
              if (e.key === 'Escape') onCancel();
            }}
            autoComplete="current-password"
            disabled={busy}
          />
          {error ? <div className="modal-error">{error}</div> : null}
        </div>
        <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>
            取消
          </button>
          <button type="button" className="btn btn-primary" onClick={submit} disabled={busy || !password}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
