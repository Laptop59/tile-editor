import Block, { blockCodes, blockTable } from "./block";

let HELD: { [key: string]: boolean } = {
    left: false,
    up: false,
    right: false
};

/**
 * Edits the HELD object.
 * @param down If the key was pressed down (and not up)
 * @param e The keyboard event.
 */
function handleKey(down: boolean, e: KeyboardEvent) {
    switch (e.key) {
        case "a":
        case "ArrowLeft":
        case "Left":
            HELD.left = down;
            break;
        case "d":
        case "ArrowRight":
        case "Right":
            HELD.right = down;
            break;
        case "w":
        case "ArrowUp":
        case "Up":
        case " ":
        case "Spacebar":
            HELD.up = down;
    }
}

/**
 * Get value of a parameter
 * @param name Parameter name
 * @returns The value as a string.
 */
function getParameter(name: string) {
    const url = new URL(document.location.href);
    return url.searchParams.get(name);
}

/**
 * 
 * @param value The value for checking
 * @param other The replacement value
 * @returns If `value` is `null` or `undefined` (not `0` or `false`) then `other` is returned otherwise `value` is returned.
 */
function or(value: any, other: any): any {
    return (value === null || value === undefined) ? other : value;
}

interface SpawnInfo {
    spawn: [number, number, number],
    reversed_gravity: boolean
}

async function copyToClipboard(content: string) {
    if (!navigator.clipboard) return fallbackCopyToClipboard(content);
    await navigator.clipboard.writeText(content);
}

function fallbackCopyToClipboard(content: string) {
    let elem = document.createElement("textarea");
    elem.value = content;
    elem.id = "clipboard";
    document.body.appendChild(elem);
    elem.focus();
    elem.select();
    document.execCommand("copy");
    document.body.removeChild(elem);
}

function convertToBlockCodes(tiles: Block[][][]): (string | number)[][][] {
    const keys = Object.keys(blockTable);
    let result = tiles.map(D => D.map(Y => Y.map(t => blockCodes[keys.find(key => blockTable[key] === t)])));
    return result.map(D => isEmptyStringDimension(D) ? null : D);
}

function isEmptyStringDimension(dimension: (string | number)[][]): boolean {
    return !dimension.some(Y => Y.some(t => t !== 0));
};

export {
    handleKey, HELD,
    getParameter,
    or,
    SpawnInfo,
    copyToClipboard,
    convertToBlockCodes
}