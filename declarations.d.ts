declare module '*.png';
declare module '*.json';
declare module '*.mp3';

/**
 * This is an array of 3 numbers: `[x, y, z]`
 * 
 * This is a three dimensional coordinate: `x` and `y` is from `0` to the `width and height of the tiles respectively minus 3` and `z` being the dimension from `0`
 */
declare type XYZ = [number, number, number];

/**
 * This is a number used for some functions. This can be casted to/from IDs.
 */
declare type Block = number;

/**
 * A string that is the ID of a sound.
 */
declare type Sound = "all_collected" | "checkpoint" | "collect" | "die" | "finish" | "play" | "stuck";

/**
 * Information about a counter.
 */
declare interface CounterInfo {
    /**
     * The colour the filled text will be represented in.
     */
    colour: string,

    /**
     * The colour the tickmark and the outlined text will be represented in.
     */
    dark_colour: string,

    /**
     * If the counter should be shown.
     */
    shown: boolean

    /**
     * Use this if you don't want to use a texture from the counter ID
     */
    icon?: string,

    /**
     * The maximum number of the counter.
     */
    getMax?: (() => number) | number

    /**
     * If the counter should be shown. `isPlaying` is also provided as an argument.
     */
    showCounter?: (isPlaying?: boolean) => boolean
}

/**
 * Entry of a palette
 */
declare interface PaletteEntry {
    /**
     * ID of the block
     */
    id: string,

    /**
     * If the block icon should be outlined with white colour.
     */
    outlined: boolean

    /**
     * If the block should replace an existing number slot from the palette and where.
     */
    replace?: number
}

/**
 * Information about a block
 */
declare interface BlockInfo {
    /**
     * The ID of the block. This will be used for the palette.
     * 
     * A number for this block will be automatically generated.
     */
    id: string,

    /**
     * The save ID of the block. For example: Ground Block → `G`.
     * 
     * When you save a level with this block, this block will use the save ID in the level data.
     * It is required for making levels with this block.
     */
    save: string | number,

    /**
     * All the code for this block.
     */
    code: BlockCode
}

/**
 * Defines all the code for a block.
*/
declare interface BlockCode {
    /**
     * The texture of the block.
     * 
     * If you provide a function instead, `x` and `y` are provided to you as arguments.
     */
    getTexture: string | ((x: number, y: number) => string),

    /**
     * If the block should be collidable directly with the player.
     * 
     * If you provide a function instead, `x` and `y` are provided to you as arguments.
     * 
     * Note: A solid block would have this `true` and a pass-through block would have this `false`.
     */
    isCollidable: boolean | ((x: number, y: number) => boolean)

    /**
     * This function executes when the player touches or collides with this block.
     */
    onCollision?: () => void
}

/**
 * Information about a mod.
 */
declare interface ModInfo {
    /**
     * This defines the palette of the mod.
     */
    palette: (PaletteEntry | null)[],

    /**
     * This defines all the blocks of the mod.
     */
    blocks: BlockInfo[],

    /**
     * This defines all the atlases of the mod.
     */
    atlases: { [key: string]: string },

    /**
     * This defines all the textures of the mod.
     */
    textures: { [key: string]: ModTextureEntry }
}

/**
 * Defines a texture in a mod.
 */
declare interface ModTextureEntry {
    /**
     * The ID of the atlas to use.
     */
    atlas: string,

    /**
     * The left position of the atlas to start from.
     */
    x: number,

    /**
     * The top position of the atlas to start from.
     */
    y: number,

    /**
     * How many pixels the atlas should go through till the right position.
     */
    w: number,

    /**
     * How many pixels the atlas should go through till the bottom position.
     */
    h: number
}

/**
 * An interface for storing player spawn data.
 */
declare interface SpawnInfo {
    /**
     * The spawn position of the player.
     */
    spawn: XYZ,

    /**
     * Reversed gravity when the player touched the checkpoint.
     */
    reversed_gravity: boolean
}

/**
 * The package to interact with the game.
 */
declare interface API {
    /**
     * Force-finishes the level.
     * @since 1.0.0
     */
    finishLevel(): void;

    /**
     * Kills the player to the last checkpoint (or spawn point if none).
     * @since 1.0.0
     */
    killPlayer(): void;

    /**
     * Gets all the positions where this block exists.
     * @param block A block to get all its instances.
     * @since 1.0.0
     */
    tilePositions(block: Block): XYZ[];

    /**
     * Converts a block ID to a `Block`.
     * @param id The block ID to convert to a `Block`.
     * @since 1.0.0
     */
    getBlockFromID(id: string): Block | null;

    /**
     * Converts a `Block` to a block ID.
     * @param id The `Block` to convert to a block ID.
     * @since 1.0.0
     */
    getIDFromBlock(id: Block): string | null;

    /**
     * Collects a tile from a position and increments the current counter from ID and also plays a glass-breaking sound if the counter reaches the max counter from ID.
     * @param position The position of the tile to collect.
     * @param current The ID of the current counter.
     * @param max The ID of the maximum counter.
     * @since 1.0.0
     */
    collectTile(position: XYZ, current?: string, max?: string): void;

    /**
     * Gets the value of the current counter from an ID
     * 
     * Note: To access vanilla counters like hexagons for example, use the singular form.
     * 
     * For example: Hexagon is `hexagon` and Triangle is `triangle`.
     * @since 1.0.0
     */
    getCurrentCounter(id: string): number | null

    /**
     * Gets the value of the maximum counter from an ID
     * 
     * Note: To access vanilla counters like hexagons for example, use the singular form.
     * 
     * For example: Hexagon is `hexagon` and Triangle is `triangle`.
     * @since 1.0.0
     */
    getMaxCounter(id: string): number | null;

    /**
     * Registers a counter of two variables: `current` and `max`.
     * @param id The counter ID
     */
    registerCounter(id: string, info: CounterInfo): void

    /**
     * Get the spawn information of the player.
     * @since 1.0.0
     */
    getSpawnInfo(): SpawnInfo;

    /**
     * Set the spawn information of the player.
     * @param info The new spawn information to replace the old one with.
     * @since 1.0.0
     */
    setSpawnInfo(info: SpawnInfo): void;

    /**
     * Get the current player position.
     * 
     * Note: If the player is exactly on tile `[0, 0]`, `x` and `y` of the returned array will both be 0.
     * @since 1.0.0
     */
    getPlayerPosition(): XYZ;

    /**
     * Set the player position.
     * @param pos The new position of the player.
     * @since 1.0.0
     */
    setPlayerPosition(pos: XYZ): void;

    /**
     * Returns if the gravity is upward for the player.
     * 
     * Note:
     * 
     * - If the gravity is downward, it returns `false`.
     * 
     * - If the gravity is upward, it returns `true`.
     * @since 1.0.0
     */
    getGravity(): boolean;

    /**
     * Set the gravity of the player.
     * @param gravity The gravity will turn upward if this is `true`; otherwise it will be downward.
     * @since 1.0.0
     */
    setGravity(gravity: boolean): void;

    /**
     * Invert the gravity of the player.
     * @since 1.0.0
     */
    invertGravity(): void;

    /**
     * Get the player size of the player.
     * The normal size is `1`.
     * @since 1.0.0
     */
    getPlayerSize(): number

    /**
     * Set the player size of the player.
     * The normal size is `1`.
     * @param size The new size.
     * @since 1.0.0
     */
    setPlayerSize(size: number): void;

    /**
     * Increment (or decrement) a current counter from ID
     * @param id The ID of the counter.
     * @param decrement If the counter should be decremented instead of incremented.
     * @since 1.0.0
     */
    incrementCurrentCounter(id: string, decrement?: boolean): void;

    /**
     * Set a current counter from ID.
     * @param id The ID of the counter.
     * @param value The new value of the counter.
     * @since 1.0.0
     */
    setCurrentCounter(id: string, value: number): void;

    /**
     * Play a sound.
     * @param sound The ID of the sound.
     * @since 1.0.0
     */
    playSound(sound: Sound): void;
}