import "server-only";

import {
  isSkanka5Configured,
  pingSupplier,
  submitBulkOrder,
  submitSingleOrder,
} from "./skanka5";
import type {
  SupplierClient,
  SupplierSubmitBulkParams,
  SupplierSubmitResult,
  SupplierSubmitSingleParams,
} from "./types";

export const skanka5Client: SupplierClient = {
  id: "skanka5",
  label: "Skanka5",
  isConfigured: () => isSkanka5Configured(),

  async submitSingle(params: SupplierSubmitSingleParams): Promise<SupplierSubmitResult> {
    const r = await submitSingleOrder({
      network: params.network,
      msisdn: params.msisdn,
      volumeMb: params.volumeMb,
      reference: params.reference,
      scope: params.scope,
    });
    if (!r.ok) {
      return { ok: false, error: r.error, httpStatus: r.status, rawResponse: r.data };
    }
    const first = r.data.orders?.[0];
    return {
      ok: true,
      reference: r.data.reference,
      orderCode: first?.order_code,
      status: first?.status ?? r.data.status,
      orders: r.data.orders,
      rawResponse: r.data,
      httpStatus: r.status,
    };
  },

  async submitBulk(params: SupplierSubmitBulkParams): Promise<SupplierSubmitResult> {
    // Skanka5 contract (Developer Portal → Quick Reference):
    //   - Single line: POST /orders        { network_id, msisdn, volume_mb }
    //   - Bulk:        POST /orders/bulk    requires a MINIMUM of 5 recipients
    // So anything from 1–4 recipients must be submitted as individual single
    // orders, otherwise /orders/bulk rejects them with "validation.min.array".
    if (params.recipients.length === 0) {
      return { ok: false, error: "No recipients", httpStatus: 0 };
    }

    if (params.recipients.length < 5) {
      const orders: SupplierSubmitResult["orders"] = [];
      let aggregateReference: string | undefined;
      let anyAccepted = false;
      let firstError: string | undefined;

      for (let i = 0; i < params.recipients.length; i++) {
        const r = params.recipients[i]!;
        const single = await submitSingleOrder({
          network: params.network,
          msisdn: r.msisdn,
          volumeMb: r.volumeMb,
          // Unique idempotency key per line so retries don't collide.
          reference: `${params.reference}-${i + 1}`,
          scope: params.scope,
        });
        if (!single.ok) {
          firstError ??= single.error;
          orders.push({ msisdn: r.msisdn, status: "failed" });
          continue;
        }
        anyAccepted = true;
        aggregateReference ??= single.data.reference;
        const first = single.data.orders?.[0];
        orders.push({
          order_code: first?.order_code,
          msisdn: r.msisdn,
          status: first?.status ?? single.data.status,
        });
      }

      if (!anyAccepted) {
        return { ok: false, error: firstError ?? "All lines rejected", httpStatus: 0 };
      }
      return {
        ok: true,
        reference: aggregateReference ?? params.reference,
        status: "pending",
        orders,
      };
    }

    const r = await submitBulkOrder({
      network: params.network,
      recipients: params.recipients,
      reference: params.reference,
      scope: params.scope,
    });
    if (!r.ok) {
      return { ok: false, error: r.error, httpStatus: r.status, rawResponse: r.data };
    }
    return {
      ok: true,
      reference: r.data.reference,
      status: r.data.status,
      orders: r.data.orders,
      rawResponse: r.data,
      httpStatus: r.status,
    };
  },

  async ping() {
    const r = await pingSupplier();
    return { ok: r.ok, error: r.ok ? undefined : r.error, raw: r.ok ? r.data : r.data };
  },
};
