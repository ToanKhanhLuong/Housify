// UC-07, 47: một dòng trong khối "Việc cần xử lý" của trang Tổng quan
// Bấm cả dòng để sang danh sách đã lọc sẵn; badge chỉ hiện khi có việc (vd "3 đơn")
import { BiChevronRight } from 'react-icons/bi';
import { Link } from 'react-router-dom';

const TaskRow = ({ to, icon: Icon, iconClass, title, description, badge, badgeTone = 'plum' }) => (
  <Link
    to={to}
    className="p-3 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 flex items-center justify-between gap-3 text-xs no-underline transition-all group"
  >
    <div className="flex items-center gap-2.5 min-w-0">
      <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconClass}`}>
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <div className="font-semibold text-slate-800 group-hover:text-slate-900 transition-colors">
          {title}
        </div>
        <div className="text-[11px] text-slate-500 mt-0.5 text-truncate">{description}</div>
      </div>
    </div>
    <div className="flex items-center gap-1.5 shrink-0">
      {badge && <span className={`hf-badge hf-b-${badgeTone}`}>{badge}</span>}
      <BiChevronRight
        size={18}
        className="text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-transform"
      />
    </div>
  </Link>
);

export default TaskRow;
