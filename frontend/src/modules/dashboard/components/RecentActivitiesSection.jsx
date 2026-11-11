// Khối Hoạt động gần đây (thanh cuộn dọc khi > 5 dòng) (UC-07, 47)
import { useMemo, useState } from 'react';
import { Card } from 'react-bootstrap';
import { BiHistory, BiUser } from 'react-icons/bi';
import { formatDateTime, formatMoney, formatDate } from '../../../utils/format';

const BADGE_CLASS_BY_TONE = {
  plum: 'hf-b-plum',
  ok: 'hf-b-ok',
  warn: 'hf-b-warn',
  red: 'hf-b-red',
  info: 'hf-b-info',
  gray: 'hf-b-gray',
};

const RecentActivitiesSection = ({ data, reportData }) => {
  const [selectedActivityId, setSelectedActivityId] = useState('');

  // Gộp hoạt động gần đây từ BE (audit_logs, hợp đồng mới ký, sự cố...) và danh sách hóa đơn quá hạn
  const activities = useMemo(() => {
    const fromBackend = Array.isArray(data?.recentActivities) ? data.recentActivities : [];
    const lateList = Array.isArray(reportData?.latePayments) ? reportData.latePayments : [];
    const lateItems = lateList.map((item) => ({
      _id: `late-${item._id}`,
      code: item.roomNumber ? `P.${item.roomNumber}` : item.invoiceCode,
      category: 'Hóa đơn quá hạn',
      title: `Hóa đơn ${item.invoiceCode} (${formatMoney(item.amount)})`,
      actorName: `Kỳ ${item.month}`,
      timeText: `Trễ ${item.overdueDays} ngày`,
      badgeText: 'Quá hạn',
      badgeTone: 'red',
      detail: `Phòng ${item.roomNumber} chưa thanh toán hóa đơn ${item.invoiceCode} (hạn ${formatDate(item.dueDate)}).`,
    }));

    return [...lateItems, ...fromBackend];
  }, [data, reportData]);

  const activeActivity = activities.find((item) => String(item._id) === String(selectedActivityId));

  return (
    <div className="flex flex-col gap-4">
      {/* Khối Hoạt động & Cần xử lý gần đây (cuộn dọc bằng thanh scroll khi > 5 dòng) */}
      <Card>
        <Card.Header className="flex items-center justify-between gap-2 py-3 px-4">
          <span className="fw-semibold text-body">Hoạt động & Cần xử lý gần đây</span>
          <span className="small text-secondary">{activities.length} ghi nhận</span>
        </Card.Header>
        <Card.Body className="p-4 flex flex-col gap-2">
          {activities.length === 0 ? (
            <div className="hf-ph py-4">
              <BiHistory size={22} />
              <span>Chưa có phát sinh hay nhật ký mới trong phạm vi này</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
              {activities.map((item) => {
                const isSelected = String(item._id) === String(selectedActivityId);
                const badgeClass = BADGE_CLASS_BY_TONE[item.badgeTone] || 'hf-b-plum';
                const timeDisplay =
                  item.timeText || (item.createdAt ? formatDateTime(item.createdAt) : '');

                return (
                  <div
                    key={item._id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedActivityId(isSelected ? '' : item._id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedActivityId(isSelected ? '' : item._id);
                      }
                    }}
                    className={`p-2.5 rounded border transition-colors flex items-center justify-between gap-3 text-start ${
                      isSelected
                        ? 'border-primary bg-body-tertiary'
                        : 'border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="fw-bold tabular-nums text-body shrink-0">{item.code}</span>
                      <span className="text-secondary small shrink-0">·</span>
                      <span className="small text-secondary shrink-0">{item.category}</span>
                      <span className="text-secondary small shrink-0">·</span>
                      <span className="small text-body text-truncate">{item.title}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="small text-secondary inline-flex items-center gap-1">
                        <BiUser size={14} />
                        {item.actorName}
                      </span>
                      {timeDisplay && (
                        <span className="small text-secondary tabular-nums">{timeDisplay}</span>
                      )}
                      <span className={`hf-badge ${badgeClass}`}>{item.badgeText}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeActivity && activeActivity.detail && (
            <div className="border-top pt-2 mt-1 small text-secondary">
              <strong className="text-body">{activeActivity.title}:</strong> {activeActivity.detail}
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default RecentActivitiesSection;
