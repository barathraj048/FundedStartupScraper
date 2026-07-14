// src/enrichment.ts
import * as xlsx from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { Impit } from 'impit';

const EXCEL_FILE = "Startup_Funding_Data03.xlsx";

export class EnrichmentEngine {
   private filePath = path.resolve(process.cwd(), "output", EXCEL_FILE);
   private impit = new Impit({ browser: "chrome", ignoreTlsErrors: true });

   private async sleep(ms: number) {
      return new Promise(resolve => setTimeout(resolve, ms));
   }

   private getTargetData(): any[] {
      if (!fs.existsSync(this.filePath)) return [];
      
      const fileBuffer = fs.readFileSync(this.filePath);
      const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
      
      const sheetName = workbook.SheetNames[0];
      if(!sheetName){
         console.log(`Sheet name is not defined`)
         return []
      }

      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) return [];
      return xlsx.utils.sheet_to_json<any>(worksheet);
   }

   private saveProgression(data: any[]) {
      const workSheet = xlsx.utils.json_to_sheet(data);
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, workSheet, "fundingRound");
      
      const outBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      fs.writeFileSync(this.filePath, outBuffer);
   }

   public async runEnrichment() {
      console.log(" Initiating Zero-Cost Data Enrichment Pipeline...");
      
      const data = this.getTargetData();
      if (data.length === 0) {
         console.log(" No data found to enrich.");
         return;
      }

      const targets = data.filter(row => !row.targetEmail);
      console.log(` Found ${targets.length} startups missing email routing data.`);
      
      for (let i = 0; i < targets.length; i++) {
         const company = targets[i];
         console.log(`\n📡 [${i + 1}/${targets.length}] Locating domain for: ${company.startupName}`);

         try {
            const url = `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(company.startupName)}`;
            const response = await this.impit.fetch(url, { method: "GET" });

            if (response.ok) {
               const suggestions = await response.json() as any[];
               
               if (suggestions && suggestions.length > 0) {
                  const primaryDomain = suggestions[0].domain;
                  console.log(` Found domain: ${primaryDomain}`);

                  const generatedEmail = `careers@${primaryDomain}`;
                  
                  const index = data.findIndex(row => row.startupName === company.startupName);
                  if (index !== -1) {
                     data[index].targetEmail = generatedEmail;
                     data[index].website = primaryDomain; 
                  }

                  this.saveProgression(data);
               } else {
                  console.log(` No domain matched for ${company.startupName}`);
               }
            } else if (response.status === 429) {
               console.log(` Rate limit hit! Forcing a 10-minute cooldown...`);
               await this.sleep(600000); 
            }
         } catch (error) {
            console.error(` Network error fetching ${company.startupName}:`, error);
         }

         if (i > 0 && i % 50 === 0) {
            console.log(`\n Batch of 50 complete. Cooling down IP for 20 minutes...`);
            await this.sleep(1200000); 
         } else {
            const jitter = Math.floor(Math.random() * 4000) + 2000;
            await this.sleep(jitter);
         }
      }

      console.log("\n Enrichment complete. Database updated.");
   }
}

const engine = new EnrichmentEngine();
engine.runEnrichment();