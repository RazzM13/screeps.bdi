const mocha = require('mocha');
const chai = require('chai');
var chaiSubset = require('chai-subset');
chai.use(chaiSubset);
const expect = chai.expect;
const process = require('process');

const _ = require('lodash');
const fs = require('fs');
const util = require('util');

const { ScreepsServer, TerrainMatrix } = require('screeps-server-mockup');
const server = new ScreepsServer();

const constants = require('@screeps/common/lib/constants');
Object.assign(global, constants);

const modules = {
    'main': fs.readFileSync('main.js', {encoding: 'utf8'}),
    'model.bdi': fs.readFileSync('model.bdi.js', {encoding: 'utf8'}),
    'model.creep': fs.readFileSync('model.creep.js', {encoding: 'utf8'}),
    'model.manager': fs.readFileSync('model.manager.js', {encoding: 'utf8'}),
    'model.tower': fs.readFileSync('model.tower.js', {encoding: 'utf8'}),
    'model.spawn': fs.readFileSync('model.spawn.js', {encoding: 'utf8'}),
    'model.architect': fs.readFileSync('model.architect.js', {encoding: 'utf8'}),
    'model.controller': fs.readFileSync('model.controller.js', {encoding: 'utf8'}),
};


describe('Creep tests', function() {

  before(async function() {
    await server.start();
  });

  after(async function() {
    setTimeout(() => {
      server.stop();
      process.exit();
    }, 500);
  });

  beforeEach(async function() {
    await server.world.reset();     // reset world but add invaders and source keepers users
    await server.world.stubWorld();
    await server.start();
  });

  it('a creep should be able to relax', async function() {
    // setup
    const bot = await server.world.addBot({ username: 'bot', room: 'W0N1', x: 15, y: 15, modules });
    await server.world.addRoomObject('W0N1', 'creep', 16, 16, {
      'body': [
        {
          'hits': 100,
          'type': 'work'
        },
        {
          'hits': 100,
          'type': 'carry'
        },
        {
          'hits': 100,
          'type': 'move'
        }
      ],
      'energy': 0,
      'energyCapacity': 0,
      'fatigue': 0,
      'hits': 100,
      'hitsMax': 100,
      'name': 'Creepy',
      'spawning': false,
      'user': bot.id
    });

    // execute
    await server.tick();

    // check
    const resultNotifications = await bot.notifications;
    expect(resultNotifications).to.have.lengthOf(0);

    const resultRoomObjects = await server.world.roomObjects('W0N1');
    expect(resultRoomObjects).to.containSubset([{
      'name': 'Creepy',
      'actionLog': {
        'say': {
          'message': '🔄 idle'
        }
      }
    }]);
  });

  it('a creep should be able to commit suicide', async function() {
    // setup
    const bot = await server.world.addBot({ username: 'bot', room: 'W0N1', x: 15, y: 15, modules });
    await server.world.addRoomObject('W0N1', 'creep', 16, 16, {
      'body': [
        {
          'hits': 100,
          'type': 'move'
        }
      ],
      'energy': 0,
      'energyCapacity': 0,
      'fatigue': 0,
      'hits': 100,
      'hitsMax': 100,
      'name': 'Creepy',
      'spawning': false,
      'user': bot.id
    });

    // execute
    await server.tick();

    // check
    const resultNotifications = await bot.notifications;
    expect(resultNotifications).to.have.lengthOf(0);

    const resultRoomObjects = await server.world.roomObjects('W0N1');
    expect(resultRoomObjects).to.not.containSubset([{
      'name': 'Creepy'
    }]);
  });

  it('a creep should be able to recycle dropped energy', async function() {
    // setup
    const bot = await server.world.addBot({ username: 'bot', room: 'W0N1', x: 15, y: 15, modules });
    await server.world.addRoomObject('W0N1', 'creep', 16, 16, {
      'body': [
        {
          'hits': 100,
          'type': 'work'
        },
        {
          'hits': 100,
          'type': 'carry'
        },
        {
          'hits': 100,
          'type': 'move'
        }
      ],
      'energy': 0,
      'energyCapacity': 100,
      'fatigue': 100,
      'hits': 100,
      'hitsMax': 100,
      'name': 'Creepy',
      'spawning': false,
      'user': bot.id
    });
    await server.world.addRoomObject('W0N1', 'energy', 17, 17, {
      'energy': 50,
      'amount': 50,
      'resourceType': RESOURCE_ENERGY
    });

    // execute
    await server.tick();

    const resultMemory = JSON.parse((await bot.memory));
    // console.log(util.inspect(resultMemory, false, null));

    await server.tick();

    // check
    const resultNotifications = await bot.notifications;
    // console.log(util.inspect(resultNotifications, false, null));
    expect(resultNotifications).to.have.lengthOf(0);


    const resultMemoryCreeps = JSON.parse((await bot.memory))['creeps'];
    expect(resultMemoryCreeps).to.include.key('Creepy');
    expect(resultMemoryCreeps['Creepy']).to.deep.include({
      'intent': 'recycle'
    });
  });
});
