// Nghiệp vụ job nhắc thanh toán (UC-49): quét hóa đơn Chờ thanh toán, nhắc người đại diện qua chuông + email theo mốc
import { env } from '../../config/env.js';
import { sendMail } from '../../config/mail.js';
import { INVOICE_STATUS, NOTIFICATION_TYPE } from '../../constants/enums.js';
import { startOfVietnamDay } from '../../helpers/date.js';
import { notify } from '../../helpers/notify.js';
import Contract from '../../models/Contract.js';
import Invoice from '../../models/Invoice.js';
import Notification from '../../models/Notification.js';
import Occupant from '../../models/Occupant.js';
import User from '../../models/User.js';

const DAY_MS = 24 * 60 * 60 * 1000;

// Số ngày từ hạn thanh toán tới hôm nay theo giờ Việt Nam: âm = còn trước hạn, 0 = đúng ngày hạn, dương = quá hạn
const daysFromDue = (dueDate, now) =>
    Math.round((startOfVietnamDay(now).getTime() - startOfVietnamDay(dueDate).getTime()) / DAY_MS);

/**
 * Mốc gần nhất đã tới, tính theo số ngày so với hạn (null nếu chưa tới mốc đầu tiên).
 * Trước và đúng hạn: theo PAYMENT_REMINDER_BEFORE_DAYS. Quá hạn: cứ PAYMENT_REMINDER_OVERDUE_EVERY ngày một mốc (mặc định 1 ngày/lần).
 */
export const latestMilestone = (days) => {
    const every = env.PAYMENT_REMINDER_OVERDUE_EVERY;
    if (days >= every) return Math.floor(days / every) * every;

    const reached = env.PAYMENT_REMINDER_BEFORE_DAYS
        .map((before) => -before)
        .filter((offset) => offset <= days);
    return reached.length > 0 ? Math.max(...reached) : null;
};

const milestoneLabel = (milestone) => {
    if (milestone < 0) return `Trước hạn ${-milestone} ngày`;
    if (milestone === 0) return 'Đúng hạn';
    return `Quá hạn ${milestone} ngày`;
};

const reminderEmailHtml = (invoice, label) => `
    <div style="font-family: Arial, sans-serif; color: #1f2937;">
        <h2 style="color: #714b67;">Nhắc thanh toán hóa đơn ${invoice.invoiceCode}</h2>
        <p>Hóa đơn tháng ${invoice.month} đang chờ thanh toán (${label}).</p>
        <ul>
            <li><b>Số tiền:</b> ${invoice.totalAmount.toLocaleString('vi-VN')} đ</li>
            <li><b>Nội dung chuyển khoản:</b> ${invoice.invoiceCode}</li>
        </ul>
        ${invoice.qrContent ? `<img src="${invoice.qrContent}" alt="Mã QR thanh toán" width="280" />` : ''}
        <p style="color: #6b7280;">Đã thanh toán rồi thì bạn bỏ qua email này.</p>
    </div>
`;

/**
 * Chạy lại nhiều lần không gửi trùng: mốc đã nhắc được ghi ở tiêu đề thông báo PAYMENT_REMINDER của hóa đơn.
 * Quét bù: chỉ gửi mốc gần nhất đã tới, nên server ngủ nhiều ngày thì khách nhận 1 lần nhắc chứ không dồn nhiều lần.
 * Gửi email lỗi: chuông vẫn tạo, ghi log.
 */
export const runPaymentReminderJob = async (now = new Date()) => {
    const invoices = await Invoice.find({
        status: INVOICE_STATUS.PENDING,
        dueDate: { $ne: null },
    }).lean();

    const reminded = [];
    let mailFailedCount = 0;

    for (const invoice of invoices) {
        const milestone = latestMilestone(daysFromDue(invoice.dueDate, now));
        if (milestone === null) continue;

        const label = milestoneLabel(milestone);
        const marker = `(${label})`;
        const alreadyReminded = await Notification.exists({
            type: NOTIFICATION_TYPE.PAYMENT_REMINDER,
            refId: invoice._id,
            title: { $regex: marker.replace(/[()]/g, '\\$&') },
        });
        if (alreadyReminded) continue;

        const representative = await Occupant.findOne({
            contractId: invoice.contractId,
            isRepresentative: true,
        })
            .select('userId')
            .lean();
        if (!representative?.userId) continue;

        await notify({
            userIds: representative.userId,
            type: NOTIFICATION_TYPE.PAYMENT_REMINDER,
            title: `Nhắc thanh toán hóa đơn tháng ${invoice.month} ${marker}`,
            message: `Hóa đơn ${invoice.invoiceCode} đang chờ thanh toán. Số tiền: ${invoice.totalAmount.toLocaleString('vi-VN')} đ.`,
            refId: invoice._id,
        });

        const contract = await Contract.findById(invoice.contractId).select('representativeEmail').lean();
        const repUser = await User.findById(representative.userId).select('email').lean();
        const recipientEmail = repUser?.email || contract?.representativeEmail;
        const sent = recipientEmail
            ? await sendMail(
                recipientEmail,
                `[Housify] Nhắc thanh toán hóa đơn ${invoice.invoiceCode}`,
                reminderEmailHtml(invoice, label),
            )
            : false;
        if (!sent) {
            mailFailedCount += 1;
            console.error(`[Job paymentReminder] Gửi email nhắc hóa đơn ${invoice.invoiceCode} thất bại`);
        }

        reminded.push({ invoiceCode: invoice.invoiceCode, milestone: label });
    }

    return {
        scannedCount: invoices.length,
        remindedCount: reminded.length,
        mailFailedCount,
        reminded,
    };
};
