import { Inc42Adapter } from "./inc42Adapter.js";
import { ExcelExporter } from "./exporter.js";
import { TartupTalkyAdepter } from "./tartupTalkyAdapter.js";
import type { UnifiedFundingRound } from "./types/types.js";
const main=async()=> {
   const inc42Adapter=new Inc42Adapter
   const starrtupTalk=new TartupTalkyAdepter
   const data=[]
   const dataFromInc42=await inc42Adapter.fetchLatest()
   data.push(...dataFromInc42)
   const dataFromStartupTalk=await starrtupTalk.fetchLatest()
   data.push(...dataFromStartupTalk)
   console.log(`\n Execution Complete! Extracted ${data.length} startups.`);
  
  if (data.length > 0) {

   ExcelExporter.exportData(data)
    console.log(' Sample Data from First Entry:');
    console.log(JSON.stringify(data[0], null, 2));
  } else {
    console.log(' No data returned. Check if the WAF blocked the request.');
  }
}

main()