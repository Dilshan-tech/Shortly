import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  Trash2,
  Power,
  RefreshCw,
  Plus,
  ChevronLeft,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { UrlTable } from '../components/urls/UrlTable.jsx';
import { UrlCard } from '../components/urls/UrlCard.jsx';
import { QrCodeModal } from '../components/urls/QrCodeModal.jsx';
import { EditUrlModal } from '../components/urls/EditUrlModal.jsx';
import { Modal } from '../components/common/Modal.jsx';
import { Button } from '../components/common/Button.jsx';
import { Card } from '../components/common/Card.jsx';
import { EmptyState } from '../components/common/EmptyState.jsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { useToast } from '../components/common/ToastContext.jsx';
import {
  getUrls,
  deleteUrl,
  updateUrl,
  bulkDeleteUrls,
  bulkUpdateStatus
} from '../api/urls.js';
import { extractErrorMessage } from '../api/client.js';

export function LinkLibraryPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // URLs data & pagination
  const [urls, setUrls] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1
  });

  // Filters & sorting
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState([]);

  // Modals state
  const [qrModalUrl, setQrModalUrl] = useState(null);
  const [editModalUrl, setEditModalUrl] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);

  const fetchUrls = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const res = await getUrls({
        search: search.trim() || undefined,
        status: statusFilter,
        sortBy,
        sortOrder,
        page: pagination.page,
        limit: pagination.limit
      });
      setUrls(res.data);
      setPagination(res.pagination);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, statusFilter, sortBy, sortOrder, pagination.page, pagination.limit, toast]);

  useEffect(() => {
    fetchUrls();
  }, [fetchUrls]);

  // Bulk selection handlers
  const handleSelectToggle = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === urls.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(urls.map((u) => u.id));
    }
  };

  // Toggle single link active status
  const handleToggleActive = async (urlItem) => {
    try {
      const newStatus = !urlItem.isActive;
      await updateUrl(urlItem.id, { isActive: newStatus });
      toast.success(newStatus ? 'Link enabled' : 'Link disabled');
      fetchUrls(true);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  // Delete single link
  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteUrl(deleteConfirmId);
      toast.success('Link deleted successfully');
      setDeleteConfirmId(null);
      setSelectedIds((prev) => prev.filter((id) => id !== deleteConfirmId));
      fetchUrls(true);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  // Bulk status update
  const handleBulkStatus = async (isActive) => {
    if (selectedIds.length === 0) return;
    try {
      const res = await bulkUpdateStatus(selectedIds, isActive);
      toast.success(res.message || 'Status updated');
      setSelectedIds([]);
      fetchUrls(true);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      const res = await bulkDeleteUrls(selectedIds);
      toast.success(res.message || 'Links deleted');
      setSelectedIds([]);
      setBulkDeleteConfirmOpen(false);
      fetchUrls(true);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Link Library
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Manage, inspect, configure, and monitor your shortened URLs
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchUrls(false)}
            isLoading={refreshing}
            icon={RefreshCw}
          >
            Refresh
          </Button>
          <Link to="/create">
            <Button variant="primary" size="sm" icon={Plus}>
              Create Link
            </Button>
          </Link>
        </div>
      </div>

      {/* Search, Filter Tabs & Sorting Toolbar */}
      <Card className="p-4 space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by code, alias, destination URL, or title..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Sort selection */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-400">Sort:</span>
            <select
              value={`${sortBy}_${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split('_');
                setSortBy(sb);
                setSortOrder(so);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-2 focus:outline-none focus:border-brand-500"
            >
              <option value="createdAt_desc">Newest First</option>
              <option value="createdAt_asc">Oldest First</option>
              <option value="clicks_desc">Most Clicks</option>
              <option value="clicks_asc">Least Clicks</option>
            </select>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'all', label: 'All Links' },
            { id: 'active', label: 'Active' },
            { id: 'disabled', label: 'Disabled' },
            { id: 'expired', label: 'Expired / Limit Reached' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                statusFilter === tab.id
                  ? 'bg-brand-600/20 text-brand-300 border border-brand-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Bulk Action Bar (Visible when items selected) */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-brand-950/40 border border-brand-500/30 text-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-brand-300">
              {selectedIds.length} link{selectedIds.length > 1 ? 's' : ''} selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="xs"
              variant="outline"
              onClick={() => handleBulkStatus(true)}
              icon={Power}
            >
              Enable Selected
            </Button>
            <Button
              size="xs"
              variant="outline"
              onClick={() => handleBulkStatus(false)}
              icon={Power}
            >
              Disable Selected
            </Button>
            <Button
              size="xs"
              variant="danger"
              onClick={() => setBulkDeleteConfirmOpen(true)}
              icon={Trash2}
            >
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <LoadingSpinner text="Fetching links..." />
      ) : urls.length === 0 ? (
        <EmptyState
          title={search ? 'No matching links found' : 'No links in library'}
          description={
            search
              ? `No URLs matched query "${search}". Try clearing search or changing filters.`
              : 'Create your first short link to see it listed here.'
          }
          actionLabel={search ? 'Clear Search' : 'Create Link'}
          onAction={search ? () => setSearch('') : undefined}
          actionLink={search ? undefined : '/create'}
        />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <UrlTable
              urls={urls}
              selectedIds={selectedIds}
              onSelectToggle={handleSelectToggle}
              onSelectAll={handleSelectAll}
              onOpenQr={(url) => setQrModalUrl(url)}
              onOpenEdit={(url) => setEditModalUrl(url)}
              onDelete={(id) => setDeleteConfirmId(id)}
              onToggleActive={handleToggleActive}
            />
          </div>

          {/* Mobile Cards View */}
          <div className="md:hidden space-y-3">
            {urls.map((url) => (
              <UrlCard
                key={url.id}
                url={url}
                isSelected={selectedIds.includes(url.id)}
                onSelectToggle={handleSelectToggle}
                onOpenQr={(u) => setQrModalUrl(u)}
                onOpenEdit={(u) => setEditModalUrl(u)}
                onDelete={(id) => setDeleteConfirmId(id)}
                onToggleActive={handleToggleActive}
              />
            ))}
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
              <span>
                Showing {(pagination.page - 1) * pagination.limit + 1}–
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} links
              </span>

              <div className="flex items-center gap-1.5">
                <Button
                  size="xs"
                  variant="secondary"
                  disabled={pagination.page <= 1}
                  onClick={() =>
                    setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))
                  }
                  icon={ChevronLeft}
                >
                  Prev
                </Button>
                <span className="px-2 font-medium text-slate-200">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <Button
                  size="xs"
                  variant="secondary"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() =>
                    setPagination((p) => ({
                      ...p,
                      page: Math.min(p.totalPages, p.page + 1)
                    }))
                  }
                  icon={ChevronRight}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* QR Code Modal */}
      {qrModalUrl && (
        <QrCodeModal
          isOpen={Boolean(qrModalUrl)}
          onClose={() => setQrModalUrl(null)}
          urlItem={qrModalUrl}
        />
      )}

      {/* Edit Link Modal */}
      {editModalUrl && (
        <EditUrlModal
          isOpen={Boolean(editModalUrl)}
          onClose={() => setEditModalUrl(null)}
          urlItem={editModalUrl}
          onSaved={() => fetchUrls(true)}
        />
      )}

      {/* Single Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteConfirmId)}
        onClose={() => setDeleteConfirmId(null)}
        title="Confirm Link Deletion"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
            <p>
              Are you sure you want to permanently delete this short link? All associated click
              history and analytics events will be purged immediately.
            </p>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmDelete}>
              Yes, Delete Link
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Delete Confirmation Modal */}
      <Modal
        isOpen={bulkDeleteConfirmOpen}
        onClose={() => setBulkDeleteConfirmOpen(false)}
        title="Confirm Bulk Deletion"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
            <p>
              Are you sure you want to delete <strong>{selectedIds.length}</strong> selected links?
              This action cannot be undone.
            </p>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setBulkDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleBulkDelete}>
              Delete {selectedIds.length} Links
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
