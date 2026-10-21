// Vòng xoay chờ tải, dùng khi trang đang gọi API lần đầu
import { Spinner } from 'react-bootstrap';

const Loading = () => (
    <div className="flex justify-center py-5">
        <Spinner animation="border" variant="primary" />
    </div>
);

export default Loading;