import "./style.css";
import textures from "./textures.png";
import textureAtlas from "./atlas";

// Constants
const WIDTH: number = 1280;
const HEIGHT: number = 720;
const ASPECT_RATIO: number = WIDTH/HEIGHT;
const TOOLBOX_WIDTH: number = WIDTH * 0.25;

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let textureImg: HTMLImageElement;

function init(): void {
    canvas = document.createElement("canvas");
    canvas.innerText = "Canvas is not supported.";
    ctx = canvas.getContext("2d");
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    setCanvas();

    textureImg = new Image();
    textureImg.src = textures;

    document.body.appendChild(canvas);
    window.requestAnimationFrame(tick);
}

function tick(): void {
    setCanvas();

    drawRect(0, 0, WIDTH, HEIGHT, "white");
    drawRect(0, 0, TOOLBOX_WIDTH, HEIGHT, "#505050");

    drawTexture("logo", 10, 10, 395, 65);

    window.requestAnimationFrame(tick);
}

function setCanvas(): void {
    let width, height: number;
    if (window.innerHeight * ASPECT_RATIO < window.innerWidth) {
        height = window.innerHeight;
        width = window.innerHeight * ASPECT_RATIO;
    } else {
        width = window.innerWidth;
        height = window.innerWidth / ASPECT_RATIO;
    }
    canvas.style.height = height + "px";
    canvas.style.width = width + "px";
    // Do the centering.
    canvas.style.top = (window.innerHeight - height) / 2 + "px";
    canvas.style.left = (window.innerWidth - width) / 2 + "px";
}

function drawRect(x: number, y: number, w: number, h: number, color: string) {
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.fillStyle = color;
    ctx.fill();
}

function drawTexture(id: string, dx: number, dy: number, dw: number, dh: number) {
    const {x, y, w, h} = textureAtlas.find(o => o.id == id);
    ctx.drawImage(textureImg, x, y, w, h, dx, dy, dw, dh);
}

init();