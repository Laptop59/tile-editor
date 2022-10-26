// Define the interface for texture entries!
interface textureEntry {
    readonly id: string,
    readonly x: number,
    readonly y: number,
    readonly w: number,
    readonly h: number
}

// All of them are defined here:
const textureAtlas: textureEntry[] = [
    {
        id: "logo",
        x: 0,
        y: 0,
        w: 218,
        h: 34
    }
];

export default textureAtlas;