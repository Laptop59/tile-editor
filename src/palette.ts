type Slot = string | null;

const palette: [Slot, boolean][] = auto([
    // Page 1
    "air",
    "ground",
    "player",
    "finish",
    "lava",
    "spring",
    "checkpoint",
]).concat(manual([
    "star",
]));

const onlyOnceArr = [
    "player"
];

function onlyOnce(name: string) {
    return onlyOnceArr.indexOf(name) != -1;
}

function auto(arr: Slot[]): [Slot, boolean][] {
    return arr.map((p: Slot) => [p, false]);
}

function manual(arr: Slot[]): [Slot, boolean][] {
    return arr.map((p: Slot) => [p, true]);
}

export {
    palette as default,
    onlyOnce
}