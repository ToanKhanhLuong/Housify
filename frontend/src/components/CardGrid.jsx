// Khung lưới hiển thị thẻ (Card Grid) responsive kiểu Odoo Kanban
const CardGrid = ({ children, minWidth = '300px', className = '' }) => {
    return (
        <div
            className={`grid gap-3.5 ${className}`}
            style={{
                gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}, 1fr))`,
            }}
        >
            {children}
        </div>
    );
};

export default CardGrid;
