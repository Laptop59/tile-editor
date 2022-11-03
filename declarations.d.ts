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
 * An interface for storing player spawn data.
 */
declare interface SpawnInfo {
    spawn: XYZ,
    reversed_gravity: boolean
}

/**
 * The package to interact with the game.
 */
declare namespace API {
    /**
     * Force-finishes the level.
     * @since 1.0.0
     */
    function finishLevel(): void;

    /**
     * Kills the player to the last checkpoint (or spawn point if none).
     * @since 1.0.0
     */
    function killPlayer(): void;

    /**
     * Gets all the positions where this block exists.
     * @param block A block to get all its instances.
     * @since 1.0.0
     */
    function tilePositions(block: Block): XYZ[];

    /**
     * Converts a block ID to a `Block`.
     * @param id The block ID to convert to a `Block`.
     * @since 1.0.0
     */
    function getBlockFromID(id: string): Block | null;

    /**
     * Converts a `Block` to a block ID.
     * @param id The `Block` to convert to a block ID.
     * @since 1.0.0
     */
    function getIDFromBlock(id: Block): string | null;

    /**
     * Collects a tile from a position and increments the current counter from ID and also plays a glass-breaking sound if the counter reaches the max counter from ID.
     * @param position The position of the tile to collect.
     * @param current The ID of the current counter.
     * @param max The ID of the maximum counter.
     * @since 1.0.0
     */
    function collectTile(position: XYZ, current?: string, max?: string): void;

    /**
     * Gets the value of the current counter from an ID
     * 
     * Note: To access vanilla counters like hexagons for example, use the singular form.
     * 
     * For example: Hexagon is `hexagon` and Triangle is `triangle`.
     * @since 1.0.0
     */
    function getCurrentCounter(id: string): number | null

    /**
     * Gets the value of the maximum counter from an ID
     * 
     * Note: To access vanilla counters like hexagons for example, use the singular form.
     * 
     * For example: Hexagon is `hexagon` and Triangle is `triangle`.
     * @since 1.0.0
     */
    function getMaxCounter(id: string): number | null;

    /**
     * Get the spawn information of the player.
     * @since 1.0.0
     */
    function getSpawnInfo(): SpawnInfo;
    
    /**
     * Set the spawn information of the player.
     * @param info The new spawn information to replace the old one with.
     * @since 1.0.0
     */
    function setSpawnInfo(info: SpawnInfo): void;
    
    /**
     * Get the current player position.
     * 
     * Note: If the player is exactly on tile `[0, 0]`, `x` and `y` of the returned array will both be 0.
     * @since 1.0.0
     */
    function getPlayerPosition(): XYZ;
    
    /**
     * Set the player position.
     * @param pos The new position of the player.
     * @since 1.0.0
     */
    function setPlayerPosition(pos: XYZ): void;
}