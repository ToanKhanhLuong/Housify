// Phân trang kiểu Odoo: "1–20 / 57" + nút trước/sau. Dùng khi API danh sách có page, limit, total
// <Pager page={page} limit={20} total={total} onChange={setPage} />
import { Button, ButtonGroup } from 'react-bootstrap';
import { BiChevronLeft, BiChevronRight } from 'react-icons/bi';

const Pager = ({ page, limit, total, onChange }) => {
    if (!total) return null;
    const from = (page - 1) * limit + 1;
    const to = Math.min(page * limit, total);

    return (
        <div className="flex items-center gap-2">
            <span className="text-secondary tabular-nums">
                {from}–{to} / {total}
            </span>
            <ButtonGroup size="sm">
                <Button
                    variant="secondary"
                    disabled={page <= 1}
                    onClick={() => onChange(page - 1)}
                    aria-label="Trang trước"
                >
                    <BiChevronLeft />
                </Button>
                <Button
                    variant="secondary"
                    disabled={to >= total}
                    onClick={() => onChange(page + 1)}
                    aria-label="Trang sau"
                >
                    <BiChevronRight />
                </Button>
            </ButtonGroup>
        </div>
    );
};

export default Pager;