// Bảng danh sách: khung trắng viền mảnh, có sẵn đang tải + trống
// const columns = [
//   { key: 'code', title: 'Mã phòng' },
//   { key: 'price', title: 'Giá thuê', align: 'end', render: (row) => <MoneyText value={row.price} /> },
// ];
// <DataTable columns={columns} data={rooms} loading={loading} emptyMessage="Không tìm thấy phòng phù hợp"
//   onRowClick={(row) => navigate(`/rooms/${row._id}`)} />
// KHÔNG đặt nút Sửa/Xóa trong dòng: bấm dòng để mở chi tiết, thao tác nằm ở trang chi tiết hoặc trong modal
import { Card, Table } from 'react-bootstrap';
import Loading from './Loading';
import EmptyState from './EmptyState';

// cột đầu/cuối thụt vào cho thẳng lề khung; cột số (align: 'end') căn phải, chữ số thẳng hàng
const cellClass = (col, index, total) =>
    [
        index === 0 && 'ps-3',
        index === total - 1 && 'pe-3',
        col.align === 'end' && 'text-end tabular-nums',
        col.className,
    ]
        .filter(Boolean)
        .join(' ');

const DataTable = ({ columns, data = [], loading = false, emptyMessage, rowKey = '_id', onRowClick }) => {
    const renderBody = () => {
        if (loading) return <Loading />;
        if (data.length === 0) return <EmptyState message={emptyMessage} />;

        return (
            <Table hover={Boolean(onRowClick)} responsive className="align-middle mb-0">
                <thead>
                    <tr>
                        {columns.map((col, i) => (
                            <th key={col.key} className={cellClass(col, i, columns.length)}>
                                {col.title}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row) => (
                        <tr
                            key={row[rowKey]}
                            onClick={onRowClick ? () => onRowClick(row) : undefined}
                            className={onRowClick ? 'cursor-pointer' : undefined}
                        >
                            {columns.map((col, i) => (
                                <td key={col.key} className={cellClass(col, i, columns.length)}>
                                    {col.render ? col.render(row) : (row[col.key] ?? '—')}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </Table>
        );
    };

    return (
        <Card>
            <Card.Body className="p-0">{renderBody()}</Card.Body>
        </Card>
    );
};

export default DataTable;