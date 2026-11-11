// Component Trợ lý ảo AI thông minh Housify (Gemini Flash Cascade Fallback)
// Hỗ trợ cả 3 vai trò (Customer, Manager, Admin) chuẩn phong cách Odoo Plum (#714b67)
import { useEffect, useRef, useState } from 'react';
import { BiBot, BiMessageRoundedDots, BiMinus, BiRefresh, BiSend, BiX } from 'react-icons/bi';
import { BsStars } from 'react-icons/bs';
import { ROLE } from '../../../constants/enums';
import { useAuth } from '../../../context/AuthContext';
import geminiApi from '../gemini.api';

const ROLE_PROMPTS = {
  [ROLE.CUSTOMER]: {
    roleName: 'Khách thuê',
    welcome: 'Xin chào! Tôi là Trợ lý AI Housify. Tôi có thể giúp bạn kiểm tra hóa đơn tháng này, xem lại nội quy tòa nhà, hướng dẫn báo sự cố hoặc quy trình hoàn cọc.',
    chips: [
      { label: '💳 Hóa đơn tháng này của tôi?', query: 'Phòng của tôi hiện có hóa đơn nào chưa thanh toán không, số tiền bao nhiêu và hạn ngày nào?' },
      { label: '🕒 Giờ đóng mở cửa & nội quy?', query: 'Cho tôi xem các nội quy quan trọng của tòa nhà này (giờ giấc đóng cửa, gửi xe, vật nuôi)?' },
      { label: '🛠️ Hỏng thiết bị thì báo ai?', query: 'Nếu bóng đèn hoặc thiết bị trong phòng bị hỏng thì tôi cần báo sự cố như thế nào?' },
      { label: '💰 Tiền cọc phòng hoàn trả ra sao?', query: 'Khi hết hạn hợp đồng hoặc thanh lý thì tiền cọc của tôi được quyết toán và hoàn trả như thế nào?' },
    ],
  },
  [ROLE.MANAGER]: {
    roleName: 'Quản lý tòa',
    welcome: 'Chào Quản lý! Tôi là Trợ lý vận hành tòa nhà Housify. Tôi có thể hỗ trợ bạn tra cứu danh sách phòng trống, đối soát nợ quá hạn, kiểm tra hợp đồng sắp hết hạn và soạn thảo thông báo.',
    chips: [
      { label: '🚪 Phòng nào đang trống?', query: 'Tòa nhà hiện có bao nhiêu phòng đang trống, nằm ở những tầng nào và giá thuê bao nhiêu?' },
      { label: '⚠️ Phòng nào đang nợ quá hạn?', query: 'Liệt kê danh sách các phòng đang nợ tiền phòng hoặc hóa đơn quá hạn cần giục nợ?' },
      { label: '📅 Hợp đồng sắp hết hạn?', query: 'Trong 60 ngày tới có những hợp đồng nào sắp hết hạn cần liên hệ gia hạn hoặc tìm khách mới?' },
      { label: '📝 Mẫu thông báo cắt nước', query: 'Hãy soạn giúp tôi một mẫu thông báo lịch cắt nước sinh hoạt để súc rửa bồn chứa gửi cho toàn thể cư dân.' },
    ],
  },
  [ROLE.ADMIN]: {
    roleName: 'Admin hệ thống',
    welcome: 'Kính chào Admin! Tôi là Trợ lý phân tích chiến lược Housify. Tôi nắm toàn bộ số liệu doanh thu chuỗi, tỷ lệ lấp đầy các cơ sở và hiệu suất vận hành toàn hệ thống.',
    chips: [
      { label: '📊 Doanh thu toàn chuỗi tháng này?', query: 'Tổng hợp doanh thu thực tế từ hóa đơn của toàn bộ các cơ sở trong tháng này?' },
      { label: '🏢 Tòa nào trống nhiều nhất?', query: 'So sánh tỷ lệ phòng trống giữa các tòa nhà cơ sở hiện tại, tòa nào cần đẩy mạnh tìm khách?' },
      { label: '💰 Tổng nợ quá hạn toàn hệ thống?', query: 'Tổng công nợ quá hạn của cả 3 cơ sở hiện tại là bao nhiêu tiền và gồm những hóa đơn nào?' },
    ],
  },
};

// Hàm render an toàn các định dạng Markdown cơ bản (đậm, gạch đầu dòng, xuống dòng)
const renderFormattedText = (rawText) => {
  if (!rawText) return null;
  const lines = rawText.split('\n');

  return lines.map((line, idx) => {
    const trimmed = line.trim();
    const isBullet = trimmed.startsWith('•') || trimmed.startsWith('- ') || trimmed.startsWith('* ');
    const content = isBullet ? trimmed.replace(/^[-*•]\s*/, '') : line;

    // Tách bold **...**
    const parts = content.split(/(\*\*.*?\*\*)/g);
    const formattedParts = parts.map((part, pIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={pIdx} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>;
      }
      return part;
    });

    if (isBullet) {
      return (
        <div key={idx} className="flex items-start gap-1.5 my-0.5 ps-1">
          <span className="text-[#714b67] font-bold text-xs leading-5">•</span>
          <span className="flex-1">{formattedParts}</span>
        </div>
      );
    }

    return (
      <div key={idx} className={`${trimmed === '' ? 'h-2' : 'mb-1'} leading-relaxed`}>
        {formattedParts}
      </div>
    );
  });
};

const HousifyAiWidget = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);
  const [modelUsed, setModelUsed] = useState('gemini-2.5-flash');

  // Lấy cấu hình theo vai trò
  const roleConfig = ROLE_PROMPTS[user?.role] || ROLE_PROMPTS[ROLE.CUSTOMER];

  const [messages, setMessages] = useState([
    {
      id: 'init',
      role: 'model',
      text: roleConfig.welcome,
      time: 'Vừa xong',
    },
  ]);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Làm mới đoạn chat
  const handleResetChat = () => {
    setMessages([
      {
        id: 'init-' + Date.now(),
        role: 'model',
        text: roleConfig.welcome,
        time: 'Vừa xong',
      },
    ]);
  };

  // Gửi tin nhắn tới backend
  const handleSend = async (messageToSend) => {
    const text = (messageToSend || inputMessage).trim();
    if (!text || loading) return;

    setInputMessage('');
    setShowTooltip(false);

    // Thêm tin nhắn của user vào danh sách
    const userMsg = {
      id: 'user-' + Date.now(),
      role: 'user',
      text,
      time: 'Vừa gửi',
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setLoading(true);

    try {
      // Chuẩn bị history (bỏ tin nhắn init và lấy tối đa 10 lượt gần nhất)
      const historyPayload = nextMessages
        .filter((m) => m.id !== 'init' && !m.id.startsWith('init-'))
        .slice(-10)
        .map((m) => ({
          role: m.role === 'model' ? 'model' : 'user',
          text: m.text,
        }));

      const response = await geminiApi.chat({
        message: text,
        history: historyPayload.slice(0, -1), // Bỏ tin nhắn mới nhất vì đã nằm trong `message`
      });

      const replyText = response.data?.reply || 'Tôi đã xử lý yêu cầu nhưng không nhận được nội dung phản hồi.';
      if (response.data?.modelUsed) {
        setModelUsed(response.data.modelUsed);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: 'bot-' + Date.now(),
          role: 'model',
          text: replyText,
          time: 'Vừa xong',
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          role: 'model',
          text: `⚠️ **Không thể kết nối đến Trợ lý AI**: ${error.message || 'Hệ thống đang quá tải, vui lòng thử lại sau.'}`,
          time: 'Vừa xong',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleChipClick = (query) => {
    handleSend(query);
  };

  return (
    <>
      {/* 1. NÚT TRÒN NỔI (FAB) GÓC DƯỚI PHẢI */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2 print:hidden select-none">
        {/* Tooltip gợi ý nổi ban đầu */}
        {showTooltip && !isOpen && (
          <div
            onClick={() => {
              setIsOpen(true);
              setShowTooltip(false);
            }}
            className="bg-slate-900 text-white text-xs px-3.5 py-1.5 rounded-xl shadow-xl flex items-center gap-2 cursor-pointer transition-all hover:bg-slate-800 animate-bounce"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Hỏi AI về hóa đơn, phòng, số liệu...</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowTooltip(false);
              }}
              className="text-slate-400 hover:text-white ms-1"
            >
              <BiX size={14} />
            </button>
          </div>
        )}

        {/* Nút tròn FAB */}
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen) setShowTooltip(false);
          }}
          className={`w-14 h-14 rounded-full text-white shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none relative ${
            isOpen ? 'bg-slate-700 hover:bg-slate-800' : 'bg-[#714b67] hover:bg-[#5a3851]'
          }`}
          title="Trợ lý AI Housify"
        >
          {isOpen ? (
            <BiX size={28} />
          ) : (
            <>
              <BsStars size={22} />
              {/* Chấm xanh Online */}
              <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
            </>
          )}
        </button>
      </div>

      {/* 2. KHUNG CHAT DRAWER/WINDOW (MỞ RỘNG) */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-[385px] max-w-[calc(100vw-32px)] h-[570px] max-h-[calc(100vh-120px)] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 flex flex-col overflow-hidden transition-all duration-300 animate-in fade-in zoom-in-95 print:hidden">
          {/* Header màu mận Odoo (#714b67) */}
          <div className="bg-gradient-to-r from-[#714b67] to-[#54334c] text-white p-3.5 px-4 flex items-center justify-between shrink-0 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-white border border-white/20">
                  <BiBot size={22} />
                </div>
                <span className="w-2.5 h-2.5 bg-emerald-400 border-2 border-[#714b67] rounded-full absolute bottom-0 right-0" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm leading-none">Housify AI Assistant</h3>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/20 font-semibold uppercase tracking-wider">
                    {roleConfig.roleName}
                  </span>
                </div>
                <span className="text-[11px] text-white/80 flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Trực tuyến · {modelUsed}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 text-white/80">
              <button
                type="button"
                onClick={handleResetChat}
                title="Làm mới cuộc trò chuyện"
                className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <BiRefresh size={18} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Thu nhỏ khung chat"
                className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <BiMinus size={18} />
              </button>
            </div>
          </div>

          {/* Messages Stream (Danh sách tin nhắn) */}
          <div className="flex-1 p-3.5 overflow-y-auto flex flex-col gap-3.5 text-xs bg-slate-50/50">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';

              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-7 h-7 rounded-lg bg-[#f5edf3] text-[#714b67] border border-[#ebdbe7] flex items-center justify-center shrink-0 mt-0.5">
                      <BiBot size={16} />
                    </div>
                  )}

                  <div className={`flex flex-col gap-1 max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`p-3 rounded-2xl shadow-2xs leading-relaxed text-xs ${
                        isUser
                          ? 'bg-[#714b67] text-white rounded-tr-xs'
                          : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs'
                      }`}
                    >
                      {renderFormattedText(msg.text)}
                    </div>
                    <span className="text-[10px] text-slate-400 px-1">{msg.time}</span>
                  </div>
                </div>
              );
            })}

            {/* Hiệu ứng gõ phím khi chờ AI phản hồi */}
            {loading && (
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#f5edf3] text-[#714b67] border border-[#ebdbe7] flex items-center justify-center shrink-0 mt-0.5">
                  <BiBot size={16} />
                </div>
                <div className="bg-white p-2.5 px-3 rounded-2xl border border-slate-200 text-slate-500 text-xs flex items-center gap-1.5 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#714b67] animate-pulse" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#714b67] animate-pulse delay-100" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#714b67] animate-pulse delay-200" />
                  <span className="text-[11px] text-slate-400 ms-1 font-medium">Housify AI đang phân tích...</span>
                </div>
              </div>
            )}

            {/* Gợi ý câu hỏi nhanh dạng viên thuốc (Pill Chips) giống mẫu Tidio */}
            {messages.length <= 2 && (
              <div className="flex flex-col gap-1.5 ps-9 pt-1">
                <span className="text-[11px] font-semibold text-slate-500 mb-0.5 flex items-center gap-1">
                  <BiMessageRoundedDots size={13} /> Gợi ý câu hỏi nhanh:
                </span>
                <div className="flex flex-col gap-1.5">
                  {roleConfig.chips.map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={loading}
                      onClick={() => handleChipClick(chip.query)}
                      className="text-left px-3 py-1.5 rounded-full border border-[#714b67] bg-white hover:bg-[#f7edf5] text-[#714b67] text-xs font-medium transition-all shadow-2xs flex items-center justify-between group active:scale-98"
                    >
                      <span>{chip.label}</span>
                      <span className="text-[10px] text-slate-400 group-hover:text-[#714b67] transition-colors">➔</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className="p-3 bg-white border-t border-slate-200 shrink-0 flex flex-col gap-1.5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputMessage}
                disabled={loading}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Hỏi AI về hóa đơn, phòng, số liệu..."
                className="flex-1 text-xs py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#714b67] focus:bg-white transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || loading}
                className="w-9 h-9 rounded-xl bg-[#714b67] hover:bg-[#5a3851] text-white flex items-center justify-center shrink-0 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none shadow-xs"
                title="Gửi câu hỏi"
              >
                <BiSend size={15} />
              </button>
            </form>
            <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
              <span>Enter để gửi tin nhắn</span>
              <span>Gemini 2.5 Flash · Cascade Resilient</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HousifyAiWidget;

