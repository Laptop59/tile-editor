import { Level } from "./util";

class ServerWorker {
    public endpoint: string = undefined;
    private cooldown: Date | null = null;
    protected SUBMIT_COOLDOWN = 5 * 60 * 1000;
    public title: string = "Unnamed Server";
    public colour: string = "#eeeeee";
    private connected: () => void = undefined;

    constructor(endpoint: string, connected?: () => void) {
        this.endpoint = endpoint;
        if (connected) this.connected = connected;
        this.fetchTable();
    }

    private fetchTable() {
        return new Promise<void>((resolve) => {
            fetch(this.endpoint + "/info", {
                method: "GET"
            })
            .then(r => r.json())
            .then(info => {
                this.title = info.title || this.title;
                this.colour = info.colour || "white";
                this.connected?.();
                resolve();
            })
            .catch(() => {
                this.connected?.();
                resolve();
            });
        });
    }

    /**
     * Get information about the server.
     */
    serverInfo() {
        return {
            title: this.title,
            colour: this.colour
        }
    }

    /**
     * Fetch the 10 most recent levels.
     */
    getRecent() {
        return new Promise<Level[]>((resolve, reject) => {
            fetch(this.endpoint + "/recent", {
                method: "GET"
            })
                .then(r => r.json())
                .then(resolve)
                .catch(reject);
        })
    }

    /**
     * Search for levels with query
     */
    search(query: string) {
        return new Promise<Level[]>((resolve, reject) => {
            fetch(this.endpoint + "/search?query=" + encodeURIComponent(query), {
                method: "GET"
            })
            .then(r => r.json())
            .then(resolve)
            .catch(reject);
        })
    }

    /**
     * Count as a play
     */
    play(id: number) {
        return new Promise<void>((resolve, reject) => {
            fetch(this.endpoint + "/play?id=" + id, {
                method: "GET"
            })
            .then(r => r.json())
            .then(resolve)
            .catch(reject);
        })
    }

    /**
     * Shortens a title.
     * @param title The title
     * @returns Shortened title
     */
    shorten(title: string) {
        // Maximum length: 25
        if (title.length >= 25) {
            return title.slice(0, 22) + "...";
        } else {
            return title;
        }
    }

    /**
     * Format a level's playing count.
     */
    formatViews(level: Level) {
        const num = level.plays || 0;
        let str: string = num + "";
        if (num < 1000) return str + "";
        if (num < 100000) return str.slice(0, str.length - 3) + "," + str.slice(-3);
        if (num < 1000000) return (num / 1000).toFixed(1) + "K";
        return (num / 1000000).toFixed(3) + "M";
    }

    /**
     * Convert level to string for showcasing its size.
     */
    levelSize(level: Level) {
        function B(num: number): string {
            return typeof num === "number" ? (num > 99 ? '*' : (num + "")) : '?';
        }

        return `${B(level.width)}×${B(level.height)}×${B(level.tiles.filter(l => l !== null).length)}`;
    }

    /**
     * Submit a level to the servers.
     * @returns Numberic ID of the level if successful, otherwise `null`.
     */
    submitLevel(level: Level): Promise<number | null> {
        return new Promise<number | null>((resolve) => {
            fetch(this.endpoint + "/post", {
                method: "POST",
                body: JSON.stringify(level),
                headers: {
                    'Content-Type': 'application/json'
                }
            })
                .then(r => r.json())
                .then(r => {
                    if (r.id) this.cooldown = new Date();
                    resolve(r.id ?? null)
                })
                .catch(() => resolve(null));
        })
    }

    /**
     * Checks if there should currently be a cooldown.
     */
    cooldownSubmit() {
        if (this.cooldown === null) return false;
        return new Date().getTime() - this.cooldown.getTime() <= this.SUBMIT_COOLDOWN;
    }
}

export default ServerWorker;