const mocha = require('mocha');
const chai = require('chai');
var chaiSubset = require('chai-subset');
chai.use(chaiSubset);
const expect = chai.expect;
const util = require('util');

const constants = require('@screeps/common/lib/constants');
Object.assign(global, constants);

// setup mocking
global.DEBUG_MODE = true;
const gameObjects = {};
const gameCreeps = {};
const gameMock = function() {
  this.time = 1;
  this.creeps = gameCreeps;
  this.getObjectById = (x) => (gameObjects[x]);
};
const roomPositionMockResults = new Map();
const roomPositionMock = function() {
  this.x = 25;
  this.y = 25;
  this.roomName = 'sim';
  this.findInRange = (x, y) => ( roomPositionMockResults.has([x, y]) ? roomPositionMockResults.get([x, y]) : [] );
};
const ModelCreepManager = require('../model.manager');
const creepManagerBeliefs = function(beliefs) {
  this.game = new gameMock(),
  this.requestRegister = {},
  this.assignmentRegister = {},
  this.creepsPerSource = 8,
  this.creepsPerResource = 1,
  this.harvestPriorityRange = 5,
  this.recyclePriorityRange = 5,
  this.assignmentExpirationTicks = 5

  // enhance or override defaults
  if ( (typeof beliefs) == 'object' ) {
    Object.assign(this, beliefs);
  }
};

describe('creepManager', function() {

  beforeEach(function() {
    // setup data
    Object.assign(gameObjects, {
      'targetID': {
        pos: new roomPositionMock(),
      }
    });
    Object.assign(gameCreeps, {
      Creepy: {
        carry: {
          [RESOURCE_ENERGY]: 0
        }
      }
    });
  });

  describe('unit tests', function() {

    it('should be able to register and disapprove first request for assignment', function() {
      const manager = new ModelCreepManager(new creepManagerBeliefs());

      const resultRequest = manager.requestAssignment('Creepy', 'targetID', 'harvest');
      expect(resultRequest).to.be.equal(false);

      const resultBeliefs = manager.beliefs;
      expect(resultBeliefs).to.deep.include({
        assignmentRegister: {
          'harvest': {
            'targetID': {}
          }
        },
        requestRegister: {
          'harvest': {
            'targetID': {
              'Creepy': 1
            }
          }
        }
      });
    });

    it('should be able to register and approve sequential request for assignment', function() {
      const manager = new ModelCreepManager(new creepManagerBeliefs({
        currentTime: 2,
        assignmentRegister: {
          'harvest': {
            'targetID': {
              'Creepy': 1
            }
          }
        },
      }));

      const resultRequest = manager.requestAssignment('Creepy', 'targetID', 'harvest');
      expect(resultRequest).to.be.equal(true);

      const resultBeliefs = manager.beliefs;
      expect(resultBeliefs).to.deep.include({
        currentTime: 2,
        assignmentRegister: {
          'harvest': {
            'targetID': {
              'Creepy': 1
            }
          }
        },
        requestRegister: {
          'harvest': {
            'targetID': {
              'Creepy': 2
            }
          }
        }
      });
    });

    it('should be able to allocate assignments favoring prior requests', function() {
      const manager = new ModelCreepManager(new creepManagerBeliefs({
        currentTime: 2,
        assignmentRegister: {
          'harvest': {
            'targetID': {
              'Creepy': 1
            }
          }
        },
        requestRegister: {
          'harvest': {
            'targetID': {
              'Creepy': 2
            }
          }
        }
      }));

      // debugger;
      const resultBeliefs = manager.execute();
      expect(resultBeliefs).to.deep.include({
        currentTime: 2,
        assignmentRegister: {
          'harvest': {
            'targetID': {
              'Creepy': 2
            }
          }
        },
        requestRegister: {
          'harvest': {
            'targetID': {
              'Creepy': 2
            }
          }
        }
      });
    });

    it('should be able to purge prior assignment allocations', function() {
      const manager = new ModelCreepManager(new creepManagerBeliefs({
       currentTime: 7,
       assignmentRegister: {
         'harvest': {
           'targetID': {
             'Creepy': 1
           }
         }
       }
     }));

      const resultBeliefs = manager.execute();
      expect(resultBeliefs).to.deep.include({
        currentTime: 7,
        assignmentRegister: {
          'harvest': {}
        },
        requestRegister: {}
      });
    });

  });

});
