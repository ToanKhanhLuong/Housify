// Controller cho module dev: chạy job tự động ngay để phục vụ test và demo
import asyncHandler from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import { runJobByName } from '../../jobs/index.js';

export const runJob = asyncHandler(async (request, response) => {
    const { name } = request.params;
    const data = await runJobByName(name);

    return ok(response, data, `Đã chạy job ${name} thành công`);
});

