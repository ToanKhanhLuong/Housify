// Bảng dữ liệu dùng chung: tự hiện đang tải / rỗng, có phân trang khi truyền total + onPageChange
// columns: [{ key, title, render?: (row, index) => node, className? }]
// Ví dụ: <DataTable columns={columns} data={items} loading={loading} page={page} limit={10} total={total} onPageChange={setPage} />
import { Table } from 'react-bootstrap';
import Loading from './Loading.jsx';
import EmptyState from './EmptyState.jsx';
import Paginator from './Paginator.jsx';

export default function DataTable({
  columns,
  data = [],
  loading = false,
  rowKey = '_id',
  emptyMessage,
  page = 1,
  limit = 10,
  total,
  onPageChange,
  onRowClick,
}) {
  if (loading) return <Loading />;
  if (data.length === 0) return <EmptyState message={emptyMessage} />;

  return (
    <div>
      <Table responsive hover className="mb-0 align-middle">
        <thead className="table-light">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={column.className}>
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr
              key={row[rowKey] ?? index}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={onRowClick ? 'cursor-pointer' : undefined}
            >
              {columns.map((column) => (
                <td key={column.key} className={column.className}>
                  {column.render ? column.render(row, index) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </Table>

      {total !== undefined && onPageChange && (
        <Paginator page={page} limit={limit} total={total} onChange={onPageChange} />
      )}
    </div>
  );
}
