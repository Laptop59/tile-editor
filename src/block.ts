enum Block {
    BORDER = 0,
    AIR,
    GROUND,
    PLAYER,
    FINISH,
    LAVA,
    SPRING,
    CHECKPOINT,
    STAR
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
    star: Block.STAR
};

const COLLIDABLE = [
    Block.BORDER,
    Block.GROUND
];

const COLLECTIBLE = [
    Block.STAR
]

export {
    Block as default,
    blockTable,
    COLLIDABLE,
    COLLECTIBLE
};