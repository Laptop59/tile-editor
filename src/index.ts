import "./style.css";
import textures from "./textures.png";
import expandableTextures from "./expandable.png";
import textureAtlas, { extraTextureEntry, expandableAtlas } from "./atlas";
import Block, { blockTable as BlockTable, blockCodes as BlockCodes, COLLECTIBLE, COLLIDABLE } from "./block";
import { default as Palette, onlyOnce } from "./palette";
let palette = Palette;

// Sounds
import SOUND_PLAY from "./audio/play.mp3";
import SOUND_DIE from "./audio/die.mp3";
import SOUND_FINISH from "./audio/finish.mp3";
import SOUND_STUCK from "./audio/stuck.mp3";
import SOUND_ALL_COLLECTED from "./audio/all_collected.mp3";
import SOUND_CHECKPOINT from "./audio/checkpoint.mp3";
import SOUND_COLLECT from "./audio/collect.mp3";

// Util
import {handleKey, HELD, getParameter, or, copyToClipboard, convertToBlockCodes, Level} from "./util";
import loadMods, { BlockCode } from "./mods";

let blockTable = BlockTable;
let blockCodes = BlockCodes;

// Constants
const WIDTH: number = 1280;
const HEIGHT: number = 720;
const ASPECT_RATIO: number = WIDTH / HEIGHT;
const EMBED = getParameter("embed") != undefined;
const STARTNOW = getParameter("start") != undefined;
const TOOLBOX_WIDTH: number = EMBED ? 0 : 288;
const AUTOLOAD = getParameter("level");
let TILES_WIDTH: number = Math.max(+or(getParameter("width"), 22), 3);
let TILES_HEIGHT: number = Math.max(+or(getParameter("height"), 16), 3);
let TILE_OFFSET: [number, number];
let SIDE_LENGTH = getNewTileSide();
const ICON_SIDE = 52;
const SLOT_R = 42;
const SLOTS_PER_PAGE = 8;
const [LOCK_WIDTH, LOCK_HEIGHT] = [67, 100]
let DIMENSIONS = Math.max(+getParameter("dimensions") || 4, 1);
const MAX_COLLIDES = 1000;
const TOUCH_FRAC = 60 / 64;
const MINI_NUM = 0.0000001;
let FRICTION = +or(getParameter("friction"), 0.025);
const SOUNDS: { [key: string]: string } = {
    play: SOUND_PLAY,
    die: SOUND_DIE,
    finish: SOUND_FINISH,
    stuck: SOUND_STUCK,
    all_collected: SOUND_ALL_COLLECTED,
    checkpoint: SOUND_CHECKPOINT,
    collect: SOUND_COLLECT
};
let ELEM_SOUNDS: { [key: string]: HTMLAudioElement } = {};

let PLAYER_SIZE = +or(getParameter("size"), 1);
let justPause = false;

// Physics are run at 600 FPS!
const GRAVITY = +or(getParameter("gravity"), 0.02);

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let textureImg: HTMLImageElement;
let expandableTextureImg: HTMLImageElement

let tiles: Block[][][] = [];
let collectedTiles: boolean[][][] = [];
let hasPlayer = false;
let isPlaying = false;
let page = 0;
let frameDate = new Date();
let deltaTime: number = 0;
let extraAtlases: [{[key: number]: HTMLImageElement}, {[key: string]: extraTextureEntry}] = [[], {}];
let blockFunctions: {[key: string]: BlockCode} = {};

let X_OFFSET: number = 0, Y_OFFSET: number = 0;
let S_WIDTH: number = 0, S_HEIGHT: number = 0;

let slotSelected: number = -1;
let tileDimension: number = 0;

let PLAYER_POS: [number, number] = [0, 0];
let PLAYER_VEL: [number, number] = [0, 0];
let PLAYER_SP: SpawnInfo;
let mods = getParameter("mods") ? getParameter("mods").split(",") : [];
let modpacks = getParameter("modpacks") ? getParameter("modpacks").split(",") : [];

let CAN_JUMP = false;

const COUNTERS = [
    "star",
    "hexagon",
    "triangle",
    "circle",
    "square"
];

// Make some custom things
let REVERSE_GRAVITY_START = getParameter("upside") != undefined;
let REVERSE_GRAVITY = REVERSE_GRAVITY_START;
let JUMP_HEIGHT = +or(getParameter("jump"), 0.4);
let SPRING_JUMP_HEIGHT = +or(getParameter("spring_jump"), 0.575);
let QUEUED_ALERTS: string[] = [];
let CUSTOM_MAX: {[key: string]: number} = {};
let EXTRA_COUNTERS: string[] = [];

let COUNTER: { [key: string]: number } = {
    "": 0,
    current_stars: 0,
    max_stars: 0,
    current_hexagons: 0,
    max_hexagons: 0,
    current_triangles: 0,
    max_triangles: 0,
    current_circles: 0,
    max_circles: 0,
    current_squares: 0,
    max_squares: 0
}

function init() {
    canvas = document.createElement("canvas");
    canvas.innerText = "Canvas is not supported.";
    canvas.addEventListener("mousedown", click);
    document.addEventListener("keydown", (e: KeyboardEvent) => restartLevel(handleKey(true, e)));
    document.addEventListener("keyup", (e: KeyboardEvent) => restartLevel(handleKey(false, e)));
    createAudios();

    ctx = canvas.getContext("2d");
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    setCanvas();

    modsInit();

    textureImg = new Image();
    textureImg.src = textures;
    expandableTextureImg = new Image();
    expandableTextureImg.src = expandableTextures;

    setupTiles();

    document.body.appendChild(canvas);

    COUNTERS.forEach(v => {
        const value = getParameter("max_" + v);
        if (value) CUSTOM_MAX[v] = +value;
    });

    if (AUTOLOAD) loadLevel(AUTOLOAD);
    if (EMBED || STARTNOW) {
        initPlay();
        resetPlayer();
    }

    window.requestAnimationFrame(tick);
}

async function modsInit() {
    await Promise.all(modpacks.map(path => new Promise(
        r => {
            fetch(path)
            .then(d => d.json())
            .then(d => mods = mods.concat(d))
            .then(r)
            .catch(e => {
                console.error("Modpack failed to load", e);
                r([]);
            })
        }
    )));

    let result = await loadMods(mods, {palette, extraAtlases, blockFunctions, blockTable, blockCodes});

    palette = result.palette;
    extraAtlases = result.extraAtlases;
    blockFunctions = result.blockFunctions;
    blockTable = result.blockTable;
    blockCodes = result.blockCodes;
}

function createAudios() {
    for (let id in SOUNDS) {
        const sound = SOUNDS[id];
        const elem = new Audio(sound);
        ELEM_SOUNDS[id] = elem;
        document.body.append(elem);
    }
}

function click(e: MouseEvent) {
    const x = (e.clientX - X_OFFSET) / S_WIDTH * WIDTH;
    const y = (e.clientY - Y_OFFSET) / S_HEIGHT * HEIGHT;

    handleClick(x, y);
}

function shouldLock(slot: number) {
    const name = palette[slot][0];
    return onlyOnce(name) && tilesContain(blockTable[name]);
}

function playSound(sound: string) {
    const elem = ELEM_SOUNDS[sound];
    if (elem)
        if (elem.paused) {
            elem.play();
        } else {
            elem.currentTime = 0;
        }
}

function handleClick(x: number, y: number): void {
    if (window.location.href.endsWith("#d")) alert(x+":"+y);
    if (!isPlaying && slotSelected >= 0 && x >= TOOLBOX_WIDTH) {
        if (shouldLock(slotSelected)) return; // Don't allow to place more!
        const tx = Math.floor((x - TOOLBOX_WIDTH - TILE_OFFSET[0]) / SIDE_LENGTH) - 1;
        const ty = Math.floor((y - TILE_OFFSET[1]) / SIDE_LENGTH) - 1;
        if (tx < 0 || tx > TILES_WIDTH - 2 || ty < 0 || ty > TILES_HEIGHT - 2) return;
        const type = palette[slotSelected][0];
        tiles[tileDimension][ty][tx] = blockTable[type];
        return;
    } else if (x >= 2 && x <= 37 && y >= 62 && y <= 100) {
        page--;
        return;
    } else if (x >= 245 && x <= 284 && y >= 62 && y <= 100) {
        page++;
        return;
    } else if (DIMENSIONS > 1 && !isPlaying && x >= 191 && x <= 236 && y >= 654 && y <= 707) {
        return changeDimension(false);
    } else if (DIMENSIONS > 1 && !isPlaying && x >= 237 && x <= 283 && y >= 654 && y <= 707) {
        return changeDimension(true);
    } else if (!isPlaying && x >= 197 && x <= 232 && y >= 528 && y <= 576) {
        saveLevel();
    } else if (!isPlaying && x >= 247 && x <= 281 && y >= 528 && y <= 576) {
        loadLevel();
    }
    const touchingSlot = (() => {
        for (let i = 0; i < 4; i++) {
            let slot = toSlotIndex(i * 2);
            if (palette[slot][0] && touchingCircle(x, y, TOOLBOX_WIDTH / 2 - 60, 145 + i * 105, SLOT_R)) return slot;
            slot = toSlotIndex(i * 2 + 1);
            if (palette[slot][0] && touchingCircle(x, y, TOOLBOX_WIDTH / 2 + 60, 145 + i * 105, SLOT_R)) return slot;
        }
    })();
    if (typeof touchingSlot !== "undefined") {
        slotSelected = touchingSlot;
        return;
    }
    if (tilesContain(Block.PLAYER) && x >= 51 && x <= 133 && y >= 547 && y <= 703) {
        isPlaying = !isPlaying;
        if (isPlaying) {
            initPlay();
            playSound("play");
            resetPlayer();
        } else stopPlaying();
    }
}

function saveLevel() {
    let level: Level = {
        width: TILES_WIDTH,
        height: TILES_HEIGHT,
        tiles: convertToBlockCodes(tiles),
        friction: FRICTION,
        max: CUSTOM_MAX
    };
    copyToClipboard(JSON.stringify(level));
    showAlert("Code has been copied to your clipboard!");
}

function loadLevel(code?: string) {
    if (!code) code = prompt("Put your level code:");
    if (!code) return;
    try {
        const level: Level = JSON.parse(code);
        TILES_WIDTH = Math.max(+or(level.width, 22), 3);
        TILES_HEIGHT = Math.max(+or(level.height, 16), 3);
        SIDE_LENGTH = getNewTileSide();
        let codes = Object.keys(blockCodes);
        let x = 0, y = 0, z = 0;
        tiles = level.tiles.map((D: (string | number)[][]) => {
            if (D === null) return Array(TILES_HEIGHT - 2).fill(void 0).map(() => Array(TILES_WIDTH - 2).fill(Block.AIR));
            y = 0;
            return D.map((Y: (string | number)[]) => {
                x = 0;
                return Y.map((t: string | number) => {
                    if (t === 0) return Block.AIR;
                    const id = codes.find(i => blockCodes[i] == t) || (()=>{
                        throw new Error(`Invalid ID '${t}' found at ${x},${y},${z}`)
                    })();
                    x++;
                    return blockTable[id];
                })
                y++;
            })
            z++;
        });
        DIMENSIONS = tiles.length;
        FRICTION = +or(level.friction, 0.025);
        CUSTOM_MAX = or(level.max, {});
    } catch(e) {
        alert("Level could not be loaded! More information in the logs can be found.");
        console.error("Error while loading level:", e);
    }
}

function initPlay() {
    isPlaying = true;
    PLAYER_SP = {
        spawn: tilePosition(Block.PLAYER),
        reversed_gravity: REVERSE_GRAVITY_START
    };
    setupTiles(true);

    // COUNTER settings
    for (let v of COUNTERS.concat(EXTRA_COUNTERS)) {
        COUNTER["current_" + v + "s"] = 0;
        COUNTER["max_" + v + "s"] = +or(CUSTOM_MAX[v], tilesCount(blockTable[v]));
    };
}

function resetPlayer() {
    PLAYER_POS = PLAYER_SP.spawn.slice(0, 2) as [number, number];
    REVERSE_GRAVITY = PLAYER_SP.reversed_gravity;
    PLAYER_VEL = [0, 0];
    tileDimension = PLAYER_SP.spawn[2];
}

function toSlotIndex(i: number): number {
    let m = (page * SLOTS_PER_PAGE + i) % palette.length;
    if (m < 0) m += palette.length;
    return m;
}

function touchingCircle(x: number, y: number, cx: number, cy: number, r: number) {
    return Math.pow(cx - x, 2) + Math.pow(cy - y, 2) <= Math.pow(r, 2);
}

function setupTiles(notTiles?: boolean): void {
    if (notTiles) collectedTiles = [];
    for (let z = 0; z < DIMENSIONS; z++) {
        if (!notTiles) tiles.push([]);
        collectedTiles.push([]);
        for (let y = 0; y < TILES_HEIGHT - 2; y++) {
            if (!notTiles) tiles[z].push([]);
            collectedTiles[z].push([]);
            for (let x = 0; x < TILES_WIDTH - 2; x++) {
                if (!notTiles) tiles[z][y].push(Block.AIR);
                collectedTiles[z][y].push(false);
            }
        }
    }
}

function tick(): void {
    let date = new Date();
    deltaTime = (date.getTime() - frameDate.getTime()) / 1000;
    frameDate = date;

    setCanvas();

    drawRect(0, 0, WIDTH, HEIGHT, "white");
    drawRect(0, 0, TOOLBOX_WIDTH, HEIGHT, "#505050");

    drawTiles();
    if (!EMBED) drawToolbox();
    drawCounters();

    showAlerts();

    doPhysics(deltaTime);

    window.requestAnimationFrame(tick);
}

function showAlerts() {
    while (QUEUED_ALERTS.length) {
        alert(QUEUED_ALERTS.splice(0, 1)[0]);
    }
}

function drawCounters(): void {
    let c = 0;
    if (isPlaying ? (COUNTER.max_stars > 0) : tilesContain(Block.STAR))
        drawCounter("star", Block.STAR, "current_stars", "max_stars", "#ffffcc", "#444400");
    if (isPlaying ? (COUNTER.max_hexagons > 0) : tilesContain(Block.HEXAGON))
        drawCounter("hexagon", Block.HEXAGON, "current_hexagons", "max_hexagons", "#ffcccc", "#440000");
    if (isPlaying ? (COUNTER.max_triangles > 0) : tilesContain(Block.TRIANGLE))
        drawCounter("triangle", Block.TRIANGLE, "current_triangles", "max_triangles", "#ccd3d3ff", "#000044");
    if (isPlaying ? (COUNTER.max_circles > 0) : tilesContain(Block.CIRCLE))
        drawCounter("circle", Block.CIRCLE, "current_circles", "max_circles", "#ccffcc", "#004400");
    if (isPlaying ? (COUNTER.max_squares > 0) : tilesContain(Block.SQUARE))
        drawCounter("square", Block.SQUARE, "current_squares", "max_squares", "#ffd7cc", "#442700");

    function drawCounter(name: string, block: Block, CURRENT: string, MAX: string, colour: string, dark_colour: string) {
        const pos = [TOOLBOX_WIDTH + 5 + c++ * 85, HEIGHT - 30];
        const tick = isPlaying && COUNTER[CURRENT] >= COUNTER[MAX];
        drawTexture("block_" + name, pos[0], pos[1], 28, 28);
        if (tick) {
            ctx.beginPath();
            ctx.moveTo(pos[0] + 8, pos[1] + 12);
            ctx.lineTo(pos[0] + 13.5, pos[1] + 17.5);
            ctx.lineTo(pos[0] + 27, pos[1]);
            ctx.strokeStyle = dark_colour;
            ctx.lineWidth = 3;
            ctx.stroke();
            c -= 0.35+0.275;
        }
        let PROG = COUNTER[CURRENT] + "/" + COUNTER[MAX];
        if (!tick) {
            c -= 0.35;
            if (!isPlaying) {
                PROG = tilesCount(block) + "";
            } else if (COUNTER[MAX] <= 1) {
                PROG = "";  
                c -= 0.275;
            } else if (COUNTER[MAX] >= 100) {
                PROG = Math.floor(COUNTER[CURRENT] / COUNTER[MAX] * 100) + "%";
            }
            if (PROG.length > 1) c += 0.275*(PROG.length - 1);
            drawText(PROG, pos[0] + 30, pos[1], colour, true, dark_colour);
        }
    }
}

function drawText(text: string, x: number, y: number, colour?: string, top?: boolean, stroke?: string, centered?: boolean, size?: number) {
    ctx.font = `${size || 32}px "Noto Sans"`;
    ctx.textAlign = centered ? 'center' : 'left';
    ctx.textBaseline = top ? 'top' : 'middle';
    if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2;
        ctx.strokeText(text, x, y);
    }
    ctx.fillStyle = colour || 'white';
    ctx.fillText(text, x, y);
}

function isColliding(): boolean {
    const [rx, ry] = PLAYER_POS.map(x => Math.round(x));
    let result = false;
    for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
            const ax = rx + x + 1, ay = ry + y + 1;
            const block = getTile(ax, ay);
            const dx = PLAYER_POS[0] - ax + 1, dy = PLAYER_POS[1] - ay + 1;
            const touching = (Math.abs(dx) + (1 - PLAYER_SIZE)/2) < TOUCH_FRAC - MINI_NUM && (Math.abs(dy) + (1 - PLAYER_SIZE)/2) < TOUCH_FRAC - MINI_NUM;

            if (touching)
                handleExtraThings(block, ax - 1, ay - 1);

            result = result || (touching && isCollidable(block, ax - 1, ay - 1));
        }
    }
    return result;
}

function isCollidable(block: Block, x?: number, y?: number): boolean {
    const id = Object.keys(blockTable).find(id => blockTable[id] == block);
    const collide = blockFunctions[id]?.isCollidable;
    if (collide) return typeof collide === "function" ? collide(x, y) : collide;
    switch (block) {
        case Block.HEXAGON_LOCK:
            return COUNTER.current_hexagons < COUNTER.max_hexagons;
        case Block.TRIANGLE_LOCK:
            return COUNTER.current_triangles < COUNTER.max_triangles;
        case Block.CIRCLE_LOCK:
            return COUNTER.current_circles < COUNTER.max_circles;
        case Block.SQUARE_LOCK:
            return COUNTER.current_squares < COUNTER.max_squares;
        case Block.STAR_LOCK:
            return COUNTER.current_stars < COUNTER.max_stars;
        case Block.HEXAGON_UNLOCK:
            return COUNTER.current_hexagons >= COUNTER.max_hexagons;
        case Block.TRIANGLE_UNLOCK:
            return COUNTER.current_triangles >= COUNTER.max_triangles;
        case Block.CIRCLE_UNLOCK:
            return COUNTER.current_circles >= COUNTER.max_circles;
        case Block.SQUARE_UNLOCK:
            return COUNTER.current_squares >= COUNTER.max_squares;
        case Block.STAR_UNLOCK:
            return COUNTER.current_stars >= COUNTER.max_stars;
        default:
            return COLLIDABLE.includes(block);
    }
}

function stopPlaying() {
    isPlaying = false;
    setupTiles(true);
}

function finishLevel() {
    if (EMBED) {
        justPause = true;
        if (confirm("Congratulations! You finished the level! Would you like to play again?")) {
            justPause = false;
            initPlay();
            resetPlayer();
        }
    } else stopPlaying();
    playSound("finish");
}

function killPlayer() {
    // Die
    resetPlayer();
    playSound("die");
}

function handleExtraThings(block: Block, x?: number, y?: number) {
    const id = Object.keys(blockTable).find(id => blockTable[id] == block);
    const act = blockFunctions[id]?.onCollision;
    if (act) {
        act();
        return;
    };
    switch (block) {
        case Block.FINISH:
            // Well, only if the finish is unlocked :)
            if (!(COUNTER.max_stars == 0 || COUNTER.current_stars >= COUNTER.max_stars)) return;
            // Stop playing!
            finishLevel();
            break;
        case Block.LAVA:
            killPlayer();
            break;
        case Block.SPRING:
            PLAYER_VEL[1] = -SPRING_JUMP_HEIGHT;
            break;
        case Block.CHECKPOINT:
            if (PLAYER_SP.spawn[0] != x || PLAYER_SP.spawn[1] != y || PLAYER_SP.spawn[2] != tileDimension) {
                PLAYER_SP.spawn = [x, y, tileDimension];
                PLAYER_SP.reversed_gravity = REVERSE_GRAVITY;
                playSound("checkpoint");
            }
            break;
        case Block.STAR:
            collectTile(x, y, tileDimension, "current_stars", "max_stars")
            break;
        case Block.HEXAGON:
            collectTile(x, y, tileDimension, "current_hexagons", "max_hexagons")
            break;
        case Block.TRIANGLE:
            collectTile(x, y, tileDimension, "current_triangles", "max_triangles")
            break;
        case Block.CIRCLE:
            collectTile(x, y, tileDimension, "current_circles", "max_circles")
            break;
        case Block.SQUARE:
            collectTile(x, y, tileDimension, "current_squares", "max_squares");
            break;
        case Block.HEXAGON_IN:
        case Block.HEXAGON_IN_LOCK:
            if (block == Block.HEXAGON_IN_LOCK && (COUNTER.current_hexagons < COUNTER.max_hexagons)) return;
            teleportToOut("hexagon");
            break;
        case Block.TRIANGLE_IN:
        case Block.TRIANGLE_IN_LOCK:
            if (block == Block.TRIANGLE_IN_LOCK && (COUNTER.current_triangles < COUNTER.max_triangles)) return;
            teleportToOut("triangle");
            break;
        case Block.CIRCLE_IN:
        case Block.CIRCLE_IN_LOCK:
            if (block == Block.CIRCLE_IN_LOCK && (COUNTER.current_circles < COUNTER.max_circles)) return;
            teleportToOut("circle");
            break;
        case Block.SQUARE_IN:
        case Block.SQUARE_IN_LOCK:
            if (block == Block.SQUARE_IN_LOCK && (COUNTER.current_squares < COUNTER.max_squares)) return;
            teleportToOut("square");
            break;
        case Block.LEFT:
            changeDimension(false);
            break;
        case Block.RIGHT:
            changeDimension(true);
            break;
        case Block.GRAVITY:
            REVERSE_GRAVITY = !REVERSE_GRAVITY;
            break;
    }
}

function showAlert(alert: string) {
    QUEUED_ALERTS.push(alert);
}

function teleportToOut(type: string) {
    const outs: [number, number, number][] = [].concat(
        tilePositions(blockTable[type + "_out"]), 
        (COUNTER["current_" + type + "s"] < COUNTER["max_" + type + "s"]) ? [] : tilePositions(blockTable[type + "_out_lock"])
    );
    if (outs.length >= 1) {
        // We can teleport!
        // Choose a random 'out'.
        const out = outs[Math.floor(Math.random() * outs.length)];
        PLAYER_POS = out.slice(0, 2) as [number, number];
        tileDimension = out[2];
    }
}

function collectTile(x: number, y: number, z: number, current: string, max: string) {
    if (!collectedTiles[z][y][x]) {
        COUNTER[current]++;
        collectedTiles[z][y][x] = true;
        playSound("collect");
        if (COUNTER[current] == COUNTER[max]) playSound("all_collected");
    }
}

function changeDimension(goRight: boolean, noloop?: boolean) {
    if (!goRight) {
        if (tileDimension > 0) tileDimension--;
        else if (!noloop) tileDimension = DIMENSIONS - 1;
    } else if (tileDimension < DIMENSIONS - 1) tileDimension++;
    else if (!noloop) tileDimension = 0;
}

function stuck() {
    playSound("stuck");
    stopPlaying();

    showAlert("The level made the player stuck and thus is not possible. We stopped the playtesting for your own good.");
}

function doPhysics(dt: number) {
    if (!isPlaying || justPause) return;
    const frames = Math.max(Math.ceil(dt * 6), 1); // 1+ frames
    for (let i = 0; i < frames; i++) {
        PLAYER_VEL[1] += GRAVITY;
        if (HELD.up && CAN_JUMP) {
            PLAYER_VEL[1] = -JUMP_HEIGHT;
            CAN_JUMP = false;
        }
        PLAYER_VEL[1] = Math.min(PLAYER_VEL[1], 0.575);
        //
        PLAYER_VEL[0] += ((+HELD.right) - (+HELD.left)) * 0.0125;
        PLAYER_VEL[0] = Math.sign(PLAYER_VEL[0]) * Math.min(Math.abs(PLAYER_VEL[0]), 0.26) * (1 - FRICTION);
        //
        PLAYER_POS[0] += PLAYER_VEL[0];
        let j = MAX_COLLIDES;
        while (isColliding() && --j) {
            if (!isPlaying) return;
            PLAYER_POS[0] -= Math.sign(PLAYER_VEL[0]) / SIDE_LENGTH * 0.5;
        }
        if (j == 0) {
            stuck();
        }
        if (j < MAX_COLLIDES) PLAYER_VEL[0] = 0;
        //
        PLAYER_VEL[1] *= REVERSE_GRAVITY ? -1 : 1;
        //
        PLAYER_POS[1] += PLAYER_VEL[1];
        j = MAX_COLLIDES;
        while (isColliding() && --j) {
            if (!isPlaying) return;
            PLAYER_POS[1] -= Math.sign(PLAYER_VEL[1]) / SIDE_LENGTH * 0.5;
        }
        if (j == 0) {
            stuck();
        }
        //
        PLAYER_VEL[1] *= REVERSE_GRAVITY ? -1 : 1;
        //
        if (j < MAX_COLLIDES) {
            if (PLAYER_VEL[1] > 0) CAN_JUMP = true;
            PLAYER_VEL[1] = 0;
        }
    }
    let [X, Y] = PLAYER_POS;
    drawTexture("player", TILE_OFFSET[0] + (X + 1.5 - PLAYER_SIZE / 2) * SIDE_LENGTH + TOOLBOX_WIDTH, TILE_OFFSET[1] + (Y + 1.5 - PLAYER_SIZE / 2) * SIDE_LENGTH, PLAYER_SIZE * SIDE_LENGTH, PLAYER_SIZE * SIDE_LENGTH);
}

function getNewTileSide(): number {
    const side = Math.min(HEIGHT / TILES_HEIGHT, (WIDTH - TOOLBOX_WIDTH) / TILES_WIDTH);
    TILE_OFFSET = [(WIDTH - TOOLBOX_WIDTH - side*TILES_WIDTH) / 2, (HEIGHT - side*TILES_HEIGHT) / 2];
    return side;
}

function setCanvas(): void {
    if (window.innerHeight * ASPECT_RATIO < window.innerWidth) {
        S_HEIGHT = window.innerHeight;
        S_WIDTH = window.innerHeight * ASPECT_RATIO;
    } else {
        S_WIDTH = window.innerWidth;
        S_HEIGHT = window.innerWidth / ASPECT_RATIO;
    }
    canvas.style.height = S_HEIGHT + "px";
    canvas.style.width = S_WIDTH + "px";
    // Do the centering.
    Y_OFFSET = (window.innerHeight - S_HEIGHT) / 2;
    X_OFFSET = (window.innerWidth - S_WIDTH) / 2;
    canvas.style.top = Y_OFFSET + "px";
    canvas.style.left = X_OFFSET + "px";
}

function restartLevel(reset: boolean) {
    if (reset) {
        initPlay();
        resetPlayer();
    }
}

function drawRect(x: number, y: number, w: number, h: number, color: string) {
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.fillStyle = color;
    ctx.fill();
}

function drawTexture(id: string, dx: number, dy: number, dw: number, dh: number, expandable?: boolean): void {
    let f;
    let tex = extraAtlases[1][id];
    if (tex) {
        let img = extraAtlases[0][tex.atlas];
        ctx.drawImage(img, tex.x, tex.y, tex.w, tex.h, dx, dy, dw, dh);
        return;
    }
    if (expandable) {
        const index = expandableAtlas.findIndex(o => id.split(".")[0] == o);
        const type = {
            "key": 0,
            "lock": 1,
            "unlock": 2,
            "in": 3,
            "out": 4,
            "in_lock": 5,
            "out_lock": 6
        }[id.split(".")[1]];
        ctx.drawImage(expandableTextureImg, type * 64, index * 64, 64, 64, dx, dy, dw, dh);
    } else if (f = expandableAtlas.find(o => "block_" + o == id)) {
        return drawTexture(f + ".key", dx, dy, dw, dh, true);
    } else if (f = expandableAtlas.find(o => "block_" + o + "_lock" == id)) {
        return drawTexture(f + ".lock", dx, dy, dw, dh, true);
    } else if (f = expandableAtlas.find(o => "block_" + o + "_unlock" == id)) {
        return drawTexture(f + ".unlock", dx, dy, dw, dh, true);
    } else if (f = expandableAtlas.find(o => "block_" + o + "_in" == id)) {
        return drawTexture(f + ".in", dx, dy, dw, dh, true);
    } else if (f = expandableAtlas.find(o => "block_" + o + "_out" == id)) {
        return drawTexture(f + ".out", dx, dy, dw, dh, true);
    } else if (f = expandableAtlas.find(o => "block_" + o + "_in_lock" == id)) {
        return drawTexture(f + ".in_lock", dx, dy, dw, dh, true);
    } else if (f = expandableAtlas.find(o => "block_" + o + "_out_lock" == id)) {
        return drawTexture(f + ".out_lock", dx, dy, dw, dh, true);
    } else {
        const texture = textureAtlas.find(o => o.id == id);
        if (!texture) {
            console.warn("Warning: invalid texture name '" + id + "' was asked to be drawn!");
            return;
        }
        const { x, y, w, h } = texture;
        if (isNaN(x + y + w + h)) {
            console.warn("Warning: invalid data from texture '" + id + "' was asked to be drawn!");
            return;
        }
        ctx.drawImage(textureImg, x, y, w, h, dx, dy, dw, dh);
    }
}

function drawTiles() {
    for (let y = 0; y < TILES_HEIGHT; y++) {
        for (let x = 0; x < TILES_WIDTH; x++) {
            const texName = getTextureName(getTile(x, y), x - 1, y - 1);
            if (!texName) continue;
            if (texName == "block_player") {
                drawTexture(texName, TILE_OFFSET[0] + x * SIDE_LENGTH + TOOLBOX_WIDTH + (1 - PLAYER_SIZE) * SIDE_LENGTH /  2, TILE_OFFSET[1] + y * SIDE_LENGTH + (1 - PLAYER_SIZE) * SIDE_LENGTH / 2, SIDE_LENGTH * PLAYER_SIZE, SIDE_LENGTH * PLAYER_SIZE);
            } else {
                drawTexture(texName, TILE_OFFSET[0] + x * SIDE_LENGTH + TOOLBOX_WIDTH, TILE_OFFSET[1] + y * SIDE_LENGTH, SIDE_LENGTH, SIDE_LENGTH);
            }
        }
    }
}

function drawToolbox() {
    // Logo
    drawTexture("logo", 10, 17.5, TOOLBOX_WIDTH - 20, 50);
    drawTexture("small_logo_text", TOOLBOX_WIDTH - 180, -2, 170, 25);

    // Box Border
    ctx.beginPath();
    ctx.rect(10, 80, TOOLBOX_WIDTH - 20, HEIGHT - 275);
    if (isPlaying) {
        ctx.fillStyle = "white";
        ctx.fill();
        drawTexture("lock", (TOOLBOX_WIDTH - LOCK_WIDTH) / 2, (80 + (80 + HEIGHT - 275) - LOCK_HEIGHT) / 2, LOCK_WIDTH, LOCK_HEIGHT);
    } else {
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2.5;
        ctx.stroke();
        drawPalette();
    }

    const [PLAY_W, PLAY_H] = [27 * 3, 54 * 3];
    hasPlayer = tilesContain(Block.PLAYER);
    drawTexture(hasPlayer ? (isPlaying ? "pause" : "play") : "locked_play", (TOOLBOX_WIDTH - PLAY_W) * 0.25, HEIGHT - (PLAY_H + 10), PLAY_W, PLAY_H);
    
    if (DIMENSIONS > 1) {
        drawTexture("left_triangle", TOOLBOX_WIDTH - 48 - 24 - 24, HEIGHT - 48 - 12, 22, 48);
        drawTexture("tilemap", TOOLBOX_WIDTH - 48 - 24, HEIGHT - 48 - 12, 44, 48);
        drawTexture("right_triangle", TOOLBOX_WIDTH - 48 - 24 + 46, HEIGHT - 48 - 12, 22, 48);
        drawText((tileDimension + 1) + "", TOOLBOX_WIDTH - 48 - 24 + 44/2, HEIGHT - 48 - 12 + 48/2, "#272727", false, "#eeeeee", true, 40);
    }

    drawTexture("load_down", TOOLBOX_WIDTH - 90 + 7.5, HEIGHT - (PLAY_H + 10) - 18, 18, 30);
    drawTexture("load_container", TOOLBOX_WIDTH - 90, HEIGHT - (PLAY_H + 10), 36, 20);

    drawTexture("load_up", TOOLBOX_WIDTH - 40 + 7.5, HEIGHT - (PLAY_H + 10) - 18, 18, 30);
    drawTexture("load_container", TOOLBOX_WIDTH - 40, HEIGHT - (PLAY_H + 10), 36, 20);
}

function tilesContain(block: Block) {
    return tiles.some(d2 => d2.some(d1 => d1.some(b => b == block)));
}

function tilesCount(block: Block) {
    let count = 0;
    for (let z = 0; z < DIMENSIONS; z++) {
        for (let y = 0; y < TILES_HEIGHT - 2; y++) {
            for (let x = 0; x < TILES_WIDTH - 2; x++) {
                if (tiles[z][y][x] == block) count++;
            }
        }
    }
    return count;
}

function tilePosition(block: Block): [number, number, number] {
    let arr = [];
    for (let z = 0; z < DIMENSIONS; z++) {
        if (tiles[z].some(x => x.includes(block))) {
            for (let y = 0; y < TILES_HEIGHT - 2; y++) {
                if (tiles[z][y].includes(block)) {
                    return [tiles[z][y].findIndex(b => b == block), y, z];
                }
            }
        }
    }
    return [-1, -1, -1];
}

function tilePositions(block: Block): [number, number, number][] {
    let pos: [number, number, number][] = [];
    for (let z = 0; z < DIMENSIONS; z++) {
        for (let y = 0; y < TILES_HEIGHT - 2; y++) {
            for (let x = 0; x < TILES_WIDTH - 2; x++) {
                if (tiles[z][y][x] == block) pos.push([x, y, z]);
            }
        }
    }
    return pos;
}

function drawPalette() {
    for (let i = 0; i < 4; i++) {
        drawSlot(i * 2, TOOLBOX_WIDTH / 2 - 60, 145 + i * 105);
        drawSlot(i * 2 + 1, TOOLBOX_WIDTH / 2 + 60, 145 + i * 105);
    }
    drawTexture("left_arrow", 3, 65, 36, 36);
    drawTexture("right_arrow", TOOLBOX_WIDTH - 40, 65, 36, 36);
}

function drawSlot(id: number, x: number, y: number) {
    id = toSlotIndex(id);
    const texture = palette[id][0];
    ctx.beginPath();
    ctx.arc(x, y, id == slotSelected ? SLOT_R * 1.15 : SLOT_R, 0, 2 * Math.PI);
    const TEMP_ICON_SIDE = ICON_SIDE * (id == slotSelected ? 1.15 : 1);
    ctx.fillStyle = texture ? "white" : "#484848";
    ctx.fill();

    if (texture) {
        const rect: [number, number, number, number] = [x - TEMP_ICON_SIDE / 2, y - TEMP_ICON_SIDE / 2, TEMP_ICON_SIDE, TEMP_ICON_SIDE];
        if (palette[id][1]) {
            drawTexture("block_" + texture, rect[0], rect[1], rect[2], rect[3]);
        } else {
            // Automatically done with a black outline.
            drawTexture("block_" + texture, rect[0], rect[1], rect[2], rect[3]);

            ctx.beginPath();
            ctx.rect(rect[0], rect[1], rect[2], rect[3]);
            ctx.strokeStyle = "black";
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }

    if (shouldLock(id)) {
        ctx.beginPath();
        ctx.arc(x, y, id == slotSelected ? 42 * 1.15 : 42, 0, 2 * Math.PI);
        ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
        ctx.fill();
    } else if (id == slotSelected) {
        // Create a glow effect with extra circle transparency!
        ctx.beginPath();
        ctx.arc(x, y, id == slotSelected ? 42 * 1.15 : 42, 0, 2 * Math.PI);
        ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
        ctx.fill();
    }
}

function getTile(x: number, y: number): Block {
    if (y <= 0 || y >= TILES_HEIGHT - 1 || x <= 0 || x >= TILES_WIDTH - 1) return Block.BORDER;
    try {
        return tiles[tileDimension][y - 1][x - 1];
    } catch(e) {
        console.error("Tile at " + x + "," + y + " might pass the checks badly! Take note of this!", e);
        return Block.BORDER;
    }
}

function getTextureName(block: Block, x?: number, y?: number): null | string {
    const values = Object.values(blockTable);
    let name = Object.keys(blockTable).find(
        (_, i) => values[i] == block
    );

    let tex = blockFunctions[name]?.getTexture;
    if (tex) return typeof tex === "function" ? tex(x, y) : tex;

    let shape;

    name = "block_" + name;
    if (name === "block_undefined") {
        console.warn("Couldn't find string ID for block id " + block + "!");
        return null;
    }

    if (name == "block_air" || (name == "block_player" && isPlaying)) {
        // Player block shouldn't be displayed when you are playing!
        // Air should not be drawn; no texture.
        return null;
    } else if (name == "block_gravity") {
        return "block_gravity_" + ((isPlaying ? REVERSE_GRAVITY : REVERSE_GRAVITY_START) ? "up" : "down")
    } else if (isPlaying) {
        if (name == "block_checkpoint" &&
            PLAYER_SP.spawn[0] == x &&
            PLAYER_SP.spawn[1] == y &&
            PLAYER_SP.spawn[2] == tileDimension
        ) {
            // Return another one
            return "block_checkpoint_done";
        }
        if (COLLECTIBLE.includes(block) &&
            collectedTiles[tileDimension][y][x] == true
        ) {
            // Already collected!
            return null;
        }

        // There are two conditions to check if all stars are collected:
        // 1) Either there are no stars to collect...
        // 2) or all the stars are >= the total.
        if (block == Block.FINISH &&
            !(COUNTER.max_stars == 0 || COUNTER.current_stars >= COUNTER.max_stars)
        ) {
            return "block_finish_locked";
        }
        if (block == Block.STAR_LOCK &&
            (COUNTER.max_stars == 0 || COUNTER.current_stars >= COUNTER.max_stars)
        ) {
            return "block_star_unlock";
        }
        if (block == Block.STAR_UNLOCK &&
            (COUNTER.max_stars == 0 || COUNTER.current_stars >= COUNTER.max_stars)
        ) {
            return "block_star_lock";
        }

        // This is for hexagon locks, triangle locks, circle locks, etc.
        if (isPlaying && (shape = expandableAtlas.find(o => "block_" + o + "_lock" == name))) {
            if (COUNTER["current_" + shape + "s"] >= COUNTER["max_" + shape + "s"]) return "block_" + shape + "_unlock";
        } else if (isPlaying && (shape = expandableAtlas.find(o => "block_" + o + "_unlock" == name))) {
            if (COUNTER["current_" + shape + "s"] >= COUNTER["max_" + shape + "s"]) return "block_" + shape + "_lock";
        } else if (isPlaying && (shape = expandableAtlas.find(o => "block_" + o + "_in_lock" == name))) {
            if (COUNTER["current_" + shape + "s"] >= COUNTER["max_" + shape + "s"]) return "block_" + shape + "_in";
        } else if (isPlaying && (shape = expandableAtlas.find(o => "block_" + o + "_out_lock" == name))) {
            if (COUNTER["current_" + shape + "s"] >= COUNTER["max_" + shape + "s"]) return "block_" + shape + "_out";
        }
    }
    return name;
}

function registerCounter(id: string) {
    EXTRA_COUNTERS.push(id);
}

function getCurrentCounter(id: string): number | null {
    return or(COUNTER["current_" + id + "s"], null);
}

function getMaxCounter(id: string): number | null {
    return or(COUNTER["max_" + id + "s"], null);
}

function getSpawnInfo(): SpawnInfo {
    return PLAYER_SP;
}

function setSpawnInfo(info: SpawnInfo) {
    PLAYER_SP = info;
}

function getPlayerPosition() {
    return PLAYER_POS.concat([tileDimension]) as XYZ;
}

function setPlayerPosition(pos: XYZ) {
    PLAYER_POS = pos.slice(0, 2) as [number, number];
    tileDimension = pos[2];
}

init();

export {
    finishLevel,
    killPlayer,
    tilePositions,
    collectTile,
    getCurrentCounter, getMaxCounter,
    getSpawnInfo, getPlayerPosition,
    setSpawnInfo, setPlayerPosition
};