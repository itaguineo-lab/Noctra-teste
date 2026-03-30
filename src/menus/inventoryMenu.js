const { Markup } = require('telegraf');

function inventoryCategoryMenu() {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback(
                '⚔️ Armas',
                'inv_weapons'
            ),
            Markup.button.callback(
                '🛡️ Armaduras',
                'inv_armors'
            )
        ],
        [
            Markup.button.callback(
                '📿 Acessórios',
                'inv_jewelry'
            ),
            Markup.button.callback(
                '🧪 Consumíveis',
                'inv_consumables'
            )
        ],
        [
            Markup.button.callback(
                '💀 Almas',
                'inv_souls'
            )
        ],
        [
            Markup.button.callback(
                '◀️ Voltar ao Menu',
                'menu'
            )
        ]
    ]);
}

function renderInventoryCategory(title, items, type) {
    let text = `🎒 *${title}*\n\n`;

    const keyboard = [];

    if (!items || !items.length) {
        text += '_Vazio..._';
    } else {
        items.forEach(item => {
            text += `🔹 *${item.name}*\n`;

            if (type === 'soul') {
                text +=
                    `${item.emoji || '💀'} ` +
                    `${item.description || 'Sem descrição'}\n`;

                keyboard.push([
                    Markup.button.callback(
                        `Equipar ${item.name}`,
                        `equip_soul_${item.id}`
                    )
                ]);

                text += '\n';
                return;
            }

            text +=
                `Lvl: ${item.level || 1} | ` +
                `⚔️ ${item.atk || 0} | ` +
                `🛡️ ${item.def || 0} | ` +
                `✨ ${item.crit || 0}%\n\n`;

            keyboard.push([
                Markup.button.callback(
                    `Equipar ${item.name}`,
                    `equip_item_${item.id}`
                )
            ]);
        });
    }

    keyboard.push([
        Markup.button.callback(
            '◀️ Voltar',
            'inventory'
        )
    ]);

    return {
        text,
        keyboard: Markup.inlineKeyboard(keyboard)
    };
}

module.exports = {
    inventoryCategoryMenu,
    renderInventoryCategory
};