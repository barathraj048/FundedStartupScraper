// src/exporter.ts
import * as xlsx from 'xlsx';
import  type { UnifiedFundingRound } from './types/types.js';
import * as fs from 'fs';
import * as path from 'path';

export class ExcelExporter {
  static exportData(data: UnifiedFundingRound[], filename: string = 'Startup_Funding_Data.xlsx') {
    if (data.length === 0) {
      console.log(' No data to export.');
      return;
    }
    let flaternData=data.map((item)=> ({
        ...item,
        investors:item.investors.join(", ")
    }))
    const worksheet = xlsx.utils.json_to_sheet(flaternData);

    const colWidths = [
      { wch: 15 }, // Source
      { wch: 30 }, // Startup Name
      { wch: 15 }, // Amount USD
      { wch: 20 }, // Funding Stage
      { wch: 15 }, // Funding Date
      { wch: 60 }, // Investors (this string gets long)
      { wch: 35 }  // Website
    ];
    worksheet['!cols'] = colWidths;

    // 3. Create a workbook and append the sheet
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Funding Rounds');

    // 4. Ensure an 'output' directory exists
    const outputDir = path.resolve(process.cwd(), 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    // 5. Write the file to disk
    const filePath = path.join(outputDir, filename);
    xlsx.writeFile(workbook, filePath);
    
    console.log(`\n💾 Excel file successfully generated at: ${filePath}`);
  }
}