function calculateDamage(attacker, defender, options = {}) {
    const {
        multiplier = 1,
        critBonus = 1.6,
        minDamage = 1
    } = options;

    let atk = attacker.atk || 1;
    let def = defender.def || 0;
    const critChance = attacker.crit || 5;

    const variance = 0.92 + Math.random() * 0.16;

    let rawDamage = atk * variance * multiplier;

    const isCrit =
        Math.random() * 100 <= critChance;

    if (isCrit) {
        rawDamage *= critBonus;
    }

    const mitigation = def / (def + 45);

    const finalDamage = Math.max(
        minDamage,
        Math.floor(rawDamage * (1 - mitigation))
    );

    return {
        damage: finalDamage,
        isCrit,
        rawDamage: Math.floor(rawDamage),
        mitigation: Number(
            mitigation.toFixed(2)
        )
    };
}

module.exports = {
    calculateDamage
};