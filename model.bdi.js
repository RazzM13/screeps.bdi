/**
 * A BDI specific desire.
 * @typedef {Object} DesireBDI
 * @property {string} title Short description of the desire
 * @property {function} actions The actions that will be executed for the fulfilment of the desire
 * @property {function} conditions The conditions that need to be met for the desire to be viable
 */

/** A simplistic Belief-Desire-Intention model. */
class ModelBDI {

  /**
   * Creates a new BDI model based on some arbitrary beliefs.
   * @param {Object} beliefs
   */
  constructor(beliefs) {
    this.beliefs = beliefs;
  }

  /*
   * Determines the most applicable desire and attempts to satisfy it.
   */
  execute() {
    try {
      for (let desire of this.desires()) {
        if (desire.conditions()) {
          desire.actions();
          break;
        }
      }
    } catch (err) {
      if (DEBUG_MODE) {
        throw err;
      } else {
        console.log(err.stack);
      }
    }
    return this.beliefs;
  }

  /**
   * Returns the desires associated with this model.
   * @returns {DesireBDI[]} Array of DesireBDI objects
   */
  desires() {
    throw Error('Not implemented!');
  }

}

module.exports = ModelBDI;
