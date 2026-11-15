// Component Trợ lý AI Housify dùng React-Bootstrap và bộ icon bi theo chuẩn dự án
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Card, Form, Spinner } from 'react-bootstrap';
import { BiBot, BiBulb, BiRefresh, BiSend, BiX } from 'react-icons/bi';
import { ROLE } from '../../../constants/enums';
import { useAuth } from '../../../context/AuthContext';
import geminiApi from '../gemini.api';

const FAB_SIZE = 56; // w-14 h-14
const EDGE_MARGIN = 16;
const DEFAULT_MARGIN = 24;
const PANEL_GAP = 14;
const PANEL_MAX_WIDTH = 380;
const PANEL_MAX_HEIGHT = 540;
const DRAG_THRESHOLD = 5;
const STORAGE_KEY = 'housify:ai-widget-pos';

const getViewport = () =>
  typeof window === 'undefined'
    ? { width: 1280, height: 720 }
    : { width: window.innerWidth, height: window.innerHeight };

const clampPosition = (pos, viewport) => ({
  x: Math.min(Math.max(EDGE_MARGIN, pos.x), Math.max(EDGE_MARGIN, viewport.width - FAB_SIZE - EDGE_MARGIN)),
  y: Math.min(Math.max(EDGE_MARGIN, pos.y), Math.max(EDGE_MARGIN, viewport.height - FAB_SIZE - EDGE_MARGIN)),
});

// Tự hít nút vào sát mép trái hoặc phải gần nhất khi thả tay (giống bong bóng chat / AssistiveTouch)
const snapToHorizontalEdge = (pos, viewport) => {
  const clamped = clampPosition(pos, viewport);
  const snapLeft = clamped.x + FAB_SIZE / 2 < viewport.width / 2;
  return {
    x: snapLeft ? EDGE_MARGIN : Math.max(EDGE_MARGIN, viewport.width - FAB_SIZE - EDGE_MARGIN),
    y: clamped.y,
  };
};

const getInitialPosition = (viewport) => {
  const fallback = {
    x: viewport.width - FAB_SIZE - DEFAULT_MARGIN,
    y: viewport.height - FAB_SIZE - DEFAULT_MARGIN,
  };
  if (typeof window === 'undefined') return snapToHorizontalEdge(fallback, viewport);
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return snapToHorizontalEdge(fallback, viewport);
    const parsed = JSON.parse(raw);
    if (Number.isFinite(parsed?.x) && Number.isFinite(parsed?.y)) {
      return snapToHorizontalEdge({ x: parsed.x, y: parsed.y }, viewport);
    }
  } catch {
    // bỏ qua nếu localStorage bị chặn hoặc lỗi JSON
  }
  return snapToHorizontalEdge(fallback, viewport);
};

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
const renderFormattedText = (rawText, isUser = false) => {
  if (!rawText) return null;
  const lines = rawText.split('\n');

  return lines.map((line, index) => {
    const trimmed = line.trim();
    const isBullet = trimmed.startsWith('•') || trimmed.startsWith('- ') || trimmed.startsWith('* ');
    const content = isBullet ? trimmed.replace(/^[-*•]\s*/, '') : line;

    const parts = content.split(/(\*\*.*?\*\*)/g);
    const formattedParts = parts.map((part, partIndex) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={partIndex} className="fw-semibold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });

    if (isBullet) {
      return (
        <div key={index} className="d-flex align-items-start gap-2 mb-1 ps-1">
          <span className={isUser ? 'fw-bold' : 'text-primary fw-bold'}>•</span>
          <span className="flex-1">{formattedParts}</span>
        </div>
      );
    }

    return (
      <div key={index} className={trimmed === '' ? 'mb-2' : 'mb-1'}>
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
  const [viewport, setViewport] = useState(getViewport);
  const [position, setPosition] = useState(() => getInitialPosition(getViewport()));
  const [isDragging, setIsDragging] = useState(false);
  const messagesEndRef = useRef(null);
  const dragRef = useRef(null);
  const suppressClickRef = useRef(false);

  const roleConfig = ROLE_CONFIGS[user?.role] || ROLE_CONFIGS[ROLE.CUSTOMER];

  // Giữ nút luôn bám sát mép trái/phải và gọn trong màn hình khi co giãn cửa sổ
  useEffect(() => {
    const handleResize = () => {
      const nextViewport = getViewport();
      setViewport(nextViewport);
      setPosition((prev) => snapToHorizontalEdge(prev, nextViewport));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const persistPosition = useCallback((pos) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
    } catch {
      // bỏ qua nếu trình duyệt chặn localStorage
    }
  }, []);

  const handleFabPointerDown = (event) => {
    // Chỉ kéo bằng chuột trái hoặc cảm ứng / bút
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    suppressClickRef.current = false;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
      moved: false,
    };

    const handlePointerMove = (moveEvent) => {
      const drag = dragRef.current;
      if (!drag || moveEvent.pointerId !== drag.pointerId) return;
      const dx = moveEvent.clientX - drag.startX;
      const dy = moveEvent.clientY - drag.startY;
      if (!drag.moved && Math.hypot(dx, dy) >= DRAG_THRESHOLD) {
        drag.moved = true;
        setIsDragging(true);
      }
      if (drag.moved) {
        const nextPos = clampPosition(
          { x: drag.originX + dx, y: drag.originY + dy },
          getViewport(),
        );
        setPosition(nextPos);
      }
    };

    const stopDragging = (endEvent) => {
      const drag = dragRef.current;
      if (!drag || endEvent.pointerId !== drag.pointerId) return;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopDragging);
      window.removeEventListener('pointercancel', stopDragging);

      if (drag.moved) {
        suppressClickRef.current = true;
        const finalPos = snapToHorizontalEdge(
          {
            x: drag.originX + (endEvent.clientX - drag.startX),
            y: drag.originY + (endEvent.clientY - drag.startY),
          },
          getViewport(),
        );
        setPosition(finalPos);
        persistPosition(finalPos);
      }
      dragRef.current = null;
      setIsDragging(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopDragging);
    window.addEventListener('pointercancel', stopDragging);
  };

  const handleFabClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    setIsOpen((prev) => !prev);
  };

  // Tính vị trí khung chat bám theo nút FAB để không bị tràn ra ngoài màn hình
  const panelWidth = Math.min(PANEL_MAX_WIDTH, Math.max(260, viewport.width - EDGE_MARGIN * 2));
  const preferRightAlign = position.x + FAB_SIZE / 2 >= viewport.width / 2;
  const rawPanelLeft = preferRightAlign ? position.x + FAB_SIZE - panelWidth : position.x;
  const panelLeft = Math.min(
    Math.max(EDGE_MARGIN, rawPanelLeft),
    Math.max(EDGE_MARGIN, viewport.width - panelWidth - EDGE_MARGIN),
  );
  const spaceAbove = position.y - PANEL_GAP - EDGE_MARGIN;
  const spaceBelow = viewport.height - (position.y + FAB_SIZE + PANEL_GAP) - EDGE_MARGIN;
  const openAbove = spaceAbove >= 360 || spaceAbove >= spaceBelow;
  const panelMaxHeight = Math.max(240, Math.min(PANEL_MAX_HEIGHT, openAbove ? spaceAbove : spaceBelow));
  const panelStyle = {
    left: `${panelLeft}px`,
    width: `${panelWidth}px`,
    maxHeight: `${panelMaxHeight}px`,
    height: `${panelMaxHeight}px`,
    ...(openAbove
      ? { bottom: `${viewport.height - position.y + PANEL_GAP}px` }
      : { top: `${position.y + FAB_SIZE + PANEL_GAP}px` }),
  };

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
          text: `**Không thể kết nối đến Trợ lý AI**: ${error.message || 'Hệ thống đang quá tải, vui lòng thử lại sau.'}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* 1. NÚT TRÒN NỔI (FAB) KÉO THẢ LINH ĐỘNG VÀ TỰ BÁM MÉP TRÁI/PHẢI KHI THẢ */}
      <div
        className={`fixed z-50 d-flex align-items-center justify-content-center print:hidden select-none touch-none ${
          isDragging ? '' : 'transition-[left,top] duration-200 ease-out'
        }`}
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
      >
        <Button
          type="button"
          variant="primary"
          onPointerDown={handleFabPointerDown}
          onClick={handleFabClick}
          className={`w-14 h-14 rounded-circle border-2 border-white p-0 d-flex align-items-center justify-content-center touch-none ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          title="Trợ lý AI Housify (kéo để di chuyển)"
          aria-label="Trợ lý AI Housify"
        >
          {isOpen ? <BiX size={24} /> : <BiBot size={24} />}
        </Button>
      </div>

      {/* 2. KHUNG CHAT REACT-BOOTSTRAP BÁM THEO VỊ TRÍ NÚT */}
      {isOpen && (
        <div className="fixed z-50 print:hidden" style={panelStyle}>
          <Card className="h-100 overflow-hidden d-flex flex-column">
            <Card.Header className="bg-white d-flex align-items-center justify-content-between py-2 px-3 shrink-0">
              <div className="d-flex align-items-center gap-2">
                <BiBot size={18} className="text-primary" />
                <span className="fw-bold">Trợ lý AI Housify</span>
              </div>

              <div className="d-flex align-items-center gap-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleResetChat}
                  className="hf-btn-ghost d-inline-flex align-items-center gap-1"
                  title="Bắt đầu phiên trò chuyện mới"
                >
                  <BiRefresh size={16} />
                  <span>Bản mới</span>
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="hf-btn-ghost d-inline-flex align-items-center justify-content-center p-1"
                  title="Đóng"
                  aria-label="Đóng"
                >
                  <BiX size={18} />
                </Button>
              </div>
            </Card.Header>

            {messages.length === 0 ? (
              <Card.Body className="flex-1 overflow-y-auto bg-white p-3">
                <p className="text-secondary small mb-3">{roleConfig.promptPlaceholder}</p>
                <div className="d-flex flex-column gap-2">
                  {roleConfig.chips.map((chip, index) => (
                    <Button
                      key={index}
                      type="button"
                      variant="secondary"
                      disabled={loading}
                      onClick={() => handleSend(chip.query)}
                      className="w-100 text-start d-flex align-items-center gap-2 py-2 px-3"
                    >
                      <BiBulb size={16} className="shrink-0 text-primary" />
                      <span className="flex-1">{chip.label}</span>
                    </Button>
                  ))}
                </div>
              </Card.Body>
            ) : (
              <Card.Body className="flex-1 overflow-y-auto bg-body-tertiary p-3 d-flex flex-column gap-2">
                {messages.map((message) => {
                  const isUser = message.role === 'user';
                  return (
                    <div
                      key={message.id}
                      className={`d-flex ${isUser ? 'justify-content-end' : 'justify-content-start'}`}
                    >
                      <div
                        className={`p-2 px-3 rounded-3 max-w-[85%] ${
                          isUser ? 'text-bg-primary' : 'bg-white border'
                        }`}
                      >
                        {renderFormattedText(message.text, isUser)}
                      </div>
                    </div>
                  );
                })}

                {loading && (
                  <div className="d-flex justify-content-start">
                    <div className="bg-white border rounded-3 py-2 px-3 d-flex align-items-center gap-2">
                      <Spinner animation="border" size="sm" variant="primary" />
                      <span className="small text-secondary">Đang trả lời...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </Card.Body>
            )}

            <Card.Footer className="bg-white p-2 shrink-0">
              <Form
                onSubmit={(event) => {
                  event.preventDefault();
                  handleSend();
                }}
                className="d-flex align-items-center gap-2"
              >
                <Form.Control
                  type="text"
                  value={inputMessage}
                  disabled={loading}
                  onChange={(event) => setInputMessage(event.target.value)}
                  placeholder="Nhập câu hỏi..."
                />
                <Button
                  type="submit"
                  variant="primary"
                  disabled={!inputMessage.trim() || loading}
                  className="d-inline-flex align-items-center justify-content-center shrink-0"
                  title="Gửi câu hỏi"
                  aria-label="Gửi câu hỏi"
                >
                  <BiSend size={16} />
                </Button>
              </Form>
            </Card.Footer>
          </Card>
        </div>
      )}
    </>
  );
};

export default HousifyAiWidget;
