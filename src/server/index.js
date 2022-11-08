let express = require("express");
let bodyParser = require("body-parser");
let app = express();
let limit = require("express-rate-limit");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken")
const privateKey = require("./secret.json")['private_key'];
if (!privateKey) {
    console.error("You must create `./secret.json` with {\"private_key\": \"*your key*\"}");
    process.exit(1);
}

let fs = require("fs");

const RECENT_MAX = 20;
const SAVE_INTERVAL = 120 * 1000; // 120 secs

if (!fs.existsSync("./data.json")) fs.writeFileSync("./data.json", JSON.stringify({
    levels: [],
    accounts: {}
}))

let data = require("./data.json");
const info = require("./info.json");

// app.use(require("cookie-parser")());
app.use(bodyParser.urlencoded({
    extended: true,
    limit: "500kb"
}));
app.use(bodyParser.json({
    limit: "500kb"
}));
app.use(cors());

const newAccountLimit = limit({
    windowMS: 3600 * 1000, // 1 hour.
    maxLimit: 2,
    standardHeaders: true,
    legacyHeaders: false,
    message: JSON.stringify({"status": "exceeded_rate_limit"})
});

const loginAccountLimit = limit({
    windowMS: 5 * 60 * 1000, // 5 min.
    maxLimit: 1,
    standardHeaders: true,
    legacyHeaders: false,
    message: JSON.stringify({"status": "exceeded_rate_limit"})
});

app.post("/account/login", loginAccountLimit, function (req, res) {
    const token = req.headers['x-access-token'];
    const result = validateToken(token);
    if (result === null) {
        res.status(400).send({status: "invalid_parameters"});
    } else if (result === false) {
        res.status(401).send({status: "invalid_token"});
    } else {
        res.status(200).send({status: "success", id: result.id})
    }
});

function validateToken(token) {
    if (!token) return null;
    try {
        return jwt.verify(token, privateKey);
    } catch {
        return false;
    }
}

app.post("/account/new", newAccountLimit, function (req, res) {
    // Params: `name` and `password`
    const { login } = req.query;
    const name = req.headers['account-name'];
    const password = req.headers['account-password'];
    const logging = typeof login !== "undefined";
    if (!name || !password) {
        res.status(400).send({status: "invalid_parameters"});
    } else if (!logging && data.accounts[name]) {
        res.status(400).send({status: "user_already_taken"});
    } else if (!logging && password.length < 8 || password.length > 20) {
        res.status(400).send({status: "password_too_short_or_long"})
    } else if (logging && !data.accounts[name]) {
        res.status(401).send({status: "invalid_account"})
    } else {
        if (logging) {
            bcrypt.compare(password, data.accounts[name].password, (err, result) => {
                if (err) {
                    res.status(500).send({status: "server_error"});
                    return;
                }
                if (result) {
                    jwt.sign({ id: name }, privateKey, {
                        expiresIn: 86400 * 7 // Week
                    }, (err, token) => {
                        if (err) {
                            res.status(500).send({status: "server_error"});
                            return;
                        }
                        res.status(200).send({status: "success", token});
                    })
                } else {
                    res.status(401).send({status: "invalid_account"});
                }
            });
            return;
        }
        bcrypt.hash(password, 10, (err, hash) => {
            if (err) {
                res.status(500).send({status: "server_error"});
                return;
            }
            jwt.sign({ id: name }, privateKey, {
                expiresIn: 86400 * 7 // Week
            }, (err, token) => {
                if (err) {
                    res.status(500).send({status: "server_error"});
                    return;
                }
                data.accounts[name] = {
                    password: hash,
                    loved: []
                }
                res.status(200).send({status: "success", token});
            })
        });
    }
})

app.get("/recent", function (req, res) {
    // Get the most recent levels.
    const recent = JSON.stringify(data.levels.slice(-RECENT_MAX).reverse().map(importantInfoPerLevel));
    res.status(200).send(recent)
})

function importantInfoPerLevel(level) {
    return {
        dimensions: level.tiles.filter(d => d !== null).length,
        height: level.height,
        width: level.width,
        owner: level.owner,
        author: level.author,
        title: level.title,
        verified: level.verified,
        views: level.views,
        id: level.id,
        plays: level.plays,
        loves: level.loves
    }
}

app.get("/search", function (req, res) {
    let {query} = req.query;
    if (!query) query = "";
    if (query && query.startsWith("#")) {
        const level = data.levels[query.slice(1)];
        res.status(200).send(level ? JSON.stringify([level]) : "[]");
        return;
    }
    const searched = JSON.stringify(data.levels.filter(l => l.title && (l.title.toLowerCase().includes(query.toLowerCase()) || (l.owner || l.author || "Unknown").toLowerCase().includes(query.toLowerCase()))).sort((l1, l2) => l2.loves - l1.loves));
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

app.get("/play", function (req, res) {
    const {id} = req.query;
    if (!data.levels[id]) {
        res.status(404).send({error: "level_not_found"});
        return;
    }
    data.levels[id].plays++;
    res.status(200).send(data.levels[id]);
});

app.get("/info", function (req, res) {
    res.status(200).send(info)
})

app.post("/account/loved", function (req, res) {
    const {id} = req.query;
    const token = req.headers['x-access-token'];

    if (!token) {
        res.status(400).send({error: "no_token"});
        return;
    }

    if (!data.levels[id]) {
        res.status(404).send({error: "level_not_found"});
        return;
    }

    const owner = validateToken(token);

    if (!owner) {
        res.status(401).send({error: "invalid_token"});
        return;
    }

    res.status(200).send({loved: data.accounts[owner.id].loved.includes(id)})
})

app.post("/account/love", function (req, res) {
    const {id, mode} = req.query;
    const token = req.headers['x-access-token'];

    if (mode !== "love" && mode !== "unlove") {
        res.status(400).send({error: "invalid_mode"});
        return;
    }

    if (!token) {
        res.status(400).send({error: "no_token"});
        return;
    }

    if (!data.levels[id]) {
        res.status(404).send({error: "level_not_found"});
        return;
    }

    let owner = validateToken(token);

    if (!owner) {
        res.status(401).send({error: "invalid_token"});
    }

    owner = owner.id;

    if (mode === "love" && !data.accounts[owner].loved.includes(id)) {
        data.levels[id].loves++;
        data.accounts[owner].loved.push(id);
    } else if (mode === "unlove" && data.accounts[owner].loved.includes(id)) {
        data.levels[id].loves--;
        data.accounts[owner].loved.splice(data.accounts[owner].loved.indexOf(id), 1);
    }

    res.status(200).send({status: "successful"})
})

app.post("/post", successPostLimit, postLimit, function (req, res) {
    // Validate the level.
    const level = req.body;

    if (!level) {
        res.status(400).send(JSON.stringify({error: "no_level"}));
        return;
    }

    const token = req.headers['x-access-token'];
    let owner, result = validateToken(token);

    if (token) {
        if (result === false) {
            res.status(500).send({status: "invalid_token"});
        } else {
            owner = result.id;
        }
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
    level.loves = 0;
    if (owner) {
        level.owner = owner;
        delete level.author;
    }

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
    let validity = isNumValidLevel(level);
    return validity === 0;
}

function isNumValidLevel(level) {
    if (!level.width || typeof level.width !== "number" || level.width < 3) return -1;
    if (!level.height || typeof level.height !== "number" || level.height < 3) return -2;
    if (typeof level.friction !== "number" && typeof level.friction !== "undefined") return -3;
    if (Array.isArray(level.max) || level.max === null || typeof level !== "object" || Object.values(level.max).some(v => typeof v !== "number")) return -4;
    if (!Array.isArray(level.mods) && typeof level.mods !== "undefined") return -5;
    if (Object.values(level.mods).some(v => typeof v !== "string")) return -6;
    if (!level.tiles || level.tiles.length < 1 || !Array.isArray(level.tiles)) return -7;
    let {tiles, width, height} = level;
    width -= 2;
    height -= 2;
    for (let z = 0; z < tiles.length; z++) {
        if (tiles[z] === null) continue;
        if (!Array.isArray(tiles[z])) return -8;
        if (tiles[z].length !== height) return -9;
        for (let y = 0; y < height; y++) {
            if (!Array.isArray(tiles[z][y])) return -10;
            if (tiles[z][y].length !== width) return -11;
            for (let x = 0; x < width; x++) {
                if (typeof tiles[z][y][x] !== "string" && typeof tiles[z][y][x] !== "number") return -12;
            }
        }
    }
    return 0;
}

function saveLevels() {
    console.log("Autosaving.")
    try {
        if (fs.existsSync("data_old.json")) fs.unlinkSync("data_old.json");
        fs.renameSync("data.json", "data_old.json");

        fs.writeFileSync("data.json", JSON.stringify(data));
    } catch(e) {
        console.log("Could not save files.", e);
    }
}