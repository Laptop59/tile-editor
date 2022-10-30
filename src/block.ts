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

    HEXAGON,
    HEXAGON_LOCK,
    TRIANGLE,
    TRIANGLE_LOCK,
    CIRCLE,
    CIRCLE_LOCK
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

    hexagon: Block.HEXAGON,
    hexagon_lock: Block.HEXAGON_LOCK,
    triangle: Block.TRIANGLE,
    triangle_lock: Block.TRIANGLE_LOCK,
    circle: Block.CIRCLE,
    circle_lock: Block.CIRCLE_LOCK
};

const COLLIDABLE = [
    Block.BORDER,
    Block.GROUND,
    
    Block.HEXAGON_LOCK,
    Block.TRIANGLE_LOCK,
    Block.CIRCLE_LOCK
];

const COLLECTIBLE = [
    Block.STAR,
    Block.HEXAGON,
    Block.TRIANGLE,
    Block.CIRCLE
];

export {
    Block as default,
    blockTable,
    COLLIDABLE,
    COLLECTIBLE
};