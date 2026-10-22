// Thanh trạng thái kiểu Odoo ở trang chi tiết: các bước theo thứ tự, bước hiện tại được tô
// <StatusSteps map={CONTRACT_STATUS_LABEL} current={contract.status}
//   steps={[CONTRACT_STATUS.DRAFT, CONTRACT_STATUS.ACTIVE, CONTRACT_STATUS.ENDED]} />
// Trạng thái nằm ngoài luồng chính (vd CANCELLED) tự hiện thêm ở cuối
const StatusSteps = ({ map, steps, current }) => {
    const list = !current || steps.includes(current) ? steps : [...steps, current];

    return (
        <div className="status-steps">
            {list.map((step) => (
                <span key={step} className={`step ${step === current ? 'active' : ''}`}>
                    {map?.[step]?.label ?? step}
                </span>
            ))}
        </div>
    );
};

export default StatusSteps;