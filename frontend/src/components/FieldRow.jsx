// Một dòng "nhãn – giá trị" ở trang chi tiết kiểu Odoo. required: hiện dấu * đỏ sau nhãn (trường bắt buộc / quan trọng)
// <FieldRow label="Ngày bắt đầu" required>{formatDate(contract.startDate)}</FieldRow>
// Chia 2 cột: bọc các FieldRow trong <div className="grid lg:grid-cols-2 column-gap-5">
const FieldRow = ({ label, required = false, children }) => (
    <div className="grid grid-cols-[10.5rem_1fr] gap-3 py-1">
        <div className="fw-semibold">
            {label}
            {required && <span className="text-danger ms-1">*</span>}
        </div>
        <div className="min-w-0">{children ?? '—'}</div>
    </div>
);

export default FieldRow;