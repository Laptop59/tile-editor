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
import { handleKey, HELD, getParameter, or, copyToClipboard, convertToBlockCodes, Level, ServerLevel, ServerData, SMM, PreviewServerLevel } from "./util";
import loadMods from "./mods";
import ServerWorker from "./server";

// Version
const version = require("../package.json").version;

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
const RANDOM_LEVEL_GEN_LINK = "https://api.json-generator.com/templates/cNAIgnNeUl-I/data?access_token=hotdm6zkrfdiamtmc2ah4pnxoftlqvjd2mn8jm4q";
const SERVER_API = getParameter("server") || null;
let serverWorker = SERVER_API ? new ServerWorker(SERVER_API, version, () => {
    SERVER_DATA.canconnect = true;
    if (!serverWorker.work) return;
    return function (username: string) {
        SERVER_DATA.username = username
    };
}) : null;
let SERVER_DATA: ServerData = {};

let SERVER_MENU_MODE: SMM = SMM.NONE;

let PLAYER_SIZE = +or(getParameter("size"), 1);
let justPause = false;
let verified = false;

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
let extraAtlases: [{ [key: number]: HTMLImageElement }, { [key: string]: extraTextureEntry }] = [[], {}];
let blockFunctions: { [key: string]: BlockCode } = {};

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
let serverMenu = false;

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
let CUSTOM_MAX: { [key: string]: number } = {};
let EXTRA_COUNTERS: string[] = [];
let EXTRA_COUNTERS_INFO: { [key: string]: CounterInfo } = {};

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
    attemptToLoadRecoveredLevel();
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

    let result = await loadMods(mods, { palette, extraAtlases, blockFunctions, blockTable, blockCodes });

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

function drawServerMenu() {
    drawRect(50, 50, WIDTH - 100, HEIGHT - 100, "#444444");
    drawRect(70, 70, WIDTH - 140, HEIGHT - 140, "#565656");
    drawTexture("left_arrow", 75, 75, 35, 35);

    const info = serverWorker.serverInfo();
    drawText(info.title, WIDTH/2, 100, info.colour, false, undefined, true, 40);

    if (!serverWorker.work && getParameter("serverwarn") !== "skip") {
        drawText("WARNING", WIDTH/2, 180, "yellow", false, "yellow", true, 50, false);
        drawText("You are currently running Tile Editor " + serverWorker.formatVer(version) + ",", WIDTH/2, 240, "yellow", false, undefined, true, 35, false);
        drawText("but the server's version is " + serverWorker.formatVer(serverWorker.serverVersion) + "!", WIDTH/2, 280, "#ffff3f", false, undefined, true, 35, false);

        drawText("The server functionality for this client might not work with this server!", WIDTH/2, 320, "#ffff5f", false, undefined, true, 32.5, false);

        drawText("If you want to continue anyway, press the button below.", WIDTH/2, HEIGHT - 230, "white", false, undefined, true, 35, false);
        drawRect(WIDTH/2 - 100, HEIGHT - 175, 200, 75, "yellow");
        drawText("Continue", WIDTH/2 - 100 + 200/2, HEIGHT - 175 + 75/2, "black", false, "black", true, 42, false);
        return;
    }

    switch (SERVER_MENU_MODE) {
        case SMM.MENU_NONE:
            // Load the recent levels.
            serverWorker.getRecent().then(r => {
                SERVER_MENU_MODE = SMM.MENU_AFTER;
                SERVER_DATA.recentdata = r;
                SERVER_DATA.page = 0;
            })
            .catch(err => {
                console.error(err);
                SERVER_MENU_MODE = SMM.MENU_ERROR;
            });
            SERVER_MENU_MODE = SMM.MENU_BEFORE;
            break;
         case SMM.QUERY_NONE:
            // Load the queried levels.
            serverWorker.search(SERVER_DATA.query).then(r => {
                SERVER_MENU_MODE = SMM.MENU_AFTER;
                SERVER_DATA.recentdata = r;
                SERVER_DATA.page = 0;
            })
            .catch(err => {
                console.error(err);
                SERVER_MENU_MODE = SMM.MENU_ERROR;
            });
            SERVER_MENU_MODE = SMM.MENU_BEFORE;
            break;
        case SMM.MENU_BEFORE:
            drawText("Loading...", WIDTH/2, HEIGHT/2, "white", false, undefined, true, 40);
            break;
        case SMM.MENU_ERROR:
            drawText("Couldn't load levels.", WIDTH/2, HEIGHT/2, "white", false, undefined, true, 40);
            break;
        case SMM.MENU_AFTER:
            drawTexture("refresh", WIDTH - 75 - 35, 75, 35, 45);
            drawTexture("search", WIDTH - 75 - 85 - 60, 75, 45, 45);
            drawTexture("user", WIDTH - 75 - 85 - 60 - 60, 75, 45, 45);
            SERVER_DATA.username && drawText(serverWorker.welcome.split("%user%").join(serverWorker.username), WIDTH/2, 130, serverWorker.colour, false, undefined, true, 30, false);

            if (!serverWorker.cooldownSubmit()) drawTexture("upload", WIDTH - 75 - 85, 75, 45, 45);
            if (SERVER_DATA.recentdata.length <= 0) {
                let MES = "There are no levels. :(";
                if (SERVER_DATA.query) MES = "No levels were found with that query.";
                drawText(MES, WIDTH/2, HEIGHT/2, "white", false, undefined, true, 40);
                return;
            }
            let s = SERVER_DATA.page * 5, i=0;

            let PAGES = Math.ceil(SERVER_DATA.recentdata.length/5);

            for (let level of SERVER_DATA.recentdata.slice(s, s + 5)) {
                drawRect(80, 150 + i * 80, WIDTH - 200, 65, "white");
                const col = level.owner ? "#005534" : "#222222";
                drawText(serverWorker.shorten(level.title || "Level"), 80 + 10, 150 + 5 + i * 80, col, true, undefined, false, 39);
                drawText(serverWorker.shorten(level.owner || level.author || "Unknown"), 80 + 10, 150 + 40 + i * 80, col, true, undefined, false, 25);
                drawText(serverWorker.levelSize(level), WIDTH - 120 - 10, 150 + 5 + i * 80, "#222222", true, undefined, false, 30, true);
                drawText(serverWorker.formatViews(level), WIDTH - 120 - 40 + 10, 150 + 5 + i * 80 + 65/2 - 5, "#222222", true, undefined, false, 30, true);
                if (level.verified) drawTexture("verified", WIDTH - 140, 120 + i * 80, 60, 50);
                drawTexture("plays", WIDTH - 120 - 30, 150 + 5 + i * 80 + 65/2 - 5, 35*0.75, 40*0.75);
                drawTexture("loves", WIDTH - 120 - 30 - 280, 150 + 5 + i * 80 + 65/2 - 5, 35*0.75, 40*0.75);
                drawText(serverWorker.formatLoves(level), WIDTH - 120 - 40 + 15 + 35*0.75 - 280, 150 + 5 + i * 80 + 65/2 - 5, "#7f0000", true, undefined, false, 30, false);
                i++;
            }
            drawTexture("left_arrow", WIDTH/2 - 50 - 50, HEIGHT - 127, 50, 50);
            drawTexture("right_arrow", WIDTH/2 + 100 - 50, HEIGHT - 127, 50, 50);
            drawText(`${SERVER_DATA.page + 1}/${PAGES}`, WIDTH/2, HEIGHT - 100, "white", false, undefined, true, 40, false);
            break;
        case SMM.SUBMIT_NONE:
            serverWorker.submitLevel(SERVER_DATA.leveldata)
            .then(id => {
                if (typeof id !== "number") throw new Error();
                SERVER_MENU_MODE = SMM.SUBMIT_AFTER;
                SERVER_DATA.query = undefined;
                SERVER_DATA.levelid = id;
            })
            .catch(() => {
                SERVER_MENU_MODE = SMM.SUBMIT_ERROR;
            });
            SERVER_MENU_MODE = SMM.SUBMIT_BEFORE;
            break;
        case SMM.SUBMIT_BEFORE:
            drawText("Uploading...", WIDTH/2, HEIGHT/2, "white", false, undefined, true, 40);
            break;
        case SMM.SUBMIT_ERROR:
            drawText("Upload failed.", WIDTH/2, HEIGHT/2, "white", false, undefined, true, 40);
            break;
        case SMM.SUBMIT_AFTER:
            drawText("Upload successful.", WIDTH/2, HEIGHT/2, "white", false, undefined, true, 40);
            drawText("ID: " + SERVER_DATA.levelid, WIDTH/2, HEIGHT/2 + 30, "#bdbdbd", false, undefined, true, 33.5);
            break;
        case SMM.LEVEL:
            const level = SERVER_DATA.levelpage;
            const col = level.owner ? "#003317" : "#222222";
            drawRect(80, 140, WIDTH - 160, HEIGHT - 250, "#dddddd");
            drawText(level.title, 100, 150, col, true, "#222222", false, 39);
            drawText("ID " + level.id, WIDTH - 87.5, 145, col, true, undefined, false, 27.5, true);
            if (level.verified) drawText("Verified", WIDTH - 87.5, 172.5, "#007700", true, "#007700", false, 27.5, true);
            else drawText("Unverified", WIDTH - 87.5, 172.5, "#002200", true, undefined, false, 27.5, true);
            drawText("By " + level.owner || level.author || "Unknown", 100, 200, col, true, "#272727", false, 25);
            
            let grd = ctx.createLinearGradient(0, 0, (WIDTH - 240) * 0.65, 0);
            grd.addColorStop(0, "#e7e7e7");
            grd.addColorStop(1, "#dddddd");

            drawRect(90, 230, WIDTH - 240, 120, grd);
            drawTexture("plays", 100, 240, 40, 40);
            drawText(serverWorker.formatViewsInFull(level), 155, 261, "#222222", false, "#222222", false, 42, false);
            drawTexture("loves", 100, 290, 40, 40);
            drawText(serverWorker.formatLovesInFull(level), 155, 261+50, "#dd0000", false, "#dd0000", false, 42, false);
            drawRect(WIDTH/2 - 100, HEIGHT - 225, 200, 75, "#22dd22");
            drawText("Play", WIDTH/2 - 100 + 200/2, HEIGHT - 225 + 75/2, "white", false, "white", true, 42, false);
            if (SERVER_DATA.username && SERVER_DATA.loved !== null) {
                if (SERVER_DATA.loved) drawTexture("loves", 100, 360-1, 40, 40);
                drawTexture("loves_outline", 100, 360, 40, 40);
                drawText(SERVER_DATA.loved ? "Loved" : "Love", 150, 380, "#7f0000", false, SERVER_DATA.loved && "#700000", false, 42, false);
            }
            break;
    }
}

function handleClickServer(x: number, y: number) {
    if (x >= 75 && x <= 110 && y >= 75 && x <= 110) {
        if (SERVER_MENU_MODE === SMM.LEVEL) {
            SERVER_MENU_MODE = SMM.MENU_AFTER;
            return;
        }
        serverMenu = false;
    } else if (!serverWorker.work && x >= WIDTH/2 - 100 && x <= WIDTH/2 + 100 && y >= HEIGHT - 175 && y <= HEIGHT - 100) {
        serverWorker.work = true;
    } else if (SERVER_MENU_MODE === SMM.MENU_AFTER && SERVER_DATA.page + 1 < Math.ceil(SERVER_DATA.recentdata.length/5) && x >= WIDTH/2 + 100 - 50 && x <= WIDTH/2 + 100 && y >= HEIGHT - 127 && y <= HEIGHT - 127 + 50) {
        SERVER_DATA.page++;
    } else if (SERVER_MENU_MODE === SMM.MENU_AFTER && SERVER_DATA.page >= 1 && x >= WIDTH/2 - 50 - 50 && x <= WIDTH/2 - 50 && y >= HEIGHT - 127 && y <= HEIGHT - 127 + 50) {
        SERVER_DATA.page--;
    } else if (SERVER_MENU_MODE === SMM.MENU_AFTER && x >= WIDTH - 75 - 35 && x <= WIDTH - 35 && y >= 75 && y <= 75 + 45) {
        SERVER_DATA.recentdata = undefined;
        SERVER_MENU_MODE = SMM.MENU_NONE;
    } else if (SERVER_MENU_MODE === SMM.MENU_AFTER && x >= WIDTH - 75 - 85 - 60 && y >= 75 && x <= WIDTH - 75 - 85 - 60 + 45 && y <= 75 + 45) {
        const query = prompt("Type your query:");
        if (query === null) return;

        SERVER_DATA.query = query;
        SERVER_MENU_MODE = SMM.QUERY_NONE;
    } else if (SERVER_MENU_MODE === SMM.LEVEL && x >= WIDTH/2 - 100 && x <= WIDTH/2 + 100 && y >= HEIGHT - 225 && y <= HEIGHT - 150) {
        serverWorker.play(SERVER_DATA.levelpage.id).then(loadLevel).then(() => serverMenu = false);
    } else if (serverWorker.canLove() && SERVER_MENU_MODE === SMM.LEVEL && SERVER_DATA.username && SERVER_DATA.loved !== null && x >= 100 && x <= 140 && y >= 360 && y <= 400) {
        SERVER_DATA.loved = !SERVER_DATA.loved
        SERVER_DATA.levelpage.loves += SERVER_DATA.loved ? 1 : -1;
        serverWorker.loveLevel(SERVER_DATA.levelpage.id, !SERVER_DATA.loved);
    } else if (SERVER_MENU_MODE === SMM.MENU_AFTER && !serverWorker.cooldownSubmit() && x >= WIDTH - 75 - 85 && x <= WIDTH - 75 - 85 + 45 && y >= 75 && y <= 75+45) {
        // Ask
        const name = prompt("Title:");
        if (!name) return;
        const author = SERVER_DATA.username || prompt("Author:");
        if (!SERVER_DATA.username && !author) return;

        let submittedlevel = saveLevel(true) as ServerLevel;
        submittedlevel.title = name;
        submittedlevel.author = author;
        
        SERVER_MENU_MODE = SMM.SUBMIT_NONE;
        SERVER_DATA.leveldata = submittedlevel;
    } else if (SERVER_MENU_MODE == SMM.MENU_AFTER && x >= WIDTH - 75 - 85 - 60 - 60 && y >= 75 && x <= WIDTH - 75 - 85 + 45 - 60 && y <= 75 + 45) {
        if (SERVER_DATA.username) {
            if (confirm("Do you want to sign out?")) {
                document.cookie = "token=;expires=" + new Date(0).toUTCString() + ";path=/";
                saveAndReload();
            }
            return;
        }
        
        if (confirm("Do you want to make use of an account?")) {
            const option = confirm("Select `OK` to login, and `Cancel` to signup.");
            if (option) {
                const name = prompt("User's name:");
                if (!name) return;
                const password = prompt("User's password:");
                if (!password) return;
                serverWorker.login(name, password).then(token => {
                    if (!token) {
                        alert("Failed to login.")
                        return;
                    } else {
                        let expires = new Date();
                        expires.setTime(expires.getTime() + 7*86400*1000);
                        // Store our token
                        document.cookie = "token=" + token + ";expires=" + expires.toUTCString() + ";path=/";
                        SERVER_DATA.username = name;
                        alert("Successfully logged in to your account. Reloading...");
                        saveAndReload();
                    }
                })
            } else {
                const name = prompt("User's name:");
                if (!name) return;
                const password = prompt("User's password:");
                if (!password) return;
                if (password.length < 8 || password.length > 20) {
                    alert("Passwords must have at least 8 characters and no more than 20!");
                    return;
                }
                const confirm_pass = prompt("Confirm password:");
                if (password === confirm_pass) {
                    // Use the worker.
                    serverWorker.register(name, password).then(token => {
                        if (!token) {
                            alert("Failed to register. Maybe the user name is already registered?")
                            return;
                        } else {
                            let expires = new Date();
                            expires.setTime(expires.getTime() + 7*86400*1000);
                            // Store our token
                            document.cookie = "token=" + token + ";expires=" + expires.toUTCString() + ";path=/";
                            SERVER_DATA.username = name;
                            alert("Successfully registered. Reloading...");
                            saveAndReload();
                        }
                    }); 
                } else {
                    alert("Passwords do not match!");
                    return;
                }
            }
        }
    } else if (SERVER_MENU_MODE === SMM.MENU_AFTER && x >= 80 && x <= 80 + WIDTH - 200) {
        let s = SERVER_DATA.page * 5, i=0;
        for (let level of SERVER_DATA.recentdata.slice(s, s + 5)) {
            if (y >= 150 + i * 80 && y <= 215 + i * 80) {
                SERVER_DATA.levelpage = level;
                SERVER_MENU_MODE = SMM.LEVEL;
                SERVER_DATA.loved = null;
                serverWorker.isLoved(level.id).then(l => SERVER_DATA.loved = l);
            }
            i++;
        }
    }
}

function handleClick(x: number, y: number): void {
    // if (window.location.href.endsWith("#d")) alert(x + ":" + y);
    if (serverMenu) return handleClickServer(x, y);
    if (!isPlaying && slotSelected >= 0 && x >= TOOLBOX_WIDTH) {
        if (shouldLock(slotSelected)) return; // Don't allow to place more!
        const tx = Math.floor((x - TOOLBOX_WIDTH - TILE_OFFSET[0]) / SIDE_LENGTH) - 1;
        const ty = Math.floor((y - TILE_OFFSET[1]) / SIDE_LENGTH) - 1;
        if (tx < 0 || tx >= TILES_WIDTH - 2 || ty < 0 || ty >= TILES_HEIGHT - 2) return;
        const type = palette[slotSelected][0];
        tiles[tileDimension][ty][tx] = blockTable[type];
        verified = false;
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
    } else if (SERVER_DATA.canconnect && SERVER_API && !isPlaying && x >= 263 && x <= 280 && y >= 576 && y <= 607) {
        serverMenu = true;
        SERVER_MENU_MODE = SMM.MENU_NONE;
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

function saveLevel(returnLevel?: boolean): ServerLevel | void {
    let level: Level = {
        width: TILES_WIDTH,
        height: TILES_HEIGHT,
        tiles: convertToBlockCodes(tiles),
        friction: FRICTION,
        max: CUSTOM_MAX,
        mods
    };
    if (returnLevel) {
        let serverlevel = level as ServerLevel;
        serverlevel.verified = verified;
        return serverlevel;
    } else {
        copyToClipboard(JSON.stringify(level));
        showAlert("Code has been copied to your clipboard!");
        return;
    }
}

function loadLevel(code?: string | Level) {
    if (!code) code = prompt("Put your level code:");
    if (!code) return;
    if (typeof code === "string" && code.startsWith("*")) {
        // Sample level.
        import(/* webpackMode: "eager" */ `./levels/${code.slice(1)}.json`)
            .then(loadLevel)
            .catch(e => {
                alert("That is not a valid sample level!")
                console.error("Error while loading sample level", e);
            });
    } else if (typeof code === "string" && code.startsWith("@")) {
        // Load URL level.
        let promise = getJSON(code.slice(1));
        promise.then(loadLevel, e => {
            alert("Couldn't get level from URL!");
            console.error("Error while getting level data", e);
        })
    } else if (typeof code === "string" && code.startsWith("$")) {
        switch (code.slice(1).toLowerCase()) {
            case "random":
                const link = RANDOM_LEVEL_GEN_LINK;
                getJSON(link).then(loadLevel);
                break;
            default:
                alert("That is not a valid special level!");
                console.error("Invalid special level", code.slice(1));
        }
    } else if (typeof code === "string" && code.startsWith("#") && SERVER_API) {
        // Load server level.
        serverWorker.search(code)
                    .then(levels => {
                        if (!levels[0]) throw new Error("That level doesn't exist in the server.");
                        serverWorker.play(levels[0].id).then(loadLevel);
                    })
                    .catch(e => {
                        alert("The level couldn't be loaded/found.");
                        console.error("Level couldn't be loaded/found", e);
                    });
    } else try {
        const level: Level = typeof code === "string" ? JSON.parse(code) : code;
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
                    const id = codes.find(i => blockCodes[i] == t) || (() => {
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
    } catch (e) {
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
        let max = EXTRA_COUNTERS_INFO[v]?.getMax;
        if (typeof max === "function") max = max();
        COUNTER["max_" + v + "s"] = +or(or(CUSTOM_MAX[v], max), tilesCount(blockTable[v]));
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

    if (serverMenu) drawServerMenu();

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
        drawCounter("block_star", Block.STAR, "current_stars", "max_stars", "#ffffcc", "#444400");
    if (isPlaying ? (COUNTER.max_hexagons > 0) : tilesContain(Block.HEXAGON))
        drawCounter("block_hexagon", Block.HEXAGON, "current_hexagons", "max_hexagons", "#ffcccc", "#440000");
    if (isPlaying ? (COUNTER.max_triangles > 0) : tilesContain(Block.TRIANGLE))
        drawCounter("block_triangle", Block.TRIANGLE, "current_triangles", "max_triangles", "#ccd3d3ff", "#000044");
    if (isPlaying ? (COUNTER.max_circles > 0) : tilesContain(Block.CIRCLE))
        drawCounter("block_circle", Block.CIRCLE, "current_circles", "max_circles", "#ccffcc", "#004400");
    if (isPlaying ? (COUNTER.max_squares > 0) : tilesContain(Block.SQUARE))
        drawCounter("block_square", Block.SQUARE, "current_squares", "max_squares", "#ffd7cc", "#442700");
    for (let counter of EXTRA_COUNTERS) {
        let e = EXTRA_COUNTERS_INFO[counter];
        const np = e.showCounter?.(isPlaying);
        let max = e?.getMax;
        if (typeof max === "function") max = max();

        if (e.shown && (isPlaying ? (typeof np !== "undefined" ? np : COUNTER["max_" + counter + "s"] > 0) : (typeof np !== "undefined" ? np : tilesContain(blockTable[counter]))))
            drawCounter(e.icon || "block" + counter, blockTable[counter], "current_" + counter + "s", "max_" + counter + "s", e.colour, e.dark_colour, max);
    }

    function drawCounter(name: string, block: Block, CURRENT: string, MAX: string, colour: string, dark_colour: string, maxCount?: number) {
        const pos = [TOOLBOX_WIDTH + 5 + c++ * 85, HEIGHT - 30];
        const tick = isPlaying && COUNTER[CURRENT] >= COUNTER[MAX];
        drawTexture(name, pos[0], pos[1], 28, 28);
        if (tick) {
            ctx.beginPath();
            ctx.moveTo(pos[0] + 8, pos[1] + 12);
            ctx.lineTo(pos[0] + 13.5, pos[1] + 17.5);
            ctx.lineTo(pos[0] + 27, pos[1]);
            ctx.strokeStyle = dark_colour;
            ctx.lineWidth = 3;
            ctx.stroke();
            c -= 0.35 + 0.275;
        }
        let PROG = COUNTER[CURRENT] + "/" + COUNTER[MAX];
        if (!tick) {
            c -= 0.35;
            if (!isPlaying) {
                PROG = (maxCount || tilesCount(block)) + "";
            } else if (COUNTER[MAX] <= 1) {
                PROG = "";
                c -= 0.275;
            } else if (COUNTER[MAX] >= 100) {
                PROG = Math.floor(COUNTER[CURRENT] / COUNTER[MAX] * 100) + "%";
            }
            if (PROG.length > 1) c += 0.275 * (PROG.length - 1);
            drawText(PROG, pos[0] + 30, pos[1], colour, true, dark_colour);
        }
    }
}

function drawText(text: string, x: number, y: number, colour?: string, top?: boolean, stroke?: string, centered?: boolean, size?: number, right?: boolean) {
    ctx.font = `${size || 32}px "Noto Sans"`;
    ctx.textAlign = right ? 'right' : (centered ? 'center' : 'left');
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
            const touching = (Math.abs(dx) + (1 - PLAYER_SIZE) / 2) < TOUCH_FRAC - MINI_NUM && (Math.abs(dy) + (1 - PLAYER_SIZE) / 2) < TOUCH_FRAC - MINI_NUM;

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
    verified = true;
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
    TILE_OFFSET = [(WIDTH - TOOLBOX_WIDTH - side * TILES_WIDTH) / 2, (HEIGHT - side * TILES_HEIGHT) / 2];
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

function drawRect(x: number, y: number, w: number, h: number, color: string | CanvasGradient | CanvasPattern) {
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
                drawTexture(texName, TILE_OFFSET[0] + x * SIDE_LENGTH + TOOLBOX_WIDTH + (1 - PLAYER_SIZE) * SIDE_LENGTH / 2, TILE_OFFSET[1] + y * SIDE_LENGTH + (1 - PLAYER_SIZE) * SIDE_LENGTH / 2, SIDE_LENGTH * PLAYER_SIZE, SIDE_LENGTH * PLAYER_SIZE);
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
        drawText((tileDimension + 1) + "", TOOLBOX_WIDTH - 48 - 24 + 44 / 2, HEIGHT - 48 - 12 + 48 / 2, "#272727", false, "#eeeeee", true, 40);
    }

    drawTexture("load_down", TOOLBOX_WIDTH - 90 + 7.5, HEIGHT - (PLAY_H + 10) - 18, 18, 30);
    drawTexture("load_container", TOOLBOX_WIDTH - 90, HEIGHT - (PLAY_H + 10), 36, 20);

    drawTexture("load_up", TOOLBOX_WIDTH - 40 + 7.5, HEIGHT - (PLAY_H + 10) - 18, 18, 30);
    drawTexture("load_container", TOOLBOX_WIDTH - 40, HEIGHT - (PLAY_H + 10), 36, 20);

    if (SERVER_API && SERVER_DATA.canconnect) drawTexture("server", TOOLBOX_WIDTH - 40 + 15, HEIGHT - (PLAY_W + 10) - 50, 18, 30);
}

function tilesContain(block: Block) {
    return tilePosition(block).every(n => n >= 0);
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
    } catch (e) {
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

function registerCounter(id: string, info: CounterInfo) {
    EXTRA_COUNTERS.push(id);
    EXTRA_COUNTERS_INFO[id] = info;
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

function getGravity() {
    return REVERSE_GRAVITY;
}

function setGravity(gravity: boolean) {
    REVERSE_GRAVITY = gravity;
}

function invertGravity() {
    REVERSE_GRAVITY = !REVERSE_GRAVITY;
}

function getPlayerSize() {
    return PLAYER_SIZE;
}

function setPlayerSize(size: number) {
    PLAYER_SIZE = size;
}

function incrementCurrentCounter(id: string, decrement?: boolean) {
    COUNTER["current_" + id + "s"] += decrement ? -1 : 1;
}

function setCurrentCounter(id: string, value: number) {
    COUNTER["current_" + id + "s"] = value;
}

function getJSON(url: string) {
    return new Promise((resolve, reject) => {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'json';
        xhr.onload = function() {
            if (xhr.responseURL == url) {
                if (xhr.status === 200) {
                    resolve(xhr.response);
                } else {
                    reject(xhr.response);
                }
            } else {
                getJSON(xhr.responseURL).then(resolve);
            }
        };
        xhr.send();
    });
}

function attemptToSaveLevel() {
    console.log("Saving level...")
    // Save current workspace.
    let level = saveLevel(true) as ServerLevel;
    delete level.verified;
    const data = JSON.stringify(level);
    sessionStorage.setItem("level", data);
}

function attemptToLoadRecoveredLevel() {
    let level = sessionStorage.getItem("level");
    if (!level) return;
    try {
        let recovered = JSON.parse(level) as Level;
        loadLevel(recovered);
        sessionStorage.removeItem("level");
    } catch(e) {
        console.warn("Unable to load recovered level.", e);
    }
}

init();

export {
    finishLevel,
    killPlayer,
    tilePositions,
    collectTile,
    getCurrentCounter, getMaxCounter, registerCounter,
    getSpawnInfo, getPlayerPosition,
    setSpawnInfo, setPlayerPosition,
    getGravity, setGravity, invertGravity,
    getPlayerSize, setPlayerSize,
    incrementCurrentCounter, setCurrentCounter,
    playSound
};

function saveAndReload() {
    attemptToSaveLevel();
    window.location.replace(window.location.href);
}