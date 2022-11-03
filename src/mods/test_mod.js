// @ts-check

class TestMod {
    /**
     * Our constructor to use to initialize this mod!
     * @param {API} API The API to use 
     */
    constructor(API) {
        // Setup the API for use.
        /**
         * @type {API}
         */
        this.API = API;
        this.goldCollision = this.goldCollision.bind(this);
        this.crystalCollision = this.crystalCollision.bind(this);

        this.API.registerCounter("crystal", {
            colour: "#aaffff",
            dark_colour: "#004444",
            shown: true,
            icon: "crystal_logo",
            getMax: () => this.API.tilePositions(this.API.getBlockFromID("crystal")).length ** 3,
            showCounter: () => this.API.tilePositions(this.API.getBlockFromID("crystal")).length > 0
        });
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
                {
                    id: "crystal",
                    outlined: true
                },
                null,
                null,
                null
            ],
            blocks: [
                {
                    id: "black",
                    save: "test_B",
                    code: {
                        getTexture: "block_black",
                        isCollidable: true
                    }
                },
                {
                    id: "gold",
                    save: "test_G",
                    code: {
                        getTexture: "block_gold",
                        isCollidable: false,
                        onCollision: this.goldCollision
                    }
                },
                {
                    id: "crystal",
                    save: "test_C",
                    code: {
                        getTexture: "block_crystal",
                        isCollidable: false,
                        onCollision: this.crystalCollision
                    }
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
                block_crystal: {
                    atlas: "atlas",
                    x: 3,
                    y: 0,
                    w: 1,
                    h: 1
                },
                crystal_logo: {
                    atlas: "atlas",
                    x: 0,
                    y: 1,
                    w: 4,
                    h: 5
                }
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

    goldCollision() {
        if (Math.random() < 0.01) this.API.finishLevel()
        else if (Math.random() < 0.01) this.API.killPlayer();
        this.API.playSound("checkpoint")
    }

    crystalCollision() {
        this.API.incrementCurrentCounter("crystal");
        this.API.playSound("collect");
    }
}

// Export our TestMod
TestMod;