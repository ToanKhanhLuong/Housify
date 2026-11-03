// UC-32: Manager thêm người ở cùng vào hợp đồng đang hiệu lực. Mở từ trang Cư dân (chọn phòng) hoặc từ chi tiết
// hợp đồng (phòng chọn sẵn). BE kiểm sức chứa loại phòng, CCCD trùng trong phòng / đang ở phòng khác, SĐT trùng
import { useEffect, useState } from 'react';
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap';
import { BiUserPlus } from 'react-icons/bi';
import { toast } from 'react-toastify';
import Input from '../../../components/Input';
import Select from '../../../components/Select';
import { hasErrors, toFieldErrors } from '../../../utils/formErrors';
import occupantApi from '../occupant.api';
import { todayInput, validateOccupant } from '../occupant.validate';
import OccupantFields from './OccupantFields';

const EMPTY_FORM = {
  name: '',
  cccd: '',
  phone: '',
  dateOfBirth: '',
  address: '',
  relationship: '',
  cccdFrontImage: '',
  cccdBackImage: '',
};

const contractLabel = (contract) => {
  const name = contract.representative?.name || contract.representative?.cccd || '—';
  return `Phòng ${contract.room?.roomNumber ?? '—'} · ${name} · ${contract.occupantCount ?? 0} người đang ở`;
};

// presetContract: { _id, roomNumber } khi mở từ chi tiết hợp đồng – không cần chọn phòng
const AddOccupantModal = ({ presetContract, onHide, onSaved }) => {
  const [contractId, setContractId] = useState(presetContract?._id ?? '');
  const [contracts, setContracts] = useState({ status: presetContract ? 'ok' : 'loading', items: [] });
  const [form, setForm] = useState(EMPTY_FORM);
  const [joinDate, setJoinDate] = useState(todayInput);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // chưa chọn sẵn phòng: tải hợp đồng đang hiệu lực của tòa để chọn
  useEffect(() => {
    if (presetContract) return;
    occupantApi
      .activeContracts()
      .then((response) => setContracts({ status: 'ok', items: response.data?.items ?? [] }))
      .catch((error) => setContracts({ status: 'error', items: [], error: error.message }));
  }, [presetContract]);

  const handleChange = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const handleImage = (field) => (publicId) => setForm((prev) => ({ ...prev, [field]: publicId }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    const clientErrors = validateOccupant(form);
    if (!contractId) clientErrors.contractId = 'Vui lòng chọn phòng';
    if (!joinDate) clientErrors.joinDate = 'Vui lòng chọn ngày bắt đầu ở';
    setErrors(clientErrors);
    if (hasErrors(clientErrors)) return;

    // ô trống không bắt buộc thì không gửi
    const address = form.address.trim();
    const relationship = form.relationship.trim();
    const data = {
      name: form.name.trim(),
      cccd: form.cccd.trim(),
      phone: form.phone.trim(),
      dateOfBirth: form.dateOfBirth,
      joinDate,
      ...(address && { address }),
      ...(relationship && { relationship }),
      ...(form.cccdFrontImage && { cccdFrontImage: form.cccdFrontImage }),
      ...(form.cccdBackImage && { cccdBackImage: form.cccdBackImage }),
    };

    setSubmitting(true);
    try {
      const response = await occupantApi.add(contractId, data);
      toast.success(response.message || 'Đã thêm người ở cùng');
      onSaved();
    } catch (error) {
      setErrors(toFieldErrors(error.errors)); // 422: lỗi hiện dưới từng ô
      if (!error.errors) toast.error(error.message); // vd "Phòng đã đạt sức chứa tối đa (2 người)"
      setSubmitting(false);
    }
  };

  const renderContractPicker = () => {
    if (presetContract) {
      return (
        <div className="mb-3">
          Thêm vào <b>Phòng {presetContract.roomNumber}</b>
        </div>
      );
    }
    if (contracts.status === 'loading') {
      return (
        <div className="flex items-center gap-2 mb-3 text-secondary small">
          <Spinner animation="border" size="sm" /> Đang tải danh sách phòng…
        </div>
      );
    }
    if (contracts.status === 'error') {
      return (
        <Alert variant="danger" className="small">
          Không tải được danh sách phòng: {contracts.error}
        </Alert>
      );
    }
    if (contracts.items.length === 0) {
      return (
        <Alert variant="secondary" className="small">
          Tòa chưa có hợp đồng nào đang hiệu lực. Chỉ thêm được người ở cùng vào phòng đang có người
          thuê.
        </Alert>
      );
    }
    return (
      <Select
        label="Phòng (hợp đồng đang hiệu lực)"
        name="contractId"
        options={contracts.items.map((contract) => ({
          value: contract._id,
          label: contractLabel(contract),
        }))}
        value={contractId}
        onChange={(event) => {
          setContractId(event.target.value);
          setErrors((prev) => ({ ...prev, contractId: undefined }));
        }}
        error={errors.contractId}
        disabled={submitting}
        required
      />
    );
  };

  return (
    <Modal show onHide={submitting ? undefined : onHide} centered backdrop="static" size="lg">
      <Form onSubmit={handleSubmit} noValidate>
        <Modal.Header closeButton={!submitting}>
          <div>
            <Modal.Title className="h5">Thêm người ở cùng</Modal.Title>
            <div className="small text-secondary">
              Người ở cùng không có tài khoản đăng nhập. Hệ thống chặn nếu phòng đã đủ sức chứa.
            </div>
          </div>
        </Modal.Header>
        <Modal.Body>
          {renderContractPicker()}
          <OccupantFields
            form={form}
            errors={errors}
            onChange={handleChange}
            onImage={handleImage}
            disabled={submitting}
          />
          <Input
            label="Ngày bắt đầu ở"
            name="joinDate"
            type="date"
            value={joinDate}
            onChange={(event) => setJoinDate(event.target.value)}
            error={errors.joinDate}
            helpText="Mặc định là hôm nay"
            className="mb-0 mt-1"
            disabled={submitting}
            required
          />
        </Modal.Body>
        <Modal.Footer className="justify-content-start">
          <Button
            type="submit"
            variant="primary"
            className="flex items-center gap-2"
            disabled={submitting || (!presetContract && contracts.items.length === 0)}
          >
            {submitting ? <Spinner animation="border" size="sm" /> : <BiUserPlus />}
            Thêm người ở cùng
          </Button>
          <Button variant="secondary" onClick={onHide} disabled={submitting}>
            Hủy
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default AddOccupantModal;
