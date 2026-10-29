// Token link kích hoạt (UC-08, UC-09, UC-24): link gửi token gốc, DB chỉ lưu bản băm sha256 để tra cứu theo token
// Không dùng bcrypt vì phải tìm bản ghi theo token. Module activation dùng hashActivationToken để so khớp.
import crypto from 'crypto';

// Link sống 24 giờ
export const ACTIVATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export const hashActivationToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

export const generateActivationToken = () => {
    const token = crypto.randomBytes(32).toString('hex');
    return {
        token,
        tokenHash: hashActivationToken(token),
    };
};
