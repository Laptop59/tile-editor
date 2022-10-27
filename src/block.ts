enum Block {
    BORDER,
    AIR,
    GROUND,
    PLAYER,
    FINISH
}

const blockTable: {[key: string]: Block} = {
    air: Block.AIR,
    border: Block.BORDER,
    ground: Block.GROUND,
    player: Block.PLAYER,
    finish: Block.FINISH
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