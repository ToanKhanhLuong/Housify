// UC-23: Admin soạn nội quy tòa nhà trên ô văn bản, "Lưu & Đăng" ghi đè bản cũ và báo Manager của tòa
// A1: bấm Hủy thì trả lại nội quy hiện hành, không lưu gì
import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Form, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import Input from '../../../components/Input';
import ErrorState from '../../../components/ErrorState';
import SkeletonRows from '../../../components/SkeletonRows';
import { hasErrors, toFieldErrors } from '../../../utils/formErrors';
import buildingApi from '../building.api';
import { validateRules } from '../building.validate';

const BuildingRulesTab = ({ building }) => {
  const [savedRules, setSavedRules] = useState(''); // bản đang áp dụng
  const [rules, setRules] = useState('');
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
          setRules(response.data.rules ?? '');
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

  const isChanged = rules !== savedRules;

  const handleCancel = () => {
    setRules(savedRules);
    setErrors({});
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const clientErrors = validateRules({ rules });
    setErrors(clientErrors);
    if (hasErrors(clientErrors)) return;

    setSubmitting(true);
    try {
      const response = await buildingApi.updateRules(building._id, { rules: rules.trim() });
      const saved = response.data?.rules ?? rules.trim();
      setSavedRules(saved);
      setRules(saved);
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
    return (
      <ErrorState message="Không tải được nội quy." detail={loadError} onRetry={handleRetry} />
    );
  }

  return (
    <Form onSubmit={handleSubmit} noValidate>
      {!building.manager && (
        <Alert variant="info">
          Tòa nhà chưa có Manager phụ trách. Nội quy vẫn được lưu, chỉ là chưa có ai để thông báo.
        </Alert>
      )}
      <Input
        label="Nội quy"
        name="rules"
        as="textarea"
        rows={12}
        value={rules}
        onChange={(event) => setRules(event.target.value)}
        error={errors.rules}
        helpText="Mỗi tòa chỉ lưu một bản nội quy hiện hành. Lưu bản mới sẽ ghi đè bản cũ."
        required
      />
      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={submitting || !isChanged}>
          {submitting && <Spinner animation="border" size="sm" className="me-2" />}
          Lưu &amp; Đăng
        </Button>
        <Button variant="secondary" onClick={handleCancel} disabled={submitting || !isChanged}>
          Hủy
        </Button>
      </div>
    </Form>
  );
};

export default BuildingRulesTab;
