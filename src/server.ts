import { Level, PreviewServerLevel, ServerLevel } from "./util";

class ServerWorker {
    public endpoint: string = undefined;
    private cooldown: Date | null = null;
    private lovecooldown: Date | null = null;
    protected SUBMIT_COOLDOWN = 5 * 60 * 1000;
    protected LOVE_COOLDOWN = 5 * 1000;
    public title: string = "Unnamed Server";
    public colour: string = "#eeeeee";
    public welcome: string = "Welcome, %user%!";
    private connected: () => void = undefined;
    private usernamed: (username: string) => void = undefined;
    public username: string | null = null;
    private version: string;
    public work: boolean;
    public serverVersion?: string;

    constructor(endpoint: string, version: string, connected?: () => void, usernamed?: (username: string) => void) {
        this.endpoint = endpoint;
        this.version = version;
        if (connected) this.connected = connected;
        if (usernamed) this.usernamed = usernamed;
        this.fetchTable();
        this.setUsername();
    }

    private setUsername(): Promise<void> {
        const token = this.getCookie("token");
        if (!token) return;
        return new Promise<void>(resolve => {
            this.getAccountName(token)
                .then(username => this.username = username)
                .then(username => this.usernamed(username))
                .then(resolve);
        });
    }

    public formatVer(version: string) {
        return version ? ("v" + version) : "<=v1.1.1";
    }

    private fetchTable() {
        return new Promise<void>((resolve) => {
            fetch(this.endpoint + "/info", {
                method: "GET"
            })
                .then(r => r.json())
                .then(info => {
                    if (info.version !== this.version && !(info.allowed?.includes?.(this.version) || info.allowed === "*")) {
                        this.serverVersion = info.version;
                        console.warn(`Server version ${info.version} might not work with client version ${this.formatVer(this.version)}`);
                        this.work = false;
                    } else this.work = true;
                    this.title = info.title || this.title;
                    this.colour = info.colour || "white";
                    this.welcome = info.welcome || this.welcome;
                    this.connected?.();
                    resolve();
                })
                .catch(() => {
                    resolve();
                });
        });
    }

    /**
     * Register an account.
     */
    register(name: string, password: string): Promise<string | null> {
        return new Promise<string | null>((resolve) => {
            fetch(`${this.endpoint}/account/new`, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                    'Account-name': name,
                    'Account-password': password
                }
            })
                .then(r => r.json())
                .then(r => {
                    resolve(r.token ?? null);
                })
                .catch(() => resolve(null));
        });
    }

    /**
     * Login to an account
     */
    login(name: string, password: string): Promise<string | null> {
        return new Promise<string | null>((resolve) => {
            fetch(`${this.endpoint}/account/new?login`, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                    'Account-name': name,
                    'Account-password': password
                }
            })
                .then(r => r.json())
                .then(r => {
                    resolve(r.token ?? null);
                })
                .catch(() => resolve(null));
        });
    }

    /**
     * Get account name.
     */
    getAccountName(token: string): Promise<string | null> {
        return new Promise<string | null>((resolve) => {
            fetch(`${this.endpoint}/account/login`, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                    'x-access-token': token
                }
            })
                .then(r => r.json())
                .then(r => {
                    resolve(r.id ?? null);
                })
                .catch(() => resolve(null));
        });
    }

    /**
     * Get information about the server.
     */
    serverInfo() {
        return {
            title: this.title,
            colour: this.colour,
            welcome: this.welcome
        }
    }

    /**
     * Fetch the 10 most recent levels.
     */
    getRecent() {
        return new Promise<PreviewServerLevel[]>((resolve, reject) => {
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
        return new Promise<PreviewServerLevel[]>((resolve, reject) => {
            fetch(this.endpoint + "/search?query=" + encodeURIComponent(query), {
                method: "GET"
            })
                .then(r => r.json())
                .then(resolve)
                .catch(reject);
        })
    }

    /**
     * Count as a play and return the level.
     */
    play(id: number) {
        return new Promise<ServerLevel>((resolve, reject) => {
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
        // Maximum length: 50
        if (title.length >= 50) {
            return title.slice(0, 47) + "...";
        } else {
            return title;
        }
    }

    /**
     * Format a level's play count.
     */
    formatViews(level: PreviewServerLevel) {
        const num = level.plays || 0;
        let str: string = num + "";
        if (num < 1000) return str + "";
        if (num < 100000) return str.slice(0, str.length - 3) + "," + str.slice(-3);
        if (num < 1000000) return (num / 1000).toFixed(1) + "K";
        return (num / 1000000).toFixed(3) + "M";
    }

    /**
     * Commify a level's play count.
     */
    formatViewsInFull(level: PreviewServerLevel) {
        /** @link https://stackoverflow.com/a/2901298 */
        return level.plays.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    /**
     * Format a level's love count.
     */
    formatLoves(level: PreviewServerLevel) {
        const num = level.loves || 0;
        let str: string = num + "";
        if (num < 1000) return str + "";
        if (num < 100000) return str.slice(0, str.length - 3) + "," + str.slice(-3);
        if (num < 1000000) return (num / 1000).toFixed(1) + "K";
        return (num / 1000000).toFixed(3) + "M";
    }

    /**
     * Commify a level's play count.
     */
    formatLovesInFull(level: PreviewServerLevel) {
        /** @link https://stackoverflow.com/a/2901298 */
        return level.loves.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    /**
     * Convert level to string for showcasing its size.
     */
    levelSize(level: PreviewServerLevel) {
        function B(num: number): string {
            return typeof num === "number" ? (num > 999 ? '*' : (num + "")) : '?';
        }

        return `${B(level.width)}×${B(level.height)}×${B(level.dimensions)}`;
    }

    loveLevel(id: number, unlove: boolean) {
        if (!this.username) return;
        this.lovecooldown = new Date();

        let headers: HeadersInit = {
            'Content-Type': 'application/json'
        };
        headers['x-access-token'] = this.getCookie("token");

        return new Promise<void>(resolve => {
            fetch(this.endpoint + "/account/love?id=" + id + "&mode=" + (unlove ? "unlove" : "love"), {
                method: "POST",
                headers
            })
                .then(() => resolve(), resolve)
        });
    }

    canLove() {
        if (this.lovecooldown === null) return true;
        return new Date().getTime() - this.lovecooldown.getTime() >= this.LOVE_COOLDOWN;
    }

    isLoved(id: number) {
        if (!this.username) return new Promise<boolean>(resolve => resolve(false));

        let headers: HeadersInit = {
            'Content-Type': 'application/json'
        };
        headers['x-access-token'] = this.getCookie("token");

        return new Promise<boolean>(resolve => {
            fetch(this.endpoint + "/account/loved?id=" + id, {
                method: "POST",
                headers
            })
            .then(data => data.json())
            .then(data => resolve(data.loved))
            .catch(() => resolve(false))
        });
    }

    /**
     * Submit a level to the servers.
     * @returns Numberic ID of the level if successful, otherwise `null`.
     */
    submitLevel(level: Level): Promise<number | null> {
        let headers: HeadersInit = {
            'Content-Type': 'application/json'
        };

        if (this.username) headers['x-access-token'] = this.getCookie("token");

        return new Promise<number | null>((resolve) => {
            let data = JSON.stringify(level);
            fetch(this.endpoint + "/post", {
                method: "POST",
                body: data,
                headers
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

    /**
     * Get a cookie.
     */
    getCookie(id: string) {
        let name = id + "=";
        let decodedCookie = decodeURIComponent(document.cookie);
        let ca = decodedCookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) == ' ') {
                c = c.substring(1);
            }
            if (c.indexOf(name) == 0) {
                return c.substring(name.length, c.length);
            }
        }
        return "";
    }
}

export default ServerWorker;