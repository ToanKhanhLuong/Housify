// Phân trang theo { page, limit, total } BE trả về. Hiện tối đa 5 số trang quanh trang hiện tại
import { Pagination } from 'react-bootstrap';

export default function Paginator({ page, limit, total, onChange }) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  const pages = Array.from({ length: end - start + 1 }, (_, index) => start + index);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pt-3">
      <span className="text-sm text-gray-500">Tổng {total} bản ghi</span>
      {totalPages > 1 && (
        <Pagination size="sm" className="mb-0">
          <Pagination.Prev disabled={page <= 1} onClick={() => onChange(page - 1)} />
          {pages.map((number) => (
            <Pagination.Item key={number} active={number === page} onClick={() => onChange(number)}>
              {number}
            </Pagination.Item>
          ))}
          <Pagination.Next disabled={page >= totalPages} onClick={() => onChange(page + 1)} />
        </Pagination>
      )}
    </div>
  );
}
