// Bấm thông báo thì mở trang nào: theo type + refId + role người nhận (UC-41)
// null = không gắn bản ghi cụ thể (vd thông báo chung) → chỉ hiện nội dung
// Đường dẫn trang iter 2, 3 đặt theo docs/use_case.md – ai làm trang đó thì sửa lại cho khớp route thật
import { NOTIFICATION_TYPE as TYPE, ROLE } from './enums.js';

const LINKS = {
  [TYPE.INVOICE_SENT]: { [ROLE.CUSTOMER]: (id) => `/customer/invoices/${id}` },
  [TYPE.INVOICE_CANCELLED]: { [ROLE.CUSTOMER]: (id) => `/customer/invoices/${id}` },
  [TYPE.PAYMENT_REMINDER]: { [ROLE.CUSTOMER]: (id) => `/customer/invoices/${id}` },
  [TYPE.PAYMENT_SUCCESS]: {
    [ROLE.CUSTOMER]: (id) => `/customer/invoices/${id}`,
    [ROLE.MANAGER]: (id) => `/manager/invoices/${id}`,
  },
  [TYPE.CONTRACT_RENEWED]: { [ROLE.CUSTOMER]: () => '/customer/contract' },
  [TYPE.CONTRACT_ENDED]: {
    [ROLE.CUSTOMER]: () => '/customer/contract',
    [ROLE.MANAGER]: (id) => `/manager/contracts/${id}`,
  },
  [TYPE.DEPOSIT_REFUNDED]: { [ROLE.CUSTOMER]: () => '/customer/contract' },
  [TYPE.TERMINATION_REQUEST]: {
    [ROLE.CUSTOMER]: (id) => `/customer/termination/${id}`,
    [ROLE.ADMIN]: (id) => `/admin/terminations/${id}`,
  },
  [TYPE.TERMINATION_CONFIRMED]: {
    [ROLE.CUSTOMER]: (id) => `/customer/termination/${id}`,
    [ROLE.MANAGER]: (id) => `/manager/terminations/${id}`,
  },
  [TYPE.TERMINATION_REJECTED]: { [ROLE.MANAGER]: (id) => `/manager/terminations/${id}` },
  [TYPE.TERMINATION_CANCELLED]: { [ROLE.CUSTOMER]: (id) => `/customer/termination/${id}` },
  [TYPE.MANAGER_ASSIGNED]: { [ROLE.MANAGER]: () => '/manager' },
  [TYPE.INCIDENT_UPDATE]: {
    [ROLE.CUSTOMER]: (id) => `/customer/incidents/${id}`,
    [ROLE.MANAGER]: (id) => `/manager/incidents/${id}`,
  },
};

export const getNotificationLink = (notification, role) => {
  const build = LINKS[notification.type]?.[role];
  if (!build) return null;
  return build(notification.refId);
};
