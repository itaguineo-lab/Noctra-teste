function calculateDamage(attacker, defender, options = {}) {
    const {
        multiplier = 1,
        critBonus = 1.5,
        minDamage = 1
    } = options;

    let atk = attacker.atk || 1;
    const def = defender.def || 0;
    const critChance = attacker.crit || 5;

    // Aplicar buffs temporários (apenas do atacante)
    if (attacker.buffs && Array.isArray(attacker.buffs)) {
        attacker.buffs.forEach(buff => {
            if (buff.type === 'atk') atk += buff.value;
            if (buff.type === 'def' && defender === attacker) {} // não aplica aqui
        });
    }

    const variance = 0.9 + Math.random() * 0.2;

    let rawDamage = atk * variance * multiplier;

    const isCrit = Math.random() * 100 <= critChance;

    if (isCrit) {
        rawDamage *= critBonus;
    }

    // defesa escalável
    const mitigation = def / (def + 50);
    const finalDamage = Math.max(minDamage, Math.floor(rawDamage * (1 - mitigation)));

    return {
        damage: finalDamage,
        isCrit,
        rawDamage: Math.floor(rawDamage),
        mitigation: Number(mitigation.toFixed(2))
    };
}

module.exports = {
    calculateDamage
};