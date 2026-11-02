// Khung lưới hiển thị thẻ (Card Grid) responsive kiểu Odoo Kanban
const CardGrid = ({ children, className = '' }) => {
    return (
        <div className={`grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3.5 ${className}`}>
            {children}
        </div>
    );
};

export default CardGrid;
