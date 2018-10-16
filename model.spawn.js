const ModelBDI = require('./model.bdi');


/** An intelligent agent for the Screeps Spawn structure. */
class ModelSpawn extends ModelBDI {

  constructor(beliefs) {
    const _beliefs = {
      'agent': null,
      'target': null,
      'targetBodyparts': null,
      'intent': null,
      'roomInfo': null,
      'maxWorkers': null
    };

    Object.assign(_beliefs, beliefs);

    super(_beliefs);
  }

  /**
   * Returns a random creep name.
   * @param {string} prefix
   * @returns {string}
   */
  generateCreepName(prefix='') {
    const uid = Math.floor(Math.random() * 1000);
    return `${prefix}${uid}`;
  }

  /**
   * Spawns a new creep with the given name and body parts.
   * @param {string[]} requiredBodyParts The body parts of the creep
   * @param {string} name The name of the creep
   * @returns {boolean} Operation status
   */
  createCreep(requiredBodyParts, name) {
    if (!requiredBodyParts) {
      throw TypeError('Invalid requiredBodyParts!');
    }

    if (!name) {
      throw TypeError('Invalid name!');
    }

    const agent = this.beliefs['agent'];
    const roomInfo = this.beliefs['roomInfo'];
    const opts = {
      'memory': {'spawnRoom': roomInfo['room'].name}
    };

    return ( agent.spawnCreep(requiredBodyParts, name, opts) == OK );
  }

  /**
   * Checks if we can spawn a new creep with the given name and body parts.
   * @param {string[]} requiredBodyParts The body parts of the creep
   * @param {string} name The name of the creep
   * @returns {boolean}
   */
  canCreateCreep(requiredBodyParts, name) {
    if (!requiredBodyParts) {
      throw TypeError('Invalid requiredBodyParts!');
    }

    if (!name) {
      throw TypeError('Invalid name!');
    }

    return ( this.beliefs['agent'].spawnCreep(requiredBodyParts, name, { dryRun: true }) == OK );
  }

  /**
   * Returns the cost of creating a creep with the given body parts.
   * @param {string[]} requiredBodyParts The body parts of the creep
   * @returns {number}
   */
  calculateCreepCost(requiredBodyParts) {
    if (!requiredBodyParts) {
      throw TypeError('Invalid requiredBodyParts!');
    }

    return requiredBodyParts.reduce( (x, y) => (x + BODYPART_COST[y]), 0 );
  }


  desires() {
    return [
      {
        title: 'spawnFighter',
        actions: () => {
          this.createCreep(this.beliefs['targetBodyparts'], this.beliefs['target']);
        },
        conditions: () => {
          const roomInfo = this.beliefs['roomInfo'];
          const energyAvailable = roomInfo['energyAvailable'];
          const enemies = roomInfo['enemies'];
          const fighters = roomInfo['fighters'];
          const ramparts = roomInfo['ramparts'];

          // early exit if we're not under attack
          if ( !enemies.length || (fighters.length >= ramparts.length) ) { return false; }

          const name = this.generateCreepName('F');
          const requiredBodyParts = [MOVE, ATTACK];
          const cost = this.calculateCreepCost(requiredBodyParts);
          if ( (cost <= energyAvailable) && (this.canCreateCreep(requiredBodyParts, name)) ) {
            this.beliefs['target'] = name;
            this.beliefs['targetBodyparts'] = requiredBodyParts;
            this.beliefs['intent'] = 'spawnFighter';
            return true;
          }
        }
      },
      {
        title: 'spawnDrone',
        actions: () => {
          this.createCreep(this.beliefs['targetBodyparts'], this.beliefs['target']);
        },
        conditions: () => {
          const roomInfo = this.beliefs['roomInfo'];
          const workers = roomInfo['workers'];
          const energyAvailable = roomInfo['energyAvailable'];
          const maxWorkers = this.beliefs['maxWorkers'];

          // early exit for max units of this type
          if ( workers.length >= maxWorkers ) { return false; }

          const name = this.generateCreepName('D');
          const requiredBodyParts = [WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, ATTACK];
          const cost = this.calculateCreepCost(requiredBodyParts);
          if ( (cost <= energyAvailable) && (this.canCreateCreep(requiredBodyParts, name)) ) {
            this.beliefs['target'] = name;
            this.beliefs['targetBodyparts'] = requiredBodyParts;
            this.beliefs['intent'] = 'spawnDrone';
            return true;
          }
        }
      },
      {
        title: 'spawnWorker3G',
        actions: () => {
          this.createCreep(this.beliefs['targetBodyparts'], this.beliefs['target']);
        },
        conditions: () => {
          const roomInfo = this.beliefs['roomInfo'];
          const workers = roomInfo['workers'];
          const maxWorkers = this.beliefs['maxWorkers'];
          const energyAvailable = roomInfo['energyAvailable'];

          // early exit for max units of this type
          if ( workers.length >= maxWorkers ) { return false; }

          const name = this.generateCreepName('3GW');
          const requiredBodyParts = [WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE];
          const cost = this.calculateCreepCost(requiredBodyParts);
          if ( (cost <= energyAvailable) && (this.canCreateCreep(requiredBodyParts, name)) ) {
            this.beliefs['target'] = name;
            this.beliefs['targetBodyparts'] = requiredBodyParts;
            this.beliefs['intent'] = 'spawnWorker3G';
            return true;
          }
        }
      },
      {
        title: 'spawnWorker2G',
        actions: () => {
          this.createCreep(this.beliefs['targetBodyparts'], this.beliefs['target']);
        },
        conditions: () => {
          const roomInfo = this.beliefs['roomInfo'];
          const workers = roomInfo['workers'];
          const maxWorkers = this.beliefs['maxWorkers'];
          const energyAvailable = roomInfo['energyAvailable'];

          // early exit for max units of this type
          if ( workers.length >= maxWorkers ) { return false; }

          const name = this.generateCreepName('2GW');
          const requiredBodyParts = [WORK, WORK, CARRY, MOVE, MOVE];
          const cost = this.calculateCreepCost(requiredBodyParts);
          if ( (cost <= energyAvailable) && (this.canCreateCreep(requiredBodyParts, name)) ) {
            this.beliefs['target'] = name;
            this.beliefs['targetBodyparts'] = requiredBodyParts;
            this.beliefs['intent'] = 'spawnWorker2G';
            return true;
          }
        }
      },
      {
        title: 'spawnWorker1G',
        actions: () => {
          this.createCreep(this.beliefs['targetBodyparts'], this.beliefs['target']);
        },
        conditions: () => {
          const roomInfo = this.beliefs['roomInfo'];
          const workers = roomInfo['workers'];
          const maxWorkers = this.beliefs['maxWorkers'];
          const energyAvailable = roomInfo['energyAvailable'];

          // early exit for max units of this type
          if ( workers.length >= maxWorkers ) { return false; }

          const name = this.generateCreepName('1GW');
          const requiredBodyParts = [WORK, WORK, CARRY, MOVE];
          const cost = this.calculateCreepCost(requiredBodyParts);
          if ( (cost <= energyAvailable) && (this.canCreateCreep(requiredBodyParts, name)) ) {
            this.beliefs['target'] = name;
            this.beliefs['targetBodyparts'] = requiredBodyParts;
            this.beliefs['intent'] = 'spawnWorker1G';
            return true;
          }
        }
      }
    ];
  }

}

module.exports = ModelSpawn;
