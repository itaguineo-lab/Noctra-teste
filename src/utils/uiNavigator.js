async function tryDeleteCurrentMessage(ctx) {
    try {
        if (ctx.callbackQuery?.message?.message_id) {
            await ctx.deleteMessage();
            return true;
        }
    } catch {}
    return false;
}

async function safeAnswer(ctx, text = undefined, options = {}) {
    try {
        if (ctx.answerCbQuery) {
            return await ctx.answerCbQuery(text, options);
        }
    } catch {}
    return null;
}

async function navigateText(ctx, text, options = {}) {
    const payload = {
        parse_mode: 'Markdown',
        ...options
    };

    if (ctx.callbackQuery?.message) {
        try {
            return await ctx.editMessageText(text, payload);
        } catch {
            const deleted = await tryDeleteCurrentMessage(ctx);
            if (deleted) {
                try {
                    return await ctx.reply(text, payload);
                } catch {}
            }
        }
    }

    return ctx.reply(text, payload);
}

async function navigatePhoto(ctx, media, caption, options = {}) {
    const payload = {
        parse_mode: 'Markdown',
        ...options
    };

    const chatId = ctx.chat?.id;
    const messageId = ctx.callbackQuery?.message?.message_id;

    if (chatId && messageId) {
        try {
            await ctx.telegram.editMessageMedia(
                chatId,
                messageId,
                null,
                {
                    type: 'photo',
                    media,
                    caption,
                    parse_mode: 'Markdown'
                },
                {
                    reply_markup: payload.reply_markup
                }
            );
            return true;
        } catch {
            const deleted = await tryDeleteCurrentMessage(ctx);
            if (deleted) {
                try {
                    await ctx.replyWithPhoto(media, {
                        caption,
                        parse_mode: 'Markdown',
                        reply_markup: payload.reply_markup
                    });
                    return true;
                } catch {}
            }
        }
    }

    await ctx.replyWithPhoto(media, {
        caption,
        parse_mode: 'Markdown',
        reply_markup: payload.reply_markup
    });
    return true;
}

async function navigateScreen(ctx, { text = '', media = null, options = {} }) {
    if (media) {
        return navigatePhoto(ctx, media, text, options);
    }
    return navigateText(ctx, text, options);
}

module.exports = {
    safeAnswer,
    navigateText,
    navigatePhoto,
    navigateScreen,
    tryDeleteCurrentMessage
};