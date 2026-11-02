// UC-06: hợp đồng thuê phòng trình bày như một trang văn bản A4 (không có ô nhập), dữ liệu lấy từ GET /activation/contract/:token
// party = thông tin Bên B khách đã điền (chưa điền thì để "………"); confirmation = { name, activatedAt } sau khi xác nhận
// Bố cục 4 mục theo mẫu hợp đồng thuê phòng trọ: 1. Nội dung thuê phòng trọ · 2. Trách nhiệm Bên A · 3. Trách nhiệm Bên B · 4. Điều khoản thực hiện
// [NHÁNH THỬ test_activatecustomer] mục 2 viết cứng, mục 3 và 4 viết theo luật đã có trong docs – cần An duyệt câu chữ
// Ô ký ghi "Xác nhận điện tử", tuyệt đối không ghi "chữ ký số" (AGENTS.md)
import { BiCheck } from 'react-icons/bi';
import { CONTRACT_TYPE } from '../../../constants/enums';
import { formatDate, formatMoney } from '../../../utils/format';
import { moneyInWords } from '../moneyInWords';

// ô trống kiểu giấy in sẵn khi chưa có dữ liệu
const Blank = ({ value, className = '' }) =>
  value ? (
    <span className={`fw-semibold ${className}`}>{value}</span>
  ) : (
    <span className="text-secondary">……………………</span>
  );

const Section = ({ number, title, children }) => (
  <section className="flex flex-col gap-1">
    <h2 className="text-base fw-bold mb-0">
      {number}. {title}
    </h2>
    {children}
  </section>
);

// "Ngày 02 tháng 11 năm 2026"
const longDate = (value) => {
  const date = new Date(value);
  const pad = (number) => String(number).padStart(2, '0');
  return `ngày ${pad(date.getDate())} tháng ${pad(date.getMonth() + 1)} năm ${date.getFullYear()}`;
};

// số tháng giữa ngày bắt đầu và kết thúc (BE: kết thúc = bắt đầu + số tháng)
const monthsBetween = (start, end) =>
  Math.round((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24 * 30.44));

// ô xác nhận điện tử: nền nhạt, dấu ✓ lớn chìm phía sau chữ (giống ô xác nhận trên hóa đơn điện tử)
// variant: 'info' (xanh dương) cho Bên A – Manager xác nhận khi tạo và gửi; 'success' (xanh lá) cho Bên B – khách xác nhận
const ConfirmationStamp = ({ name, activatedAt, variant = 'success' }) => {
  const time = new Date(activatedAt).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return (
    <div
      className={`relative overflow-hidden rounded border border-${variant} bg-${variant}-subtle px-4 py-3 text-center [print-color-adjust:exact]`}
    >
      <BiCheck
        aria-hidden="true"
        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-28 text-${variant} opacity-25`}
      />
      <div className="relative flex flex-col gap-1">
        <span className={`small fw-semibold text-${variant}-emphasis`}>
          Đã xác nhận điện tử bởi
        </span>
        <span className="fw-bold text-uppercase">{name}</span>
        <span className="small text-secondary">
          Lúc {time} · {formatDate(activatedAt)}
        </span>
      </div>
    </div>
  );
};

const ContractDocument = ({ contract, party = {}, confirmation = null }) => {
  const { building, room, manager } = contract;
  const isGroup = contract.contractType === CONTRACT_TYPE.GROUP;
  const months = monthsBetween(contract.startDate, contract.endDate);
  // người ở cùng = người Manager đã nhập sẵn + người đại diện vừa nhập (bỏ dòng chưa có tên) [NHÁNH THỬ]
  const coOccupants = [
    ...(contract.coOccupants ?? []),
    ...(party.coOccupants ?? []).filter((person) => person.name.trim()),
  ];

  return (
    // khổ giấy: nền trắng, viền mảnh, chữ có chân như văn bản Word
    <article className="w-full bg-white text-body border rounded shadow-sm px-4 py-5 sm:px-5 font-['Times_New_Roman',Times,'Noto_Serif',serif] leading-relaxed flex flex-col gap-3 print:shadow-none print:border-0">
      <header className="text-center flex flex-col gap-1">
        <span className="fw-bold text-uppercase">Cộng hòa xã hội chủ nghĩa Việt Nam</span>
        <span className="fw-semibold">Độc lập – Tự do – Hạnh phúc</span>
        <span className="mx-auto w-40 border-top border-dark" />
        <h1 className="h4 fw-bold text-uppercase mt-3 mb-0">Hợp đồng thuê phòng trọ</h1>
        <span className="small fst-italic">
          (Hợp đồng {isGroup ? 'nhóm' : 'đơn'} · {months} tháng)
        </span>
      </header>

      <p className="fst-italic mb-0">
        Hôm nay, {longDate(confirmation?.activatedAt ?? new Date())}, tại {building.name},{' '}
        {building.address}, chúng tôi gồm:
      </p>

      {/* Bên A: Manager tạo hợp đồng đại diện bên cho thuê (contracts.createdBy, cũng là người nhận cọc) */}
      <section className="flex flex-col gap-1">
        <h2 className="text-base fw-bold mb-0">
          BÊN CHO THUÊ (gọi tắt là Bên A): Housify – {building.name}
        </h2>
        <div>
          Người đại diện: Ông/bà <Blank value={manager?.name} />
        </div>
        <div className="grid sm:grid-cols-2 gap-x-4">
          <span>
            Điện thoại: <Blank value={manager?.phone} />
          </span>
          <span>
            Sinh ngày: <Blank value={manager?.dateOfBirth && formatDate(manager.dateOfBirth)} />
          </span>
        </div>
        <div>
          Địa chỉ: <Blank value={manager?.address} />
        </div>
      </section>

      {/* Bên B: người đại diện thuê phòng, phần khách tự điền */}
      <section className="flex flex-col gap-1">
        <h2 className="text-base fw-bold mb-0">BÊN THUÊ PHÒNG TRỌ (gọi tắt là Bên B):</h2>
        <div className="grid sm:grid-cols-2 gap-x-4">
          <span>
            Ông/bà: <Blank value={party.name} />
          </span>
          <span>
            Sinh ngày: <Blank value={party.dateOfBirth && formatDate(party.dateOfBirth)} />
          </span>
        </div>
        <div>
          CCCD số: <Blank value={contract.representativeCccd} />
        </div>
        <div className="grid sm:grid-cols-2 gap-x-4">
          <span>
            Điện thoại: <Blank value={party.phone} />
          </span>
          <span>
            Email: <Blank value={contract.representativeEmail} />
          </span>
        </div>
        <div>
          Thường trú tại: <Blank value={party.address} />
        </div>
      </section>

      <p className="fst-italic fw-semibold mb-0">Sau khi thỏa thuận, hai bên thống nhất như sau:</p>

      <Section number={1} title="Nội dung thuê phòng trọ">
        <p className="mb-0">
          Bên A cho Bên B thuê 01 phòng trọ số <b>{room.roomNumber}</b> (tầng {room.floorNumber},{' '}
          {room.roomTypeName}, diện tích {room.area} m²) tại {building.name}, {building.address}.
          Với thời hạn là <b>{months}</b> tháng, kể từ ngày <b>{formatDate(contract.startDate)}</b>{' '}
          đến ngày <b>{formatDate(contract.endDate)}</b>, giá thuê{' '}
          <b>{formatMoney(contract.rentPrice)}</b>/tháng (Bằng chữ:{' '}
          <i>{moneyInWords(contract.rentPrice)}</i>). Chưa bao gồm tiền dịch vụ (điện, nước và các
          phí khác) tính theo hóa đơn hằng tháng.
        </p>
      </Section>

      <Section number={2} title="Trách nhiệm Bên A">
        <p className="mb-0">Bảo đảm phòng cho thuê không có tranh chấp, khiếu kiện.</p>
        <p className="mb-0">
          Gửi hóa đơn hằng tháng đầy đủ, rõ ràng các khoản qua hệ thống Housify.
        </p>
        <p className="mb-0">Tiếp nhận và xử lý sự cố Bên B báo qua hệ thống Housify.</p>
      </Section>

      <Section number={3} title="Trách nhiệm Bên B">
        <p className="mb-0">
          Đặt cọc với số tiền là <b>{formatMoney(contract.deposit)}</b> (Bằng chữ:{' '}
          <i>{moneyInWords(contract.deposit)}</i>), thanh toán tiền thuê phòng và tiền dịch vụ hằng
          tháng theo hóa đơn Bên A gửi qua hệ thống Housify, chuyển khoản theo mã QR in trên hóa
          đơn.
        </p>
        <p className="mb-0">
          Chỉ sử dụng phòng trọ vào mục đích ở, với số lượng tối đa không quá{' '}
          <b>{room.capacity ?? '…'}</b> người theo loại phòng; người ở cùng phải có tên trong hợp
          đồng.
          {!isGroup && ' Hợp đồng đơn, không có người ở cùng.'}
          {isGroup && coOccupants.length > 0 && ' Người ở cùng gồm:'}
          {/* hợp đồng nhóm chưa có ai: Bên B nhập ở bước điền thông tin */}
          {isGroup && coOccupants.length === 0 && (
            <>
              {' '}
              Người ở cùng gồm: <span className="text-secondary">…………………… (Bên B điền)</span>
            </>
          )}
        </p>
        {isGroup && coOccupants.length > 0 && (
          <div className="overflow-x-auto">
            <table className="table table-bordered table-sm mb-0 font-['Times_New_Roman',Times,'Noto_Serif',serif]">
              <thead>
                <tr className="text-center">
                  <th>STT</th>
                  <th>Họ và tên</th>
                  <th>Số CCCD</th>
                  <th>Điện thoại</th>
                  <th>Ngày sinh</th>
                </tr>
              </thead>
              <tbody>
                {coOccupants.map((person, index) => (
                  <tr key={person.id ?? person.cccd}>
                    <td className="text-center">{index + 1}</td>
                    <td>{person.name}</td>
                    <td>{person.cccd}</td>
                    <td>{person.phone}</td>
                    <td>{formatDate(person.dateOfBirth)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mb-0">
          Tuân thủ nội quy tòa nhà
          {building.rules ? ' như sau:' : '. Tòa nhà hiện chưa ban hành nội quy.'}
        </p>
        {building.rules && <p className="mb-0 ps-3 whitespace-pre-line">{building.rules}</p>}
      </Section>

      <Section number={4} title="Điều khoản thực hiện">
        <p className="mb-0">
          Hai bên nghiêm túc thực hiện những quy định trên trong thời hạn cho thuê. Hợp đồng có hiệu
          lực khi Bên B xác nhận điện tử trên hệ thống Housify.
        </p>
        <p className="mb-0">
          Gia hạn hợp đồng chỉ dời ngày kết thúc, giá thuê và tiền cọc giữ nguyên. Chấm dứt hợp đồng
          trước thời hạn thực hiện bằng đơn chấm dứt trên hệ thống Housify.
        </p>
        <p className="mb-0">
          Tiền cọc được hoàn trả đủ bằng tiền mặt khi hợp đồng kết thúc đúng thời hạn mà không có
          đơn chấm dứt; hợp đồng chấm dứt trước hạn theo đơn thì không hoàn cọc.
        </p>
        {contract.notes && (
          <p className="mb-0 whitespace-pre-line">Điều khoản đặc biệt: {contract.notes}</p>
        )}
      </Section>

      {/* khối xác nhận: Bên A trái, Bên B phải. Bên A (Manager) đã xác nhận lúc tạo và gửi hợp đồng */}
      <div className="grid grid-cols-2 gap-4 pt-3 text-center">
        <div className="flex flex-col items-center gap-2">
          <span className="fw-bold">BÊN A</span>
          {manager?.name && contract.createdAt ? (
            <ConfirmationStamp
              name={manager.name}
              activatedAt={contract.createdAt}
              variant="info"
            />
          ) : (
            <span className="small fst-italic text-secondary">Housify – {building.name}</span>
          )}
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="fw-bold">BÊN B</span>
          {confirmation ? (
            <ConfirmationStamp name={confirmation.name} activatedAt={confirmation.activatedAt} />
          ) : (
            <span className="small fst-italic text-secondary">(Chờ xác nhận điện tử)</span>
          )}
        </div>
      </div>
    </article>
  );
};

export default ContractDocument;
