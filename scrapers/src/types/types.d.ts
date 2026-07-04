export interface UnifiedFundingRound {
    source: 'inc42' | 'entrackr' | 'startuptalky' | 'yourstory';
    startupName: string;
    amountUSD: number;
    fundingStage: string;
    fundingDate: string;
    investors: string[];
    website?: string;
}
export interface ScraperAdapter {
    fetchLatest(): Promise<UnifiedFundingRound[]>;
}
//# sourceMappingURL=types.d.ts.map