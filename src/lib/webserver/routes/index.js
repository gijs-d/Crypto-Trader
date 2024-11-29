module.exports = [
    ['/', require('./indexRoute')],
    ['/data', require('./dataRoute')],
    ['/tas', require('./tasRoute')],
    ['/scan', require('./scanRoute')],
    ['/live', require('./liveRoute')],
    ['/autoScan', require('./autoScanRoute')],
];
