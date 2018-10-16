const ModelBDI = require('./model.bdi');
const utils = require('./utils');


/** An intelligent agent that handles architectural design in a Screeps room. */
class ModelArchitect extends ModelBDI {

  constructor(beliefs) {

    const roomInfo = beliefs['roomInfo'];
    const isConstructionFinished = roomInfo ? !(roomInfo['constructionSites'].length) : null;

    const _beliefs = {
      isConstructionFinished,
      'target': null,
      'intent': null,
      'roomInfo': null,
      'threatSafeRange': null,
      'frequentlyWalkedPos': [],
      'structureMinDistance': null,
      'structureMaxDistance': null,
      'lowValuePerimeterInternalRadius': null,
      'highValuePerimeterInternalRadius': null,
      'containersPerSource': null
    };

    Object.assign(_beliefs, beliefs);

    super(_beliefs);
  }

  desires() {
    return [
      {
        title: 'cancelConstructionSites',
        actions: () => {
          for (const site of this.beliefs['target']) {
            site.remove();
          }
        },
        conditions: () => {
          const roomInfo = this.beliefs['roomInfo'];
          const room = roomInfo['room'];
          const threats = roomInfo['threats'];
          const structures = roomInfo['structures'];
          const constructionSites = roomInfo['constructionSites'];
          const threatSafeRange = this.beliefs['threatSafeRange'];

          // early exit
          if ( !constructionSites.length) { return false; }

          // cancel construction in locations that are occupied by threats
          const cancelledSites = [];
          for (const constructionSite of constructionSites) {
            if (constructionSite.pos.findInRange(threats, threatSafeRange).length) {
              cancelledSites.push(constructionSite);
            }
          }

          if (cancelledSites.length) {
            this.beliefs['target'] = cancelledSites;
            this.beliefs['intent'] = 'cancelConstructionSites';
            return true;
          }
        }
      },
      {
        title: 'placeTowerStructures',
        actions: () => {
          const roomInfo = this.beliefs['roomInfo'];
          for (const site of this.beliefs['target']) {
            roomInfo['room'].createConstructionSite(site, STRUCTURE_TOWER);
          }
        },
        conditions: () => {
          const roomInfo = this.beliefs['roomInfo'];
          const room = roomInfo['room'];
          const structures = roomInfo['structures'];
          const constructionSites = roomInfo['constructionSites'];
          const maxTowerStructures = roomInfo['maxTowerStructures'];
          const spawnStructures = structures.filter( (x) => (x.structureType == STRUCTURE_SPAWN) );
          const towerStructures = structures.filter( (x) => (x.structureType == STRUCTURE_TOWER) );
          const towerConstructionSites = constructionSites.filter( (x) => (x.structureType == STRUCTURE_TOWER) );
          const structureMinDistance = this.beliefs['structureMinDistance'];
          const structureMaxDistance = this.beliefs['structureMaxDistance'];

          let totalTowerStructures = towerStructures.length + towerConstructionSites.length;

          // early exit
          if ( (totalTowerStructures >= maxTowerStructures) || !spawnStructures.length) { return false; }

          // find best locations
          const towerSites = [];
          for (const spawnStructure of spawnStructures) {
            const location = utils.findPrimeLocation(spawnStructure.pos, roomInfo, structureMinDistance, structureMaxDistance);
            if (location) {
              towerSites.push(location);
              totalTowerStructures++;
            }
            if (totalTowerStructures >= maxTowerStructures) {
              break;
            }
          }

          if (towerSites.length) {
            this.beliefs['target'] = towerSites;
            this.beliefs['intent'] = 'placeTowerStructures';
            return true;
          }
        }
      },
      // TODO: the strategy for these needs revising
      // {
      //   title: 'placeContainerStructures',
      //   actions: () => {
      //     const roomInfo = this.beliefs['roomInfo'];
      //     for (const site of this.beliefs['target']) {
      //       roomInfo['room'].createConstructionSite(site, STRUCTURE_CONTAINER);
      //     }
      //   },
      //   conditions: () => {
      //     const roomInfo = this.beliefs['roomInfo'];
      //     const room = roomInfo['room'];
      //     const structures = roomInfo['structures'];
      //     const energySources = roomInfo['energySources'];
      //     const constructionSites = roomInfo['constructionSites'];
      //     const containerStructures = roomInfo['energyContainers'];
      //     const containerConstructionSites = constructionSites.filter( (x) => (x.structureType == STRUCTURE_CONTAINER) );
      //     const maxContainerStructures = Math.min( roomInfo['maxContainerStructures'],
      //                                              (this.beliefs['containersPerSource'] * energySources.length) );
      //     const structureMinDistance = this.beliefs['structureMinDistance'];
      //     const structureMaxDistance = this.beliefs['structureMaxDistance'];
      //
      //     let totalContainerStructures = containerStructures.length + containerConstructionSites.length;
      //
      //     // early exit
      //     if ( (totalContainerStructures >= maxContainerStructures) || !energySources.length) { return false; }
      //
      //     // find best locations
      //     const containerSites = [];
      //     for (const energySource of energySources) {
      //       const location = utils.findPrimeLocation(energySource.pos, roomInfo, structureMinDistance, structureMaxDistance);
      //       if (location) {
      //         containerSites.push(location);
      //         totalContainerStructures++;
      //       }
      //       if (totalContainerStructures >= maxContainerStructures) {
      //         break;
      //       }
      //     }
      //
      //     if (containerSites.length) {
      //       this.beliefs['target'] = containerSites;
      //       this.beliefs['intent'] = 'placeContainerStructures';
      //       return true;
      //     }
      //   }
      // },
      {
        title: 'placeExtensionStructures',
        actions: () => {
          const roomInfo = this.beliefs['roomInfo'];
          for (const site of this.beliefs['target']) {
            roomInfo['room'].createConstructionSite(site, STRUCTURE_EXTENSION);
          }
        },
        conditions: () => {
          const roomInfo = this.beliefs['roomInfo'];
          const room = roomInfo['room'];
          const structures = roomInfo['structures'];
          const energySources = roomInfo['energySources'];
          const constructionSites = roomInfo['constructionSites'];
          const maxExtensionStructures = roomInfo['maxExtensionStructures'];
          const extensionStructures = structures.filter( (x) => (x.structureType == STRUCTURE_EXTENSION) );
          const extensionConstructionSites = constructionSites.filter( (x) => (x.structureType == STRUCTURE_EXTENSION) );
          const structureMinDistance = this.beliefs['structureMinDistance'];
          const structureMaxDistance = this.beliefs['structureMaxDistance'];
          const isConstructionFinished = this.beliefs['isConstructionFinished'];

          let totalExtensionStructures = extensionStructures.length + extensionConstructionSites.length;

          // early exit
          if ( !isConstructionFinished || (totalExtensionStructures >= maxExtensionStructures) ||
               !energySources.length) { return false; }

          // find best locations
          const extensionSites = [];
          for (const energySource of energySources) {
            const location = utils.findPrimeLocation(energySource.pos, roomInfo, structureMinDistance, structureMaxDistance);
            if (location) {
              extensionSites.push(location);
              totalExtensionStructures++;
            }
            if (totalExtensionStructures >= maxExtensionStructures) {
              break;
            }
          }

          if (extensionSites.length) {
            this.beliefs['target'] = extensionSites;
            this.beliefs['intent'] = 'placeExtensionStructures';
            return true;
          }
        }
      },
      {
        title: 'placeRampartStructures',
        actions: () => {
          const roomInfo = this.beliefs['roomInfo'];
          for (const site of this.beliefs['target']) {
            roomInfo['room'].createConstructionSite(site, STRUCTURE_RAMPART);
          }
        },
        conditions: () => {
          const roomInfo = this.beliefs['roomInfo'];
          const room = roomInfo['room'];
          const structures = roomInfo['structures'];
          const lowValueStructures = roomInfo['lowValueStructures'];
          const highValueStructures = roomInfo['highValueStructures'];
          const energySources = roomInfo['energySources'];
          const constructionSites = roomInfo['constructionSites'];
          const maxRampartStructures = roomInfo['maxRampartStructures'];
          const isConstructionFinished = this.beliefs['isConstructionFinished'];
          const lowValuePerimeterInternalRadius = this.beliefs['lowValuePerimeterInternalRadius'];
          const highValuePerimeterInternalRadius = this.beliefs['highValuePerimeterInternalRadius'];
          const lowValueRampartThickness = Math.max( (lowValuePerimeterInternalRadius - 1), 0 );
          const highValueRampartThickness = Math.max( (highValuePerimeterInternalRadius - 1), 0 );
          const rampartStructures = structures.filter( (x) => (x.structureType == STRUCTURE_RAMPART) );
          const rampartConstructionSites = constructionSites.filter( (x) => (x.structureType == STRUCTURE_RAMPART) );

          let totalRampartStructures = rampartStructures.length + rampartConstructionSites.length;

          // early exit
          if ( !isConstructionFinished || (totalRampartStructures >= maxRampartStructures) ) { return false; }

          // find best locations
          let rampartSites = [];

          // around high-value structures
          for (const structure of highValueStructures) {
            // ignore ramparts
            if (structure.structureType == STRUCTURE_RAMPART) { continue; }

            const perimeter = utils.getPosPerimeter(structure.pos, roomInfo, highValueRampartThickness, true);
            if (perimeter) {
              rampartSites = rampartSites.concat(perimeter, [structure.pos]);
            }
          }

          // around low-value structures
          for (const structure of lowValueStructures) {
            // ignore ramparts
            if (structure.structureType == STRUCTURE_RAMPART) { continue; }

            const perimeter = utils.getPosPerimeter(structure.pos, roomInfo, lowValueRampartThickness, true);
            if (perimeter) {
              rampartSites = rampartSites.concat(perimeter, [structure.pos]);
            }
          }

          // around energy sources
          for (const energySource of energySources) {
            const perimeter = utils.getPosPerimeter(energySource.pos, roomInfo, lowValueRampartThickness, true);
            if (perimeter) {
              rampartSites = rampartSites.concat(perimeter);
            }
          }

          // remove duplicates and existing construction sites
          rampartSites = utils.uniqPos(rampartSites);
          rampartSites = rampartSites.filter( (x) => (utils.isPosBuildable(x, roomInfo) && !utils.isPosRampart(x, roomInfo)) );

          // ensure we don't exceed limits
          const rampartSitesLimit = Math.max(Math.min((maxRampartStructures - totalRampartStructures), MAX_CONSTRUCTION_SITES), 0);
          rampartSites = rampartSites.slice(0,  rampartSitesLimit);

          // normalize room positions
          rampartSites = rampartSites.map( (x) => (room.getPositionAt(x.x, x.y)) );

          if (rampartSites.length) {
            this.beliefs['target'] = rampartSites;
            this.beliefs['intent'] = 'placeRampartStructures';
            return true;
          }
        }
      },
      {
        title: 'placeRoadStructures',
        actions: () => {
          const roomInfo = this.beliefs['roomInfo'];
          for (const site of this.beliefs['target']) {
            roomInfo['room'].createConstructionSite(site, STRUCTURE_ROAD);
          }
        },
        conditions: () => {
          const roomInfo = this.beliefs['roomInfo'];
          const room = roomInfo['room'];
          const energySources = roomInfo['energySources'];
          const frequentlyWalkedPos = this.beliefs['frequentlyWalkedPos'];
          const isConstructionFinished = this.beliefs['isConstructionFinished'];

          // early exit
          if (!isConstructionFinished || !frequentlyWalkedPos.length) { return false; }

          // TODO: reconsideration, this has seriously high cost ...
          // place roads to enable access around energy sources
          // let energySourceSites = energySources.map( (x) => (this.getPosPerimeter(x.pos, 1, true)) );
          // energySourceSites = energySourceSites.reduce( (x, y) => (x.concat(y)), [] );
          // energySourceSites = energySourceSites.map( (x) => (room.getPositionAt(x.x, x.y)) );
          // energySourceSites = energySourceSites.filter( (x) => (this.isPosWall(x, x.look())) );

          // place roads on frequently walked swamps
          const frequentlyWalkedPosSites = frequentlyWalkedPos.filter( (x) => (utils.isPosSwamp(x, roomInfo) &&
                                                                               utils.isPosBuildable(x, roomInfo)) );

          // const roadSites = energySourceSites.concat(frequentlyWalkedPosSites);
          let roadSites = frequentlyWalkedPosSites;
          const roadSitesLimit = Math.min(roadSites.length, MAX_CONSTRUCTION_SITES);
          roadSites = roadSites.slice(0, roadSitesLimit);
          if (roadSites.length) {
            this.beliefs['target'] = roadSites;
            this.beliefs['intent'] = 'placeRoadStructures';
            return true;
          }
        }
      }
    ];
  }

}

module.exports = ModelArchitect;
