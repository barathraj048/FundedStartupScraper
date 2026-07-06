import type { ScraperAdapter, UnifiedFundingRound } from "./types/types.js";
export declare class TartupTalkyAdepter implements ScraperAdapter {
    private Url;
    private impit;
    constructor();
    fetchLatest(): Promise<UnifiedFundingRound[]>;
}
//# sourceMappingURL=tartupTalkyAdapter.d.ts.map