# How to run the server

To start the server, **go to the server directory and run `node .`**\
You cannot run the server from directories outside.

Levels save every `30 seconds`.

If you want to change the title and colour of the server,
change it in `info.json` and restart the server.

# `info.json`
```json
    {   
        // This is the title shown by the server.
        "title": "My Server Title",

        // This is the colour used by the title.
        "colour": "#453192",

        // The welcome message shown when the user is logged on.
        "welcome": "Hello, %user%!",

        // The server's version.
        "version": "1.2.0",

        // What versions are also allowed.
        // Might be useful for some servers.
        // Note, "allowed" will not show warnings for versions <=1.1.1! [1.0.0 or 1.1.0 or 1.1.1]
        "allowed": ["1.1.1"],

        // Or, allow all versions:
        // Note, "allowed" will not show warnings for versions <=1.1.1! [1.0.0 or 1.1.0 or 1.1.1]
        "allowed": "*"
    }
```

# How to connect to the server

Use the `server` parameter followed by the address of the server (with no slash afterwards)

Example: If the server is at `http://localhost:8080/`,
you have to connect to it with the webpage path `path/to/tile-editor?server=http://localhost:8080`.