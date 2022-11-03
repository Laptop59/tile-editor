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

type BlockCode = {
    getTexture: ((x?: number, y?: number) => string) | string,
    isCollidable: ((x?: number, y?: number) => boolean) | boolean,
    onCollision: (() => void) | null | undefined,
    save: string
};

let atlasNum = 0;
let blockID = -1;

interface ModInfo {
    palette: {id: string, outlined: boolean}[],
    atlases: {[key: string]: string},
    textures: {[key: string]: {
        atlas: string,
        x: number,
        y: number,
        w: number,
        h: number
    }},
    blocks: {id: string, save: string, code: BlockCode}[]
}

let temp: TemporaryObject;

async function loadMods(mods: string[], orig: TemporaryObject) {
    temp = orig;
    return Promise.all(mods.map(loadMod)).then(() => temp);
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

        temp.palette = palette.concat(info.palette.map((o: {id: string, outlined: boolean}) => o ? [o.id, !o.outlined] : [null, false]));
        
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

export {
    loadMods as default,
    BlockCode
};