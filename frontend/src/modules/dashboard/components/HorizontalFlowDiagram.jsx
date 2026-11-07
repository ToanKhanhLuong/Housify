// Thẻ Hiệu suất & Chỉ số tổng hợp theo mẫu Google Search Console (UC-07, 47): thanh kỳ sát nhau + modal Phạm vi ngày + 4 ô màu sát nhau khớp màu đường biểu đồ
import { useMemo, useState } from 'react';
import { Button, Card, Form, Modal } from 'react-bootstrap';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BiCheck, BiChevronDown } from 'react-icons/bi';
import Input from '../../../components/Input';
import MoneyText from '../../../components/MoneyText';
import { formatMoney } from '../../../utils/format';

const QUICK_PERIODS = [
  { key: '24h', label: '24 giờ' },
  { key: '7d', label: '7 ngày' },
  { key: '28d', label: '28 ngày' },
  { key: '3m', label: '3 tháng' },
];

const EXTRA_PERIOD_LABELS = {
  '6m': '6 tháng trước',
  '12m': '12 tháng trước',
  custom: 'Tùy chỉnh',
};

const METRIC_META = {
  contracts: {
    label: 'Hợp đồng mới',
    color: 'var(--bs-info)',
    activeClass: 'text-bg-info',
    yAxisId: 'left',
  },
  residents: {
    label: 'Cư dân vào ở',
    color: 'var(--bs-primary)',
    activeClass: 'text-bg-primary',
    yAxisId: 'left',
  },
  revenue: {
    label: 'Doanh thu',
    color: 'var(--bs-success)',
    activeClass: 'text-bg-success',
    yAxisId: 'right',
  },
  incidents: {
    label: 'Sự cố phát sinh',
    color: 'var(--bs-warning)',
    activeClass: 'text-bg-warning',
    yAxisId: 'left',
  },
};

const getDefaultCustomDates = () => {
  const now = new Date();
  const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return { from: fmt(past), to: fmt(now) };
};

const HorizontalFlowDiagram = ({ data }) => {
  const defaultDates = useMemo(() => getDefaultCustomDates(), []);

  const [period, setPeriod] = useState('3m');
  const [activeMetrics, setActiveMetrics] = useState(['contracts', 'residents']);

  // State cho modal "Phạm vi ngày" (Thêm ▾)
  const [showModal, setShowModal] = useState(false);
  const [modalChoice, setModalChoice] = useState('6m');
  const [customFrom, setCustomFrom] = useState(defaultDates.from);
  const [customTo, setCustomTo] = useState(defaultDates.to);
  const [appliedCustom, setAppliedCustom] = useState(defaultDates);

  const handleToggleMetric = (metricKey) => {
    setActiveMetrics((prev) => {
      if (prev.includes(metricKey)) {
        if (prev.length === 1) return prev;
        return prev.filter((key) => key !== metricKey);
      }
      return [...prev, metricKey];
    });
  };

  const handleOpenMoreModal = () => {
    if (period === '6m' || period === '12m' || period === 'custom') {
      setModalChoice(period);
    } else {
      setModalChoice('6m');
    }
    setShowModal(true);
  };

  const handleApplyModal = () => {
    if (modalChoice === 'custom') {
      setAppliedCustom({
        from: customFrom <= customTo ? customFrom : customTo,
        to: customFrom <= customTo ? customTo : customFrom,
      });
    }
    setPeriod(modalChoice);
    setShowModal(false);
  };

  // Tính tổng và danh sách điểm trên trục X theo kỳ đang chọn trên thanh công cụ
  const { totals, chartPoints } = useMemo(() => {
    const perf = data?.performanceByPeriod ?? {};
    const allDaily = Array.isArray(perf.dailyPoints) ? perf.dailyPoints : [];

    if (period === 'custom') {
      const filtered = allDaily.filter(
        (point) =>
          point.date && point.date >= appliedCustom.from && point.date <= appliedCustom.to,
      );
      const sum = filtered.reduce(
        (acc, item) => ({
          contracts: acc.contracts + (item.contracts ?? 0),
          residents: acc.residents + (item.residents ?? 0),
          revenue: acc.revenue + (item.revenue ?? 0),
          incidents: acc.incidents + (item.incidents ?? 0),
        }),
        { contracts: 0, residents: 0, revenue: 0, incidents: 0 },
      );
      return {
        totals: sum,
        chartPoints: filtered.length > 0 ? filtered : allDaily.slice(-8),
      };
    }

    const bucket = perf[period];
    const bucketTotals = bucket?.totals ?? {
      revenue: data?.monthlyRevenue ?? 0,
      contracts: data?.activeContracts ?? 0,
      residents: data?.movedIn ?? 0,
      incidents: data?.openIncidents ?? 0,
    };

    return {
      totals: bucketTotals,
      chartPoints: bucket?.points ?? allDaily.slice(-8),
    };
  }, [data, period, appliedCustom]);

  const cards = [
    {
      key: 'contracts',
      title: METRIC_META.contracts.label,
      value: totals.contracts ?? 0,
    },
    {
      key: 'residents',
      title: METRIC_META.residents.label,
      value: totals.residents ?? 0,
    },
    {
      key: 'revenue',
      title: METRIC_META.revenue.label,
      value: <MoneyText value={totals.revenue ?? 0} />,
    },
    {
      key: 'incidents',
      title: METRIC_META.incidents.label,
      value: totals.incidents ?? 0,
    },
  ];

  const isExtraPeriod = period === '6m' || period === '12m' || period === 'custom';
  const extraLabel = isExtraPeriod ? EXTRA_PERIOD_LABELS[period] : 'Thêm';
  const hasRightAxis = activeMetrics.includes('revenue');

  return (
    <>
      <Card>
        <Card.Body className="p-4 flex flex-col gap-3">
          {/* Thanh nút chọn kỳ sát nhau (segmented group) giống Google Search Console */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="hf-vsw">
              {QUICK_PERIODS.map((option) => {
                const isSelected = period === option.key;
                return (
                  <div
                    key={option.key}
                    role="button"
                    tabIndex={0}
                    onClick={() => setPeriod(option.key)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setPeriod(option.key);
                      }
                    }}
                    className={`hf-vs border-end ${isSelected ? 'hf-vs-on' : ''}`}
                  >
                    {isSelected && <BiCheck size={16} />}
                    <span>{option.label}</span>
                  </div>
                );
              })}

              <div
                role="button"
                tabIndex={0}
                onClick={handleOpenMoreModal}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleOpenMoreModal();
                  }
                }}
                className={`hf-vs ${isExtraPeriod ? 'hf-vs-on' : ''}`}
              >
                {isExtraPeriod && <BiCheck size={16} />}
                <span>{extraLabel}</span>
                <BiChevronDown size={14} />
              </div>
            </div>

            {period === 'custom' && (
              <span className="small text-secondary tabular-nums">
                {appliedCustom.from} → {appliedCustom.to}
              </span>
            )}
          </div>

          {/* 4 thẻ chỉ số nhỏ gọn, sát nhau (gap-0) và tô kín màu tương ứng với đường biểu đồ */}
          <div className="pt-1">
            <div className="inline-grid grid-cols-2 sm:grid-cols-4 border rounded overflow-hidden">
              {cards.map((card, index) => {
                const isChecked = activeMetrics.includes(card.key);
                const meta = METRIC_META[card.key];
                const borderClass = index < cards.length - 1 ? 'border-end' : '';
                return (
                  <div
                    key={card.key}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleToggleMetric(card.key)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleToggleMetric(card.key);
                      }
                    }}
                    className={`min-w-36 sm:min-w-44 px-3 py-2 flex flex-col justify-between gap-1 cursor-pointer select-none ${borderClass} ${
                      isChecked ? meta.activeClass : 'bg-body text-body'
                    }`}
                  >
                    <div className="flex items-center gap-2 small">
                      <span
                        className={`w-4 h-4 rounded-1 border inline-flex items-center justify-center shrink-0 ${
                          isChecked ? 'border-light' : 'border-secondary'
                        }`}
                      >
                        {isChecked && <BiCheck size={13} />}
                      </span>
                      <span className="text-truncate fw-medium">{card.title}</span>
                    </div>
                    <div className="fs-5 fw-bold tabular-nums whitespace-nowrap leading-tight mt-1">
                      {card.value}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Biểu đồ đường thẳng sắc nét (không chấm tròn rỗng) có màu khớp từng ô */}
          <div className="w-full h-60 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartPoints} margin={{ top: 8, right: 16, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--bs-border-color)" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  padding={{ left: 12, right: 12 }}
                />
                <YAxis
                  yAxisId="left"
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  width={28}
                />
                {hasRightAxis && (
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickLine={false}
                    axisLine={false}
                    width={76}
                    tickFormatter={(value) => formatMoney(value)}
                  />
                )}
                <Tooltip
                  formatter={(value, name) => {
                    const meta = METRIC_META[name];
                    if (name === 'revenue') {
                      return [formatMoney(value), meta?.label ?? name];
                    }
                    return [value, meta?.label ?? name];
                  }}
                />
                {activeMetrics.map((metricKey) => {
                  const meta = METRIC_META[metricKey];
                  if (!meta) return null;
                  return (
                    <Line
                      key={metricKey}
                      yAxisId={meta.yAxisId}
                      type="linear"
                      dataKey={metricKey}
                      stroke={meta.color}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                      isAnimationActive={false}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card.Body>
      </Card>

      {/* Modal "Phạm vi ngày" khi bấm vào nút Thêm ▾ giống hệt Google Search Console */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h6 fw-bold mb-0">Phạm vi ngày</Modal.Title>
        </Modal.Header>
        <Modal.Body className="flex flex-col gap-3">
          <Form.Check
            type="radio"
            id="period-6m"
            name="dashboard-period-modal"
            label="6 tháng trước"
            checked={modalChoice === '6m'}
            onChange={() => setModalChoice('6m')}
          />
          <Form.Check
            type="radio"
            id="period-12m"
            name="dashboard-period-modal"
            label="12 tháng trước"
            checked={modalChoice === '12m'}
            onChange={() => setModalChoice('12m')}
          />
          <Form.Check
            type="radio"
            id="period-custom"
            name="dashboard-period-modal"
            label="Tùy chỉnh"
            checked={modalChoice === 'custom'}
            onChange={() => setModalChoice('custom')}
          />

          <div className="grid sm:grid-cols-2 gap-3 ps-4">
            <Input
              label="Ngày bắt đầu"
              name="customFrom"
              type="date"
              value={customFrom}
              onFocus={() => setModalChoice('custom')}
              onChange={(event) => {
                setModalChoice('custom');
                setCustomFrom(event.target.value);
              }}
              className="mb-0"
            />
            <Input
              label="Ngày kết thúc"
              name="customTo"
              type="date"
              value={customTo}
              onFocus={() => setModalChoice('custom')}
              onChange={(event) => {
                setModalChoice('custom');
                setCustomTo(event.target.value);
              }}
              className="mb-0"
            />
          </div>
        </Modal.Body>
        <Modal.Footer className="justify-content-start">
          <Button variant="primary" onClick={handleApplyModal}>
            Áp dụng
          </Button>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Hủy
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default HorizontalFlowDiagram;
