import type { ScraperAdapter, UnifiedFundingRound } from "../types/types.js";
export declare class starrtupTalkAdepter implements ScraperAdapter {
    private Url;
    private impit;
    constructor();
    fetchLatest(): Promise<UnifiedFundingRound[]>;
    amountConverter(amount: string): number;
    extractData(html: string): UnifiedFundingRound[];
}
//# sourceMappingURL=starrtupTalkAdapter.d.ts.map