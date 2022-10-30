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
    null,
    null,
    null,
    null,
    null,
    null
]),
auto([
    "hexagon",
    "hexagon_lock",
    "triangle",
    "triangle_lock",
    "circle",
    "circle_lock",
    null,
    null
])
);

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