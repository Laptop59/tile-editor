import atlas from "./atlas.json";

// Define the interface for texture entries!
interface textureEntry {
    readonly id: string,
    readonly x: number,
    readonly y: number,
    readonly w: number,
    readonly h: number
}

// All of them are defined here:
// `atlas.json` contains the whole atlas!
const textureAtlas: textureEntry[] = atlas;

export default textureAtlas;