let HELD: { [key: string]: boolean } = {
    left: false,
    up: false,
    right: false
};

/**
 * Edits the HELD object.
 * @param down If the key was pressed down (and not up)
 * @param e The keyboard event.
 */
function handleKey(down: boolean, e: KeyboardEvent) {
    switch (e.key) {
        case "a":
        case "ArrowLeft":
        case "Left":
            HELD.left = down;
            break;
        case "d":
        case "ArrowRight":
        case "Right":
            HELD.right = down;
            break;
        case "w":
        case "ArrowUp":
        case "Up":
        case " ":
        case "Spacebar":
            HELD.up = down;
    }
}

function getParameter(name: string) {
    const url = new URL(document.location.href);
    return url.searchParams.get(name);
}

export {
    handleKey, HELD,
    getParameter
}