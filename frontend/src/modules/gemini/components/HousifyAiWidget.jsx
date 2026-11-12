// Component Trợ lý AI Housify - Tối giản, thanh lịch chuẩn mẫu VKho / Odoo Plum (#714b67)
import { useEffect, useRef, useState } from 'react';
import { BiRefresh, BiSend, BiX } from 'react-icons/bi';
import { BsStars } from 'react-icons/bs';
import { ROLE } from '../../../constants/enums';
import { useAuth } from '../../../context/AuthContext';
import geminiApi from '../gemini.api';

const ROLE_CONFIGS = {
  [ROLE.CUSTOMER]: {
    promptPlaceholder: 'Hỏi tôi về hóa đơn, phòng, nội quy, sự cố...',
    chips: [
      {
        label: 'Hướng dẫn sử dụng Housify',
        query: 'Hướng dẫn cho tôi các chức năng cơ bản trên Housify dành cho khách thuê (xem phòng, hóa đơn, báo sự cố, thanh toán)?',
      },
      {
        label: 'Hóa đơn tháng này bao nhiêu?',
        query: 'Phòng của tôi hiện có hóa đơn nào chưa thanh toán không, số tiền bao nhiêu và hạn ngày nào?',
      },
      {
        label: 'Giờ giấc & nội quy tòa nhà',
        query: 'Cho tôi xem các nội quy quan trọng của tòa nhà này (giờ giấc đóng cửa, gửi xe, vật nuôi)?',
      },
      {
        label: 'Hỏng thiết bị thì báo ai?',
        query: 'Nếu bóng đèn hoặc thiết bị trong phòng bị hỏng thì tôi cần báo sự cố như thế nào?',
      },
      {
        label: 'Tiền cọc phòng hoàn trả ra sao?',
        query: 'Khi hết hạn hợp đồng hoặc thanh lý thì tiền cọc của tôi được quyết toán và hoàn trả như thế nào?',
      },
    ],
  },
  [ROLE.MANAGER]: {
    promptPlaceholder: 'Hỏi tôi về phòng trống, nợ quá hạn, hợp đồng...',
    chips: [
      {
        label: 'Hướng dẫn sử dụng Housify',
        query: 'Tóm tắt các chức năng chính dành cho Quản lý tòa nhà trên Housify.',
      },
      {
        label: 'Tòa nhà có bao nhiêu phòng đang trống?',
        query: 'Tòa nhà hiện có bao nhiêu phòng đang trống, nằm ở những tầng nào và giá thuê bao nhiêu?',
      },
      {
        label: 'Phòng nào đang nợ tiền quá hạn?',
        query: 'Liệt kê danh sách các phòng đang nợ tiền phòng hoặc hóa đơn quá hạn cần giục nợ?',
      },
      {
        label: 'Hợp đồng nào sắp hết hạn trong 60 ngày?',
        query: 'Trong 60 ngày tới có những hợp đồng nào sắp hết hạn cần liên hệ gia hạn hoặc tìm khách mới?',
      },
      {
        label: 'Soạn mẫu thông báo cắt nước sinh hoạt',
        query: 'Hãy soạn giúp tôi một mẫu thông báo lịch cắt nước sinh hoạt để súc rửa bồn chứa gửi cho toàn thể cư dân.',
      },
    ],
  },
  [ROLE.ADMIN]: {
    promptPlaceholder: 'Hỏi tôi về doanh thu, công nợ, tỷ lệ lấp đầy...',
    chips: [
      {
        label: 'Hướng dẫn sử dụng Housify',
        query: 'Tóm tắt các báo cáo và chức năng dành cho Admin quản trị hệ thống Housify.',
      },
      {
        label: 'Hôm nay doanh thu bao nhiêu?',
        query: 'Tổng hợp doanh thu thực tế từ hóa đơn của toàn bộ các cơ sở trong tháng này?',
      },
      {
        label: 'Tòa nhà nào trống nhiều nhất?',
        query: 'So sánh tỷ lệ phòng trống giữa các tòa nhà cơ sở hiện tại, tòa nào cần đẩy mạnh tìm khách?',
      },
      {
        label: 'Tổng nợ quá hạn toàn hệ thống',
        query: 'Tổng công nợ quá hạn của cả 3 cơ sở hiện tại là bao nhiêu tiền và gồm những hóa đơn nào?',
      },
      {
        label: 'Hiệu suất vận hành các cơ sở',
        query: 'Đánh giá tỷ lệ lấp đầy phòng và hiệu suất vận hành của các tòa nhà cơ sở.',
      },
    ],
  },
};

// Render an toàn Markdown (đậm, gạch đầu dòng)
const renderFormattedText = (rawText) => {
  if (!rawText) return null;
  const lines = rawText.split('\n');

  return lines.map((line, idx) => {
    const trimmed = line.trim();
    const isBullet = trimmed.startsWith('•') || trimmed.startsWith('- ') || trimmed.startsWith('* ');
    const content = isBullet ? trimmed.replace(/^[-*•]\s*/, '') : line;

    const parts = content.split(/(\*\*.*?\*\*)/g);
    const formattedParts = parts.map((part, pIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={pIdx} className="font-semibold text-slate-900">
            {part.slice(2, -2)}
          </strong>
        );
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
  const [messages, setMessages] = useState([]); // Khởi tạo rỗng để hiển thị màn hình gợi ý VKho
  const messagesEndRef = useRef(null);

  const roleConfig = ROLE_CONFIGS[user?.role] || ROLE_CONFIGS[ROLE.CUSTOMER];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Làm mới (Bản mới)
  const handleResetChat = () => {
    setMessages([]);
    setInputMessage('');
  };

  // Gửi tin nhắn
  const handleSend = async (customMessage) => {
    const text = (customMessage || inputMessage).trim();
    if (!text || loading) return;

    setInputMessage('');

    const userMsg = {
      id: 'user-' + Date.now(),
      role: 'user',
      text,
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setLoading(true);

    try {
      const historyPayload = nextMessages
        .slice(-10)
        .map((m) => ({
          role: m.role === 'model' ? 'model' : 'user',
          text: m.text,
        }));

      const currentScreen = typeof window !== 'undefined'
        ? `${window.location.pathname}${window.location.search}`
        : null;

      const response = await geminiApi.chat({
        message: text,
        history: historyPayload.slice(0, -1),
        currentScreen,
      });

      const replyText = response.data?.reply || 'Tôi đã xử lý yêu cầu nhưng không nhận được nội dung phản hồi.';

      setMessages((prev) => [
        ...prev,
        {
          id: 'bot-' + Date.now(),
          role: 'model',
          text: replyText,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          role: 'model',
          text: `⚠️ **Không thể kết nối đến Trợ lý AI**: ${error.message || 'Hệ thống đang quá tải, vui lòng thử lại sau.'}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* 1. NÚT TRÒN NỔI (FAB) GÓC DƯỚI PHẢI */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center justify-center print:hidden select-none">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-14 h-14 rounded-full bg-[#714b67] hover:bg-[#5a3851] text-white flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none cursor-pointer shadow-lg"
          style={{ border: '3px solid #ffffff', outline: 'none' }}
          title="Trợ lý AI Housify"
        >
          {isOpen ? <BiX size={26} /> : <BsStars size={22} />}
        </button>
      </div>

      {/* 2. KHUNG CHAT TỐI GIẢN CHUẨN MẪU VKHO */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-[380px] max-w-[calc(100vw-32px)] h-[540px] max-h-[calc(100vh-120px)] bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 flex flex-col overflow-hidden transition-all duration-200 print:hidden">
          {/* Header */}
          <div className="bg-white border-b border-slate-200/80 px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <BsStars className="text-[#714b67] text-lg" />
              <h3 className="font-bold text-slate-800 text-[15px]">Trợ lý AI Housify</h3>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleResetChat}
                className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 font-medium px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                style={{ border: 'none', background: 'transparent' }}
                title="Bắt đầu phiên trò chuyện mới"
              >
                <BiRefresh size={16} />
                <span>Bản mới</span>
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                style={{ border: 'none', background: 'transparent' }}
                title="Đóng"
              >
                <BiX size={20} />
              </button>
            </div>
          </div>

          {/* Body: Màn hình gợi ý hoặc danh sách tin nhắn */}
          {messages.length === 0 ? (
            <div className="flex-1 p-4 overflow-y-auto flex flex-col text-sm bg-white">
              <p className="text-slate-500 text-sm mb-3">
                {roleConfig.promptPlaceholder}
              </p>
              <div className="flex flex-col gap-2.5">
                {roleConfig.chips.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={loading}
                    onClick={() => handleSend(chip.query)}
                    className="w-full text-left p-3 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-sm transition-all shadow-2xs flex items-center gap-2.5 cursor-pointer active:scale-98"
                  >
                    <span className="text-base shrink-0">💡</span>
                    <span className="flex-1">{chip.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 p-3.5 overflow-y-auto flex flex-col gap-3 text-sm bg-slate-50/50">
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`p-3 rounded-2xl leading-relaxed text-sm max-w-[85%] shadow-2xs ${
                        isUser
                          ? 'bg-[#714b67] text-white rounded-tr-xs'
                          : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs'
                      }`}
                    >
                      {renderFormattedText(msg.text)}
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white p-2.5 px-3 rounded-2xl rounded-tl-xs border border-slate-200/80 text-slate-400 text-sm flex items-center gap-1.5 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#714b67] animate-pulse" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#714b67] animate-pulse delay-100" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#714b67] animate-pulse delay-200" />
                    <span className="text-xs text-slate-400 ms-1 font-medium">Đang trả lời...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Footer Input */}
          <div className="p-3 bg-white border-t border-slate-200/80 shrink-0">
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
                placeholder="Nhập câu hỏi..."
                className="flex-1 text-sm py-2.5 px-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#714b67] focus:bg-white transition-all disabled:opacity-50 placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || loading}
                className="w-10 h-10 rounded-xl bg-[#714b67] hover:bg-[#5a3851] text-white flex items-center justify-center shrink-0 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none shadow-xs cursor-pointer"
                style={{ border: 'none' }}
                title="Gửi câu hỏi"
              >
                <BiSend size={18} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default HousifyAiWidget;
