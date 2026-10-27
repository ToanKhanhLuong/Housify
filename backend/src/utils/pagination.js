// Phân trang dùng chung: ?page=1&limit=10 → { items, total, page, limit } (docs/api.md – Quy ước)
export const paginate = async (Model, filter, { page = 1, limit = 10, sort, select } = {}) => {
    const [items, total] = await Promise.all([
        Model.find(filter)
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(limit)
            .select(select)
            .lean(),
        Model.countDocuments(filter),
    ]);

    return {
        items,
        total,
        page,
        limit,
    };
};
