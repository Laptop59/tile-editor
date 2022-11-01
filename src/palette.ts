type Slot = string | null;

const palette: [Slot, boolean][] = []
.concat(
    ///
auto([
    // Page 1
    "air",
    "ground",
    "player",
    "finish",
    "lava",
    "spring",
    "checkpoint",
]),
manual([
    "star",
]),
auto([
    // Page 2

    "left",
    "right",
    "gravity",
    null,
    "star_lock",
    "star_unlock",
    null,
    null
]),
...["hexagon", "triangle", "circle", "square"].map(newExpandablePack)
);

const onlyOnceArr = [
    "player"
];

function newExpandablePack(str: string) {
    return [
        [str, true],
        [null],
        [str + "_lock", false],
        [str + "_unlock", false],
        [str + "_in", false],
        [str + "_out", false],
        [null],
        [null]
    ]
}

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