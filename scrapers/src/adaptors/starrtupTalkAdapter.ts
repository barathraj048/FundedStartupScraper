import { Impit } from "impit";
import type { ScraperAdapter, UnifiedFundingRound } from "../types/types.js";
import * as cheerio from 'cheerio';


export class starrtupTalkAdepter implements ScraperAdapter{
   private Url:string="https://startuptalky.com/indian-startups-funding-investors-data-2026/"
   private impit:Impit
   constructor(){
      this.impit=new Impit({
      browser:"chrome",
      ignoreTlsErrors: true,
      })
   }

   async fetchLatest(): Promise<UnifiedFundingRound[]> {
   try {
      console.log(` Fetching HTML from ${this.Url}`);
      const response = await this.impit.fetch(this.Url, { method: "GET" });
      
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      
      const html = await response.text();
      console.log(` HTML loaded. Parsing tables...`);
      
      // Pass the HTML to our extractor and return the array
      const extractedData = this.extractData(html);
      return extractedData;
      
   } catch (e: any) {
      console.error(' [StartupTalky Adapter Error]:', e.message);
      return [];
   }
   }

   amountConverter(amount: string): number {
      const value = parseFloat(amount.replace(/[^0-9.]/g, ""));

      if (isNaN(value)) return 0;

      const suffix = amount.trim().slice(-1).toUpperCase();

      const amountMap: Record<string, number> = {
         K: 1_000,
         M: 1_000_000,
         B: 1_000_000_000
      };

      return value * (amountMap[suffix] ?? 1);
   }
   extractData(html: string): UnifiedFundingRound[] {
   const $ = cheerio.load(html);
   const rounds: UnifiedFundingRound[] = [];

   $('table tbody tr').each((index, element) => {
      if ($(element).find('th').length > 0) return;

      const columns = $(element).find('td');

      const startupName = $(columns[0]).text().trim();
      const sector = $(columns[1]).text().trim();     
      const headquarters = $(columns[2]).text().trim();

      const rawAmount = $(columns[3]).text().trim();
      const fundingStage = $(columns[4]).text().trim();
      const rawInvestors = $(columns[5]).text().trim();

      const amountUSD = this.amountConverter(rawAmount);
      const investors= rawInvestors ? rawInvestors.split(',').map(i => i.trim()) : []

      // 5. If a row actually has a startup name, push it to our array
      if (startupName) {
         rounds.push({
         source: 'startuptalky',
         startupName,
         amountUSD,
         fundingStage: fundingStage || 'Undisclosed',
         fundingDate: "",
         investors,
         website:"" 
         });
      }
   });

   return rounds;
   }
}
