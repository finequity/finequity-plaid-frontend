/**
 * Normalize Plaid recurring streams into a flat list of "recurring items".
 *
 * INPUT:
 *   resp: an object with the shape Plaid returns from transactions/recurring/get:
 *     {
 *       inflow_streams:  [ { ...stream } ],
 *       outflow_streams: [ { ...stream } ]
 *     }
 *   - Each stream may include:
 *       - account_id
 *       - average_amount.amount (or last_amount.amount as a fallback)
 *       - merchant_name / description
 *       - frequency
 *       - last_date
 *       - personal_finance_category.detailed
 *       - predicted_next_date
 *       - is_active (boolean)  ← used to filter active streams only
 *
 * OUTPUT:
 *   An array of normalized items:
 *     [
 *       {
 *         account_id,
 *         average_amount: { amount: Number },
 *         description,                         // prefers merchant_name, falls back to description
 *         frequency,                           // string or null
 *         last_date,                           // ISO date or null
 *         personal_finance_category: { detailed: string|null },
 *         predicted_next_date                  // ISO date or null
 *       },
 *       ...
 *     ]
 *
 * NOTES:
 *   - Only streams where `is_active === true` are included.
 *   - Amount is coerced to a Number. It prefers `average_amount.amount`, otherwise `last_amount.amount`, else 0.
 *   - Sort order: ascending by `predicted_next_date`; missing dates are placed at the end.
 */
export async function toRecurringItems(resp) {
    // Only consider outflow_streams (guarded)
    const outflows = (resp && Array.isArray(resp.outflow_streams))
        ? resp.outflow_streams
        : [];

    const pickFields = (s) => ({
        account_id: s.account_id,
        average_amount: {
            // keep numeric; UI can format/abs if desired
            amount: Number(
                (s.average_amount && s.average_amount.amount) ??
                (s.last_amount && s.last_amount.amount) ??
                0
            ),
        },
        description:
            s.merchant_name && s.merchant_name.trim().length
                ? s.merchant_name
                : (s.description || ""),
        frequency: s.frequency || null,
        last_date: s.last_date || null,
        personal_finance_category: {
            detailed:
                (s.personal_finance_category &&
                    s.personal_finance_category.detailed) || null,
        },
        predicted_next_date: s.predicted_next_date || null,
    });

    // Only active streams
    const combined = outflows.filter((s) => s.is_active).map(pickFields);

    // Sort by predicted_next_date (ascending); missing dates last
    combined.sort((a, b) => {
        const ax = a.predicted_next_date || "";
        const bx = b.predicted_next_date || "";
        if (!ax && !bx) return 0;
        if (!ax) return 1;
        if (!bx) return -1;
        return ax.localeCompare(bx);
    });

    return combined;
}
