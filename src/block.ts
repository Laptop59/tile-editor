enum Block {
    BORDER = 0,
    AIR,
    GROUND,
    PLAYER,
    FINISH,
    LAVA,
    SPRING,
    CHECKPOINT
}

const blockTable: {[key: string]: Block} = {
    air: Block.AIR,
    border: Block.BORDER,
    ground: Block.GROUND,
    player: Block.PLAYER,
    finish: Block.FINISH,
    lava: Block.LAVA,
    spring: Block.SPRING,
    checkpoint: Block.CHECKPOINT
};

const COLLIDABLE = [
    Block.BORDER,
    Block.GROUND
];

export {
    Block as default,
    blockTable,
    COLLIDABLE
};