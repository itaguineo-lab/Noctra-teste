function calculateDamage(
    attacker,
    defender,
    options = {}
) {
    const {
        multiplier = 1,
        critBonus = 1.6,
        minDamage = 1,
        penetration = 0
    } = options;

    const atk = Math.max(
        1,
        attacker.atk || 1
    );

    let def = Math.max(
        0,
        defender.def || 0
    );

    const critChance =
        Math.min(
            75,
            attacker.crit || 5
        );

    const variance =
        0.9 + Math.random() * 0.2;

    def = Math.max(
        0,
        def - penetration
    );

    let rawDamage =
        atk *
        variance *
        multiplier;

    const isCrit =
        Math.random() * 100 <=
        critChance;

    if (isCrit) {
        rawDamage *= critBonus;
    }

    /*
    CURVA MELHOR
    */

    const mitigation =
        Math.min(
            0.75,
            def / (def + 60)
        );

    const finalDamage =
        Math.max(
            minDamage,
            Math.floor(
                rawDamage *
                    (1 - mitigation)
            )
        );

    return {
        damage: finalDamage,
        isCrit,
        rawDamage:
            Math.floor(rawDamage),
        mitigation: Number(
            mitigation.toFixed(2)
        )
    };
}

module.exports = {
    calculateDamage
};