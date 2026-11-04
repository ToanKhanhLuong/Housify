// Ô số liệu trên trang tổng quan (UC-07, 47): icon, giá trị lớn, nhãn, dòng phụ. Có to thì bấm được sang trang chi tiết
import { Link } from 'react-router-dom';

const StatTile = ({ icon: Icon, label, value, sub, to }) => {
  const content = (
    <>
      <span className="hf-av w-11 h-11">
        <Icon size={22} />
      </span>
      <span className="flex flex-col min-w-0">
        <span className="fs-4 fw-bold leading-tight tabular-nums text-body">{value}</span>
        <span className="small text-secondary">{label}</span>
        {sub && <span className="small text-secondary">{sub}</span>}
      </span>
    </>
  );

  return to ? (
    <Link to={to} className="hf-tcard no-underline flex-row items-center gap-3 p-3">
      {content}
    </Link>
  ) : (
    <div className="hf-card flex items-center gap-3 p-3">{content}</div>
  );
};

export default StatTile;
