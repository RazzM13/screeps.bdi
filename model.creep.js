const ModelBDI = require('./model.bdi');


/** An intelligent agent for the Screeps Creep unit. */
class ModelCreep extends ModelBDI {

  constructor(beliefs) {
    const creep = beliefs['agent'];

    const hasEnergy = !!(creep.carry[RESOURCE_ENERGY]);
    const totalNearbySourceEnergy = beliefs['nearbySourceEnergy'] ? beliefs['nearbySourceEnergy'].length : 0;
    const isNearEnergySource = !!(totalNearbySourceEnergy);
    const availableCarryCapacity = (creep.carryCapacity - creep.carry[RESOURCE_ENERGY]);
    const canMove = (creep ? creep.getActiveBodyparts(MOVE) > 0 : null);
    const canWork = (creep ? creep.getActiveBodyparts(WORK) > 0 : null);
    const canCarry = (creep ? creep.getActiveBodyparts(CARRY) > 0 : null);
    const canAttack = (creep ? creep.getActiveBodyparts(ATTACK) > 0 : null);
    const canGatherEnergy = !!(canWork && canCarry && availableCarryCapacity);

    const _beliefs = {
      hasEnergy,
      isNearEnergySource,
      availableCarryCapacity,
      canMove,
      canWork,
      canCarry,
      canAttack,
      canGatherEnergy,
      'agent': null,
      'intent': null,
      'target': null,
      'roomInfo': null,
      'spawnRoom': null,
      'creepManager': null,
      'nearbyCreeps': [],
      'nearbyThreats': [],
      'nearbySourceEnergy': [],
      'hasEnergyFromContainer': false,
      'controllerDowngradeSafetyThreshold': null
    };

    Object.assign(_beliefs, beliefs);

    super(_beliefs);
  }

  /**
   * Attack a single enemy in close combat.
   * @param {Creep} target
   */
  doCloseCombat(target) {
    if (!target) {
      throw TypeError('Invalid target!');
    }

    const agent = this.beliefs['agent'];
    if ( (agent.attack(target) == ERR_NOT_IN_RANGE) && (agent.moveTo(target) == OK) ) {
      agent.attack(target);
    }
  }

  /**
   * Extracts energy from a source.
   * @param {Source} target
   */
  doGatherSourceEnergy(target) {
    if (!target) {
      throw TypeError('Invalid target!');
    }

    const agent = this.beliefs['agent'];
    if ( (agent.harvest(target) == ERR_NOT_IN_RANGE) && (agent.moveTo(target) == OK) ) {
      agent.harvest(target);
    }
  }

  /**
   * Picks up dropped energy.
   * @param {Resource} target
   */
  doGatherDroppedEnergy(target) {
    if (!target) {
      throw TypeError('Invalid target!');
    }

    const agent = this.beliefs['agent'];
    if ( (agent.pickup(target) == ERR_NOT_IN_RANGE) && (agent.moveTo(target) == OK) ) {
      agent.pickup(target);
    }
  }

  /**
   * Builds a given target.
   * @param {ConstructionSite} target
   */
  doBuild(target) {
    if (!target) {
      throw TypeError('Invalid target!');
    }

    const agent = this.beliefs['agent'];
    if ( (agent.build(target) == ERR_NOT_IN_RANGE) && (agent.moveTo(target) == OK) ) {
      agent.build(target);
    }
  }

  /**
   * Check if we can build.
   * @returns {boolean}
   */
  canDoBuild() {
    const agent = this.beliefs['agent'];
    return !!(this.beliefs['canWork'] && this.beliefs['canCarry'] && agent.carry[RESOURCE_ENERGY]);
  }

  /**
   * Repairs a given target.
   * @param {Structure} target
   */
  doRepair(target) {
    if (!target) {
      throw TypeError('Invalid target!');
    }

    const agent = this.beliefs['agent'];
    if ( (agent.repair(target) == ERR_NOT_IN_RANGE) && (agent.moveTo(target) == OK) ) {
      agent.repair(target);
    }
  }

  /**
   * Check if we can do repairs.
   * @returns {boolean}
   */
  canDoRepair() {
    const agent = this.beliefs['agent'];
    return !!(this.beliefs['canWork'] && this.beliefs['canCarry'] && agent.carry[RESOURCE_ENERGY]);
  }

  /**
   * Upgrades a given controller.
   * @param {StructureController} target
   */
  doUpgradeController(target) {
    if (!target) {
      throw TypeError('Invalid target!');
    }

    const agent = this.beliefs['agent'];
    if ( (agent.upgradeController(target) == ERR_NOT_IN_RANGE) && (agent.moveTo(target) == OK) ) {
      agent.upgradeController(target);
    }
  }

  /**
   * Check if we can upgrade a given controller.
   * @returns {boolean}
   */
  canDoUpgradeController(target) {
    if (!target) {
      throw TypeError('Invalid target!');
    }

    const agent = this.beliefs['agent'];
    return !!( this.beliefs['canWork'] && this.beliefs['canCarry'] && agent.carry[RESOURCE_ENERGY] && !(target.upgradeBlocked) );
  }

  /**
   * Transfers carried energy to a target store.
   * @param {(StructureSpawn|StructureExtension|StructureContainer)} target
   */
  doStoreEnergy(target) {
    if (!target) {
      throw TypeError('Invalid target!');
    }

    const agent = this.beliefs['agent'];
    if ( (agent.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) && (agent.moveTo(target) == OK) ) {
      agent.transfer(target, RESOURCE_ENERGY);
    }
  }

  /**
   * Check if we can transfer carried energy to a target store.
   * @param {(StructureSpawn|StructureExtension|StructureContainer)} target
   * @returns {boolean}
   */
  canDoStoreEnergy(target) {
    if (!target) {
      throw TypeError('Invalid target!');
    }

    const agent = this.beliefs['agent'];

    let energy = null;
    let energyCapacity = null;
    if ( (target.structureType == STRUCTURE_SPAWN) || (target.structureType == STRUCTURE_EXTENSION) ||
         (target.structureType == STRUCTURE_TOWER) ) {
      energy = target.energy;
      energyCapacity = target.energyCapacity;
    } else if (target.structureType == STRUCTURE_CONTAINER) {
      energy = target.store[RESOURCE_ENERGY];
      energyCapacity = target.storeCapacity;
    }

    return !!( this.beliefs['canCarry'] && agent.carry[RESOURCE_ENERGY] && (energyCapacity > energy) );
  }

  /**
   * Withdraws energy from a target store.
   * @param {(StructureSpawn|StructureExtension|StructureContainer)} target
   */
  doWithdrawEnergy(target) {
    if (!target) {
      throw TypeError('Invalid target!');
    }

    const agent = this.beliefs['agent'];
    if ( (agent.withdraw(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) && (agent.moveTo(target) == OK) ) {
      agent.withdraw(target);
    }
  }

  /**
   * Check if we can withdraw energy from a target store.
   * @param {(StructureSpawn|StructureExtension|StructureContainer)} target
   * @returns {boolean}
   */
  canDoWithdrawEnergy(target) {
    if (!target) {
      throw TypeError('Invalid target!');
    }

    const agent = this.beliefs['agent'];
    const canCarry = this.beliefs['canCarry'];
    const availableCarryCapacity = this.beliefs['availableCarryCapacity'];
    return !!( canCarry && (target.store[RESOURCE_ENERGY] >= availableCarryCapacity) );
  }

  /**
   * Returns the position where a first creep should move in order to avoid a second creep.
   * @param {RoomPosition} a The position of the first creep
   * @param {RoomPosition} b The position of the second creep
   * @param {Object} roomInfo The room specific information
   */
  findCollisionAvoidancePos(a, b, roomInfo) {
    let targetX = (a.x > b.x) ? (a.x + 1) : (a.x - 1);
    targetX = Math.max(Math.min(targetX, roomInfo['roomLeft']), roomInfo['roomRight']);
    let targetY = (a.y > b.y) ? (a.y + 1) : (a.y - 1);
    targetY = Math.max(Math.min(targetY, roomInfo['roomTop']), roomInfo['roomBottom']);
    return new RoomPosition(targetX, targetY, roomInfo['room'].name);
  }


  desires() {
    return [
      {
        title: 'salute',
        actions: () => {
          this.beliefs['agent'].say(this.beliefs['target']);
        },
        conditions: () => {
          const agent = this.beliefs['agent'];
          if (agent.spawning) {
            this.beliefs['target'] = '🔄 hello';
            this.beliefs['intent'] = 'salute';
            return true;
          }
        }
      },
      {
        title: 'suicide',
        actions: () => {
          this.beliefs['agent'].say('🔄 bye');
          this.beliefs['agent'].suicide();
        },
        conditions: () => {
          const agent = this.beliefs['agent'];
          const roomInfo = this.beliefs['roomInfo'];
          const enemies = roomInfo['enemies'];
          const threats = roomInfo['threats'];
          const canAttack = this.beliefs['canAttack'];
          const canWork = this.beliefs['canWork'];
          const canCarry = this.beliefs['canCarry'];

          if ( !enemies.length && !threats.length && !canAttack && (!canWork || !canCarry)  ) {
            this.beliefs['target'] = agent;
            this.beliefs['intent'] = 'suicide';
            return true;
          }
        }
      },
      {
        title: 'fight',
        actions: () => {
          this.beliefs['agent'].say('🔄 fight');
          this.doCloseCombat(this.beliefs['target']);
        },
        conditions: () => {
          const agent = this.beliefs['agent'];
          const roomInfo = this.beliefs['roomInfo'];
          const enemiesInPerimeters = roomInfo['enemiesInPerimeters'];
          const threatsInPerimeters = roomInfo['threatsInPerimeters'];
          const canAttack = this.beliefs['canAttack'];

          if ( (enemiesInPerimeters.length || threatsInPerimeters.length) && canAttack ) {

            // prioritize attack on targets based on their attack capability
            let target = null;
            if (threatsInPerimeters.length) {
              target = agent.pos.findClosestByPath(threatsInPerimeters);
            } else {
              target = agent.pos.findClosestByPath(enemiesInPerimeters);
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
        title: 'guard',
        actions: () => {
          this.beliefs['agent'].say('🔄 guard');
          this.beliefs['agent'].moveTo(this.beliefs['target']);
        },
        conditions: () => {
          const intent = 'guard';
          const agent = this.beliefs['agent'];
          const canMove = this.beliefs['canMove'];
          const canWork = this.beliefs['canWork'];
          const canAttack = this.beliefs['canAttack'];
          const roomInfo = this.beliefs['roomInfo'];
          const ramparts = roomInfo['ramparts'];
          const creepManager = this.beliefs['creepManager'];

          // early exit
          if ( canWork || !canMove || !canAttack ) { return false; }

          // man perimeter defences
          const target = agent.pos.findClosestByPath(ramparts, {
           filter: (x) => ( creepManager.requestAssignment(agent.name, x.id, intent) )
          });

          if (target) {
            this.beliefs['target'] = target;
            this.beliefs['intent'] = intent;
            return true;
          }
        }
      },
      {
        title: 'evade',
        actions: () => {
          this.beliefs['agent'].say('🔄 evade');
          this.beliefs['agent'].moveTo(this.beliefs['target']);
        },
        conditions: () => {
          const agent = this.beliefs['agent'];
          const roomInfo = this.beliefs['roomInfo'];
          const canAttack = this.beliefs['canAttack'];
          const nearbyThreats = this.beliefs['nearbyThreats'];

          if (nearbyThreats.length && !canAttack) {
            const subject = agent.pos.findClosestByRange(nearbyThreats);
            const target = this.findCollisionAvoidancePos(agent.pos, subject.pos, roomInfo);
            if (target) {
              this.beliefs['target'] = target;
              this.beliefs['intent'] = 'evade';
              return true;
            }
          }
        }
      },
      {
        title: 'emergencyUpgradeController',
        actions: () => {
          this.beliefs['agent'].say('🔄 emergencyUpgradeController');
          this.doUpgradeController(this.beliefs['target']);
        },
        conditions: () => {
          const roomInfo = this.beliefs['roomInfo'];
          const target = roomInfo['room'].controller;
          const controllerDowngradeSafetyThreshold = this.beliefs['controllerDowngradeSafetyThreshold'];

          // early exit
          if (!target) { return false; }

          const elapsedTicksToDowngrade = (CONTROLLER_DOWNGRADE[target.level] - target.ticksToDowngrade);
          if ( (elapsedTicksToDowngrade >= controllerDowngradeSafetyThreshold) && this.canDoUpgradeController(target) ) {
            this.beliefs['target'] = target;
            this.beliefs['intent'] = 'emergencyUpgradeController';
            return true;
          }
        }
      },
      {
        title: 'recycle',
        actions: () => {
          this.beliefs['agent'].say('🔄 recycle');

          const target = this.beliefs['target'];
          if (target instanceof Tombstone) {
            this.doWithdrawEnergy(target);
          } else {
            this.doGatherDroppedEnergy(target);
          }

          this.beliefs['hasEnergyFromContainer'] = false;
        },
        conditions: () => {
          const intent = 'recycle';
          const agent = this.beliefs['agent'];
          const roomInfo = this.beliefs['roomInfo'];
          const droppedEnergy = roomInfo['droppedEnergy'];
          const tombstones = roomInfo['tombstones'];
          const hasEnergy = this.beliefs['hasEnergy'];
          const creepManager = this.beliefs['creepManager'];
          const canGatherEnergy = this.beliefs['canGatherEnergy'];

          // early exit
          if ( !canGatherEnergy || hasEnergy || (!droppedEnergy.length && !tombstones.length) ) { return false; }

          let target = null;

          // recycle tombstone energy
          if (tombstones.length) {
            target = agent.pos.findClosestByPath(tombstones, {
             filter: (x) => ( this.canDoWithdrawEnergy(x) && creepManager.requestAssignment(agent.name, x.id, intent) )
            });

          // recycle dropped energy
          } else if (droppedEnergy.length) {
            target = agent.pos.findClosestByPath(droppedEnergy, {
             filter: (x) => ( creepManager.requestAssignment(agent.name, x.id, intent) )
            });
          }

          if (target) {
            this.beliefs['target'] = target;
            this.beliefs['intent'] = intent;
            return true;
          }
        }
      },
      {
        title: 'harvest',
        actions: () => {
          this.beliefs['agent'].say('🔄 harvest');
          this.doGatherSourceEnergy(this.beliefs['target']);
          this.beliefs['hasEnergyFromContainer'] = false;
        },
        conditions: () => {
          const intent = 'harvest';
          const agent = this.beliefs['agent'];
          const roomInfo = this.beliefs['roomInfo'];
          const energySources = roomInfo['energySources'];
          const hasEnergy = this.beliefs['hasEnergy'];
          const creepManager = this.beliefs['creepManager'];
          const canGatherEnergy = this.beliefs['canGatherEnergy'];
          const isNearEnergySource = this.beliefs['isNearEnergySource'];

          // early exit
          if ( !canGatherEnergy || !energySources.length || (!isNearEnergySource && hasEnergy) ) { return false; }

          const target = agent.pos.findClosestByPath(energySources, {
           filter: (x) => ( creepManager.requestAssignment(agent.name, x.id, intent) )
          });
          if (target) {
           this.beliefs['target'] = target;
           this.beliefs['intent'] = intent;
           return true;
          }
        }
      },
      {
        title: 'stockpile',
        actions: () => {
          this.beliefs['agent'].say('🔄 stockpile');
          this.doStoreEnergy(this.beliefs['target']);
        },
        conditions: () => {
          const intent = 'stockpile';
          const agent = this.beliefs['agent'];
          const roomInfo = this.beliefs['roomInfo'];
          const towers = roomInfo['towers'];
          const energyStores = roomInfo['energyStores'];
          // const energyContainers = roomInfo['energyContainers'];
          const creepManager = this.beliefs['creepManager'];

          // early exit
          if (this.beliefs['hasEnergyFromContainer']) { return false; }

          let target = agent.pos.findClosestByPath(towers, {
            filter: (x) => ( this.canDoStoreEnergy(x) && creepManager.requestAssignment(agent.name, x.id, intent) )
          });
          if (!target) {
            target = agent.pos.findClosestByPath(energyStores, {
              filter: (x) => ( this.canDoStoreEnergy(x) && creepManager.requestAssignment(agent.name, x.id, intent) )
            });
          // } else if (!target) {
          //   target = agent.pos.findClosestByPath(energyContainers, {
          //     filter: (x) => ( this.canDoStoreEnergy(x) && creepManager.requestAssignment(agent.name, x.id, intent) )
          //   });
          }

          if (target) {
            this.beliefs['target'] = target;
            this.beliefs['intent'] = intent;
            return true;
          }
        }
      },
      // TODO: reconsider withdraw strategy
      // {
      //   title: 'withdraw',
      //   actions: () => {
      //     this.beliefs['agent'].say('🔄 withdraw');
      //     this.doWithdrawEnergy(this.beliefs['target']);
      //     this.beliefs['hasEnergyFromContainer'] = true;
      //   },
      //   conditions: () => {
      //     const agent = this.beliefs['agent'];
      //     const roomInfo = this.beliefs['roomInfo'];
      //     const energyContainers = roomInfo['energyContainers'];
      //
      //     // early exit
      //     if (!energyContainers.length || agent.carry[RESOURCE_ENERGY]) { return false; }
      //
      //     const target = agent.pos.findClosestByPath(energyContainers, {
      //       filter: (x) => this.canDoWithdrawEnergy(x)
      //     });
      //     if (target) {
      //       this.beliefs['target'] = target;
      //       this.beliefs['intent'] = 'withdraw';
      //       return true;
      //     }
      //   }
      // },
      {
        title: 'repair',
        actions: () => {
          this.beliefs['agent'].say('🔄 repair');
          this.doRepair(this.beliefs['target']);
        },
        conditions: () => {
          const intent = 'repair';
          const agent = this.beliefs['agent'];
          const roomInfo = this.beliefs['roomInfo'];
          const damagedStructures = roomInfo['damagedStructures'];
          const creepManager = this.beliefs['creepManager'];

          if ( damagedStructures.length && this.canDoRepair() ) {
            const target = agent.pos.findClosestByPath(damagedStructures, {
              filter: (x) => ( creepManager.requestAssignment(agent.name, x.id, intent) )
            });
            if (target) {
              this.beliefs['target'] = target;
              this.beliefs['intent'] = intent;
              return true;
            }
          }
        }
      },
      {
        title: 'build',
        actions: () => {
          this.beliefs['agent'].say('🔄 build');
          this.doBuild(this.beliefs['target']);
        },
        conditions: () => {
          const intent = 'build';
          const agent = this.beliefs['agent'];
          const roomInfo = this.beliefs['roomInfo'];
          const constructionSites = roomInfo['constructionSites'];
          const creepManager = this.beliefs['creepManager'];

          if ( constructionSites.length && this.canDoBuild() ) {
            const target = agent.pos.findClosestByPath(constructionSites, {
              filter: (x) => ( creepManager.requestAssignment(agent.name, x.id, intent) )
            });
            if (target) {
              this.beliefs['target'] = target;
              this.beliefs['intent'] = intent;
              return true;
            }
          }
        }
      },
      {
        title: 'upgradeController',
        actions: () => {
          this.beliefs['agent'].say('🔄 upgradeController');
          this.doUpgradeController(this.beliefs['target']);
        },
        conditions: () => {
          const roomInfo = this.beliefs['roomInfo'];
          const target = roomInfo['room'].controller;

          if ( target && this.canDoUpgradeController(target) ) {
            this.beliefs['target'] = target;
            this.beliefs['intent'] = 'upgradeController';
            return true;
          }
        }
      },
      {
        title: 'idle',
        actions: () => {
          this.beliefs['agent'].say('🔄 idle');

          const target = this.beliefs['target'];
          if (target) {
            this.beliefs['agent'].moveTo(target);
          }
        },
        conditions: () => {
          const agent = this.beliefs['agent'];
          const roomInfo = this.beliefs['roomInfo'];
          const room = roomInfo['room'];
          const spawnRoom = this.beliefs['spawnRoom'];
          const nearbyCreeps = this.beliefs['nearbyCreeps'];

          let target;

          // avoid nearby creeps
          if (nearbyCreeps.length) {
            const subject = agent.pos.findClosestByRange(nearbyCreeps);
            target = this.findCollisionAvoidancePos(agent.pos, subject.pos, roomInfo);
          }

          // return to spawn room
          if (spawnRoom != room.name) {
            switch(true) {
              case (agent.pos.x >= roomInfo['roomCenter']):
                target = new RoomPosition( (roomInfo['roomLeft'] + 1), agent.pos.y, spawnRoom );
                break;
              case (agent.pos.x <= roomInfo['roomCenter']):
                target = new RoomPosition( (roomInfo['roomRight'] - 1), agent.pos.y, spawnRoom );
                break;
              case (agent.pos.y >= roomInfo['roomCenter']):
                target = new RoomPosition( agent.pos.x, (roomInfo['roomTop'] + 1), spawnRoom );
                break;
              case (agent.pos.y <= roomInfo['roomCenter']):
                target = new RoomPosition( agent.pos.x, (roomInfo['roomBottom'] - 1), spawnRoom );
                break;
            }
          }

          this.beliefs['target'] = target;
          this.beliefs['intent'] = 'idle';
          return true;
        }
      }
    ];
  }
}

module.exports = ModelCreep;
