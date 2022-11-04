# tile-editor
A recreation of a Scratch game of tiles 'Tile Game'!

# Installation
You must install `node` (`npm` should be included) before testing this project.
After that, go to the project directory `tile-editor` and run `npm install`/`npm i`

# Development server
Run `npm start`/`npm run start` in the project directory to run a webpack server. Each change in the game's code should reload the webpage (except for mods). Press `^C` to stop the server.

# Build
Run `npm run build` to start building in production. It will at most take a minute to finish. After that, some new files and folders generate.

## Folders
`assets` - This contains all the hash-named assets.\
`mods` - This is copied from the `src` folder. This contains example mod files and documentation.\
`zip` - This contains a zip file which has almost the same contents as the build folder (not the `zip` folder though.)

## Files
`bundle.js` - This contains all the code for this game.\
`favicon.ico` - This is the icon for the browser tab.\
`index.html` - This is the webpage of the game. However, this only contains the frame of the actual webpage and `bundle.js` will fill the rest (like canvas for example).
