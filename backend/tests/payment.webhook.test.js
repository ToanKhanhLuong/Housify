// Kiểm thử tích hợp cho luồng SePay Webhook, quan hệ Invoice (1..1) — (0..1) Payment, bảo mật và transaction
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { CONNECT_DB, CLOSE_DB } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import {
    AUDIT_ACTION,
    INVOICE_ITEM_TYPE,
    INVOICE_STATUS,
    NOTIFICATION_TYPE,
} from '../src/constants/enums.js';
import { sepayAuth } from '../src/middlewares/sepayAuth.middleware.js';
import { processSepayWebhook } from '../src/modules/payment/payment.service.js';
import Contract from '../src/models/Contract.js';
import Invoice from '../src/models/Invoice.js';
import Payment from '../src/models/Payment.js';
import AuditLog from '../src/models/AuditLog.js';

const testPrefix = `T${Date.now().toString().slice(-4)}`;
const createdInvoiceIds = [];
const createdPaymentIds = [];
const createdContractIds = [];
const createdAuditContractIds = [];

const makeFakeInvoiceCode = (suffix) => `HD2699${suffix}`;

const createTestInvoice = async ({
    suffix,
    status = INVOICE_STATUS.PENDING,
    totalAmount = 3000000,
    dueDate = new Date(Date.now() + 3 * 86400000),
    contractId = new mongoose.Types.ObjectId(),
} = {}) => {
    const invoice = await Invoice.create({
        invoiceCode: makeFakeInvoiceCode(suffix),
        contractId,
        month: '2026-11',
        items: [
            {
                type: INVOICE_ITEM_TYPE.RENT,
                description: 'Tiền phòng test',
                quantity: 1,
                unitPrice: totalAmount,
                amount: totalAmount,
            },
        ],
        totalAmount,
        status,
        sentAt: status === INVOICE_STATUS.DRAFT ? undefined : new Date(),
        dueDate: status === INVOICE_STATUS.DRAFT ? undefined : dueDate,
        createdBy: new mongoose.Types.ObjectId(),
    });
    createdInvoiceIds.push(invoice._id);
    return invoice;
};

const buildWebhookPayload = ({
    id,
    invoiceCode,
    amount = 3000000,
    transferType = 'in',
    accountNumber = env.BANK_ACCOUNT_NO || undefined,
    gateway = 'MBBank',
} = {}) => ({
    id,
    gateway,
    transactionDate: '2026-11-19 10:30:00',
    accountNumber,
    content: `Thanh toan ${invoiceCode}`,
    transferType,
    transferAmount: amount,
});

const cleanupTestRecords = async () => {
    if (createdPaymentIds.length > 0) {
        await Payment.deleteMany({ _id: { $in: createdPaymentIds } });
    }
    if (createdInvoiceIds.length > 0) {
        await Payment.deleteMany({ invoiceId: { $in: createdInvoiceIds } });
        await AuditLog.deleteMany({ 'metadata.invoiceId': { $in: createdInvoiceIds } });
        await Invoice.deleteMany({ _id: { $in: createdInvoiceIds } });
    }
    if (createdContractIds.length > 0) {
        await Contract.deleteMany({ _id: { $in: createdContractIds } });
    }
    if (createdAuditContractIds.length > 0) {
        await AuditLog.deleteMany({ targetId: { $in: createdAuditContractIds } });
    }
    createdPaymentIds.length = 0;
    createdInvoiceIds.length = 0;
    createdContractIds.length = 0;
    createdAuditContractIds.length = 0;
};

const httpPostJson = (server, path, body, headers = {}) =>
    new Promise((resolve, reject) => {
        const address = server.address();
        const data = JSON.stringify(body);
        const req = http.request(
            {
                hostname: '127.0.0.1',
                port: address.port,
                path,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(data),
                    ...headers,
                },
            },
            (res) => {
                let raw = '';
                res.on('data', (chunk) => {
                    raw += chunk;
                });
                res.on('end', () => {
                    try {
                        resolve({ status: res.statusCode, body: JSON.parse(raw) });
                    } catch {
                        resolve({ status: res.statusCode, body: raw });
                    }
                });
            },
        );
        req.on('error', reject);
        req.write(data);
        req.end();
    });

test.before(async () => {
    await CONNECT_DB();
    await Payment.syncIndexes();
});

test.afterEach(async () => {
    await cleanupTestRecords();
});

test.after(async () => {
    await cleanupTestRecords();
    await CLOSE_DB();
});

test('1. Invoice PENDING nhận đủ tiền -> PAID, cập nhật paidAt và tạo đúng 1 Payment', async () => {
    const invoice = await createTestInvoice({ suffix: `${testPrefix.slice(-2)}01`, totalAmount: 3000000 });
    const notifyCalls = [];
    const mailCalls = [];

    const result = await processSepayWebhook(
        buildWebhookPayload({ id: `TXN_${testPrefix}_01`, invoiceCode: invoice.invoiceCode, amount: 3000000 }),
        {
            notifyFn: async (arg) => notifyCalls.push(arg),
            sendMailFn: async (...args) => {
                mailCalls.push(args);
                return true;
            },
        },
    );

    assert.equal(result.success, true);
    assert.ok(result.payment?._id);
    createdPaymentIds.push(result.payment._id);

    const updated = await Invoice.findById(invoice._id).lean();
    assert.equal(updated.status, INVOICE_STATUS.PAID);
    assert.ok(updated.paidAt instanceof Date);

    const payments = await Payment.find({ invoiceId: invoice._id }).lean();
    assert.equal(payments.length, 1);
    assert.equal(payments[0].amount, 3000000);
    assert.ok(notifyCalls.some((n) => n.type === NOTIFICATION_TYPE.PAYMENT_SUCCESS));
});

test('2. Nhận thiếu tiền (100.000 / 3.000.000) -> giữ PENDING, không tạo Payment, ghi AuditLog đối soát', async () => {
    const contractId = new mongoose.Types.ObjectId();
    createdAuditContractIds.push(contractId);
    const invoice = await createTestInvoice({ suffix: `${testPrefix.slice(-2)}02`, totalAmount: 3000000, contractId });

    const result = await processSepayWebhook(
        buildWebhookPayload({ id: `TXN_${testPrefix}_02A`, invoiceCode: invoice.invoiceCode, amount: 100000 }),
        { notifyFn: async () => {}, sendMailFn: async () => true },
    );

    assert.equal(result.success, true);
    assert.equal(result.underpaid, true);
    assert.equal(result.payment, null);

    const freshInv = await Invoice.findById(invoice._id).lean();
    assert.equal(freshInv.status, INVOICE_STATUS.PENDING);
    assert.equal(await Payment.countDocuments({ invoiceId: invoice._id }), 0);

    const auditDoc = await AuditLog.findOne({
        action: AUDIT_ACTION.PAYMENT_UNDERPAID,
        'metadata.sepayTxnId': `TXN_${testPrefix}_02A`,
    }).lean();
    assert.ok(auditDoc);

    // Sau đó khách chuyển lại đúng 3.000.000 vẫn thanh toán thành công được
    const fullResult = await processSepayWebhook(
        buildWebhookPayload({ id: `TXN_${testPrefix}_02B`, invoiceCode: invoice.invoiceCode, amount: 3000000 }),
        { notifyFn: async () => {}, sendMailFn: async () => true },
    );
    assert.equal(fullResult.success, true);
    assert.ok(fullResult.payment?._id);
    assert.equal((await Invoice.findById(invoice._id).lean()).status, INVOICE_STATUS.PAID);
    assert.equal(await Payment.countDocuments({ invoiceId: invoice._id }), 1);
});

test('3. Nhận thừa tiền (3.500.000 / 3.000.000) -> giữ PENDING, không tạo Payment, ghi AuditLog đối soát', async () => {
    const contractId = new mongoose.Types.ObjectId();
    createdAuditContractIds.push(contractId);
    const invoice = await createTestInvoice({ suffix: `${testPrefix.slice(-2)}03`, totalAmount: 3000000, contractId });

    const result = await processSepayWebhook(
        buildWebhookPayload({ id: `TXN_${testPrefix}_03`, invoiceCode: invoice.invoiceCode, amount: 3500000 }),
        { notifyFn: async () => {}, sendMailFn: async () => true },
    );

    assert.equal(result.success, true);
    assert.equal(result.overpaid, true);
    assert.equal(result.payment, null);

    const freshInv = await Invoice.findById(invoice._id).lean();
    assert.equal(freshInv.status, INVOICE_STATUS.PENDING);
    assert.equal(await Payment.countDocuments({ invoiceId: invoice._id }), 0);

    const auditDoc = await AuditLog.findOne({
        action: AUDIT_ACTION.PAYMENT_OVERPAID,
        'metadata.sepayTxnId': `TXN_${testPrefix}_03`,
    }).lean();
    assert.ok(auditDoc);
});

test('4. Invoice DRAFT -> không ghi nhận thanh toán thành công, không tạo Payment', async () => {
    const invoice = await createTestInvoice({
        suffix: `${testPrefix.slice(-2)}04`,
        status: INVOICE_STATUS.DRAFT,
        totalAmount: 3000000,
    });

    const result = await processSepayWebhook(
        buildWebhookPayload({ id: `TXN_${testPrefix}_04`, invoiceCode: invoice.invoiceCode, amount: 3000000 }),
        { notifyFn: async () => {}, sendMailFn: async () => true },
    );

    assert.equal(result.ignored, true);
    assert.equal((await Invoice.findById(invoice._id).lean()).status, INVOICE_STATUS.DRAFT);
    assert.equal(await Payment.countDocuments({ invoiceId: invoice._id }), 0);
});

test('5. Invoice CANCELLED -> không ghi nhận thanh toán thành công, không tạo Payment', async () => {
    const invoice = await createTestInvoice({
        suffix: `${testPrefix.slice(-2)}05`,
        status: INVOICE_STATUS.CANCELLED,
        totalAmount: 3000000,
    });

    const result = await processSepayWebhook(
        buildWebhookPayload({ id: `TXN_${testPrefix}_05`, invoiceCode: invoice.invoiceCode, amount: 3000000 }),
        { notifyFn: async () => {}, sendMailFn: async () => true },
    );

    assert.equal(result.ignored, true);
    assert.equal((await Invoice.findById(invoice._id).lean()).status, INVOICE_STATUS.CANCELLED);
    assert.equal(await Payment.countDocuments({ invoiceId: invoice._id }), 0);
});

test('6. Invoice đã PAID -> không tạo Payment thứ hai', async () => {
    const invoice = await createTestInvoice({
        suffix: `${testPrefix.slice(-2)}06`,
        status: INVOICE_STATUS.PAID,
        totalAmount: 3000000,
    });
    const firstPay = await Payment.create({
        sepayTxnId: `TXN_${testPrefix}_06A`,
        invoiceId: invoice._id,
        amount: 3000000,
        transferContent: `Thanh toan ${invoice.invoiceCode}`,
        bankName: 'MBBank',
        paidAt: new Date(),
    });
    createdPaymentIds.push(firstPay._id);

    const result = await processSepayWebhook(
        buildWebhookPayload({ id: `TXN_${testPrefix}_06B`, invoiceCode: invoice.invoiceCode, amount: 3000000 }),
        { notifyFn: async () => {}, sendMailFn: async () => true },
    );

    assert.equal(result.ignored, true);
    assert.equal(await Payment.countDocuments({ invoiceId: invoice._id }), 1);
});

test('7. Webhook trùng sepayTxnId -> idempotent, không tạo thêm Payment hay gửi trùng thông báo', async () => {
    const invoice = await createTestInvoice({ suffix: `${testPrefix.slice(-2)}07`, totalAmount: 3000000 });
    let notifyCount = 0;
    const deps = {
        notifyFn: async () => {
            notifyCount += 1;
        },
        sendMailFn: async () => true,
    };
    const payload = buildWebhookPayload({ id: `TXN_${testPrefix}_07`, invoiceCode: invoice.invoiceCode, amount: 3000000 });

    const r1 = await processSepayWebhook(payload, deps);
    const firstNotifyCount = notifyCount;
    const r2 = await processSepayWebhook(payload, deps);

    assert.equal(r1.success, true);
    assert.ok(r1.payment?._id);
    assert.equal(r2.success, true);
    assert.equal(r2.ignored, true);
    assert.equal(notifyCount, firstNotifyCount);
    assert.equal(await Payment.countDocuments({ sepayTxnId: payload.id }), 1);
});

test('8. Hai webhook sepayTxnId khác nhau cho cùng 1 Invoice -> chỉ tối đa 1 Payment hợp lệ', async () => {
    const invoice = await createTestInvoice({ suffix: `${testPrefix.slice(-2)}08`, totalAmount: 3000000 });
    const deps = { notifyFn: async () => {}, sendMailFn: async () => true };

    const r1 = await processSepayWebhook(
        buildWebhookPayload({ id: `TXN_${testPrefix}_08A`, invoiceCode: invoice.invoiceCode, amount: 3000000 }),
        deps,
    );
    const r2 = await processSepayWebhook(
        buildWebhookPayload({ id: `TXN_${testPrefix}_08B`, invoiceCode: invoice.invoiceCode, amount: 3000000 }),
        deps,
    );

    assert.equal(Boolean(r1.payment?._id), true);
    assert.equal(r2.ignored, true);
    assert.equal(await Payment.countDocuments({ invoiceId: invoice._id }), 1);
});

test('9. Hai webhook xử lý đồng thời (cùng sepayTxnId và khác sepayTxnId) -> không tạo dữ liệu trùng', async () => {
    const invSameTxn = await createTestInvoice({ suffix: `${testPrefix.slice(-2)}9A`, totalAmount: 3000000 });
    const deps = { notifyFn: async () => {}, sendMailFn: async () => true };
    const samePayload = buildWebhookPayload({ id: `TXN_${testPrefix}_09S`, invoiceCode: invSameTxn.invoiceCode, amount: 3000000 });

    const [s1, s2] = await Promise.all([
        processSepayWebhook(samePayload, deps),
        processSepayWebhook(samePayload, deps),
    ]);
    assert.equal([s1.ignored, s2.ignored].filter(Boolean).length, 1);
    assert.equal(await Payment.countDocuments({ invoiceId: invSameTxn._id }), 1);

    const invDiffTxn = await createTestInvoice({ suffix: `${testPrefix.slice(-2)}9B`, totalAmount: 3000000 });
    const [d1, d2] = await Promise.all([
        processSepayWebhook(
            buildWebhookPayload({ id: `TXN_${testPrefix}_09X`, invoiceCode: invDiffTxn.invoiceCode, amount: 3000000 }),
            deps,
        ),
        processSepayWebhook(
            buildWebhookPayload({ id: `TXN_${testPrefix}_09Y`, invoiceCode: invDiffTxn.invoiceCode, amount: 3000000 }),
            deps,
        ),
    ]);
    assert.equal([d1.ignored, d2.ignored].filter(Boolean).length, 1);
    assert.equal(await Payment.countDocuments({ invoiceId: invDiffTxn._id }), 1);
});

test('10. Webhook không xác thực / sai scheme / payload không hợp lệ -> bị từ chối 401 hoặc 422', async () => {
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

    try {
        // Không có Authorization header -> 401
        const noAuth = await httpPostJson(server, '/api/webhooks/sepay', buildWebhookPayload({ id: 'UNAUTH_1', invoiceCode: 'HD2699XXXX' }));
        assert.equal(noAuth.status, 401);

        // Sai scheme Bearer thay vì Apikey -> 401 (dù truyền đúng key!)
        if (env.SEPAY_API_KEY) {
            const wrongScheme = await httpPostJson(
                server,
                '/api/webhooks/sepay',
                buildWebhookPayload({ id: 'UNAUTH_2', invoiceCode: 'HD2699XXXX' }),
                { Authorization: `Bearer ${env.SEPAY_API_KEY}` },
            );
            assert.equal(wrongScheme.status, 401);

            // Sai API key -> 401
            const wrongKey = await httpPostJson(
                server,
                '/api/webhooks/sepay',
                buildWebhookPayload({ id: 'UNAUTH_3', invoiceCode: 'HD2699XXXX' }),
                { Authorization: 'Apikey wrong_key_value' },
            );
            assert.equal(wrongKey.status, 401);

            // Đúng Apikey nhưng transferAmount = 0 -> 422
            const zeroAmount = await httpPostJson(
                server,
                '/api/webhooks/sepay',
                buildWebhookPayload({ id: 'INVALID_AMT', invoiceCode: 'HD2699XXXX', amount: 0 }),
                { Authorization: `Apikey ${env.SEPAY_API_KEY}` },
            );
            assert.equal(zeroAmount.status, 422);

            // Đúng Apikey nhưng id rỗng -> 422
            const emptyId = await httpPostJson(
                server,
                '/api/webhooks/sepay',
                buildWebhookPayload({ id: '   ', invoiceCode: 'HD2699XXXX', amount: 100000 }),
                { Authorization: `Apikey ${env.SEPAY_API_KEY}` },
            );
            assert.equal(emptyId.status, 422);
        } else {
            // Nếu môi trường test chưa set SEPAY_API_KEY thì middleware vẫn phải từ chối 401
            assert.throws(
                () => sepayAuth({ headers: { authorization: 'Apikey anything' } }, {}, () => {}),
                (err) => err.statusCode === 401,
            );
        }
    } finally {
        await new Promise((resolve) => server.close(resolve));
    }
});

test('11. Giao dịch tiền chuyển ra (transferType = out) -> bỏ qua, không ghi nhận thanh toán', async () => {
    const invoice = await createTestInvoice({ suffix: `${testPrefix.slice(-2)}11`, totalAmount: 3000000 });

    const result = await processSepayWebhook(
        buildWebhookPayload({
            id: `TXN_${testPrefix}_11`,
            invoiceCode: invoice.invoiceCode,
            amount: 3000000,
            transferType: 'out',
        }),
        { notifyFn: async () => {}, sendMailFn: async () => true },
    );

    assert.equal(result.ignored, true);
    assert.equal((await Invoice.findById(invoice._id).lean()).status, INVOICE_STATUS.PENDING);
    assert.equal(await Payment.countDocuments({ invoiceId: invoice._id }), 0);
});

test('12. Transaction thất bại giữa chừng -> Invoice vẫn PENDING và không lưu Payment nửa chừng', async () => {
    const invoice = await createTestInvoice({ suffix: `${testPrefix.slice(-2)}12`, totalAmount: 3000000 });
    let notifyCalled = false;

    await assert.rejects(
        () => processSepayWebhook(
            buildWebhookPayload({ id: `TXN_${testPrefix}_12`, invoiceCode: invoice.invoiceCode, amount: 3000000 }),
            {
                onBeforePaymentCreate: async () => {
                    throw new Error('SIMULATED_TX_FAILURE');
                },
                notifyFn: async () => {
                    notifyCalled = true;
                },
                sendMailFn: async () => true,
            },
        ),
        /SIMULATED_TX_FAILURE/,
    );

    const rolledBack = await Invoice.findById(invoice._id).lean();
    assert.equal(rolledBack.status, INVOICE_STATUS.PENDING);
    assert.equal(rolledBack.paidAt, undefined);
    assert.equal(await Payment.countDocuments({ invoiceId: invoice._id }), 0);
    assert.equal(notifyCalled, false);
});

test('13. Lỗi gửi notification / email sau khi commit -> không làm mất trạng thái PAID và Payment đã lưu', async () => {
    const testContract = await Contract.create({
        roomId: new mongoose.Types.ObjectId(),
        contractType: 'SINGLE',
        representativeCccd: '099999999913',
        representativeEmail: 'webhook.test13@example.invalid',
        startDate: new Date('2026-01-01T00:00:00Z'),
        endDate: new Date('2027-01-01T00:00:00Z'),
        rentPrice: 3000000,
        deposit: 3000000,
        status: 'ACTIVE',
        createdBy: new mongoose.Types.ObjectId(),
    });
    createdContractIds.push(testContract._id);

    const invoice = await createTestInvoice({
        suffix: `${testPrefix.slice(-2)}13`,
        totalAmount: 3000000,
        contractId: testContract._id,
    });

    const result = await processSepayWebhook(
        buildWebhookPayload({ id: `TXN_${testPrefix}_13`, invoiceCode: invoice.invoiceCode, amount: 3000000 }),
        {
            notifyFn: async () => {
                throw new Error('NOTIFICATION_SERVICE_DOWN');
            },
            sendMailFn: async () => false,
        },
    );

    assert.equal(result.success, true);
    assert.ok(result.payment?._id);
    assert.match(result.warning || '', /thông báo/i);
    assert.match(result.warning || '', /email/i);

    const committedInv = await Invoice.findById(invoice._id).lean();
    assert.equal(committedInv.status, INVOICE_STATUS.PAID);
    assert.equal(await Payment.countDocuments({ invoiceId: invoice._id }), 1);
});
