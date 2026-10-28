// Hiện số tiền đã định dạng, không bị xuống dòng: <MoneyText value={room.price} /> → 1.200.000 đ
import { formatMoney } from '../utils/format';

const MoneyText = ({ value, className = '' }) => (
    <span className={`text-nowrap ${className}`}>{formatMoney(value)}</span>
);

export default MoneyText;