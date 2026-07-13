import * as xlsx from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { MailOutReacher } from './mailDispatcher/mailer.js';


const FileName: string = "Startup_Funding_Data03.xlsx"; 
const BatchSize: number = 35;
const MinDelaIn_Ms = 2 * 60 * 1000;
const MaxDelayIn_MS = 20 * 60 * 1000;
const SessionTiming = 12 * 60 * 60 * 1000;

export class CampaignManager {
   private mailer = new MailOutReacher(); 
   private filePath = path.resolve(process.cwd(), "output", FileName);

   private getRandomDelay() {
      return Math.floor(Math.random() * (MaxDelayIn_MS - MinDelaIn_Ms + 1) + MinDelaIn_Ms);
   }

   private sleep(ms: number) {
      const min = (ms / 1000 / 60).toFixed(2);
      console.log(`\n⏳ Campaign sleeping for ${min} minutes...`);
      return new Promise(resolve => setTimeout(resolve, ms));
   }

   // 1. Read Bypass using Native Memory Buffers
   private getTargetData(): any[] {
      if (!fs.existsSync(this.filePath)) {
         console.log(`\n File ${FileName} does not exist at ${this.filePath}`);
         return [];
      }

      // Read file natively via Node.js into a memory buffer
      const fileBuffer = fs.readFileSync(this.filePath);
      // Parse the raw buffer directly
      const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];

      if (!sheetName) {
         console.log('\n Workbook is empty. No sheets found.');
         return [];
      }

      const worksheet = workbook.Sheets[sheetName];

      if (!worksheet) {
         console.log(`\nWorksheet '${sheetName}' is missing or corrupted.`);
         return [];
      }

      const data = xlsx.utils.sheet_to_json<any>(worksheet);

      data.sort((a: any, b: any) => (b.amountUSD || 0) - (a.amountUSD || 0));
      return data;
   }

   // 2. Write Bypass using Native Memory Buffers
   private saveProgression(data: any[]) {
      const workSheet = xlsx.utils.json_to_sheet(data);
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, workSheet, "fundingRound");
      
      // Write workbook structure into a raw binary buffer
      const outBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      // Native write to disk
      fs.writeFileSync(this.filePath, outBuffer);
   }

   public async runBatch() {
      console.log(" Initializing OutReach Campaign...");
      
      const data = this.getTargetData();
      
      const pendingTargets = data.filter((row: any) => 
            row.ContactStatus !== 'Sent' && 
            row.ContactStatus !== 'Failed' && 
            row.targetEmail
         );

      if (pendingTargets.length === 0) {
         console.log('\n No pending targets with emails found. Campaign idle.');
         return;
      }
      
      const currentBatch = pendingTargets.slice(0, BatchSize);
      console.log(`\n This batch locked ${currentBatch.length} targets.`);

      for (let i = 0; i < currentBatch.length; i++) {
         const target: any = currentBatch[i];
         console.log(`\n [${i + 1}/${currentBatch.length}] Pitching ${target.startupName}...`);

         // Fire the email
         const success = await this.mailer.sendPitch(
            target.targetEmail, 
            target.startupName, 
            target.founderName
         );

         const targetIndex = data.findIndex((row: any) => row.startupName === target.startupName);
         if (targetIndex !== -1) {
            data[targetIndex].ContactStatus = success ? 'Sent' : 'Failed';
         }

         // Immediate state checkpoint
         this.saveProgression(data);

         if (i < currentBatch.length - 1) {
            const delay = this.getRandomDelay();
            await this.sleep(delay);
         }
      }
      console.log('\n Shift complete. Entering deep sleep mode.');
   }

   public async startDaemon() {
      while (true) {
         await this.runBatch();
         
         console.log(`\n Hibernating for 12 hours. Do not close this terminal.`);
         await this.sleep(SessionTiming);
      }
   }
}

const manager = new CampaignManager();
manager.startDaemon();