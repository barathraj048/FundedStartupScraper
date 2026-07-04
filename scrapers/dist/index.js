import { Inc42Adapter } from "./inc42Adapter.js";
const main = async () => {
    const adapter = new Inc42Adapter;
    const data = await adapter.fetchLatest();
    console.log(`\n Execution Complete! Extracted ${data.length} startups.`);
    if (data.length > 0) {
        console.log(' Sample Data from First Entry:');
        console.log(JSON.stringify(data[0], null, 2));
    }
    else {
        console.log(' No data returned. Check if the WAF blocked the request.');
    }
};
main();
//# sourceMappingURL=index.js.map