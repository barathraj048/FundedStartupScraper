import { Impit } from 'impit';
import type { UnifiedFundingRound, ScraperAdapter } from '../types/types.js';

export class Inc42Adapter implements ScraperAdapter {
  private apiUrl = 'https://datalabs-api.inc42.com/company/new-search';
  private impit: Impit;

  constructor() {
    // Initialize the stealth engine once
    this.impit = new Impit({
      browser: 'chrome',
      ignoreTlsErrors: true,
    });
  }

  async fetchLatest(): Promise<UnifiedFundingRound[]> {
    let allCompanies: UnifiedFundingRound[] = [];
    let currentOffset = 0;
    const limitPerPage = 50; 
    let canContinueLoop=true

    console.log('Starting Inc42 Pagination Loop...');

    while (canContinueLoop) {
      try {
        console.log(` Fetching offset: ${currentOffset}, allCOmpanies ${allCompanies.length}`);
        
        const response = await this.impit.fetch(this.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'origin': 'https://inc42.com',
            'referer': 'https://inc42.com/'
          },
          body: JSON.stringify({
            limit_per_page: limitPerPage,
            from: currentOffset,
            sortby: "founded_date",
            sort: "desc",
            filter:{
               company_type: ["Funded"]
            }
          })
        });

        if (!response.ok) {
          console.error(`Request failed with status ${response.status}. Halting loop.`);
          canContinueLoop=false
          break;
        }

        const payload: any = await response.json();
        const rawCompanies = payload?.response?.companies || [];
        
        if (rawCompanies.length === 0) {
          console.log('Reached the end of the data stream.');
          canContinueLoop=false
          break;
        }

        // Map the raw data to our clean schema
        const mappedCompanies = rawCompanies.map((co: any) => ({
          source: 'inc42',
          startupName: co.name,
          amountUSD: co.amount_raised_in_usd || co.last_funding_amount || 0,
          fundingStage: co.last_funding_stage || co.last_funding_type || 'Undisclosed',
          fundingDate: co.last_funding_date || new Date().toISOString().split('T')[0],
          investors: co.investor_name || [],
          website: co.website || undefined
        }));

        allCompanies.push(...mappedCompanies);
        currentOffset += limitPerPage; // Increment for the next page

        // BE ELITE: Don't hammer the server. Add a slight delay to mimic human reading speed.
        await new Promise(resolve => setTimeout(resolve, 1500)); 

      } catch (error: any) {
        console.error(' [Inc42 Adapter Error]:', error.message);
      }
    }

    return allCompanies;
  }
}