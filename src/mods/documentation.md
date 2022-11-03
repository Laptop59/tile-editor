# Mods
Mods can add new blocks to the game! Here is how you can create mods for use and also how to use them.

## Use

### With parameter `mods`
To use mods, put a URL parameter `mods` with all the mod script links you want to load, separated by a `,`.

For example: `path/to/tile-editor?mods=https://example.com/mod1.js,https://example.com/mod2.js`

### With parameter `modpacks`
To use modpacks (each a JSON array of links to mod script files), put a URL parameter `modpacks` with all the modpack links separated by a `,`.

For example: `path/to/tile-editor?modpacks=https://example.com/modpack.json`

## Create
To create a mod, you must put code into a file, as well as make it publicly accessible in a link.

### Tutorial
Create a new JavaScript, like `mod.js`.
In the file, create any class with a name like for example, `Mod` and you MUST add the variable as the last statement of the file, as it will be executed by `eval`!

For example:
```js
class Mod {
    // ...
}

/**
    Your other code
    blah blah blah
**/

// Very important here!!
Mod;
```

This class is your starting point.
First, you need to add the constructor (because classes)
It has to store the API parameter to the class `this`
```js
class Mod {
    constructor(API) {
        // Set the API
        this.API = API;
    }
}
// ...
```

This class also needs a method named getInfo! This is important; it stores all the information the game needs to use the mod.

Currently, an object of all this has to be returned:
`palette`,
`atlases`,
`textures`,
`blocks`

Structure:
```js
class Mod {
    constructor(API) {
        this.API = API;
    }

    getInfo() {
        return {
            palette: [],
            blocks: [],
            atlases: {},
            textures: {}
        }
    }
}

Mod;
```

## `palette`
`palette` is an array of an object with a stucture of `{id: string, outlined: boolean}` or just `null`.

For example, something like
```js
return {
    // ...
    palette: [
        {
            id: "block_1",
            outlined: true,
        },
        null,
        null,
        {
            id: "block_2",
            outlined: false
        }
    ]
    // ...
}
```
creates 4 new slots in the palette, the first one being outlined, the second and third being blank and the fourth being non-outlined.

## `atlases`
`atlases` is an object that defined all the atlases required for textures.

For example, we define an atlas of id `textures` via an image file `textures.png` in `example.com`:
```js
return {
    // ...
    atlases: {
        textures: "example.com/textures.png"
    }
    // ...
}
```

## `textures`
`textures` are related with `atlases`. It is another object that defines all textures form atlas.

For example, we define two textures, `texture1` and `texture2` from the atlas with an id `textures`,

```js
return {
    // ...
    textures: {
        texture1: {
            atlas: "textures",
            x: 0,
            y: 0,
            w: 100,
            h: 100
        },
        texture2: {
            atlas: "textures",
            x: 200,
            y: 100,
            w: 100,
            h: 100
        }
    }
    // ...
}
```

## `blocks`
`blocks` defines all the blocks in the mod in an array. Each block should have a structure like this:
```js
return {
    // ...
    blocks: [
        {
            id: "my_block_id", // The ID. This is used by the palette.
            save: "my_block_save_id", // This string will appear when you save the level! DO NOT CHANGE THIS AT ALL!
            code: {
                // `block_` should preceed all block texture names as good practice.
                getTexture: "block_texture" // This can also be a function accepting `x` and `y` parameters.
                isCollidable: false // This can also be a function accepting `x` and `y` parameters.
                onCollision: function() {
                    API.finishLevel() // This finishes the level for the player.
                } // This doesn't have to be defined.
            }
        }
    ]
    // ...
}
```

# API Documentation
API Documentation can be found on `declarations.d.ts`.