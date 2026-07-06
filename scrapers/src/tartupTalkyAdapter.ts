import { Impit } from "impit";
import type { ScraperAdapter, UnifiedFundingRound } from "./types/types.js";
import * as cheerio from 'cheerio';


export class TartupTalkyAdepter implements ScraperAdapter{
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

   extractData(html: string): UnifiedFundingRound[] {
   const $ = cheerio.load(html);
   const rounds: UnifiedFundingRound[] = [];

   $('table tbody tr').each((index, element) => {
      if ($(element).find('th').length > 0) return;

      const columns = $(element).find('td');

      const rawDate = $(columns[0]).text().trim();
      const startupName = $(columns[1]).text().trim();
      const rawAmount = $(columns[4]).text().trim();
      const rawInvestors = $(columns[5]).text().trim();
      const fundingStage = $(columns[6]).text().trim();

      const amountUSD = parseInt(rawAmount.replace(/[^0-9]/g, '')) || 0; 
      const investors = rawInvestors ? rawInvestors.split(',').map(i => i.trim()) : [];

      // 5. If a row actually has a startup name, push it to our array
      if (startupName) {
         rounds.push({
         source: 'startuptalky',
         startupName,
         amountUSD,
         fundingStage: fundingStage || 'Undisclosed',
         fundingDate: rawDate || "",
         investors,
         website:"" 
         });
      }
   });

   return rounds;
   }
}

let test=new TartupTalkyAdepter
test.fetchLatest()
