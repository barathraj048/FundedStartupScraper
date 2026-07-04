import type { UnifiedFundingRound, ScraperAdapter } from './types/types.js';
export declare class Inc42Adapter implements ScraperAdapter {
    private apiUrl;
    private impit;
    constructor();
    fetchLatest(): Promise<UnifiedFundingRound[]>;
}
//# sourceMappingURL=inc42Adapter.d.ts.map