import * as xlsx from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { MailOutReacher } from './mailDispatcher/mailer.js';
const FileName = "Startup_Funding_Data03.xlsx";
const BatchSize = 35;
const MinDelaIn_Ms = 2 * 60 * 1000;
const MaxDelayIn_MS = 20 * 60 * 1000;
const SessionTiming = 12 * 60 * 60 * 1000;
export class CampaignManager {
    // 2. Fixed typo from 'maoler' to 'mailer'
    mailer = new MailOutReacher();
    filePath = path.resolve(process.cwd(), "output", FileName);
    getRandomDelay() {
        return Math.floor(Math.random() * (MaxDelayIn_MS - MinDelaIn_Ms + 1) + MinDelaIn_Ms);
    }
    sleep(ms) {
        // Fixed math readability to accurately log minutes
        const min = (ms / 1000 / 60).toFixed(2);
        console.log(`\n⏳ Campaign sleeping for ${min} minutes...`);
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    // 3. Explicitly defined the return type as any[] to fix Error 2571
    getTargetData() {
        if (!fs.existsSync(this.filePath)) {
            console.log(`\n File ${FileName} does not exist at ${this.filePath}`);
            return [];
        }
        const workbook = xlsx.readFile(this.filePath);
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
        const data = xlsx.utils.sheet_to_json(worksheet);
        data.sort((a, b) => (b.amountUSD || 0) - (a.amountUSD || 0));
        return data;
    }
    saveProgression(data) {
        const workSheet = xlsx.utils.json_to_sheet(data);
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, workSheet, "fundingRound");
        xlsx.writeFile(workbook, this.filePath);
    }
    async runBatch() {
        console.log(" Initializing OutReach Campaign...");
        const data = this.getTargetData();
        const pendingTargets = data.filter((row) => row.ContactStatus !== 'Sent' &&
            row.ContactStatus !== 'Failed' &&
            row.targetEmail);
        if (pendingTargets.length === 0) {
            console.log('\n No pending targets with emails found. Campaign idle.');
            return;
        }
        const currentBatch = pendingTargets.slice(0, BatchSize);
        console.log(`\n This batch locked ${currentBatch.length} targets.`);
        for (let i = 0; i < currentBatch.length; i++) {
            const target = currentBatch[i];
            console.log(`\n [${i + 1}/${currentBatch.length}] Pitching ${target.startupName}...`);
            // Fire the email
            const success = await this.mailer.sendPitch(target.targetEmail, target.startupName, target.founderName);
            // Update the master data array
            const targetIndex = data.findIndex((row) => row.startupName === target.startupName);
            if (targetIndex !== -1) {
                data[targetIndex].ContactStatus = success ? 'Sent' : 'Failed';
            }
            // Checkpoint: Save to Excel immediately.
            this.saveProgression(data);
            // Add stochastic delay if it's not the last email in the batch
            if (i < currentBatch.length - 1) {
                const delay = this.getRandomDelay();
                await this.sleep(delay);
            }
        }
        console.log('\n Shift complete. Entering deep sleep mode.');
    }
    async startDaemon() {
        while (true) {
            await this.runBatch();
            console.log(`\n Hibernating for 12 hours. Do not close this terminal.`);
            await this.sleep(SessionTiming);
        }
    }
}
const manager = new CampaignManager();
manager.startDaemon();
//# sourceMappingURL=campaign.js.map