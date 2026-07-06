import { Impit } from "impit";
export class TartupTalkyAdepter {
    Url = "https://startuptalky.com/indian-startups-funding-investors-data-2026/";
    impit;
    constructor() {
        this.impit = new Impit({
            browser: "chrome",
            ignoreTlsErrors: true,
        });
    }
    async fetchLatest() {
        try {
            let response = await this.impit.fetch(this.Url, {
                method: "GET"
            });
            let html = await response.text();
            console.log(html);
            return [];
        }
        catch (e) {
            console.log(e);
            return [];
        }
    }
}
let test = new TartupTalkyAdepter;
test.fetchLatest();
//# sourceMappingURL=tartupTalkyAdapter.js.map