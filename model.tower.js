const ModelBDI = require('./model.bdi');


/** An intelligent agent for the Screeps Tower structure. */
class ModelTower extends ModelBDI {

  constructor(beliefs) {
    const _beliefs = {
      'agent': null,
      'target': null,
      'intent': null,
      'workersInRange': [],
      'fightersInRange': [],
      'enemiesInRange': [],
      'threatsInRange': [],
      'damagedStructuresInRange': []
    };

    Object.assign(_beliefs, beliefs);

    super(_beliefs);
  }

  desires() {
    return [
      {
        title: 'fight',
        actions: () => {
          this.beliefs['agent'].attack(this.beliefs['target']);
        },
        conditions: () => {
          const agent = this.beliefs['agent'];

          if (this.beliefs['enemiesInRange'].length || this.beliefs['threatsInRange'].length) {
            let target = agent.pos.findClosestByRange(this.beliefs['threatsInRange']);
            if (!target) {
              target = agent.pos.findClosestByRange(this.beliefs['enemiesInRange']);
            }
            if (target) {
              this.beliefs['target'] = target;
              this.beliefs['intent'] = 'fight';
              return true;
            }
          }
        }
      },
      {
        title: 'heal',
        actions: () => {
          this.beliefs['agent'].heal(this.beliefs['target']);
        },
        conditions: () => {
          const agent = this.beliefs['agent'];

          if (this.beliefs['fightersInRange'].length || this.beliefs['workersInRange'].length) {
            let target = agent.pos.findClosestByRange(this.beliefs['fightersInRange'], {
              filter: (x) => (x.hits < x.hitsMax)
            });
            if (!target) {
              target = agent.pos.findClosestByRange(this.beliefs['workersInRange'], {
                filter: (x) => (x.hits < x.hitsMax)
              });
            }
            if (target) {
              this.beliefs['target'] = target;
              this.beliefs['intent'] = 'heal';
              return true;
            }
          }
        }
      },
      {
        title: 'repair',
        actions: () => {
          this.beliefs['agent'].repair(this.beliefs['target']);
        },
        conditions: () => {
          const agent = this.beliefs['agent'];

          if (this.beliefs['damagedStructuresInRange'].length) {
            const target = agent.pos.findClosestByRange(this.beliefs['damagedStructuresInRange']);
            if (target) {
              this.beliefs['target'] = target;
              this.beliefs['intent'] = 'repair';
              return true;
            }
          }
        }
      }
    ];
  }
}

module.exports = ModelTower;
