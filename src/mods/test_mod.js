class TestMod {
    /**
     * Our constructor to use to initialize this mod!
     * @param API The API to use 
     */
    constructor(API) {
        // Setup the API for use.
        this.API = API;
    }

    /**
     * Return an object about the mod information.
     */
    getInfo() {
        // Return our information.
        return {
            palette: [
                {
                    id: "black",
                    outlined: true
                },
                null,
                {
                    id: "gold",
                    outlined: false
                },
                null,
                null,
                null,
                null,
                null
            ],
            blocks: [
                {
                    id: "black",
                    save: "test_B",
                    code: this.Black()
                },
                {
                    id: "gold",
                    save: "test_G",
                    code: this.Gold()
                }
            ],
            atlases: {
                "atlas": "http://localhost:3000/mods/test_mod_atlas.png",
                // "unused": "bruh"
            },
            textures: {
                // It is best practice to preceed block textures with `block_`!
                block_black: {
                    atlas: "atlas",
                    x: 0,
                    y: 0,
                    w: 1,
                    h: 1
                },
                block_gold: {
                    atlas: "atlas",
                    x: 2,
                    y: 0,
                    w: 1,
                    h: 1
                },
                /* unused: {
                    atlas: "unused",
                    x: 0,
                    y: 0,
                    w: 0,
                    h: 0
                } */
            },
        }
    }

    /**
     * All the code for the black block.
     */
    Black() {
        return {
            getTexture: "block_black",
            isCollidable: true
        }
    }

    /**
     * All the code for the golden block.
     */
    Gold() {
        return {
            getTexture: function() {
                return "block_gold"
            },
            isCollidable: false,
            onCollision: function() {
                if (Math.random() < 0.01) API.finishLevel();
                else if (Math.random() < 0.01) API.killPlayer();
            }
        }
    }
}

// Export our TestMod
TestMod;