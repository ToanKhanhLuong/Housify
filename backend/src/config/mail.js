import { env } from './env.js';

/**
 * Gửi email qua Brevo HTTP API
 * @param {string} to - Email người nhận
 * @param {string} subject - Tiêu đề email
 * @param {string} html - Nội dung HTML
 * @returns {Promise<boolean>} true nếu thành công, false nếu lỗi
 */
export const sendMail = async (to, subject, html) => {
    // Nếu không có API key, in ra console thay vì gửi
    if (!env.BREVO_API_KEY) {
        console.log('\n=== EMAIL (DEV MODE - không gửi) ===');
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`Body:\n${html}`);
        console.log('=====================================\n');
        return true;
    }

    try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': env.BREVO_API_KEY,
            },
            body: JSON.stringify({
                sender: { email: env.MAIL_FROM, name: 'Housify' },
                to: [{ email: to }],
                subject,
                htmlContent: html,
            }),
        });

        if (!response.ok) {
            console.error(`Brevo API error: ${response.status}`, await response.text());
            return false;
        }

        return true;
    } catch (error) {
        console.error('sendMail error:', error.message);
        return false;
    }
};