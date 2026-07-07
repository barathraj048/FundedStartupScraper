import * as xlsx from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { MailOutReacher } from './mailDispatcher/mailer.js';
import { resolve } from 'dns';

const FileName:string="Startup_Funding_Data03"
const BatchSize:number=35
const MinDelaIn_Ms=2 * 60 * 1000
const MaxDelayIn_MS=20 * 60 * 1000
const SessionTiming=12 * 60 * 60 * 1000

export class CampaignManager{
   private maoler=new MailOutReacher()
   private filePath=path.resolve(process.cwd(),"output",FileName)

   private getRandomDelay(){
      return Math.floor(Math.random()*(MaxDelayIn_MS-MinDelaIn_Ms+1) + MinDelaIn_Ms)
   }

   private sleep(ms:number){
      const min=Math.floor((ms/60)/1000)
      console.log(`Campign sleepes for ${min} and begine shortly`)
      return new Promise(resolve => setTimeout(resolve,ms))
   }

   private getTargetData(){
      if(!fs.existsSync(this.filePath)){
         console.log(`file ${FileName} is not exist in ${this.filePath}`)
         return []
      }

      const workbook=xlsx.readFile(this.filePath)
      const sheetName=workbook.SheetNames[0]
      const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName])

      data.sort((a:any,b:any)=> (b.amountUSD || 0)-(a.amountUSD || 0))
      return data
   }

   private saveProgtrssion(data:any){
      const workSheet=xlsx.utils.json_to_sheet(data)
      const workbook=xlsx.utils.book_new()
      xlsx.utils.book_append_sheet(workbook,workSheet,"fundingRound")
      xlsx.writeFile(workbook,this.filePath)
   }

   public async runBatch(){
      console.log("Initilize outReach campaigne")
   }
}