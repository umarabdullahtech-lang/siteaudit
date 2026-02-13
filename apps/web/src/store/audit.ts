import { create } from 'zustand';
import { api, getErrorMessage } from '@/lib/api';
import { subscribeToAudit } from '@/lib/socket';
import type { Audit, AuditResults } from '@shared/types';

interface AuditWithProject extends Audit {
  project?: { id: string; name: string; url: string };
}

interface AuditState {
  // Audit list
  audits: AuditWithProject[];
  auditsLoading: boolean;
  auditsError: string | null;

  // Current audit (for report page)
  currentAudit: AuditWithProject | null;
  currentLoading: boolean;
  currentError: string | null;

  // Active crawl
  activeCrawl: {
    auditId: string;
    progress: number;
    status: string;
  } | null;

  // Actions
  fetchAudits: () => Promise<void>;
  fetchAudit: (id: string) => Promise<void>;
  startAudit: (url: string, maxDepth?: number, maxPages?: number) => Promise<string>;
  subscribeToCrawl: (auditId: string) => () => void;
  clearActiveCrawl: () => void;
}

export const useAuditStore = create<AuditState>((set, get) => ({
  audits: [],
  auditsLoading: false,
  auditsError: null,

  currentAudit: null,
  currentLoading: false,
  currentError: null,

  activeCrawl: null,

  fetchAudits: async () => {
    set({ auditsLoading: true, auditsError: null });
    try {
      const audits = await api.getAudits();
      set({ audits: audits as AuditWithProject[], auditsLoading: false });
    } catch (err) {
      set({ auditsLoading: false, auditsError: getErrorMessage(err) });
    }
  },

  fetchAudit: async (id: string) => {
    set({ currentLoading: true, currentError: null });
    try {
      const audit = await api.getAudit(id);
      set({ currentAudit: audit as AuditWithProject, currentLoading: false });
    } catch (err) {
      set({ currentLoading: false, currentError: getErrorMessage(err) });
    }
  },

  startAudit: async (url, maxDepth = 3, maxPages = 100) => {
    const audit = await api.createAudit({ url, maxDepth, maxPages });
    set({
      activeCrawl: {
        auditId: audit.id,
        progress: 0,
        status: 'Queued...',
      },
    });

    // Add to the top of the list
    set((state) => ({
      audits: [audit as AuditWithProject, ...state.audits],
    }));

    return audit.id;
  },

  subscribeToCrawl: (auditId: string) => {
    const unsub = subscribeToAudit(auditId, {
      onProgress: (data) => {
        if (data.auditId === auditId) {
          set({
            activeCrawl: {
              auditId,
              progress: data.progress,
              status: data.status,
            },
          });
        }
      },
      onComplete: (data) => {
        if (data.auditId === auditId) {
          set({ activeCrawl: null });
          // Refresh audits
          get().fetchAudits();
        }
      },
      onError: (data) => {
        if (data.auditId === auditId) {
          set({
            activeCrawl: {
              auditId,
              progress: 0,
              status: `Error: ${data.error}`,
            },
          });
          setTimeout(() => set({ activeCrawl: null }), 5000);
        }
      },
    });

    return unsub;
  },

  clearActiveCrawl: () => set({ activeCrawl: null }),
}));
