# Levels
You can load your own JSON levels with two ways:

1) Use the `Load` button

2) Put a URL parameter `level`

Like: `path/to/tile-editor?level=<your level code>`

# Sample levels
Sample levels in this folder (`levels`) can be loaded by preceding its name with an astrick `*`\
For example: to load `src/levels/gravity_trash.json`, use level code `*gravity_trash`.

# Internet levels
Internet levels should be accessible by a link. They can be loaded by preceding its name with an at sign `@`\
Suppose you want to load a level like `https://example.com/path/to/level.json`,\
the level code would be `@https://example.com/path/to/level.json`.

# Special levels
Special levels can be loaded by preceding its name with a dollar sign `$`\
Here is a list of special levels:

| Special Level | Description               |
|---------------|---------------------------|
| `random`      | Use a JSON template to generate a random level (doesn't change though) |

# Saved levels
For other levels, directly put/paste their (JSON) contents.
For example: to load code `{...<code>...}`, use level code `{...<code>...}`.

# Server levels
If you're connected to a server and you want to load a server level from ID, the level can be loaded by preceding its name with an hashtag `#`.