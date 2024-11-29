require('dotenv').config();
const AutoScan = require('./lib/autoScan/autoScan');
const args = process.argv.slice(2);

let settings;
if (args[0]) {
    settings = JSON.parse(args[0]);
}

new AutoScan(settings?.timeframes, settings?.base, settings?.pairs, settings?.types);
