enum Block {
    BORDER = 0,
    AIR,
    GROUND,
    PLAYER,
    FINISH,
    LAVA,
    SPRING,
    CHECKPOINT,
    STAR,
    LEFT,
    RIGHT,
    GRAVITY,

    HEXAGON,
    HEXAGON_LOCK,
    HEXAGON_UNLOCK,
    HEXAGON_IN,
    HEXAGON_OUT,
    TRIANGLE,
    TRIANGLE_LOCK,
    TRIANGLE_UNLOCK,
    TRIANGLE_IN,
    TRIANGLE_OUT,
    CIRCLE,
    CIRCLE_LOCK,
    CIRCLE_UNLOCK,
    CIRCLE_IN,
    CIRCLE_OUT,
    SQUARE,
    SQUARE_LOCK,
    SQUARE_UNLOCK,
    SQUARE_IN,
    SQUARE_OUT,
    
    STAR_LOCK,
    STAR_UNLOCK
}

const blockCodes: {[key: string]: string | number} = {
    air: 0,
    border: 'B',
    ground: 'G',
    player: 'P',
    finish: 'F',
    lava: 'L',
    spring: 'S',
    checkpoint: 'C',
    star: '*',
    left: '<',
    right: '>',
    gravity: 'GV',

    hexagon: 'kH',
    hexagon_lock: 'kHl',
    hexagon_unlock: 'kHu',
    hexagon_in: 'kHi',
    hexagon_out: 'kHo',
    
    triangle: 'kT',
    triangle_lock: 'kTl',
    triangle_unlock: 'kTu',
    triangle_in: 'kTi',
    triangle_out: 'kTo',

    circle: 'kC',
    circle_lock: 'kCl',
    circle_unlock: 'kCu',
    circle_in: 'kCi',
    circle_out: 'kCo',
    
    square: 'kS',
    square_lock: 'kSl',
    square_unlock: 'ksu',
    square_in: 'kSi',
    square_out: 'kSo',

    star_lock: 'k*l',
    star_unlock: 'k*u'
}

const blockTable: {[key: string]: Block} = {
    air: Block.AIR,
    border: Block.BORDER,
    ground: Block.GROUND,
    player: Block.PLAYER,
    finish: Block.FINISH,
    lava: Block.LAVA,
    spring: Block.SPRING,
    checkpoint: Block.CHECKPOINT,
    star: Block.STAR,
    left: Block.LEFT,
    right: Block.RIGHT,
    gravity: Block.GRAVITY,

    hexagon: Block.HEXAGON,
    hexagon_lock: Block.HEXAGON_LOCK,
    hexagon_unlock: Block.HEXAGON_UNLOCK,
    hexagon_in: Block.HEXAGON_IN,
    hexagon_out: Block.HEXAGON_OUT,
    triangle: Block.TRIANGLE,
    triangle_lock: Block.TRIANGLE_LOCK,
    triangle_unlock: Block.TRIANGLE_UNLOCK,
    triangle_in: Block.TRIANGLE_IN,
    triangle_out: Block.TRIANGLE_OUT,
    circle: Block.CIRCLE,
    circle_lock: Block.CIRCLE_LOCK,
    circle_unlock: Block.CIRCLE_UNLOCK,
    circle_in: Block.CIRCLE_IN,
    circle_out: Block.CIRCLE_OUT,
    square: Block.SQUARE,
    square_lock: Block.SQUARE_LOCK,
    square_unlock: Block.SQUARE_UNLOCK,
    square_in: Block.SQUARE_IN,
    square_out: Block.SQUARE_OUT,

    star_lock: Block.STAR_LOCK,
    star_unlock: Block.STAR_UNLOCK,
};

const COLLIDABLE = [
    Block.BORDER,
    Block.GROUND,
    Block.GRAVITY,
    
    Block.HEXAGON_LOCK,
    Block.TRIANGLE_LOCK,
    Block.CIRCLE_LOCK,
    Block.SQUARE_LOCK,
    Block.STAR_LOCK
];

const COLLECTIBLE = [
    Block.STAR,
    Block.HEXAGON,
    Block.TRIANGLE,
    Block.CIRCLE,
    Block.SQUARE
];

export {
    Block as default,
    blockTable,
    blockCodes,
    COLLIDABLE,
    COLLECTIBLE
};