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
    // Ensure we always have the two arrays we expect, even if `resp` is undefined/null.
    const streams = resp || { inflow_streams: [], outflow_streams: [] };

    // Project (pick/normalize) only the fields the UI needs from each stream.
    const pickFields = (s) => ({
        account_id: s.account_id,

        // Prefer s.average_amount.amount, else s.last_amount.amount, else 0; always a Number
        average_amount: {
            amount: Number(
                (s.average_amount && s.average_amount.amount) ??
                (s.last_amount && s.last_amount.amount) ??
                0
            ),
        },

        // Prefer merchant_name if present and non-empty; else fall back to raw description
        description:
            s.merchant_name && s.merchant_name.trim().length
                ? s.merchant_name
                : (s.description || ""),

        // Copy-through fields (or null if missing)
        frequency: s.frequency || null,
        last_date: s.last_date || null,

        // Keep nested shape for category, but guard for missing object
        personal_finance_category: {
            detailed:
                (s.personal_finance_category &&
                    s.personal_finance_category.detailed) || null,
        },

        predicted_next_date: s.predicted_next_date || null,
    });

    // Include only streams explicitly marked active
    const active = (arr) => (arr || []).filter((s) => s.is_active);

    // Merge inflow + outflow after mapping to normalized items
    const combined = [
        ...active(streams.inflow_streams).map(pickFields),
        ...active(streams.outflow_streams).map(pickFields),
    ];

    // Sort by predicted_next_date (ascending). Items without a date go last.
    combined.sort((a, b) => {
        const ax = a.predicted_next_date || "";
        const bx = b.predicted_next_date || "";
        if (!ax && !bx) return 0; // both missing → keep relative order
        if (!ax) return 1;        // a missing → a after b
        if (!bx) return -1;       // b missing → b after a
        return ax.localeCompare(bx);
    });

    return combined;
}
