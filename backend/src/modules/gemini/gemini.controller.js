// Controller cho module gemini (Housify AI Assistant)
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as geminiService from './gemini.service.js';

export const chat = asyncHandler(async (request, response) => {
    const { message, history } = request.body;
    const user = request.user;

    const data = await geminiService.chatWithGemini({
        user,
        message,
        history,
    });

    response.status(200).json({
        success: true,
        data,
    });
});
