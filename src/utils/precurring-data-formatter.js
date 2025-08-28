export async function toRecurringItems(resp) {
    const streams = resp || { inflow_streams: [], outflow_streams: [] };

    const pickFields = (s) => ({
        account_id: s.account_id,
        average_amount: {
            amount: Number((s.average_amount && s.average_amount.amount) ?? (s.last_amount && s.last_amount.amount) ?? 0),
        },
        description: s.merchant_name && s.merchant_name.trim().length
            ? s.merchant_name
            : (s.description || ""),
        frequency: s.frequency || null,
        last_date: s.last_date || null,
        personal_finance_category: { detailed: (s.personal_finance_category && s.personal_finance_category.detailed) || null },
        predicted_next_date: s.predicted_next_date || null,
    });

    const active = (arr) => (arr || []).filter(s => s.is_active);

    const combined = [
        ...active(streams.inflow_streams).map(pickFields),
        ...active(streams.outflow_streams).map(pickFields),
    ];

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
