let express = require("express");
let bodyParser = require("body-parser");
let app = express();
let limit = require("express-rate-limit");
const cors = require("cors");

let fs = require("fs");

const RECENT_MAX = 20;
const SAVE_INTERVAL = 30 * 1000; // 30 secs

if (!fs.existsSync("./data.json")) fs.writeFileSync("./data.json", JSON.stringify({
    levels: []
}))

let data = require("./data.json");
const info = require("./info.json");

// app.use(require("cookie-parser")());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(cors());

app.get("/recent", function (req, res) {
    // Get the most recent levels.
    const recent = JSON.stringify(data.levels.slice(-RECENT_MAX));
    res.status(200).send(recent)
})

app.get("/search", function (req, res) {
    const {query} = req.query
    if (query && query.startsWith("#")) {
        const level = data.levels[query.slice(1)];
        res.status(200).send(level ? JSON.stringify([level]) : "[]");
        return;
    }
    const searched = JSON.stringify(data.levels.filter(l => l.title && (l.title.toLowerCase().includes(query.toLowerCase())||l.author.toLowerCase().includes(query.toLowerCase()))).sort((l1, l2) => l2.plays - l1.plays));
    res.status(200).send(searched);
})

const successPostLimit = limit({
    windowMS: 5 * 60 * 1000, // 5 minutes,
    max: 1, // 1 time
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: JSON.stringify({"error": "success_rate_limit_exceeded"}),
    skipFailedRequests: true
});

const postLimit = limit({
    windowMS: 5 * 60 * 1000,
    max: 10, // 7 times
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: JSON.stringify({"error": "rate_limit_exceeded"})
})

const playLimit = limit({
    windowMS: 15000,
    max: 1,
    standardHeaders: true,
    legacyHeaders: false,
    message: JSON.stringify({"counted": false})
})

app.get("/play", playLimit, function (req, res) {
    const {id} = req.query;
    if (!data.levels[id]) {
        res.status(400).send(JSON.stringify({"counted": false}));
        return;
    }
    data.levels[id].plays++;
    res.status(200).send(JSON.stringify({"counted": true}));
});

app.get("/info", function (req, res) {
    res.status(200).send(info)
})

app.post("/post", successPostLimit, postLimit, function (req, res) {
    // Validate the level.
    const level = req.body;

    if (!level) {
        res.status(400).send(JSON.stringify({error: "no_level"}));
        return;
    }

    try {
        if (!isValidLevel(level)) throw new Error();
    } catch {
        res.status(400).send(JSON.stringify({error: "invalid_level"}))
        return;
    }

    if (!level.title) level.title = "Level";
    if (!level.author) level.author = "Unknown";
    level.plays = 0;
    level.id = data.levels.length;

    data.levels.push(level);

    res.status(200).send(JSON.stringify({status: "success", id: level.id}))
})

process.on("SIGINT", function() {
    console.log("Shutting down... Please wait.");
    saveLevels();
    process.exit();
});

app.listen(8080, () => {
    console.log("Listening on port 8080");
});

setInterval(saveLevels, SAVE_INTERVAL);

function isValidLevel(level) {
    if (!level.width || typeof level.width !== "number" || level.width < 3) return false;
    if (!level.height || typeof level.height !== "number" || level.height < 3) return false;
    if (typeof level.friction !== "number" && typeof level.friction !== "undefined") return false;
    if (Array.isArray(level.max) || level.max === null || typeof level !== "object" || Object.values(level.max).some(v => typeof v !== "number")) return false;
    if (!Array.isArray(level.mods) && typeof level.mods !== "undefined") return false;
    if (Object.values(level.mods).some(v => typeof v !== "string")) return false;
    if (!level.tiles || level.tiles.length < 1 || !Array.isArray(level.tiles)) return false;
    let {tiles, width, height} = level;
    width -= 2;
    height -= 2;
    for (let z = 0; z < tiles.length; z++) {
        if (tiles[z] === null) continue;
        if (!Array.isArray(tiles[z])) return false;
        if (tiles[z].length !== height) return false;
        for (let y = 0; y < height; y++) {
            if (!Array.isArray(tiles[z][y])) return false;
            if (tiles[z][y].length !== width) return false;
            for (let x = 0; x < width; x++) {
                if (typeof tiles[z][y][x] !== "string" && typeof tiles[z][y][x] !== "number") return false;
            }
        }
    }
    return true;
}

function saveLevels() {
    console.log("Now saving levels.")
    try {
        if (fs.existsSync("data_old.json")) fs.unlinkSync("data_old.json");
        fs.renameSync("data.json", "data_old.json");

        fs.writeFileSync("data.json", JSON.stringify(data));
    } catch(e) {
        console.log("Could not save files.", e);
    }
}