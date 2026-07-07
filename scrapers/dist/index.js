import { Inc42Adapter } from "./adaptors/inc42Adapter.js";
import { ExcelExporter } from "./exporter.js";
import { starrtupTalkAdepter } from "./adaptors/starrtupTalkAdapter.js";
const main = async () => {
    const inc42Adapter = new Inc42Adapter;
    const starrtupTalk = new starrtupTalkAdepter;
    const [dataFromInc42, dataFromStartupTalk] = await Promise.all([
        inc42Adapter.fetchLatest(), starrtupTalk.fetchLatest()
    ]);
    const data = [
        ...dataFromInc42, ...dataFromStartupTalk
    ];
    console.log(`\n Execution Complete! Extracted ${data.length} startups.`);
    if (data.length > 0) {
        ExcelExporter.exportData(data);
        console.log(' Sample Data from First Entry:');
        console.log(JSON.stringify(data[0], null, 2));
    }
    else {
        console.log(' No data returned. Check if the WAF blocked the request.');
    }
};
main();
//# sourceMappingURL=index.js.map