// UC-34 / UC-36: bảng các khoản của hóa đơn. Xem: tên khoản, chỉ số cũ / mới, số lượng, đơn giá, thành tiền, tổng
// Sửa (hóa đơn Nháp): nhập chỉ số điện nước, số lượng phí cố định, thêm / bỏ chi phí phát sinh; tổng tạm tính để xem trước
// Tiền thật do server tính lại khi lưu (BR-095); tiền phòng luôn theo hợp đồng nên chỉ xem
import { Button, Form, Table } from 'react-bootstrap';
import { BiPlus, BiTrash } from 'react-icons/bi';
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
  if (item.type === INVOICE_ITEM_TYPE.EXTRA) return toNumber(item.unitPrice);
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
}) => {
  const update = (index, field, value) =>
    onChange(
      items.map((item, position) => (position === index ? { ...item, [field]: value } : item)),
    );
  const remove = (index) => onChange(items.filter((_, position) => position !== index));
  const addExtra = () =>
    onChange([
      ...items,
      { type: INVOICE_ITEM_TYPE.EXTRA, description: '', quantity: 1, unitPrice: '' },
    ]);

  const rows = rentItem ? [rentItem, ...items] : items;
  const total = rows.reduce(
    (sum, item) => sum + (editing ? previewAmount(item) : toNumber(item.amount)),
    0,
  );

  return (
    <div className="flex flex-col gap-2">
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
              const rowAmount = editing ? previewAmount(item) : toNumber(item.amount);

              return (
                <tr key={item.serviceId ?? `${item.type}-${rowIndex}`}>
                  <td>
                    {editable && isExtra ? (
                      <>
                        <Form.Control
                          size="sm"
                          placeholder="Tên khoản, vd Thay khóa cửa"
                          value={item.description}
                          onChange={(event) => update(index, 'description', event.target.value)}
                          isInvalid={Boolean(error('description'))}
                          maxLength={200}
                          disabled={disabled}
                        />
                        {error('description') && (
                          <div className="small text-danger mt-1">{error('description')}</div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="fw-medium">{item.description}</div>
                        <div className="small text-secondary">
                          {INVOICE_ITEM_TYPE_LABEL[item.type]?.label}
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
                      <NumberCell
                        value={item.unitPrice}
                        onChange={(value) => update(index, 'unitPrice', value)}
                        error={error('unitPrice')}
                        label="Số tiền phát sinh"
                        disabled={disabled}
                      />
                    ) : (
                      <MoneyText value={item.unitPrice} />
                    )}
                  </td>
                  <td className="text-end tabular-nums fw-semibold">
                    <MoneyText value={rowAmount} />
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
          <Button
            variant="secondary"
            size="sm"
            className="flex items-center gap-1"
            onClick={addExtra}
            disabled={disabled}
          >
            <BiPlus />
            Thêm chi phí phát sinh
          </Button>
          <span className="small text-secondary">
            Tổng chính thức do hệ thống tính lại khi lưu.
          </span>
        </div>
      )}
    </div>
  );
};

export default InvoiceItemsTable;
