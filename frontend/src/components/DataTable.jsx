// Bảng danh sách, có sẵn khung trắng + trạng thái đang tải + trống
// const columns = [
//   { key: 'code', title: 'Mã phòng' },
//   { key: 'price', title: 'Giá thuê', render: (row) => <MoneyText value={row.price} /> },
// ];
// <DataTable columns={columns} data={rooms} loading={loading} emptyMessage="Không tìm thấy phòng phù hợp"
//   onRowClick={(row) => navigate(`/rooms/${row._id}`)} />
// Có onRowClick mà trong ô còn có nút thì nút phải gọi e.stopPropagation()
import { Card, Table } from 'react-bootstrap';
import Loading from './Loading';
import EmptyState from './EmptyState';

const DataTable = ({ columns, data = [], loading = false, emptyMessage, rowKey = '_id', onRowClick }) => {
    const renderBody = () => {
        if (loading) return <Loading />;
        if (data.length === 0) return <EmptyState message={emptyMessage} />;

        return (
            <Table hover responsive className="align-middle mb-0">
                <thead className="table-light">
                    <tr>
                        {columns.map((col) => (
                            <th key={col.key} className={`text-nowrap ${col.className ?? ''}`}>
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
                            {columns.map((col) => (
                                <td key={col.key} className={col.className}>
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
        <Card className="shadow-sm">
            <Card.Body className="p-0">{renderBody()}</Card.Body>
        </Card>
    );
};

export default DataTable;