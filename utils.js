/**
 * A bounding box coordinates object.
 * @typedef {Object} BoundingBox
 * @property {number} top The top most point of the bounding box
 * @property {number} left The left most point of the bounding box
 * @property {number} bottom The bottom most point of the bounding box
 * @property {number} right The right most point of the bounding box
 */

/**
 * A position coordinates object from which RoomPosition can be derived.
 * @typedef {Object} Position
 * @property {number} x A coordinate value on the X axis
 * @property {number} y A coordinate value on the Y axis
 */


/**
 * Returns a subset of the objects specified that are near the given position and in accordance with range and filter.
 * @param {RoomObject[]} subjects The objects of interest
 * @param {RoomPosition} pos The point of reference
 * @param {number} range The search radius
 * @param {function} filter A function to further filter the results
 * @returns {RoomObject[]}
 */
function getNearbySubjects(subjects, pos, range, filter=null) {
  switch(true) {
    case (!subjects):
      throw TypeError('Invalid subjects!');
    case (!pos):
      throw TypeError('Invalid position!');
    case (range < 0):
      throw RangeError('Invalid range value!');
  }

  let results = [];
  if (subjects.length) {
    results = pos.findInRange(subjects, range, filter);
  }

  return results;
}

/**
 * Gets the bounding box coordinates that surround a given position.
 * @param {Position} pos The center point of the bounding box
 * @param {Object} roomInfo The information about the room containing the given position
 * @param {number} padding The offset around the center point
 * @returns {BoundingBox}
 */
function getPosBoundingBox(pos, roomInfo, padding=0) {
  if (!pos) {
    throw TypeError('Invalid position!');
  }

  if (!roomInfo) {
    throw TypeError('Invalid roomInfo!');
  }

  if (padding < 0) {
    throw RangeError('Invalid padding!');
  }

  const offset = Math.max(1, padding);
  const boundingBox = {
    top:    Math.max((pos.y - offset), roomInfo['roomTop']),
    left:   Math.max((pos.x - offset), roomInfo['roomLeft']),
    bottom: Math.min((pos.y + offset), roomInfo['roomBottom']),
    right:  Math.min((pos.x + offset), roomInfo['roomRight'])
  };
  return boundingBox;
}

/**
 * Removes the positions inside of a perimeter according to the given coordinates.
 * @param {Position[]} perimeter The positions that make up the perimeter
 * @param {number} top The top most point of the extrusion
 * @param {number} left The left most point of the extrusion
 * @param {number} bottom The bottom most point of the extrusion
 * @param {number} right The right most point of the extrusion
 * @returns {Position[]}
 */
function innerExtrudePerimeter(perimeter, top, left, bottom ,right) {
  switch(true) {
    case (!perimeter):
      throw TypeError('Invalid perimeter!');
    case (top < 0):
      throw RangeError('Invalid top value!');
    case (left < 0):
      throw RangeError('Invalid left value!');
    case (bottom < 0):
      throw RangeError('Invalid bottom value!');
    case (right < 0):
      throw RangeError('Invalid right value!');
  }

  let result = [];
  result = result.concat( perimeter.filter((elt) => (elt.y > top)) );
  result = result.concat( perimeter.filter((elt) => (elt.x < left)) );
  result = result.concat( perimeter.filter((elt) => (elt.y < bottom)) );
  result = result.concat( perimeter.filter((elt) => (elt.x > right)) );
  result = result.map( (x) => (JSON.stringify(x)) );
  result = _.uniq(result).map( (x) => (JSON.parse(x)) );
  return result;
}

/**
 * Returns an array of unique positions.
 * @param {Position[]} subjects The positions that will be deduplicated
 * @returns {Position[]}
 */
function uniqPos(subjects) {
  let uniq = subjects.reduce( (sum, elt) => {sum[`x=${elt.x},y=${elt.y}`] = elt; return sum}, {} );
  uniq = Object.values(uniq);
  return uniq;
}

/**
 * Filters an array of positions according to a filter function that will be passed as first argument each position in a
 * stringified form, e.g.: `x=0,y=0`.
 * @param {Position[]} subjects The positions that will be filtered
 * @param {function} filter The filter function
 * @returns {Position[]}
 */
function filterPosByCoordinates(subjects, filter) {
  const subjectsMap = subjects.reduce( (sum, elt) => {sum[`x=${elt.x},y=${elt.y}`] = elt; return sum}, {} );
  const filtered = [];
  for (const subject in subjectsMap) {
    if (filter(subject)) {
      filtered.push(subjectsMap[subject]);
    }
  }
  return filtered;
}


/**
 * Returns the positions surrounding a given position.
 * @param {Position} pos The center of the perimeter
 * @param {Object} roomInfo The information about the room containing the given position
 * @param {number} padding The thickness of the perimeter
 * @param {boolean} includePadding If only the edges of the perimeter should be returned
 * @returns {Position[]}
 */
function getPosPerimeter(pos, roomInfo, padding=0, includePadding=false) {
  if (!pos) {
    throw TypeError('Invalid position!');
  }

  if (!roomInfo) {
    throw TypeError('Invalid roomInfo!');
  }

  if (padding < 0) {
    throw RangeError('Invalid padding!');
  }

  const roomTop = roomInfo['roomTop'];
  const roomLeft = roomInfo['roomLeft'];
  const roomBottom = roomInfo['roomBottom'];
  const roomRight = roomInfo['roomRight'];

  let perimeter = [
    { y: Math.min( (pos.y + 1), roomBottom ), x: Math.max( (pos.x - 1), roomLeft )  }, // top-left
    { y: Math.min( (pos.y + 1), roomBottom ), x: (pos.x)                            }, // top-center
    { y: Math.min( (pos.y + 1), roomBottom ), x: Math.min( (pos.x + 1), roomRight ) }, // top-right
    { y: (pos.y),                             x: Math.min( (pos.x + 1), roomRight ) }, // middle-right
    { y: Math.max( (pos.y - 1), roomTop ),    x: Math.min( (pos.x + 1), roomRight ) }, // bottom-right
    { y: Math.max( (pos.y - 1), roomTop ),    x: (pos.x)                            }, // bottom-center
    { y: Math.max( (pos.y - 1), roomTop ),    x: Math.max( (pos.x - 1), roomLeft )  }, // bottom-left
    { y: (pos.y),                             x: Math.max( (pos.x - 1), roomLeft )  }  // middle-left
  ];

  if (padding) {
    let paddedPerimeter = [];
    for (const elt of perimeter) {
      paddedPerimeter = paddedPerimeter.concat( getPosPerimeter(elt, roomInfo, (padding-1)) );
    }
    // remove duplicates and center point
    // paddedPerimeter = paddedPerimeter.reduce( (sum, elt) => {sum[`x=${elt.x},y=${elt.y}`] = elt; return sum}, {} );
    // delete paddedPerimeter[`x=${pos.x},y=${pos.y}`];
    // paddedPerimeter = Object.values(paddedPerimeter);
    paddedPerimeter = uniqPos(paddedPerimeter);
    paddedPerimeter = filterPosByCoordinates( paddedPerimeter, ((x) => (x != `x=${pos.x},y=${pos.y}`)) );

    if (!includePadding) {
      const posBB = getPosBoundingBox(pos, roomInfo, padding);
      paddedPerimeter = innerExtrudePerimeter(paddedPerimeter, posBB.top, posBB.left, posBB.bottom, posBB.right);
    }

    perimeter = paddedPerimeter;
  }

  return perimeter;
}

/**
 * Checks if a given position is within the constructable area of the map.
 * @param {RoomPosition} pos The subject position
 * @param {Object} roomInfo The information about the room containing the given position
 * @returns {boolean}
 */
function isPosInBuildArea(pos, roomInfo) {
  if (!pos) {
    throw TypeError('Invalid position!');
  }

  if (!roomInfo) {
    throw TypeError('Invalid roomInfo!');
  }

  const roomTop = roomInfo['roomBuildAreaTop'];
  const roomLeft = roomInfo['roomBuildAreaLeft'];
  const roomBottom = roomInfo['roomBuildAreaBottom'];
  const roomRight = roomInfo['roomBuildAreaRight'];

  return !( (pos.x < roomLeft) || (pos.x > roomRight) || (pos.y < roomTop) || (pos.y > roomBottom) );
}

/**
 * Checks if a given position is a wall tile.
 * @param {RoomPosition} pos The subject position
 * @param {Object} roomInfo The information about the room containing the given position
 * @returns {boolean}
 */
function isPosWall(pos, roomInfo) {
  if (!pos) {
    throw TypeError('Invalid position!');
  }

  if (!roomInfo) {
    throw TypeError('Invalid roomInfo!');
  }

  const room = roomInfo['room'];
  const terrain = room.getTerrain();
  return ( terrain.get(pos.x, pos.y) == TERRAIN_MASK_WALL );
}

/**
 * Checks if a given position is an empty buildable swamp tile.
 * @param {RoomPosition} pos The subject position
 * @param {Object} roomInfo The information about the room containing the given position
 * @returns {boolean}
 */
function isPosSwamp(pos, roomInfo) {
  if (!pos) {
    throw TypeError('Invalid position!');
  }

  if (!roomInfo) {
    throw TypeError('Invalid roomInfo!');
  }

  const room = roomInfo['room'];
  const terrain = room.getTerrain();
  return ( terrain.get(pos.x, pos.y) == TERRAIN_MASK_SWAMP );
}

/**
 * Checks if a given position is or will become a rampart structure.
 * @param {RoomPosition} pos The subject position
 * @param {Object} roomInfo The information about the room containing the given position
 * @returns {boolean}
 */
function isPosRampart(pos, roomInfo) {
  if (!pos) {
    throw TypeError('Invalid position!');
  }

  if (!roomInfo) {
    throw TypeError('Invalid roomInfo!');
  }

  const room = roomInfo['room'];
  const contents = room.lookAt(pos.x, pos.y);
  return contents.some( (x) => {
    if ( ((x.type == 'structure') && (x.structure.structureType == STRUCTURE_RAMPART)) ||
         ((x.type == 'constructionSite') && (x.constructionSite.structureType == STRUCTURE_RAMPART)) ) {
      return true;
    }
  });
}


/**
 * Checks if a given object is walkable.
 * @param {Object} obj The subject object
 * @returns {boolean}
 */
function isObjWalkable(obj) {
  if (!obj) {
    throw TypeError('Invalid object!');
  }

  let result;
  switch (obj) {
    case (obj instanceof Creep):
    case (obj instanceof Tombstone):
    case (obj instanceof StructureRoad):
    case (obj instanceof StructureRampart):
      result = true;
    default:
      result = false;
  }

  return result
}

/**
 * Checks if a given position is a walkable tile.
 * @param {RoomPosition} pos The subject position
 * @param {Object} roomInfo The information about the room containing the given position
 * @returns {boolean}
 */
function isPosWalkable(pos, roomInfo) {
  if (!pos) {
    throw TypeError('Invalid position!');
  }

  if (!roomInfo) {
    throw TypeError('Invalid roomInfo!');
  }

  const room = roomInfo['room'];
  const contents = room.lookAt(pos.x, pos.y);
  const objects = contents.reduce( (sum, x) => {
    if (x.type == 'creep') {
      sum.push(x.creep);
    } else if (x.type == 'structure') {
      sum.push(x.structure);
    } else if (x.type == 'constructionSite') {
      sum.push(x.constructionSite);
    }
    return sum;
  }, []);

  return ( !isPosWall(pos, roomInfo) && objects.every((x) => (isObjWalkable(x))) );
}

/**
 * Checks if a given position is a buildable tile.
 * @param {RoomPosition} pos The subject position
 * @param {Object} roomInfo The information about the room containing the given position
 * @returns {boolean}
 */
function isPosBuildable(pos, roomInfo) {
  if (!pos) {
    throw TypeError('Invalid position!');
  }

  if (!roomInfo) {
    throw TypeError('Invalid roomInfo!');
  }

  const room = roomInfo['room'];
  return ( isPosInBuildArea(pos, roomInfo) && isPosWalkable(pos, roomInfo) );
}

/**
 * Checks if the positions surrounding a given position are all buildable tiles.
 * @param {RoomPosition} pos The center of the perimeter
 * @param {Object} roomInfo The information about the room containing the given position
 * @param {number} padding The thickness of the perimeter
 * @param {boolean} includePadding If only the edges of the perimeter should be checked
 * @returns {boolean}
 */
function isPosPerimeterBuildable(pos, roomInfo, padding=0, includePadding=false) {
  if (!pos) {
    throw TypeError('Invalid position!');
  }

  if (!roomInfo) {
    throw TypeError('Invalid roomInfo!');
  }

  const perimeter = getPosPerimeter(pos, roomInfo, padding, includePadding);
  return perimeter.every( (x) => (isPosBuildable(x, roomInfo)) );
}

/**
 * Returns the thickest buildable perimeter available.
 * @param {RoomPosition} pos The center of the perimeter
 * @param {Object} roomInfo The information about the room containing the given position
 * @param {number} padding The maximum thickness of the perimeter
 * @param {boolean} includePadding If only the edges of the perimeter should be checked
 * @returns {Position[]}
 */
function findPosThickestBuildablePerimeter(pos, roomInfo, padding=0, includePadding=false) {
  if (!pos) {
    throw TypeError('Invalid position!');
  }

  if (!roomInfo) {
    throw TypeError('Invalid roomInfo!');
  }

  let perimeter = null;

  for (let x = padding; x > 0; x--) {
    if (isPosPerimeterBuildable(pos, roomInfo, x, false)) {
      perimeter = getPosPerimeter(pos, roomInfo, x, false);
      break;
    }
  }

  return perimeter;
}

/**
 * Returns a position that is surrounded by a number of empty tiles and is nearest to the offset of a given position.
 * @param {RoomPosition} pos The point of interest
 * @param {Object} roomInfo The information about the room containing the given position
 * @param {number} minDistance The minimum number of tiles between the result and the point of interest
 * @param {number} maxDistance The maximum number of tiles between the result and the point of interest
 * @returns {RoomPosition}
 */
function findPrimeLocation(pos, roomInfo, minDistance, maxDistance) {
  const room = roomInfo['room'];

  switch(true) {
    case (!room):
      throw TypeError('Invalid room!');
    case (!pos):
      throw TypeError('Invalid position!');
    case (minDistance < 0):
      throw RangeError('Invalid minDistance value!');
    case (maxDistance < 0):
      throw RangeError('Invalid maxDistance value!');
  }

  let candidates = getPosPerimeter(pos, roomInfo, (maxDistance - 1), true);
  candidates = candidates.filter( (x) => (isPosBuildable(x, roomInfo) &&
                                          isPosPerimeterBuildable(x, roomInfo, (minDistance - 1), true)) );
  candidates = candidates.map( (x) => (room.getPositionAt(x.x, x.y)) );
  const location = pos.findClosestByPath(candidates);

  return location;
}


module.exports = {
  getNearbySubjects,
  getPosBoundingBox,
  innerExtrudePerimeter,
  getPosPerimeter,
  isPosInBuildArea,
  isPosWall,
  isPosSwamp,
  isPosRampart,
  isObjWalkable,
  isPosWalkable,
  isPosBuildable,
  isPosPerimeterBuildable,
  findPrimeLocation,
  findPosThickestBuildablePerimeter,
  filterPosByCoordinates,
  uniqPos
}
