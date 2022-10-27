type Slot = string | null;

const palette: [Slot, boolean][] = auto([
    "air",
    "ground",
    "player",
    "finish",
    null,
    null,
    //null,
    //null
]);

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