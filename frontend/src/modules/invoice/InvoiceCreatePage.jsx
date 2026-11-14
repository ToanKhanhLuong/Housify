// UC-34: lập hóa đơn tháng (Manager) – chọn kỳ và phòng đang thuê → hệ thống tự điền tiền phòng, phí cố định,
// điện nước kèm chỉ số cũ (GET /invoices/prefill) → Manager nhập chỉ số mới, sửa số lượng, thêm phát sinh → "Lưu nháp"
// Đã có hóa đơn cùng kỳ: cảnh báo và chặn tạo mới (1 phòng / 1 kỳ chỉ có 1 hóa đơn hiệu lực). Mở sẵn phòng: /invoices/new?contractId=
// Chưa có đơn giá dịch vụ: cảnh báo, vẫn cho lập với giá 0.
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { BiSave } from 'react-icons/bi';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import PageHeader from '../../components/PageHeader';
import SkeletonRows from '../../components/SkeletonRows';
import { INVOICE_ITEM_TYPE } from '../../constants/enums';
import { hasErrors, toFieldErrors } from '../../utils/formErrors';
import invoiceApi from './invoice.api';
import { hasNegativeInvoiceTotal, validateInvoiceItems } from './invoice.validate';
import { toDraftItems, toPayloadItems } from './invoiceItems';
import InvoiceItemsTable from './components/InvoiceItemsTable';

// kỳ mặc định = tháng hiện tại, dạng YYYY-MM (tính 1 lần khi nạp trang)
const NOW = new Date();
const CURRENT_MONTH = `${NOW.getFullYear()}-${String(NOW.getMonth() + 1).padStart(2, '0')}`;

// nhãn phòng trong ô chọn: "Phòng 101 · Nguyễn Thị Thuê"
const contractLabel = (contract) => {
  const who =
    contract.representative?.name || contract.representative?.email || 'chưa có người đại diện';
  return `Phòng ${contract.room?.roomNumber ?? '—'} · ${who}`;
};

const InvoiceCreatePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [contracts, setContracts] = useState(null); // null = đang tải
  const [contractsError, setContractsError] = useState('');
  const [contractId, setContractId] = useState(searchParams.get('contractId') ?? '');
  const [month, setMonth] = useState(CURRENT_MONTH);

  const [prefill, setPrefill] = useState(null); // dữ liệu gợi ý của phòng + kỳ đang chọn
  const [prefillError, setPrefillError] = useState('');
  // mở sẵn phòng qua ?contractId= thì đang tải gợi ý ngay từ đầu
  const [prefillLoading, setPrefillLoading] = useState(() =>
    Boolean(searchParams.get('contractId')),
  );
  const [items, setItems] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // danh sách phòng đang thuê (hợp đồng ACTIVE) của tòa
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
      .catch((error) => {
        setContracts([]);
        setContractsError(error.message);
      });
  }, []);

  // chọn đủ phòng và kỳ → tải gợi ý. ignore: bỏ kết quả cũ khi đổi lựa chọn nhanh
  useEffect(() => {
    if (!contractId || !month) return undefined;
    let ignore = false;
    invoiceApi
      .prefill({ contractId, month })
      .then((response) => {
        if (ignore) return;
        setPrefill(response.data);
        setItems(toDraftItems(response.data.items));
        setErrors({});
        setPrefillError('');
      })
      .catch((error) => !ignore && setPrefillError(error.message))
      .finally(() => !ignore && setPrefillLoading(false));
    return () => {
      ignore = true;
    };
  }, [contractId, month]);

  const handleContractChange = (event) => {
    setContractId(event.target.value);
    setPrefill(null);
    setPrefillLoading(Boolean(event.target.value));
  };
  const handleMonthChange = (event) => {
    setMonth(event.target.value);
    setPrefill(null);
    setPrefillLoading(Boolean(contractId && event.target.value));
  };

  const save = async () => {
    setSaving(true);
    try {
      const response = await invoiceApi.create({
        contractId,
        month,
        items: toPayloadItems(items),
      });
      const { warnings = [], ...invoice } = response.data;
      toast.success(`Đã lưu nháp hóa đơn ${invoice.invoiceCode}`);
      warnings.forEach((warning) => toast.warning(warning));
      navigate(`/invoices/${invoice._id}`, { replace: true });
    } catch (error) {
      setSaving(false);
      if (error.errors) setErrors(toFieldErrors(error.errors));
      else toast.error(error.message);
    }
  };

  const rentItem = prefill?.items.find((item) => item.type === INVOICE_ITEM_TYPE.RENT);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (prefill?.hasExistingInvoice) {
      toast.warning('Phòng này đã có hóa đơn trong kỳ đang chọn. Vui lòng mở hóa đơn đã có để xử lý.');
      return;
    }
    const clientErrors = validateInvoiceItems(items);
    setErrors(clientErrors);
    if (hasErrors(clientErrors)) return;
    if (hasNegativeInvoiceTotal(items, rentItem?.amount)) {
      toast.error('Tổng tiền hóa đơn sau khi khấu trừ không được âm');
      return;
    }
    save();
  };

  const renderItems = () => {
    if (!contractId || !month) {
      return (
        <div className="text-secondary">Chọn phòng và kỳ để hệ thống tự điền các khoản thu.</div>
      );
    }
    if (prefillLoading) return <SkeletonRows rows={4} columns={5} />;
    if (prefillError) {
      return <ErrorState message="Không tải được dữ liệu lập hóa đơn" detail={prefillError} />;
    }
    if (!prefill) return null;
    return (
      <div className="flex flex-col gap-3">
        {prefill.warnings.length > 0 && (
          <Alert variant={prefill.hasExistingInvoice ? 'warning' : 'warning'} className="mb-0">
            <ul className="mb-0 ps-3">
              {prefill.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
            {prefill.existingInvoiceId && (
              <div className="mt-2">
                <Link
                  to={`/invoices/${prefill.existingInvoiceId}`}
                  className="fw-semibold text-decoration-underline"
                >
                  Mở hóa đơn đã có ({prefill.existingInvoiceCode ? `${prefill.existingInvoiceCode} · ` : ''}
                  {prefill.existingInvoiceStatus === 'DRAFT'
                    ? 'Nháp'
                    : prefill.existingInvoiceStatus === 'PENDING'
                      ? 'Chờ thanh toán'
                      : prefill.existingInvoiceStatus === 'PAID'
                        ? 'Đã thanh toán'
                        : 'Xem chi tiết'}) &rarr;
                </Link>
              </div>
            )}
          </Alert>
        )}
        <InvoiceItemsTable
          rentItem={rentItem}
          items={items}
          editing
          onChange={setItems}
          errors={errors}
          disabled={saving}
          overpaymentCredit={prefill.overpaymentCredit ?? 0}
        />
      </div>
    );
  };

  if (contracts === null) {
    return (
      <Card>
        <Card.Body>
          <SkeletonRows rows={5} columns={4} />
        </Card.Body>
      </Card>
    );
  }
  if (contractsError) {
    return (
      <ErrorState message="Không tải được danh sách phòng đang thuê" detail={contractsError} />
    );
  }
  if (contracts.length === 0) {
    return <EmptyState message="Tòa chưa có phòng nào đang thuê để lập hóa đơn." />;
  }

  return (
    <Form onSubmit={handleSubmit} noValidate>
      <PageHeader
        backTo="/invoices"
        breadcrumbs={[{ label: 'Hóa đơn', to: '/invoices' }, 'Tạo hóa đơn']}
        actions={
          <>
            <Button
              type="submit"
              variant="primary"
              className="flex items-center gap-2"
              disabled={
                saving || !prefill || prefillLoading || Boolean(prefill?.hasExistingInvoice)
              }
              title={
                prefill?.hasExistingInvoice
                  ? 'Phòng này đã có hóa đơn trong kỳ này'
                  : undefined
              }
            >
              {saving ? <Spinner animation="border" size="sm" /> : <BiSave />}
              Lưu nháp
            </Button>
            <Button variant="secondary" onClick={() => navigate('/invoices')} disabled={saving}>
              Hủy
            </Button>
          </>
        }
      />

      <Card className="hf-paper">
        <Row className="g-3">
          <Col md={7}>
            <Form.Group controlId="contractId">
              <Form.Label>
                Phòng<span className="text-danger ms-1">*</span>
              </Form.Label>
              <Form.Select value={contractId} onChange={handleContractChange} disabled={saving}>
                <option value="">-- Chọn phòng đang thuê --</option>
                {contracts.map((contract) => (
                  <option key={contract._id} value={contract._id}>
                    {contractLabel(contract)}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={5}>
            <Form.Group controlId="month">
              <Form.Label>
                Kỳ hóa đơn<span className="text-danger ms-1">*</span>
              </Form.Label>
              <Form.Control
                type="month"
                value={month}
                onChange={handleMonthChange}
                disabled={saving}
              />
            </Form.Group>
          </Col>
        </Row>

        <div>
          <h2 className="h6 fw-bold mb-2">Các khoản thu</h2>
          {renderItems()}
        </div>
        {prefill && (
          <div className="small text-secondary">
            Lưu nháp xong vẫn sửa được. Hóa đơn chỉ đến tay khách khi bấm "Gửi hóa đơn" ở trang chi
            tiết.
          </div>
        )}
      </Card>
    </Form>
  );
};

export default InvoiceCreatePage;
