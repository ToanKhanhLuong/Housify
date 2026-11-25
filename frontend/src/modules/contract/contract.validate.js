// Kiểm tra form của module contract (UC-24 tạo, UC-26 sửa, UC-27 gia hạn). Trả { field: message }, rỗng là hợp lệ
// Câu lỗi giống contract.validation.js của BE; lỗi người ở cùng theo khóa coOccupants.0.cccd như BE trả
import { CONTRACT_TYPE } from '../../constants/enums';
import { CCCD_REGEX, PERSON_NAME_MESSAGE, PERSON_NAME_REGEX, PHONE_REGEX } from '../../constants/regex';
import { endDateOf } from './contractFormat';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const todayInput = () => {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

// thời hạn hợp đồng và số tháng gia hạn: 3..24 tháng (giống BE contract.validation.js)
export const MIN_CONTRACT_MONTHS = 3;
export const MAX_CONTRACT_MONTHS = 24;

const validateMonths = (value) => {
  if (value === '' || value === null || value === undefined) return 'Vui lòng nhập thời hạn thuê';
  const months = Number(value);
  if (!Number.isInteger(months)) return 'Thời hạn thuê phải là số nguyên';
  if (months < MIN_CONTRACT_MONTHS) return `Thời hạn thuê tối thiểu ${MIN_CONTRACT_MONTHS} tháng`;
  if (months > MAX_CONTRACT_MONTHS) return `Thời hạn thuê tối đa ${MAX_CONTRACT_MONTHS} tháng`;
  return '';
};

// CCCD, email người đại diện + ngày bắt đầu, số tháng, ghi chú (dùng cho tạo và sửa nháp)
export const validateContractFields = (form) => {
  const errors = {};
  const cccd = form.representativeCccd.trim();
  if (!cccd) errors.representativeCccd = 'Vui lòng nhập số CCCD người đại diện';
  else if (!CCCD_REGEX.test(cccd)) errors.representativeCccd = 'CCCD phải đúng 12 chữ số';

  const email = form.representativeEmail.trim();
  if (!email) errors.representativeEmail = 'Vui lòng nhập email người đại diện';
  else if (!EMAIL_REGEX.test(email)) errors.representativeEmail = 'Email không hợp lệ';

  if (!form.startDate) errors.startDate = 'Vui lòng nhập ngày bắt đầu';
  const monthsError = validateMonths(form.durationMonths);
  if (monthsError) errors.durationMonths = monthsError;

  if (!errors.startDate && !errors.durationMonths) {
    const computedEnd = endDateOf(form.startDate, form.durationMonths);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (computedEnd && computedEnd <= today) {
      errors.startDate =
        'Ngày kết thúc hợp đồng phải sau ngày hiện tại, vui lòng kiểm tra lại ngày bắt đầu và thời hạn thuê';
    }
  }

  if ((form.notes ?? '').length > 1000) errors.notes = 'Ghi chú tối đa 1000 ký tự';
  return errors;
};

// UC-24: form tạo – thêm phòng, loại hợp đồng, người ở cùng (không bắt buộc; khách có thể tự thêm khi kích hoạt)
export const validateCreateContract = (form, capacity) => {
  const errors = validateContractFields(form);
  if (!form.roomId) errors.roomId = 'Vui lòng chọn phòng';
  if (!form.contractType) errors.contractType = 'Vui lòng chọn loại hợp đồng';

  const people = form.contractType === CONTRACT_TYPE.GROUP ? form.coOccupants : [];
  if (capacity && 1 + people.length > capacity) {
    errors.coOccupants = `Số người (${1 + people.length}) vượt quá sức chứa tối đa của phòng (${capacity} người)`;
  }

  // CCCD, SĐT không trùng người đại diện và nhau (BE: "… bị trùng lặp trong hợp đồng")
  const cccdSeen = new Set([form.representativeCccd.trim()]);
  const phoneSeen = new Set();
  people.forEach((person, index) => {
    const key = (field) => `coOccupants.${index}.${field}`;
    const cccd = person.cccd.trim();
    const phone = person.phone.trim();
    if (!person.name.trim()) errors[key('name')] = 'Vui lòng nhập họ tên người ở cùng';
    else if (!PERSON_NAME_REGEX.test(person.name.trim())) errors[key('name')] = PERSON_NAME_MESSAGE;
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

// UC-27: số tháng gia hạn nguyên 3..24
export const validateRenew = ({ months, notes }) => {
  const errors = {};
  const value = Number(months);
  if (months === '' || months === null || months === undefined) errors.months = 'Vui lòng nhập số tháng gia hạn';
  else if (!Number.isInteger(value)) errors.months = 'Số tháng gia hạn phải là số nguyên';
  else if (value < MIN_CONTRACT_MONTHS) errors.months = `Số tháng gia hạn tối thiểu ${MIN_CONTRACT_MONTHS} tháng`;
  else if (value > MAX_CONTRACT_MONTHS) errors.months = `Số tháng gia hạn tối đa ${MAX_CONTRACT_MONTHS} tháng`;
  if ((notes ?? '').length > 1000) errors.notes = 'Ghi chú tối đa 1000 ký tự';
  return errors;
};
