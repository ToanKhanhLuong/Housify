// Email nhận thư của người đại diện hợp đồng: ưu tiên email tài khoản Customer hiện tại (khách tự đổi ở UC-05),
// chưa có tài khoản (hợp đồng nháp) thì dùng contracts.representativeEmail – bản lưu lúc lập / ký, không bị đổi theo hồ sơ
import Occupant from '../models/Occupant.js';
import User from '../models/User.js';

export const getRepresentativeRecipientEmail = async (contractId, fallbackEmail) => {
    if (!contractId) return fallbackEmail;
    const repOccupant = await Occupant.findOne({
        contractId,
        isRepresentative: true,
    }).select('userId').lean();
    if (repOccupant?.userId) {
        const user = await User.findById(repOccupant.userId).select('email').lean();
        if (user?.email) return user.email;
    }
    return fallbackEmail;
};
