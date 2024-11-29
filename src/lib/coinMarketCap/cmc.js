const fs = require('fs').promises;
const Cli = require('../logs');
const cli = new Cli('coinMarketCap', 'cmc.js');

const saveFile = 'data/topCoins.json';

class CmC {
    url = 'https://coinmarketcap.com/';

    async getTop100() {
        try {
            const saved = JSON.parse(await fs.readFile(saveFile));
            if (!saved?.timestamp || Date.now() - saved.timestamp > 1000 * 60 * 60 * 24) {
                throw new Error('Data to old');
            }
            return saved.coins;
        } catch (e) {
            cli.error(`Error: ${e}`);
        }
        return this.#fetchNewData();
    }

    async #fetchNewData() {
        let html = await fetch(this.url);
        html = await html.text();
        const coins = html
            .split('"COMPRESSED_KEYS_ARR\\",\\"excludeProps\\":[]},')[1]
            .split(']]')[0]
            .split(']')
            .map(s => s.split(',').at(-3))
            .filter(s => s.includes('\\'))
            .map(s => s.slice(2, -2));
        await fs.writeFile(saveFile, JSON.stringify({ timestamp: Date.now(), coins }));
        return coins;
    }
}

module.exports = new CmC();
