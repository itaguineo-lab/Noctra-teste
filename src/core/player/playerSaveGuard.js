const { savePlayer } = require('./playerService');

/**
 * Salva o player sem recalcular manualmente nos handlers.
 * A responsabilidade do recálculo fica centralizada no savePlayer.
 */
async function persistPlayer(userId, player) {
  return savePlayer(userId, player);
}

module.exports = {
  persistPlayer
};
