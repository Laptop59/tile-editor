import API from "./api";
import palette, { Slot } from "./palette";
import atlas, {extraTextureEntry} from "./atlas";

type TemporaryObject = {
    palette: [Slot, boolean][],
    extraAtlases: [{[key: number]: HTMLImageElement}, {[key: string]: extraTextureEntry}],
    blockFunctions: {[key: string]: BlockCode},
    blockTable: {[key: string]: number},
    blockCodes: {[key: string]: string | number}
};

import GravityLocks from "./mods/gravity_locks";

const vanillaMods = [
    GravityLocks
];

let atlasNum = 0;
let blockID = -1;

let temp: TemporaryObject;

async function loadMods(mods: string[], orig: TemporaryObject) {
    temp = orig;
    loadVanillaMods();
    return Promise.all(mods.map(loadMod)).then(() => temp);
}

function loadVanillaMods() {
    for (let vmod of vanillaMods) {
       registerModClass(vmod);
    }
}

async function loadMod(mod: string): Promise<void> {
    return new Promise((resolve) => {
        let code;
        try {
            code = Import(mod);
        } catch(e) {
            resolve(console.error("Couldn't load mod ", mod, e));
        }
        code.then(plaincode => {
            // Run eval
            let class_code = eval(plaincode);
            
            registerModClass(class_code);
            resolve();
        }).catch(err => {
            console.error("Error while loading mod ", mod, err);
            resolve();
        })
    })
}

function Import(path: string) {
    return fetch(path).then(r => r.text()).catch(e => {throw new Error(e)})
}

function registerModClass(mod: any) {
    const instance = new mod(API);

    let info: ModInfo;
    try {
        info = instance.getInfo();
        // There are four things to handle:
        
        // Palette
        // Blocks
        // Atlases
        // Textures

        let newp: [string|null, boolean][] = [];

        for (let p of info.palette) {
            let slot: [string, boolean] = p ? [p.id, !p.outlined] : [null, false];
            if (p.replace && temp.palette.length > p.replace) {
                temp.palette[p.replace] = slot;
            } else {
                newp.push(slot);
            }
        }

        temp.palette = temp.palette.concat(newp);
        
        let mapping: {[key: string]: number} = {};

        Object.keys(info.atlases).forEach((id: string, i: number) => {
            const img = new Image();
            const src = info.atlases[id];
            img.src = src;
            mapping[id] = atlasNum;
            temp.extraAtlases[0][atlasNum++] = img;
        });

        for (let i in info.textures) {
            let t: any = info.textures[i];
            t.atlas = mapping[t.atlas];

            temp.extraAtlases[1][i] = t as extraTextureEntry;
        };

        for (let b of info.blocks) {
            const {id} = b;
            temp.blockCodes[id] = b.save;
            temp.blockFunctions[id] = b.code;
            temp.blockTable[id] = blockID--;
        }
    } catch(e) {
        console.error("Error while initializing mod", mod);
    }
}

export default loadMods;