import gravityImg from "./gravity_locks_atlas.png";

let API: API;

class GravityLocks {
    constructor(api: API) {
        API = api;
    }

    getInfo(): ModInfo {
        return {
            palette:  [
                {
                    id: "gravity_lock",
                    outlined: true,
                    replace: 14
                },
                {
                    id: "gravity_unlock",
                    outlined: true,
                    replace: 15
                }
            ],
            atlases: {
                gravity: gravityImg
            },
            textures: {
                block_gravity_lock: {
                    atlas: "gravity",
                    x: 0,
                    y: 0,
                    w: 64,
                    h: 64
                },
                block_gravity_unlock: {
                    atlas: "gravity",
                    x: 64,
                    y: 0,
                    w: 64,
                    h: 64
                }
            },
            blocks: [
                {
                    id: "gravity_lock",
                    save: "GVl",
                    code: {
                        getTexture: function() {
                            return "block_gravity_" + (API.getGravity() ? "un" : "") + "lock";
                        },
                        isCollidable: function() {
                            return !API.getGravity();
                        }
                    }
                },
                {
                    id: "gravity_unlock",
                    save: "GVu",
                    code: {
                        getTexture: function() {
                            return "block_gravity_" + (API.getGravity() ? "" : "un") + "lock";
                        },
                        isCollidable: function() {
                            return API.getGravity();
                        }
                    }
                }
            ]
        }
    }
}

export default GravityLocks;