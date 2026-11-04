// Kiểm tra dữ liệu nhập các form của module activation (UC-08). Trả { field: message }, rỗng là hợp lệ
// Chỉ để người dùng thấy lỗi ngay; BE vẫn kiểm tra lại. Dùng: const errors = validateActivateManager(form); if (hasErrors(errors)) …
import { CONTRACT_TYPE } from '../../constants/enums';
import { CCCD_REGEX, PASSWORD_REGEX, PHONE_REGEX } from '../../constants/regex';

// hôm nay dạng YYYY-MM-DD để so với giá trị ô ngày (cùng múi giờ máy người dùng)
const todayInput = () => {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

// Người ở cùng người đại diện tự nhập. Lỗi theo khóa coOccupants.0.cccd như BE trả
// Câu lỗi giống BE (activation.validation.js, activation.service.js)
const validateCoOccupants = (form, contract) => {
  const errors = {};
  const people = form.coOccupants;
  const existing = contract.coOccupants ?? [];

  if (contract.contractType === CONTRACT_TYPE.GROUP && existing.length + people.length === 0) {
    errors.coOccupants = 'Hợp đồng nhóm phải có ít nhất 1 người ở cùng';
  }
  const total = 1 + existing.length + people.length;
  if (contract.room.capacity != null && total > contract.room.capacity) {
    errors.coOccupants = `Số người (${total}) vượt quá sức chứa tối đa của phòng (${contract.room.capacity} người)`;
  }

  // CCCD, SĐT không trùng với người đại diện, người đã có và nhau
  const cccdSeen = new Set([contract.representativeCccd, ...existing.map((person) => person.cccd)]);
  const phoneSeen = new Set([form.phone.trim(), ...existing.map((person) => person.phone)]);

  people.forEach((person, index) => {
    const key = (field) => `coOccupants.${index}.${field}`;
    const name = person.name.trim();
    const cccd = person.cccd.trim();
    const phone = person.phone.trim();

    if (!name) errors[key('name')] = 'Vui lòng nhập họ tên người ở cùng';
    else if (name.length > 100) errors[key('name')] = 'Họ tên người ở cùng tối đa 100 ký tự';

    if (!cccd) errors[key('cccd')] = 'Vui lòng nhập CCCD người ở cùng';
    else if (!CCCD_REGEX.test(cccd)) errors[key('cccd')] = 'CCCD người ở cùng phải đúng 12 chữ số';
    else if (cccdSeen.has(cccd))
      errors[key('cccd')] = `Số CCCD ${cccd} bị trùng lặp trong hợp đồng`;
    else cccdSeen.add(cccd);

    if (!phone) errors[key('phone')] = 'Vui lòng nhập SĐT người ở cùng';
    else if (!PHONE_REGEX.test(phone))
      errors[key('phone')] = 'SĐT người ở cùng không hợp lệ (10 số, bắt đầu bằng 0)';
    else if (phoneSeen.has(phone))
      errors[key('phone')] = `Số điện thoại ${phone} bị trùng lặp trong hợp đồng`;
    else phoneSeen.add(phone);

    if (!person.dateOfBirth) errors[key('dateOfBirth')] = 'Vui lòng nhập ngày sinh người ở cùng';
    else if (person.dateOfBirth > todayInput())
      errors[key('dateOfBirth')] = 'Ngày sinh không được ở tương lai';
  });
  return errors;
};

// UC-06: form khách điền khi kích hoạt hợp đồng. Câu lỗi giống activation.validation.js của BE
export const validateActivateCustomer = (form, contract) => {
  const errors = {};
  const name = form.name.trim();
  if (!name) errors.name = 'Vui lòng nhập họ và tên';
  else if (name.length > 100) errors.name = 'Họ và tên tối đa 100 ký tự';

  if (!form.phone.trim()) errors.phone = 'Vui lòng nhập số điện thoại';
  else if (!PHONE_REGEX.test(form.phone.trim()))
    errors.phone = 'Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0)';

  if (!form.dateOfBirth) errors.dateOfBirth = 'Vui lòng nhập ngày sinh';
  else if (form.dateOfBirth > todayInput()) errors.dateOfBirth = 'Ngày sinh không được ở tương lai';

  if (form.address.trim().length > 255) errors.address = 'Địa chỉ tối đa 255 ký tự';

  if (!form.cccdFrontImage) errors.cccdFrontImage = 'Vui lòng tải lên ảnh CCCD mặt trước';
  if (!form.cccdBackImage) errors.cccdBackImage = 'Vui lòng tải lên ảnh CCCD mặt sau';

  Object.assign(errors, validateActivateManager(form)); // mật khẩu + xác nhận: cùng luật với Manager
  Object.assign(errors, validateCoOccupants(form, contract));
  return errors;
};

// UC-08 bước 7: mật khẩu tối thiểu 6 ký tự, có chữ và số (như UC-03), phải khớp ô xác nhận. Câu lỗi giống BE
export const validateActivateManager = ({ password, confirmPassword }) => {
  const errors = {};
  if (!password) errors.password = 'Vui lòng nhập mật khẩu';
  else if (!PASSWORD_REGEX.test(password))
    errors.password = 'Mật khẩu tối thiểu 6 ký tự, có chữ và số';

  if (!confirmPassword) errors.confirmPassword = 'Vui lòng xác nhận mật khẩu';
  else if (confirmPassword !== password) errors.confirmPassword = 'Xác nhận mật khẩu không khớp';
  return errors;
};
