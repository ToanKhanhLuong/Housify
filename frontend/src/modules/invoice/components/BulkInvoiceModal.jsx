// UC-34 A1: tạo hóa đơn nháp hàng loạt – chọn kỳ + nhiều phòng đang thuê → mỗi phòng một hóa đơn Nháp,
// tự điền tiền phòng và phí cố định, chỉ số mới tạm = chỉ số cũ (Manager nhập sau ở từng hóa đơn)
// Phòng đã có hóa đơn cùng kỳ thì BE bỏ qua; kết quả hiện số tạo được, phòng bị bỏ qua và cảnh báo thiếu đơn giá
import { useEffect, useState } from 'react';
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap';
import { BiLayerPlus } from 'react-icons/bi';
import ErrorState from '../../../components/ErrorState';
import SkeletonRows from '../../../components/SkeletonRows';
import invoiceApi from '../invoice.api';
import { monthLabel } from '../invoiceFormat';

const NOW = new Date();
const CURRENT_MONTH = `${NOW.getFullYear()}-${String(NOW.getMonth() + 1).padStart(2, '0')}`;

const BulkInvoiceModal = ({ onHide, onDone }) => {
  const [contracts, setContracts] = useState(null); // null = đang tải
  const [loadError, setLoadError] = useState('');
  const [month, setMonth] = useState(CURRENT_MONTH);
  const [selected, setSelected] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // kết quả POST /invoices/bulk
  const [error, setError] = useState('');

  useEffect(() => {
    invoiceApi
      .activeContracts()
      .then((response) => {
        const list = response.data?.items ?? [];
        list.sort((a, b) =>
          String(a.room?.roomNumber).localeCompare(String(b.room?.roomNumber), 'vi', {
            numeric: true,
          }),
        );
        setContracts(list);
      })
      .catch((err) => {
        setContracts([]);
        setLoadError(err.message);
      });
  }, []);

  const allSelected = contracts?.length > 0 && selected.length === contracts.length;
  const toggle = (id) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  const toggleAll = () => setSelected(allSelected ? [] : contracts.map((contract) => contract._id));

  const handleSubmit = async () => {
    if (!month) {
      setError('Vui lòng chọn kỳ hóa đơn (tháng)');
      return;
    }
    if (selected.length === 0) {
      setError('Vui lòng chọn ít nhất một phòng để tạo hóa đơn');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const response = await invoiceApi.bulk({ contractIds: selected, month });
      setResult(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderBody = () => {
    if (result) {
      return (
        <div className="flex flex-col gap-2">
          <Alert variant={result.totalCreated > 0 ? 'success' : 'warning'} className="mb-0">
            Đã tạo <b>{result.totalCreated}</b> hóa đơn nháp kỳ {monthLabel(month)}. Mở từng hóa đơn
            để nhập chỉ số điện nước rồi gửi.
          </Alert>
          {result.errors.length > 0 && (
            <Alert variant="secondary" className="mb-0">
              <div className="fw-semibold mb-1">Bỏ qua {result.errors.length} phòng:</div>
              <ul className="mb-0 ps-3 small">
                {result.errors.map((item) => (
                  <li key={item.contractId}>{item.message}</li>
                ))}
              </ul>
            </Alert>
          )}
          {result.warnings.length > 0 && (
            <Alert variant="warning" className="mb-0">
              <ul className="mb-0 ps-3 small">
                {result.warnings.map((item) => (
                  <li key={`${item.contractId}-${item.message}`}>
                    Phòng {item.roomNumber}: {item.message}
                  </li>
                ))}
              </ul>
            </Alert>
          )}
        </div>
      );
    }

    if (contracts === null) return <SkeletonRows rows={4} columns={2} />;
    if (loadError)
      return <ErrorState message="Không tải được danh sách phòng đang thuê" detail={loadError} />;
    if (contracts.length === 0)
      return <div className="text-secondary">Tòa chưa có phòng nào đang thuê.</div>;

    return (
      <div className="flex flex-col gap-3">
        <Form.Group controlId="bulkMonth">
          <Form.Label>
            Kỳ hóa đơn<span className="text-danger ms-1">*</span>
          </Form.Label>
          <Form.Control
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            disabled={submitting}
          />
        </Form.Group>
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="fw-semibold">
              Phòng đang thuê<span className="text-danger ms-1">*</span>
            </span>
            <Form.Check
              id="bulkAll"
              label={`Chọn tất cả (${contracts.length})`}
              checked={allSelected}
              onChange={toggleAll}
              disabled={submitting}
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 max-h-64 overflow-y-auto rounded border px-3 py-2">
            {contracts.map((contract) => (
              <Form.Check
                key={contract._id}
                id={`bulk-${contract._id}`}
                label={`Phòng ${contract.room?.roomNumber ?? '—'}`}
                checked={selected.includes(contract._id)}
                onChange={() => toggle(contract._id)}
                disabled={submitting}
              />
            ))}
          </div>
        </div>
        <div className="small text-secondary">
          Mỗi phòng một hóa đơn nháp: tự điền tiền phòng và phí cố định, chỉ số điện nước nhập sau.
          Phòng đã có hóa đơn cùng kỳ sẽ được bỏ qua.
        </div>
      </div>
    );
  };

  return (
    <Modal
      show
      onHide={submitting ? undefined : result ? onDone : onHide}
      centered
      backdrop="static"
    >
      <Modal.Header closeButton={!submitting}>
        <Modal.Title className="h5">Tạo hóa đơn hàng loạt</Modal.Title>
      </Modal.Header>
      <Modal.Body className="flex flex-col gap-3">
        {error && (
          <Alert variant="danger" className="mb-0">
            {error}
          </Alert>
        )}
        {renderBody()}
      </Modal.Body>
      <Modal.Footer className="justify-content-start">
        {result ? (
          <Button variant="primary" onClick={onDone}>
            Xem danh sách hóa đơn
          </Button>
        ) : (
          <>
            <Button
              variant="primary"
              className="flex items-center gap-2"
              onClick={handleSubmit}
              disabled={submitting || !contracts?.length}
            >
              {submitting ? <Spinner animation="border" size="sm" /> : <BiLayerPlus />}
              Tạo {selected.length > 0 ? `${selected.length} hóa đơn` : 'hóa đơn'}
            </Button>
            <Button variant="secondary" onClick={onHide} disabled={submitting}>
              Hủy
            </Button>
          </>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default BulkInvoiceModal;
