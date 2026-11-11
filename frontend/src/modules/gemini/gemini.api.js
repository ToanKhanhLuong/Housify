// API của module gemini: Trợ lý ảo AI thông minh Housify
import api from '../../api/axios';

const geminiApi = {
  // Gửi tin nhắn chat tới Trợ lý AI (kèm lịch sử hội thoại)
  chat: (data) => api.post('/gemini/chat', data),
};

export default geminiApi;
