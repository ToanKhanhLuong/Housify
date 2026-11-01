// UC-23: tab Nội quy trong chi tiết tòa theo mockup docs/mock/BuildingDetail.dc.html
// Mặc định chỉ xem; Admin bấm "Chỉnh sửa nội quy" → ô soạn, "Lưu & Đăng" ghi đè bản cũ và báo Manager của tòa
// A1: bấm Hủy thì trả lại nội quy hiện hành, không lưu gì
import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Form, Spinner } from 'react-bootstrap';
import { BiEditAlt } from 'react-icons/bi';
import { toast } from 'react-toastify';
import Input from '../../../components/Input';
import ErrorState from '../../../components/ErrorState';
import SkeletonRows from '../../../components/SkeletonRows';
import { hasErrors, toFieldErrors } from '../../../utils/formErrors';
import buildingApi from '../building.api';
import { validateRules } from '../building.validate';

// readOnly (Manager xem tòa mình): chỉ hiện nội quy để đọc, không có nút sửa
const BuildingRulesTab = ({ building, readOnly = false }) => {
  const [savedRules, setSavedRules] = useState(''); // bản đang áp dụng
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const loadRules = useCallback(
    () =>
      buildingApi
        .rules(building._id)
        .then((response) => {
          setSavedRules(response.data.rules ?? '');
          setLoadError('');
        })
        .catch((error) => setLoadError(error.message))
        .finally(() => setLoading(false)),
    [building._id],
  );

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const handleRetry = () => {
    setLoading(true);
    loadRules();
  };

  const handleStartEdit = () => {
    setDraft(savedRules);
    setErrors({});
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    setErrors({});
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const clientErrors = validateRules({ rules: draft });
    setErrors(clientErrors);
    if (hasErrors(clientErrors)) return;

    setSubmitting(true);
    try {
      const response = await buildingApi.updateRules(building._id, { rules: draft.trim() });
      setSavedRules(response.data?.rules ?? draft.trim());
      setEditing(false);
      if (response.data?.warning) toast.warning(response.data.warning);
      else toast.success('Lưu nội quy thành công');
    } catch (error) {
      setErrors(toFieldErrors(error.errors));
      if (!error.errors) toast.error(error.message); // E02: giữ nguyên nội quy cũ
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <SkeletonRows rows={4} columns={1} />;
  if (loadError) {
    return <ErrorState message="Không tải được nội quy" detail={loadError} onRetry={handleRetry} />;
  }

  if (editing) {
    return (
      <Form onSubmit={handleSubmit} noValidate>
        {!building.manager && (
          <Alert variant="info">
            Tòa nhà chưa có Manager phụ trách. Nội quy vẫn được lưu, chỉ là chưa có ai để thông báo.
          </Alert>
        )}
        <Input
          label="Nội quy tòa nhà"
          name="rules"
          as="textarea"
          rows={9}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          error={errors.rules}
          helpText="Nội quy mới thay thế bản cũ và gửi thông báo cho Manager của tòa."
          disabled={submitting}
          autoFocus
          required
        />
        <div className="flex gap-2">
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting && <Spinner animation="border" size="sm" className="me-2" />}
            Lưu &amp; Đăng
          </Button>
          <Button variant="secondary" onClick={handleCancel} disabled={submitting}>
            Hủy
          </Button>
        </div>
      </Form>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {!readOnly && (
        <div>
          <Button variant="secondary" className="flex items-center gap-2" onClick={handleStartEdit}>
            <BiEditAlt />
            {savedRules ? 'Chỉnh sửa nội quy' : 'Soạn nội quy'}
          </Button>
        </div>
      )}
      {savedRules ? (
        // khung nền nhạt giữ xuống dòng như bản Admin soạn
        <div className="whitespace-pre-line leading-relaxed rounded border bg-body-tertiary px-4 py-3">
          {savedRules}
        </div>
      ) : (
        <div className="text-secondary">
          Tòa nhà chưa có nội quy.{!readOnly && ' Bấm "Soạn nội quy" để soạn và đăng.'}
        </div>
      )}
    </div>
  );
};

export default BuildingRulesTab;
