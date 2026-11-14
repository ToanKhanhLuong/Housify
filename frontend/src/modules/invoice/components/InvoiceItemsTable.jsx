// UC-34 / UC-36: bảng các khoản của hóa đơn. Xem: tên khoản, chỉ số cũ / mới, số lượng, đơn giá, thành tiền, tổng
// Sửa (hóa đơn Nháp): nhập chỉ số điện nước, số lượng phí cố định, thêm / bỏ chi phí phát sinh (+) hoặc khấu trừ tiền thừa (−); tổng tạm tính để xem trước
// Tiền thật do server tính lại khi lưu (BR-095); tiền phòng luôn theo hợp đồng nên chỉ xem
import { Alert, Button, Form, InputGroup, Table } from 'react-bootstrap';
import { BiMinus, BiPlus, BiTrash } from 'react-icons/bi';
import MoneyText from '../../../components/MoneyText';
import { INVOICE_ITEM_TYPE } from '../../../constants/enums';
import { INVOICE_ITEM_TYPE_LABEL } from '../../../constants/statusLabels';

const toNumber = (value) =>
  value === '' || value === null || value === undefined ? 0 : Number(value);

// thành tiền tạm tính của một dòng đang sửa (giống công thức server)
const previewAmount = (item) => {
  if (item.type === INVOICE_ITEM_TYPE.METERED) {
    return (
      Math.max(0, toNumber(item.newReading) - toNumber(item.oldReading)) * toNumber(item.unitPrice)
    );
  }
  if (item.type === INVOICE_ITEM_TYPE.FIXED)
    return toNumber(item.quantity) * toNumber(item.unitPrice);
  if (item.type === INVOICE_ITEM_TYPE.EXTRA) {
    const val = Math.abs(toNumber(item.unitPrice));
    return item.isDeduction ? -val : val;
  }
  return toNumber(item.amount);
};

// ô số trong bảng: gọn, lỗi hiện ngay dưới ô
const NumberCell = ({ value, onChange, error, label, disabled }) => (
  <>
    <Form.Control
      type="number"
      min={0}
      size="sm"
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
      isInvalid={Boolean(error)}
      aria-label={label}
      disabled={disabled}
      className="text-end min-w-24"
    />
    {error && <div className="small text-danger mt-1 text-start">{error}</div>}
  </>
);

// rentItem: dòng tiền phòng (chỉ xem). items: dòng đang hiển thị (đã bỏ tiền phòng khi sửa)
const InvoiceItemsTable = ({
  rentItem,
  items,
  editing = false,
  onChange,
  errors = {},
  disabled = false,
  overpaymentCredit = 0,
}) => {
  const update = (index, field, value) =>
    onChange(
      items.map((item, position) => (position === index ? { ...item, [field]: value } : item)),
    );
  const remove = (index) => onChange(items.filter((_, position) => position !== index));
  const addExtra = (isDeduction = false, suggestedAmount = '') =>
    onChange([
      ...items,
      {
        type: INVOICE_ITEM_TYPE.EXTRA,
        isDeduction,
        description: isDeduction ? 'Khấu trừ tiền chuyển thừa kỳ trước' : '',
        quantity: 1,
        unitPrice: suggestedAmount,
      },
    ]);

  const rows = rentItem ? [rentItem, ...items] : items;
  const total = rows.reduce(
    (sum, item) => sum + (editing ? previewAmount(item) : toNumber(item.amount)),
    0,
  );
  const hasDeductionItem = items.some(
    (item) =>
      item.type === INVOICE_ITEM_TYPE.EXTRA && (item.isDeduction || toNumber(item.amount) < 0),
  );
  const showOverpaymentHint = editing && overpaymentCredit > 0 && !hasDeductionItem;

  return (
    <div className="flex flex-col gap-2">
      {showOverpaymentHint && (
        <Alert
          variant="info"
          className="mb-0 py-2 px-3 flex flex-wrap items-center justify-between gap-2 small"
        >
          <span>
            <b>Gợi ý từ hệ thống:</b> Phòng này còn khoản chuyển thừa{' '}
            <b className="text-danger">
              <MoneyText value={overpaymentCredit} />
            </b>{' '}
            từ hóa đơn kỳ trước. Bạn có thể bấm nút bên phải để khấu trừ vào hóa đơn này.
          </span>
          <Button
            variant="primary"
            size="sm"
            disabled={disabled}
            onClick={() => addExtra(true, overpaymentCredit)}
          >
            + Áp dụng trừ <MoneyText value={overpaymentCredit} />
          </Button>
        </Alert>
      )}
      <div className="overflow-x-auto">
        <Table bordered size="sm" className="align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th>Khoản thu</th>
              <th className="text-end">Chỉ số cũ</th>
              <th className="text-end">Chỉ số mới</th>
              <th className="text-end">Số lượng</th>
              <th className="text-end">Đơn giá</th>
              <th className="text-end">Thành tiền</th>
              {editing && <th aria-label="Thao tác" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((item, rowIndex) => {
              // index trong items (dòng sửa được); dòng tiền phòng đứng đầu không có index
              const index = rentItem ? rowIndex - 1 : rowIndex;
              const error = (field) => errors[`items.${index}.${field}`];
              const editable = editing && item.type !== INVOICE_ITEM_TYPE.RENT;
              const isMetered = item.type === INVOICE_ITEM_TYPE.METERED;
              const isFixed = item.type === INVOICE_ITEM_TYPE.FIXED;
              const isExtra = item.type === INVOICE_ITEM_TYPE.EXTRA;
              const isDeduction = isExtra && (item.isDeduction || toNumber(item.unitPrice) < 0 || toNumber(item.amount) < 0);
              const rowAmount = editing ? previewAmount(item) : toNumber(item.amount);
              const displayUnitPrice = isDeduction && !editable ? -Math.abs(toNumber(item.unitPrice)) : toNumber(item.unitPrice);

              return (
                <tr
                  key={item.serviceId ?? `${item.type}-${rowIndex}`}
                  className={isDeduction ? 'bg-danger-subtle bg-opacity-25' : undefined}
                >
                  <td>
                    {editable && isExtra ? (
                      <>
                        <Form.Control
                          size="sm"
                          placeholder={
                            isDeduction
                              ? 'Lý do khấu trừ, vd: Trừ tiền chuyển thừa tháng trước'
                              : 'Tên khoản, vd Thay khóa cửa'
                          }
                          value={item.description}
                          onChange={(event) => update(index, 'description', event.target.value)}
                          isInvalid={Boolean(error('description'))}
                          maxLength={200}
                          disabled={disabled}
                        />
                        <span
                          className={`inline-block mt-1 px-1.5 py-0.5 rounded small fw-semibold ${
                            isDeduction
                              ? 'bg-danger-subtle text-danger border border-danger-subtle'
                              : 'bg-body-tertiary text-secondary border'
                          }`}
                          style={{ fontSize: '0.7rem' }}
                        >
                          {isDeduction ? '− Khoản giảm trừ / Hoàn tiền thừa' : '+ Chi phí phát sinh'}
                        </span>
                        {error('description') && (
                          <div className="small text-danger mt-1">{error('description')}</div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="fw-medium">{item.description}</div>
                        <div className={`small ${isDeduction ? 'text-danger fw-medium' : 'text-secondary'}`}>
                          {isDeduction
                            ? 'Khoản giảm trừ (Hoàn tiền thừa)'
                            : INVOICE_ITEM_TYPE_LABEL[item.type]?.label}
                        </div>
                      </>
                    )}
                  </td>
                  <td className="text-end">
                    {isMetered &&
                      (editable ? (
                        <NumberCell
                          value={item.oldReading}
                          onChange={(value) => update(index, 'oldReading', value)}
                          error={error('oldReading')}
                          label={`Chỉ số cũ ${item.description}`}
                          disabled={disabled}
                        />
                      ) : (
                        (item.oldReading ?? '—')
                      ))}
                  </td>
                  <td className="text-end">
                    {isMetered &&
                      (editable ? (
                        <NumberCell
                          value={item.newReading}
                          onChange={(value) => update(index, 'newReading', value)}
                          error={error('newReading')}
                          label={`Chỉ số mới ${item.description}`}
                          disabled={disabled}
                        />
                      ) : (
                        (item.newReading ?? '—')
                      ))}
                  </td>
                  <td className="text-end tabular-nums">
                    {editable && isFixed ? (
                      <NumberCell
                        value={item.quantity}
                        onChange={(value) => update(index, 'quantity', value)}
                        error={error('quantity')}
                        label={`Số lượng ${item.description}`}
                        disabled={disabled}
                      />
                    ) : isMetered && editing ? (
                      Math.max(0, toNumber(item.newReading) - toNumber(item.oldReading))
                    ) : (
                      item.quantity
                    )}
                  </td>
                  <td className="text-end tabular-nums">
                    {editable && isExtra ? (
                      isDeduction ? (
                        <>
                          <InputGroup size="sm">
                            <InputGroup.Text className="text-danger fw-bold">−</InputGroup.Text>
                            <Form.Control
                              type="number"
                              min={0}
                              value={item.unitPrice ?? ''}
                              onChange={(event) => update(index, 'unitPrice', event.target.value)}
                              isInvalid={Boolean(error('unitPrice'))}
                              aria-label="Số tiền khấu trừ"
                              disabled={disabled}
                              className="text-end min-w-20 text-danger fw-semibold"
                            />
                          </InputGroup>
                          {error('unitPrice') && (
                            <div className="small text-danger mt-1 text-start">{error('unitPrice')}</div>
                          )}
                        </>
                      ) : (
                        <NumberCell
                          value={item.unitPrice}
                          onChange={(value) => update(index, 'unitPrice', value)}
                          error={error('unitPrice')}
                          label="Số tiền phát sinh"
                          disabled={disabled}
                        />
                      )
                    ) : (
                      <MoneyText
                        value={displayUnitPrice}
                        className={isDeduction ? 'text-danger fw-semibold' : ''}
                      />
                    )}
                  </td>
                  <td className="text-end tabular-nums fw-semibold">
                    <MoneyText
                      value={rowAmount}
                      className={rowAmount < 0 ? 'text-danger fw-bold' : ''}
                    />
                  </td>
                  {editing && (
                    <td className="text-center">
                      {editable && isExtra && (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="hf-btn-ghost"
                          onClick={() => remove(index)}
                          disabled={disabled}
                          aria-label="Bỏ khoản phát sinh"
                          title="Bỏ khoản phát sinh"
                        >
                          <BiTrash />
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5} className="text-end fw-bold">
                {editing ? 'Tổng tạm tính' : 'Tổng cộng'}
              </td>
              <td className="text-end fs-6 fw-bold tabular-nums">
                <MoneyText value={total} />
              </td>
              {editing && <td />}
            </tr>
          </tfoot>
        </Table>
      </div>

      {editing && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="flex items-center gap-1"
              onClick={() => addExtra(false)}
              disabled={disabled}
            >
              <BiPlus />
              Thêm chi phí phát sinh
            </Button>
            <Button
              variant="outline-danger"
              size="sm"
              className="flex items-center gap-1 fw-medium"
              onClick={() => addExtra(true)}
              disabled={disabled}
            >
              <BiMinus />
              Thêm khấu trừ / Hoàn tiền thừa
            </Button>
          </div>
          <span className="small text-secondary">
            Tổng chính thức do hệ thống tính lại khi lưu.
          </span>
        </div>
      )}
      {editing && total < 0 && (
        <Alert variant="danger" className="mb-0 py-2 small">
          Tổng tiền hóa đơn sau khi khấu trừ đang bị âm. Vui lòng giảm số tiền khấu trừ.
        </Alert>
      )}
    </div>
  );
};

export default InvoiceItemsTable;
