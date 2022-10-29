import "./style.css";
import textures from "./textures.png";
import textureAtlas from "./atlas";
import Block, { blockTable, COLLECTIBLE, COLLIDABLE } from "./block";
import palette, { onlyOnce } from "./palette";

// Sounds
import SOUND_PLAY from "./audio/play.mp3";
import SOUND_DIE from "./audio/die.mp3";
import SOUND_FINISH from "./audio/finish.mp3";
import SOUND_STUCK from "./audio/stuck.mp3";
import SOUND_ALL_COLLECTED from "./audio/all_collected.mp3";
import SOUND_CHECKPOINT from "./audio/checkpoint.mp3";
import SOUND_COLLECT from "./audio/collect.mp3";

// Constants
const WIDTH: number = 1280;
const HEIGHT: number = 720;
const ASPECT_RATIO: number = WIDTH / HEIGHT;
const TOOLBOX_WIDTH: number = 288;
const TILES_WIDTH: number = 22;
const TILES_HEIGHT: number = 16;
const SIDE_LENGTH = HEIGHT / TILES_HEIGHT;
const ICON_SIDE = 52;
const SLOT_R = 42;
const SLOTS_PER_PAGE = 8;
const [LOCK_WIDTH, LOCK_HEIGHT] = [67, 100];
const DIMENSIONS = 9;
const MAX_COLLIDES = 1000;
const TOUCH_FRAC = 60 / 64;
const FRICTION = 0.025;
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

let PLAYER_SIZE = 1;

// Physics are run at 600 FPS!
const GRAVITY = 0.02;

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let textureImg: HTMLImageElement;

let tiles: Block[][][] = [];
let collectedTiles: boolean[][][] = [];
let hasPlayer = false;
let isPlaying = false;
let page = 0;
let frameDate = new Date();
let deltaTime: number = 0;

let X_OFFSET: number = 0, Y_OFFSET: number = 0;
let S_WIDTH: number = 0, S_HEIGHT: number = 0;

let slotSelected: number = -1;
let tileDimension: number = 0;

let PLAYER_POS: [number, number] = [0, 0];
let PLAYER_VEL: [number, number] = [0, 0];
let PLAYER_SP: [number, number, number] = [0, 0, 0];

let CAN_JUMP = false;

// Make some custom things
let REVERSE_GRAVITY = false;
let JUMP_HEIGHT = 0.4;
let SPRING_JUMP_HEIGHT = 0.575;

let HELD: { [key: string]: boolean } = {
    left: false,
    up: false,
    right: false
};

let COUNTER: { [key: string]: number } = {
    current_stars: 0,
    max_stars: 0
}

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

function init(): void {
    canvas = document.createElement("canvas");
    canvas.innerText = "Canvas is not supported.";
    canvas.addEventListener("mousedown", click);
    document.addEventListener("keydown", (e: KeyboardEvent) => handleKey(true, e));
    document.addEventListener("keyup", (e: KeyboardEvent) => handleKey(false, e));
    createAudios();

    ctx = canvas.getContext("2d");
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    setCanvas();

    textureImg = new Image();
    textureImg.src = textures;

    setupTiles();

    document.body.appendChild(canvas);
    window.requestAnimationFrame(tick);
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
    // if (window.location.href.endsWith("#d")) alert(x+":"+y);
    if (!isPlaying && slotSelected >= 0 && x >= TOOLBOX_WIDTH) {
        if (shouldLock(slotSelected)) return; // Don't allow to place more!
        const tx = Math.floor((x - TOOLBOX_WIDTH) / SIDE_LENGTH) - 1;
        const ty = Math.floor(y / SIDE_LENGTH) - 1;
        if (tx < 0 || tx > TILES_WIDTH - 2 || ty < 0 || ty > TILES_HEIGHT - 2) return;
        const type = palette[slotSelected][0];
        tiles[tileDimension][ty][tx] = blockTable[type];
        return;
    } else if (x >= 2 && x <= 37 && y >= 62 && y <= 100) {
        page--;
    } else if (x >= 245 && x <= 284 && y >= 62 && y <= 100) {
        page++;
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
    if (tilesContain(Block.PLAYER) && x >= 105 && x <= 184 && y >= 547 && y <= 703) {
        isPlaying = !isPlaying;
        if (isPlaying) {
            initPlay();
            playSound("play");
            resetPlayer();
        } else stopPlaying();
    }
}

function initPlay() {
    PLAYER_SP = tilePosition(Block.PLAYER);

    // COUNTER settings
    COUNTER.current_stars = 0;
    COUNTER.max_stars = tilesCount(Block.STAR);
}

function resetPlayer() {
    PLAYER_POS = PLAYER_SP.slice(0, 2) as [number, number];
    PLAYER_VEL = [0, 0];
    tileDimension = PLAYER_SP[2];
}

function toSlotIndex(i: number): number {
    return (page * SLOTS_PER_PAGE + i) % palette.length;
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
    drawToolbox();
    drawCounters();

    doPhysics(deltaTime);

    window.requestAnimationFrame(tick);
}

function drawCounters(): void {
    let c = 0;
    if (isPlaying ? (COUNTER.max_stars > 0) : tilesContain(Block.STAR)) for (let i = 0;i<5;i++)drawCounter(c, "star", Block.STAR, "current_stars", "max_stars", "#ffffcc", "#444400", "block");

    function drawCounter(c: number, name: string, block: Block, CURRENT: string, MAX: string, colour: string, dark_colour: string, outline: string) {
        const pos = [TOOLBOX_WIDTH + 5 + c++ * 120, HEIGHT - 30];
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
            c -= 0.75;
        }
        let PROG = COUNTER[CURRENT] + "/" + COUNTER[MAX];
        if (!tick) {
            if (!isPlaying) {
                PROG = tilesCount(block) + "";
                c -= 0.5;
            } else if (COUNTER[MAX] >= 100) {
                PROG = Math.floor(COUNTER[CURRENT] / COUNTER[MAX] * 100) + "%";
            }
            drawText(PROG, pos[0] + 30, pos[1], colour, true, outline);
        }
    }
}

function drawText(text: string, x: number, y: number, colour?: string, top?: boolean, stroke?: string) {
    ctx.font = "32px \"Noto Sans\"";
    ctx.textAlign = 'left';
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
    for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
            const ax = rx + x + 1, ay = ry + y + 1;
            const block = getTile(ax, ay);
            const dx = PLAYER_POS[0] - ax + 1, dy = PLAYER_POS[1] - ay + 1;
            const touching = Math.abs(dx) < PLAYER_SIZE * TOUCH_FRAC && Math.abs(dy) < PLAYER_SIZE * TOUCH_FRAC;

            if (touching)
                handleExtraThings(block, ax - 1, ay - 1);

            if (COLLIDABLE.includes(block)) {
                if (touching) {
                    return true;
                }
            }
        }
    }
    return false;
}

function stopPlaying() {
    isPlaying = false;
    setupTiles(true);
}

function handleExtraThings(block: Block, x?: number, y?: number) {
    switch (block) {
        case Block.FINISH:
            // Well, only if the finish is unlocked :)
            if (!(COUNTER.max_stars == 0 || COUNTER.current_stars >= COUNTER.max_stars)) return;
            // Stop playing!
            stopPlaying();
            playSound("finish");
            break;
        case Block.LAVA:
            // Die
            resetPlayer();
            playSound("die");
            break;
        case Block.SPRING:
            PLAYER_VEL[1] = -SPRING_JUMP_HEIGHT;
            break;
        case Block.CHECKPOINT:
            if (PLAYER_SP[0] != x && PLAYER_SP[1] != y && PLAYER_SP[2] != tileDimension) {
                PLAYER_SP = [x, y, tileDimension];
                playSound("checkpoint");
            }
            break;
        case Block.STAR:
            if (!collectedTiles[tileDimension][y][x]) {
                COUNTER.current_stars++;
                collectedTiles[tileDimension][y][x] = true;
                playSound("collect");
                if (COUNTER.current_stars >= COUNTER.max_stars) playSound("all_collected");
            }
    }
}

function stuck() {
    playSound("stuck");
    stopPlaying();
}

function doPhysics(dt: number) {
    if (!isPlaying) return;
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
        while (isColliding() && j--) {
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
        while (isColliding() && j--) {
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
    drawTexture("player", (X + 1.5 - PLAYER_SIZE / 2) * SIDE_LENGTH + TOOLBOX_WIDTH, (Y + 1.5 - PLAYER_SIZE / 2) * SIDE_LENGTH, PLAYER_SIZE * SIDE_LENGTH, PLAYER_SIZE * SIDE_LENGTH);
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

function drawRect(x: number, y: number, w: number, h: number, color: string) {
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.fillStyle = color;
    ctx.fill();
}

function drawTexture(id: string, dx: number, dy: number, dw: number, dh: number) {
    const { x, y, w, h } = textureAtlas.find(o => o.id == id);
    ctx.drawImage(textureImg, x, y, w, h, dx, dy, dw, dh);
}

function drawTiles() {
    for (let y = 0; y < TILES_HEIGHT; y++) {
        for (let x = 0; x < TILES_WIDTH; x++) {
            const texName = getTextureName(getTile(x, y), x - 1, y - 1);
            if (!texName) continue;
            drawTexture(texName, x * SIDE_LENGTH + TOOLBOX_WIDTH, y * SIDE_LENGTH, SIDE_LENGTH, SIDE_LENGTH);
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
    drawTexture(hasPlayer ? (isPlaying ? "pause" : "play") : "locked_play", (TOOLBOX_WIDTH - PLAY_W) / 2, HEIGHT - (PLAY_H + 10), PLAY_W, PLAY_H);
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
            // Use another texture.

            drawTexture("block_icon_" + texture, rect[0], rect[1], rect[2], rect[3]);
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
    return tiles[tileDimension][y - 1][x - 1];
}

function getTextureName(block: Block, x?: number, y?: number): null | string {
    const values = Object.values(blockTable);
    const name = "block_" + Object.keys(blockTable).find(
        (_, i) => values[i] == block
    );
    if (name == "block_air" || (name == "block_player" && isPlaying)) {
        // Player block shouldn't be displayed when you are playing!
        // Air should not be drawn; no texture.
        return null;
    } else if (isPlaying) {
        if (name == "block_checkpoint" &&
            PLAYER_SP[0] == x &&
            PLAYER_SP[1] == y &&
            PLAYER_SP[2] == tileDimension
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
    }
    return name;
}

init();