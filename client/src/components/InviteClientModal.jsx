import { useState } from 'react';
import Button from './Button';
import './InviteClientModal.css';

export default function InviteClientModal({
  inviteLink,
  inviteLoading,
  inviteError,
  onClose,
  onCopy
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (onCopy) {
      await onCopy();
    } else if (inviteLink) {
      try {
        await navigator.clipboard.writeText(inviteLink);
      } catch (err) {
        console.error('Failed to copy', err);
      }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="invite-modal-backdrop" onClick={onClose}>
      <div className="invite-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="invite-modal-header">
          <h2>Invite Client</h2>
          <button className="invite-modal-close" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        <div className="invite-modal-body">
          <p className="invite-modal-desc">
            Share this link with your client. Once they sign up, they will automatically be linked to your coach profile.
          </p>

          {inviteLoading && (
            <div className="invite-modal-loading">
              <div className="spinner"></div>
              <span>Generating invite link...</span>
            </div>
          )}

          {inviteError && (
            <div className="invite-modal-error">
              {inviteError}
            </div>
          )}

          {!inviteLoading && !inviteError && inviteLink && (
            <div className="invite-modal-link-box">
              <input
                type="text"
                readOnly
                value={inviteLink}
                className="invite-modal-input"
                onClick={(e) => e.target.select()}
              />
              <Button
                variant="primary"
                text={copied ? "Copied! ✓" : "Copy Link"}
                onClick={handleCopy}
                className={`invite-copy-btn ${copied ? 'copied' : ''}`}
              />
            </div>
          )}
        </div>

        <div className="invite-modal-footer">
          <Button variant="secondary" text="Done" onClick={onClose} />
        </div>
      </div>
    </div>
  );
}
