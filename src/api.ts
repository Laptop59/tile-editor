import Block, { blockTable } from "./block";
import { finishLevel, killPlayer, tilePositions, collectTile as bigCollectTile, getCurrentCounter, getMaxCounter, getSpawnInfo, setSpawnInfo, getPlayerPosition, setPlayerPosition } from "./index";

/*
    This file defines the `API` for mods!
*/

const API = {
    finishLevel,
    killPlayer,
    getBlockFromID,
    getIDFromBlock,
    tilePositions,
    collectTile,
    getCurrentCounter,
    getMaxCounter,
    getSpawnInfo,
    setSpawnInfo,
    getPlayerPosition,
    setPlayerPosition
}

function collectTile(position: XYZ, current?: string, max?: string) {
    current = current || "";
    max = max || "";
    bigCollectTile(position[0], position[1], position[2], current, max);
}

function getBlockFromID(id: string): Block | null {
    const block = blockTable[id];
    return typeof block === "undefined" ? null : block;
}

function getIDFromBlock(block: Block): string | null {
    const id = Object.keys(blockTable).find(o => blockTable[o] == block);
    return typeof id === "undefined" ? null : id;
}

export default API;