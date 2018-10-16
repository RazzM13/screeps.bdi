const ModelBDI = require('./model.bdi');


/** An intelligent agent for managing Screeps Creep units. */
class ModelCreepManager extends ModelBDI {

  constructor(beliefs, di = {}) {

    const _beliefs = {
      'game': null,
      'requestRegister': {},
      'assignmentRegister': {},
      'creepsPerSource': null,
      'creepsPerRampart': null,
      'creepsPerResource': null,
      'creepPriorityRange': null,
      'assignmentExpirationTicks': null
    };

    Object.assign(_beliefs, beliefs);

    super(_beliefs);

    Object.assign(this, di);
  }

  requestAssignment(creepName, targetID, intent) {
    const game = this.beliefs['game'];
    const currentTime = game.time;
    const requestRegister = this.beliefs['requestRegister'];
    const assignmentRegister = this.beliefs['assignmentRegister'];

    // acquire or initialize registers

    if ( !requestRegister.hasOwnProperty(intent) ) {
      requestRegister[intent] = {};
    }
    const intentRequestRegister = requestRegister[intent];

    if ( !assignmentRegister.hasOwnProperty(intent) ) {
      assignmentRegister[intent] = {};
    }
    const intentAssignmentRegister = assignmentRegister[intent];

    // acquire or initialize intent registers

    let targetRequesters = {};
    if ( intentRequestRegister.hasOwnProperty(targetID) ) {
      targetRequesters = intentRequestRegister[targetID];
    }

    let targetAsignees = {};
    if ( intentAssignmentRegister.hasOwnProperty(targetID) ) {
      targetAsignees = intentAssignmentRegister[targetID];
    }

    // determine creep assigment eligibility
    let result = false;
    if ( targetAsignees.hasOwnProperty(creepName) ) {
      result = true;
    }
    targetRequesters[creepName] = currentTime;

    // update registers
    intentRequestRegister[targetID] = targetRequesters;
    intentAssignmentRegister[targetID] = targetAsignees;

    return result;
  }

  assignTargetRequesters(intentAsignees, targetAsignees, targetRequesters, prioritizedRequesters, isSufficient) {
    const requesters = prioritizedRequesters.concat(Object.keys(targetRequesters));
    let lastAssigned = null;
    for (const requesterName of requesters) {
      if (isSufficient(targetAsignees, lastAssigned)) {
        break;
      } else if ( !intentAsignees.hasOwnProperty(requesterName) ) {
        targetAsignees[requesterName] = targetRequesters[requesterName];
        lastAssigned = requesterName;
      }
    }
  }

  desires() {
    return [
      {
        title: 'allocateAssignments',
        actions: () => {
          const game = this.beliefs['game'];
          const creeps = game.creeps;
          const currentTime = game.time;
          const creepsPerSource = this.beliefs['creepsPerSource'];
          const creepsPerRampart = this.beliefs['creepsPerRampart'];
          const creepsPerResource = this.beliefs['creepsPerResource'];
          const requestRegister = this.beliefs['requestRegister'];
          const assignmentRegister = this.beliefs['assignmentRegister'];
          const creepPriorityRange = this.beliefs['creepPriorityRange'];
          const assignmentExpirationTicks = this.beliefs['assignmentExpirationTicks'];

          // purge stale or update ongoing assignments
          for (const intent in assignmentRegister) {
            const intentRequestTargets = requestRegister[intent];
            const assignmentTargets = assignmentRegister[intent];

            for (const targetID in assignmentTargets) {
              for (const assignee in assignmentTargets[targetID]) {
                if ( !intentRequestTargets || !intentRequestTargets[targetID] ||
                     !intentRequestTargets[targetID].hasOwnProperty(assignee) ) {
                       if (currentTime > (assignmentTargets[targetID][assignee] + assignmentExpirationTicks)) {
                         delete assignmentTargets[targetID][assignee];
                       }
                } else {
                  assignmentTargets[targetID][assignee] = currentTime;
                }
              }
              if (!Object.keys(assignmentTargets[targetID]).length) {
                delete assignmentTargets[targetID];
              }
            }
          }

          // allocate new assignments
          for (const intent in requestRegister) {
            const intentRequestTargets = requestRegister[intent];
            const assignmentTargets = assignmentRegister[intent];

            for (const targetID in intentRequestTargets) {
              const target = game.getObjectById(targetID);

              // early exit
              if (!target) { continue; }

              const intentAsignees = Object.values(assignmentTargets).reduce( (x, y) => (Object.assign(x, y)), {} );
              const intentRequesters = Object.values(intentRequestTargets).reduce( (x, y) => (Object.assign(x, y)), {} );
              const intentRequestersTotal = Object.keys(intentRequesters).length;
              const intentRequestTargetsTotal = Object.keys(intentRequestTargets).length;
              const maxCreepsPerSource = Math.min( (intentRequestersTotal / intentRequestTargetsTotal), creepsPerSource );
              const targetRequesters = intentRequestTargets[targetID];
              const targetRequesterNames = Object.keys(targetRequesters);
              const targetRequesterCreeps = targetRequesterNames.map( (x) => (creeps[x]) ).filter( (x) => (!!x) );
              const targetRoomInfo = this.getRoomInfo(target.room.name);
              const maxRampartHits = targetRoomInfo['maxRampartHits'];

              let targetAsignees = {};
              if ( assignmentTargets.hasOwnProperty(targetID) ) {
                targetAsignees = assignmentTargets[targetID];
              }

              let isSufficient;
              let energyNeeded;
              let nearbyRequesters = target.pos.findInRange(targetRequesterCreeps, creepPriorityRange).map( (x) => (x.name) );
              let prioritizedRequesters = targetRequesterNames.filter( (x) => (targetAsignees[x]) );
              prioritizedRequesters = prioritizedRequesters.concat(nearbyRequesters);
              switch(intent) {
                case 'guard':
                  isSufficient = (x) => ( Object.keys(x).length >= creepsPerRampart);
                  break;

                case 'harvest':
                  isSufficient = (x) => ( Object.keys(x).length >= maxCreepsPerSource);
                  break;

                case 'recycle':
                  isSufficient = (x) => ( Object.keys(x).length >= creepsPerResource);
                  break;

                case 'stockpile':
                  // determine needed energy
                  let energy;
                  let energyCapacity;
                  if ( (target.structureType == STRUCTURE_SPAWN) || (target.structureType == STRUCTURE_EXTENSION) ||
                       (target.structureType == STRUCTURE_TOWER) ) {
                    energy = target.energy;
                    energyCapacity = target.energyCapacity;
                  } else if (target.structureType == STRUCTURE_CONTAINER) {
                    energy = target.store[RESOURCE_ENERGY];
                    energyCapacity = target.storeCapacity;
                  }
                  energyNeeded = (energyCapacity - energy);

                  isSufficient = (_, lastAssigned) => {
                    if (lastAssigned) {
                      const lastAssignedCreep = creeps[lastAssigned];
                      const lastAssignedEnergy = lastAssignedCreep ? lastAssignedCreep.carry[RESOURCE_ENERGY] : 0;
                      energyNeeded = energyNeeded - lastAssignedEnergy;
                    }
                    return (energyNeeded <= 0);
                  };
                  break;

                case 'build':
                  // determine needed energy
                  let progress = target.progress;
                  let progressTotal = target.progressTotal;
                  energyNeeded = progressTotal - progress;

                  isSufficient = (_, lastAssigned) => {
                    if (lastAssigned) {
                      const lastAssignedCreep = creeps[lastAssigned];
                      let lastAssignedEnergy = lastAssignedCreep ? lastAssignedCreep.carry[RESOURCE_ENERGY] : 0;
                      lastAssignedEnergy = Math.min(lastAssignedEnergy, BUILD_POWER); // constrain to tick capability
                      energyNeeded = energyNeeded - lastAssignedEnergy;
                    }
                    return (energyNeeded <= 0);
                  };
                  break;
                case 'repair':
                  // determine needed energy
                  let hits = target.hits;
                  let hitsMax = target.hitsMax;
                  if (target.structureType == STRUCTURE_RAMPART) {
                    hitsMax = maxRampartHits;
                  }
                  energyNeeded = ( (hitsMax - hits) / REPAIR_POWER );

                  isSufficient = (_, lastAssigned) => {
                    if (lastAssigned) {
                      const lastAssignedCreep = creeps[lastAssigned];
                      const lastAssignedEnergy = lastAssignedCreep ? lastAssignedCreep.carry[RESOURCE_ENERGY] : 0;
                      energyNeeded = energyNeeded - lastAssignedEnergy;
                    }
                    return (energyNeeded <= 0);
                  };
                  break;
              }

              this.assignTargetRequesters(intentAsignees, targetAsignees, targetRequesters, prioritizedRequesters, isSufficient);

              assignmentTargets[targetID] = targetAsignees;
            }
          }
        },
        conditions: () => {
          return true;
        }
      }
    ];
  }

}

module.exports = ModelCreepManager;
