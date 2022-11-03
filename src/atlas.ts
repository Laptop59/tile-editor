import atlas from "./atlas.json";

// Define the interface for texture entries!
interface textureEntry {
    readonly id: string,
    readonly x: number,
    readonly y: number,
    readonly w: number,
    readonly h: number
}

// Define another interface for extra texture entries!
interface extraTextureEntry {
    readonly atlas: number,
    readonly x: number,
    readonly y: number,
    readonly w: number,
    readonly h: number
}

// All of them are defined here:
// `atlas.json` contains the whole atlas!
const textureAtlas: textureEntry[] = atlas.textures || [];
const expandableAtlas: string[] = atlas.expandable || [];

export {
    textureAtlas as default,
    expandableAtlas,
    extraTextureEntry
}