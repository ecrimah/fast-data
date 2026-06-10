import 'server-only';

import type {
  SupplierClient,
  SupplierSubmitBulkParams,
  SupplierSubmitResult,
  SupplierSubmitSingleParams,
} from './types';

export const manualClient: SupplierClient = {
  id: 'manual',
  label: 'Manual fulfilment (no automated supplier)',
  isConfigured: () => true,

  async submitSingle(_params: SupplierSubmitSingleParams): Promise<SupplierSubmitResult> {
    return {
      ok: true,
      manual: true,
      status: 'awaiting_manual',
    };
  },

  async submitBulk(_params: SupplierSubmitBulkParams): Promise<SupplierSubmitResult> {
    return {
      ok: true,
      manual: true,
      status: 'awaiting_manual',
    };
  },
};
