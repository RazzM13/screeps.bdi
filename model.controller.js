const ModelBDI = require('./model.bdi');


/** An intelligent agent for the Screeps Controller structure. */
class ModelController extends ModelBDI {

  constructor(beliefs) {
    const _beliefs = {
      'agent': null,
      'intent': null,
      'roomInfo': null
    };

    Object.assign(_beliefs, beliefs);

    super(_beliefs);
  }

  desires() {
      return [
        {
          title: 'activateSafeMode',
          actions: () => {
            this.beliefs['agent'].activateSafeMode();
          },
          conditions: () => {
            const agent = this.beliefs['agent'];
            const fighters = this.beliefs['roomInfo']['fighters'];
            const enemiesInInternalPerimeters = this.beliefs['roomInfo']['enemiesInInternalPerimeters'];

            if ( !agent.safeMode && !agent.safeModeCooldown && agent.safeModeAvailable &&
                 (enemiesInInternalPerimeters.length > fighters.length) ) {
              this.beliefs['intent'] = 'activateSafeMode';
              return true;
            }
          }
        }
      ];
  }
}

module.exports = ModelController;
