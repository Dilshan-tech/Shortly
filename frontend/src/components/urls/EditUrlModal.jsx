import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.jsx';
import { Button } from '../common/Button.jsx';
import { CopyButton } from '../common/CopyButton.jsx';
import { Input } from '../common/Input.jsx';
import { useToast } from '../common/ToastContext.jsx';
import { updateUrl } from '../../api/urls.js';
import { extractErrorMessage } from '../../api/client.js';
import { getShortUrl } from '../../utils/formatters.js';

export function EditUrlModal({ isOpen, onClose, urlItem, onSaved }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    longUrl: '',
    clickLimit: '',
    expiresAt: '',
    isActive: true,
    newPassword: '',
    removePassword: false
  });

  useEffect(() => {
    if (urlItem) {
      setFormData({
        title: urlItem.title || '',
        longUrl: urlItem.longUrl || '',
        clickLimit: urlItem.clickLimit ? String(urlItem.clickLimit) : '',
        expiresAt: urlItem.expiresAt ? urlItem.expiresAt.slice(0, 16) : '',
        isActive: Boolean(urlItem.isActive),
        newPassword: '',
        removePassword: false
      });
    }
  }, [urlItem]);

  if (!urlItem) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        title: formData.title,
        longUrl: formData.longUrl,
        isActive: formData.isActive,
        clickLimit: formData.clickLimit ? parseInt(formData.clickLimit, 10) : null,
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null
      };

      if (formData.removePassword) {
        payload.password = '';
      } else if (formData.newPassword) {
        payload.password = formData.newPassword;
      }

      const res = await updateUrl(urlItem.id, payload);
      toast.success('Link updated successfully');
      if (onSaved) onSaved(res.data);
      onClose();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const shortUrl = getShortUrl(urlItem);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Link: /${urlItem.code}`}>
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 block mb-0.5">Short URL</span>
            <a
              href={shortUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-500 dark:hover:text-brand-300 break-all select-all hover:underline"
              title={`Open ${shortUrl} in a new tab`}
            >
              {shortUrl}
            </a>
          </div>
          <CopyButton text={shortUrl} size="xs" variant="secondary" showLabel={true} />
        </div>

        <Input
          label="Title / Description"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g. Documentation, Product launch link"
        />

        <Input
          label="Destination URL"
          required
          value={formData.longUrl}
          onChange={(e) => setFormData({ ...formData, longUrl: e.target.value })}
          placeholder="https://example.com/target-page"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Click Limit"
            type="number"
            min="1"
            value={formData.clickLimit}
            onChange={(e) => setFormData({ ...formData, clickLimit: e.target.value })}
            placeholder="No limit"
            helperText="Deactivates once reached"
          />

          <Input
            label="Expiration Date & Time"
            type="datetime-local"
            value={formData.expiresAt}
            onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
            helperText="Link will expire after this time"
          />
        </div>

        {/* Password management */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
            Password Protection
          </label>
          {urlItem.isPasswordProtected && (
            <label className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-300 mb-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.removePassword}
                onChange={(e) => setFormData({ ...formData, removePassword: e.target.checked })}
                className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-brand-600 focus:ring-brand-500"
              />
              Remove current password protection
            </label>
          )}

          {!formData.removePassword && (
            <Input
              type="password"
              value={formData.newPassword}
              onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
              placeholder={urlItem.isPasswordProtected ? 'Set new password (leave blank to keep current)' : 'Set password to protect this link'}
              helperText="Minimum 4 characters"
            />
          )}
        </div>

        {/* Active Toggle */}
        <div className="pt-1">
          <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-brand-600 focus:ring-brand-500 w-4 h-4 cursor-pointer"
            />
            <span className="font-semibold text-slate-900 dark:text-white">Active Link</span>
          </label>
        </div>

        {/* Modal footer actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={loading}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
