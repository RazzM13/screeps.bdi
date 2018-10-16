const utils = require('./utils');

const ModelCreepManager = require('./model.manager');
const ModelController = require('./model.controller');
const ModelArchitect = require('./model.architect');
const ModelTower = require('./model.tower');
const ModelSpawn = require('./model.spawn');
const ModelCreep = require('./model.creep');

global.DEBUG_MODE = true;

const ROOM_TOP = 0;
const ROOM_LEFT = 0;
const ROOM_BOTTOM = 49;
const ROOM_RIGHT = 49;
const ROOM_CENTER = 24;
const ROOM_BUILD_AREA_TOP = 2;
const ROOM_BUILD_AREA_LEFT = 2;
const ROOM_BUILD_AREA_BOTTOM = 47;
const ROOM_BUILD_AREA_RIGHT = 47;

const CREEPS_PER_SOURCE = 8;
const CREEPS_PER_RAMPART = 1;
const CREEPS_PER_RESOURCE = 1;
const THREAT_SAFE_RANGE = 4;
const COLLISION_AVOIDANCE_RANGE = 2;
const STRUCTURE_MIN_DISTANCE = 1;
const STRUCTURE_MAX_DISTANCE = 5;
const HIGHVALUE_STRUCTURE_TYPES = [STRUCTURE_CONTROLLER, STRUCTURE_SPAWN, STRUCTURE_TOWER];
const HIGHVALUE_PERIMETER_EXTERNAL_RADIUS = 6;
const HIGHVALUE_PERIMETER_INTERNAL_RADIUS = 3;
const LOWVALUE_PERIMETER_EXTERNAL_RADIUS = 2;
const LOWVALUE_PERIMETER_INTERNAL_RADIUS = 1;
const STRUCTURE_RAMPART_HITS_ATTACK_RATIO = 1;
const ARCHITECT_RUN_INTERVAL = 100;
const ARCHITECT_ROAD_EFFICIENCY_RATIO = 0.3;
const ARCHITECT_CONTAINERS_PER_SOURCE = 1;
const MANAGER_RUN_INTERVAL = 5;
const MANAGER_CREEP_PRIORITY_RANGE = 5;
const CONTROLLER_DOWNGRADE_SAFETY_THRESHOLD = 4000;
const MEMORY_PURGE_INTERVAL = 1500;

const cachedRoomInfo = {};


/**
 * Returns beliefs that are pertinent to the given room.
 * @param {string} name The name of the room
 * @returns {Object}
 */
function getRoomInfo(name) {
  if (!name) {
    throw TypeError('Invalid name!');
  }

  const currentTime = Game.time;

  // retrieve from cache
  if ( cachedRoomInfo.hasOwnProperty(name) && (cachedRoomInfo[name]['currentTime'] == currentTime) ) {
    return cachedRoomInfo[name];
  }

  const room = Game.rooms[name];
  if (!room) {
    throw TypeError('Room does not exist!');
  }

  const creeps = room.find(FIND_MY_CREEPS);
  const workers = creeps.filter( x => (x.getActiveBodyparts(WORK) && x.getActiveBodyparts(CARRY)) );
  const fighters = creeps.filter( x => (x.getActiveBodyparts(ATTACK) || x.getActiveBodyparts(RANGED_ATTACK)) );
  const enemies = room.find(FIND_HOSTILE_CREEPS);
  const threats = enemies.filter( x => (x.getActiveBodyparts(ATTACK) || x.getActiveBodyparts(RANGED_ATTACK)) );
  const structures = room.find(FIND_MY_STRUCTURES);
  const highValueStructures = structures.filter( x => !!~(HIGHVALUE_STRUCTURE_TYPES.indexOf(x.structureType)) );
  const lowValueStructures = structures.filter( x => !~(HIGHVALUE_STRUCTURE_TYPES.indexOf(x.structureType)) );
  const towers = structures.filter( x => (x.structureType == STRUCTURE_TOWER) );
  const ramparts = structures.filter( x => (x.structureType == STRUCTURE_RAMPART) );
  const energyStores = structures.filter( x => ((x.structureType == STRUCTURE_SPAWN) ||
                                                (x.structureType == STRUCTURE_EXTENSION)) );
  const energySources = room.find(FIND_SOURCES_ACTIVE, {
    filter: (x) => ( !utils.getNearbySubjects(threats, x.pos, THREAT_SAFE_RANGE).length )
  });
  const energyContainers = room.find(FIND_STRUCTURES, {
    filter: (x) => (x instanceof StructureContainer)
  });
  const droppedEnergy = room.find(FIND_DROPPED_RESOURCES, {
    filter: (x) => ( x.resourceType == RESOURCE_ENERGY && !utils.getNearbySubjects(threats, x.pos, THREAT_SAFE_RANGE).length )
  });
  const tombstones = room.find(FIND_TOMBSTONES, {
    filter: (x) => ( x.store[RESOURCE_ENERGY] && !utils.getNearbySubjects(threats, x.pos, THREAT_SAFE_RANGE).length )
  });
  const controller = room.controller ? room.controller : null;
  const RCL = controller ? controller.level : 0;
  const maxExtensionStructures = controller ? CONTROLLER_STRUCTURES['extension'][RCL] : 0;
  const maxContainerStructures = controller ? CONTROLLER_STRUCTURES['container'][RCL] : 0;
  const maxTowerStructures = controller ? CONTROLLER_STRUCTURES['tower'][RCL] : 0;
  const maxRampartStructures = controller ? CONTROLLER_STRUCTURES['rampart'][RCL] : 0;
  const maxEnergyPotential = SPAWN_ENERGY_CAPACITY + (maxExtensionStructures * EXTENSION_ENERGY_CAPACITY[RCL]);
  const maxAttackPotential = Math.ceil(maxEnergyPotential / BODYPART_COST[ATTACK]) * ATTACK_POWER;
  const maxRampartHits = maxAttackPotential * STRUCTURE_RAMPART_HITS_ATTACK_RATIO;
  const damagedStructures = structures.filter( x => ((x.hits < x.hitsMax) && ((x.structureType == STRUCTURE_RAMPART) &&
                                                     (x.hits < maxRampartHits))) );

  // enemies in perimeters
  let enemiesInInternalPerimeters = [];
  let enemiesInExternalPerimeters = [];

  // determine enemies in perimeters for high value structures
  for (const perimeterizedStructure of highValueStructures) {
    let externalEnemies = utils.getNearbySubjects(enemies, perimeterizedStructure.pos, HIGHVALUE_PERIMETER_EXTERNAL_RADIUS);
    let internalEnemies = utils.getNearbySubjects(externalEnemies, perimeterizedStructure.pos, HIGHVALUE_PERIMETER_INTERNAL_RADIUS);
    externalEnemies = externalEnemies.filter( (x) => (!~internalEnemies.indexOf(x)) );
    enemiesInInternalPerimeters = enemiesInInternalPerimeters.concat(internalEnemies);
    enemiesInExternalPerimeters = enemiesInExternalPerimeters.concat(externalEnemies);
  }

  // determine enemies in perimeters for low value structures
  for (const perimeterizedStructure of highValueStructures) {
    // ignore ramparts
    if (perimeterizedStructure.structureType == STRUCTURE_RAMPART) { continue; }

    let externalEnemies = utils.getNearbySubjects(enemies, perimeterizedStructure.pos, LOWVALUE_PERIMETER_EXTERNAL_RADIUS);
    let internalEnemies = utils.getNearbySubjects(externalEnemies, perimeterizedStructure.pos, LOWVALUE_PERIMETER_INTERNAL_RADIUS);
    externalEnemies = externalEnemies.filter( (x) => (!~internalEnemies.indexOf(x)) );
    enemiesInInternalPerimeters = enemiesInInternalPerimeters.concat(internalEnemies);
    enemiesInExternalPerimeters = enemiesInExternalPerimeters.concat(externalEnemies);
  }

  // deduplicate
  enemiesInInternalPerimeters = Array.from( new Set(enemiesInInternalPerimeters) );
  enemiesInExternalPerimeters = Array.from( new Set(enemiesInExternalPerimeters) );

  const threatsInInternalPerimeters = enemiesInInternalPerimeters.filter( x => (x.getActiveBodyparts(ATTACK) ||
                                                                                x.getActiveBodyparts(RANGED_ATTACK)) );
  const threatsInExternalPerimeters = enemiesInExternalPerimeters.filter( x => (x.getActiveBodyparts(ATTACK) ||
                                                                                x.getActiveBodyparts(RANGED_ATTACK)) );
  const enemiesInPerimeters = enemiesInInternalPerimeters.concat(enemiesInExternalPerimeters);
  const threatsInPerimeters = threatsInInternalPerimeters.concat(threatsInExternalPerimeters);

  // assemble info object
  const info = {
    currentTime,
    room,
    creeps,
    workers,
    fighters,
    enemies,
    threats,
    structures,
    highValueStructures,
    lowValueStructures,
    damagedStructures,
    towers,
    ramparts,
    energyStores,
    energySources,
    energyContainers,
    droppedEnergy,
    tombstones,
    enemiesInPerimeters,
    enemiesInInternalPerimeters,
    enemiesInExternalPerimeters,
    threatsInPerimeters,
    threatsInInternalPerimeters,
    threatsInExternalPerimeters,
    maxExtensionStructures,
    maxContainerStructures,
    maxTowerStructures,
    maxRampartStructures,
    maxEnergyPotential,
    maxAttackPotential,
    maxRampartHits,
    roomTop: ROOM_TOP,
    roomLeft: ROOM_LEFT,
    roomBottom: ROOM_BOTTOM,
    roomRight: ROOM_RIGHT,
    roomCenter: ROOM_CENTER,
    roomBuildAreaTop: ROOM_BUILD_AREA_TOP,
    roomBuildAreaLeft: ROOM_BUILD_AREA_LEFT,
    roomBuildAreaBottom: ROOM_BUILD_AREA_BOTTOM,
    roomBuildAreaRight: ROOM_BUILD_AREA_RIGHT,
    energyAvailable: room.energyAvailable,
    energyCapacityAvailable: room.energyCapacityAvailable,
    constructionSites: room.find(FIND_MY_CONSTRUCTION_SITES)
  };

  // cache info for later use
  cachedRoomInfo[name] = info;

  return info;
}


module.exports.loop = function () {
  const controllers = new Map( Object.entries(Game.structures).filter((x) => (x[1].structureType == STRUCTURE_CONTROLLER)) );
  const towers = new Map( Object.entries(Game.structures).filter((x) => (x[1].structureType == STRUCTURE_TOWER)) );
  const spawns = new Map( Object.entries(Game.spawns) );
  const creeps = new Map( Object.entries(Game.creeps) );
  const rooms  = new Map( Object.entries(Game.rooms) );

  let requestRegister = Memory.requestRegister;
  if (!requestRegister) {
    requestRegister = {};
  }

  let assignmentRegister = Memory.assignmentRegister;
  if (!assignmentRegister) {
    assignmentRegister = {};
  }

  let frequentlyWalkedPos = Memory.frequentlyWalkedPos;
  if (!frequentlyWalkedPos) {
    frequentlyWalkedPos = {};
  }

  if (Game.time % MEMORY_PURGE_INTERVAL == 0) {
    const creepNamesInMemory = Object.keys(Memory.creeps);
    for (const creepName of creepNamesInMemory) {
      if (!Game.creeps[creepName]) {
        delete Memory.creeps[creepName];
      }
    }
  }

  // architect logic, should run each 100 ticks
  if (Game.time % ARCHITECT_RUN_INTERVAL == 0) {
    for( const controller of controllers.values() ) {
      const room = controller.room;
      const roomName = room.name;
      const roomInfo = getRoomInfo(roomName);

      // filter out unpopular positions
      frequentlyWalkedPos = Object.entries(frequentlyWalkedPos).reduce( (sum, x) => {
        if ( x[1] >= (ARCHITECT_RUN_INTERVAL * ARCHITECT_ROAD_EFFICIENCY_RATIO) ) {
          sum.push(x[0]);
        }
        return sum;
      }, []);

      // deserialize and normalize
      frequentlyWalkedPos = frequentlyWalkedPos.map( (x) => (JSON.parse(x)) );
      frequentlyWalkedPos = frequentlyWalkedPos.map( (x) => (room.getPositionAt(x.x, x.y)) );


      let beliefs = {
        roomInfo,
        frequentlyWalkedPos,
        'threatSafeRange': THREAT_SAFE_RANGE,
        'structureMinDistance': STRUCTURE_MIN_DISTANCE,
        'structureMaxDistance': STRUCTURE_MAX_DISTANCE,
        'lowValuePerimeterInternalRadius': LOWVALUE_PERIMETER_INTERNAL_RADIUS,
        'highValuePerimeterInternalRadius': HIGHVALUE_PERIMETER_INTERNAL_RADIUS,
        'containersPerSource': ARCHITECT_CONTAINERS_PER_SOURCE
      };
      beliefs = (new ModelArchitect(beliefs)).execute();

      if (beliefs['intent']) {
        console.log('Architect', beliefs['intent'], beliefs['target']);
      }

      // reset
      frequentlyWalkedPos = {};
    }
  }

  // creep manager logic, should run each 5 ticks
  let beliefs = {
    requestRegister,
    assignmentRegister,
    'game': Game,
    'creepsPerSource': CREEPS_PER_SOURCE,
    'creepsPerRampart': CREEPS_PER_RAMPART,
    'creepsPerResource': CREEPS_PER_RESOURCE,
    'creepPriorityRange': MANAGER_CREEP_PRIORITY_RANGE,
    'assignmentExpirationTicks': MANAGER_RUN_INTERVAL
  };
  const creepManager = new ModelCreepManager(beliefs, {getRoomInfo});

  if (Game.time % MANAGER_RUN_INTERVAL == 0) {
    beliefs = creepManager.execute();
    Memory.requestRegister = requestRegister = {}; // clear previous requests
  }
  // testing purposes
  // Memory.creepManager = creepManager.beliefs;

  // controller logic
  for( const controller of controllers.values() ) {
    const roomName = controller.room.name;
    const roomInfo = getRoomInfo(roomName);

    let beliefs = {
      'agent': controller,
      'roomInfo': roomInfo
    };
    beliefs = (new ModelController(beliefs)).execute();

    if (beliefs['intent']) {
      console.log(beliefs['agent'].name ? beliefs['agent'].name : beliefs['agent'].id, beliefs['intent'], beliefs['target']);
    }
  }

  // tower logic
  for( const name of towers.keys() ) {
    const tower = towers.get(name);
    const roomName = tower.room.name;
    const roomInfo = getRoomInfo(roomName);

    let beliefs = {
      'agent': tower,
      'creepsInRange': utils.getNearbySubjects(roomInfo['creeps'], tower.pos, TOWER_FALLOFF_RANGE),
      'fightersInRange': utils.getNearbySubjects(roomInfo['fighters'], tower.pos, TOWER_FALLOFF_RANGE),
      'enemiesInRange': utils.getNearbySubjects(roomInfo['enemies'], tower.pos, TOWER_FALLOFF_RANGE),
      'threatsInRange': utils.getNearbySubjects(roomInfo['threats'], tower.pos, TOWER_FALLOFF_RANGE),
      'damagedStructuresInRange': utils.getNearbySubjects(roomInfo['damagedStructures'], tower.pos, TOWER_FALLOFF_RANGE)
    };
    beliefs = (new ModelTower(beliefs)).execute();

    if (beliefs['intent']) {
      console.log(beliefs['agent'].name ? beliefs['agent'].name : beliefs['agent'].id, beliefs['intent'], beliefs['target']);
    }
  }

  // spawn logic
  for( const name of spawns.keys() ) {
    const spawn = spawns.get(name);
    const roomName = spawn.room.name;
    const roomInfo = getRoomInfo(roomName);

    let beliefs = {
      'agent': spawn,
      'roomInfo': roomInfo,
      'maxWorkers': (roomInfo['energySources'].length * CREEPS_PER_SOURCE)
    };
    beliefs = (new ModelSpawn(beliefs)).execute();

    if (beliefs['intent']) {
      console.log(beliefs['agent'].name ? beliefs['agent'].name : beliefs['agent'].id, beliefs['intent'], beliefs['target']);
    }
  }

  // creep logic
  for( const name of creeps.keys() ) {
    const creep = creeps.get(name);
    const roomName = creep.room.name;
    const roomInfo = getRoomInfo(roomName);

    let beliefs = {
      creepManager,
      'agent': creep,
      'roomInfo': roomInfo,
      'spawnRoom': creep.memory['spawnRoom'],
      'nearbyCreeps': utils.getNearbySubjects(roomInfo['creeps'], creep.pos, COLLISION_AVOIDANCE_RANGE),
      'nearbyThreats': utils.getNearbySubjects(roomInfo['threats'], creep.pos, THREAT_SAFE_RANGE),
      'nearbySourceEnergy': utils.getNearbySubjects(roomInfo['energySources'], creep.pos, 1),
      'hasEnergyFromContainer': creep.memory['hasEnergyFromContainer'],
      'controllerDowngradeSafetyThreshold': CONTROLLER_DOWNGRADE_SAFETY_THRESHOLD
    };
    beliefs = (new ModelCreep(beliefs)).execute();

    // remember useful information
    creep.memory['hasEnergyFromContainer'] = beliefs['hasEnergyFromContainer'];

    // testing purposes
    creep.memory['intent'] = beliefs['intent'];
    creep.memory['target'] = beliefs['target'] ? beliefs['target'].id : null;


    if (beliefs['intent']) {
      // console.log(beliefs['agent'].name ? beliefs['agent'].name : beliefs['agent'].id, beliefs['intent'], beliefs['target']);
    }

    // update frequently walked positions
    const posID = JSON.stringify(creep.pos);
    const posFreq = frequentlyWalkedPos[posID] ?  frequentlyWalkedPos[posID] : 0;
    frequentlyWalkedPos[posID] = (posFreq + 1);
  }

  // persist for future use
  Memory.requestRegister = requestRegister;
  Memory.assignmentRegister = assignmentRegister;
  Memory.frequentlyWalkedPos = frequentlyWalkedPos;
}
