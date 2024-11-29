function initScan() {
    const tas = new Tas();
    const highscores = new Highscores();
    const scan = new Scan();
    let chart;
    let data;
    const loading = [false];
    let print = true;
    const chartSet = {
        pair: 'BTCUSDT',
        timef: '5m',
        size: 10,
        live: 0,
    };
    const checkSet = {
        fee: 0.1,
        scann: 200,
        minTas: 0,
        maxTas: 0,
        addOld: 0,
        tHs: 0, //twitch highscore
    };

    document.addEventListener('DOMContentLoaded', init);

    async function init() {
        loading[0] = setLoading(true);
        chart = new Chart('chart');
        await loadTas();
        await getData();
        printTas();
        chart.setLines(tas);
        printSets();
        printChecks();
        addEventListeners();
        highscores.newBest = newBest;
        highscores.newScore = newScore;
        chart.setData('candle', data);
        loading[0] = setLoading(false);
    }

    function addEventListeners() {
        document.querySelector('#reload').addEventListener('click', reload);
        document.querySelector('#check').addEventListener('click', checkData);
        document.querySelector('#scan').addEventListener('click', scanf);
        document.querySelector('#addTas').addEventListener('submit', addTas);
        document.querySelector('#addtasselect').addEventListener('keydown', handleKey);
        document.querySelector('#addCheckBest').addEventListener('click', addCheckBest);
    }

    function handleKey(e) {
        if (e.keyCode == 13) {
            addTas(e);
        }
    }

    function newScore(newScores) {
        try {
            printBestTable(newScores);
        } catch {}
        document.querySelectorAll(`#bestScore${newScores.i} table .copy`).forEach(d => {
            d.addEventListener('click', copyText);
        });
    }

    function copyText(e) {
        document.querySelectorAll('.selectedCopy').forEach(c => c.classList.remove('selectedCopy'));
        e.target.classList.add('selectedCopy');
        const text = e.target.textContent;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text);
        } else {
            const input = document.createElement('textarea');
            input.value = text;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
        }
    }

    function printBestTable(newScores) {
        document.querySelector(`#bestScore${newScores.i} table.bestTable`).innerHTML = newScores.arr
            .map(
                ns =>
                    `<tr>
            <td>${ns[0].toFixed(2)}</td>
            <td>${ns[1].gain.toFixed(2)}% (${((ns[1].gainC - 1) * 100).toFixed(2)}%)</td> 
            <td>${ns[1].wins} / ${ns[1].tot} (${((ns[1].wins / ns[1].tot) * 100).toFixed(0)}%)</td>
            <td>${ns[1].u.toFixed(2)} | ${ns[1].std.toFixed(2)} _ ${ns[1].max.toFixed(
                        1
                    )} | ${ns[1].min.toFixed(1)}</td> 
            <td><span class="copy">${ns[2]
                .map(t => `${t.type} [ ${t.set.join(',')} ]`)
                .join(', ')}</span></td>
            </tr>`
            )
            .join('');
    }

    function newBest(newBests) {
        try {
            newBests.forEach(nb => {
                const str = `<span>${nb.parsedScore.toFixed(2)}</span> 
                <span>${nb.score.gain.toFixed(2)}% (${((nb.score.gainC - 1) * 100).toFixed(
                    2
                )}%)</span> 
                <span>${nb.score.wins} / ${nb.score.tot} (${(
                    (nb.score.wins / nb.score.tot) *
                    100
                ).toFixed(0)}%)</span> 
                <span>${nb.score.u.toFixed(2)} | ${nb.score.std.toFixed(
                    2
                )}  _ ${nb.score.max.toFixed(1)} | ${nb.score.min.toFixed(1)}</span>  
                <span>${tas.arr
                    .map(ta => ` ${ta.type} [ ${ta.set.join(',')} ]`)
                    .join(',')}</span> `;
                document.querySelector(`#bestScore${nb.i} summary`).innerHTML = str;
            });
        } catch {}
    }

    async function scanf() {
        if (loading[0]) {
            scan.stop = true;
            return;
        }
        if (tas.arr.length <= 0) {
            return;
        }
        scan.stop = false;
        loading[0] = setLoading(true);
        document.querySelector('#scan').value = 'Stop';
        print = false;
        const startTas = [...tas.arr.map(a => ({ ...a }))];
        scan.handlers.loop = scanLoopHandler;
        scan.handlers.newScore = scanNewScoreHandler;
        await scan.start(data, { ...chartSet, ...checkSet }, tas, highscores);
        print = true;
        tas.arr = [...startTas];
        loading[0] = setLoading(false);
        document.querySelector('#scan').value = 'Scan';
    }

    async function scanLoopHandler(loop) {
        document.querySelector('#scanning').textContent = `${loop.i + 1} / ${loop.scann} ${loop.tas
            .map(tt => `${tt.type} [${tt.set.join(',')}]`)
            .join(', ')} (${loop.tas.length})`;
        await new Promise(r => setTimeout(r, 0));
    }

    function scanNewScoreHandler(score) {
        document.querySelector('#score').innerHTML = `
        <span class="${score.gain >= 0 ? 'green' : 'red'}">${score.gain.toFixed(2)}%</span> 
        ( <span class="${score.gainC >= 1 ? 'green' : 'red'}">${((score.gainC - 1) * 100).toFixed(
            2
        )}%</span> )`;
        document.querySelector('#wins').textContent = `
        ${score.wins} / ${score.tot} ( ${((score.wins / score.tot) * 100).toFixed(2)}% ) 
        `;
        document.querySelector('#stat').innerHTML = `${score.u.toFixed(2)} | ${score.std.toFixed(
            2
        )} _ ${score.max.toFixed(1)} | ${score.min.toFixed(1)}`;
    }

    function stingToTas(tasString) {
        let tasArray;
        try {
            tasArray = tasString
                ?.split(']')
                .slice(0, -1)
                .map(t => {
                    return {
                        type: t.split('[')[0].replace(',', '').trim(),
                        set: t
                            .split('[')[1]
                            .split(',')
                            .map(tt => Number(tt.trim())),
                    };
                });
        } catch (e) {
            console.log(e);
            tasArray = [];
        }
        return tasArray;
    }

    async function checkData() {
        if (loading[0]) {
            return;
        }
        loading[0] = setLoading(true);
        const checkSettings = document.querySelector('#checkSettings').value;
        const tasArray = stingToTas(checkSettings);
        if (tasArray.length <= 0) {
            loading[0] = setLoading(false);
            return;
        }
        const startTasIds = tas.ids;
        const startTasArr = [...tas.arr.map(a => ({ ...a }))];
        tas.ids = 0;
        tas.arr = [];
        tasArray.forEach(newTas => {
            try {
                if (tas.add(newTas.type)) {
                    tas.arr[tas.arr.length - 1].set = newTas.set;
                }
            } catch {}
        });
        if (tas.arr.length > 0) {
            print = true;
            const score = calc();
            printCheckScore(score);
            print = false;
        }
        tas.ids = startTasIds;
        tas.arr = [...startTasArr];
        loading[0] = setLoading(false);
    }

    function printCheckScore(score) {
        document.querySelector('#checkScore').innerHTML = `${score.gain.toFixed(2)}% (${(
            (score.gainC - 1) *
            100
        ).toFixed(2)}%) ${score.wins} / ${score.tot} (${(
            (score.wins / (score.tot || 1)) *
            100
        ).toFixed(2)}%) ${score.u.toFixed(2)} | ${score.std.toFixed(2)} _ ${score.max.toFixed(
            1
        )} | ${score.min.toFixed(1)}`;
    }

    function calc() {
        const tempData = [...data];
        const check = new Check();
        check.checkData(tempData, tas, checkSet);
        const { score } = check;
        if (print) {
            chart.setLines(tas);
            tas.arr.forEach(t => {
                t.lines.forEach(line => {
                    if (check.lines[t.ids[line]]) {
                        chart.setData(t.name + line, check.lines[t.ids[line]]);
                    }
                });
            });
            chart.setMarkers('candle', check.markers);
        }
        printScore(score);
        highscores.checkScore(score, tas.arr);
        return score;
    }

    function printScore(score) {
        document.querySelector('#score').innerHTML = `
        <span class="${score.gain >= 0 ? 'green' : 'red'}">${score.gain.toFixed(2)}%</span> 
        ( <span class="${score.gainC >= 1 ? 'green' : 'red'}">${((score.gainC - 1) * 100).toFixed(
            2
        )}%</span> )

        `;
        document.querySelector('#wins').textContent = `
        ${score.wins} / ${score.tot} ( ${((score.wins / score.tot) * 100).toFixed(2)}% ) 
        `;
        document.querySelector('#stat').innerHTML = `${score.u.toFixed(2)} | ${score.std.toFixed(
            2
        )} _ ${score.max.toFixed(1)} | ${score.min.toFixed(1)}`;
    }

    async function reload() {
        if (loading[0]) {
            return;
        }
        loading[0] = setLoading(true);
        highscores.bestScores = {};
        await getData();
        chart.setData('candle', data);
        loading[0] = setLoading(false);
    }

    async function getData() {
        if (chartSet.live == 0) {
            data = await (
                await fetch(`/data/live/${chartSet.pair}/${chartSet.timef}/${chartSet.size}`)
            ).json();
        } else {
            data = await (
                await fetch(`/data/${chartSet.pair}/${chartSet.timef}/${chartSet.size}`)
            ).json();
        }
        printDataInfo();
        data = data.map(d => {
            d.time = Math.floor(d.time / 1000);
            return d;
        });
    }

    function printDataInfo() {
        const chartGain = (data[data.length - 1].close - data[0].open) / data[0].open;
        const chartHigh = data.reduce((a, b) => Math.max(a, b.high), 0);
        const chartLow = data.reduce((a, b) => Math.min(a, b.low), chartHigh);
        const chartMaxGain = (chartHigh - chartLow) / chartLow;
        const lastPrice = data[data.length - 1].close;
        const chartNowH = (chartHigh - lastPrice) / lastPrice;
        const chartNowL = (lastPrice - chartLow) / chartLow;
        const showP = n => `${(n * 100).toFixed(2)}%`;
        document.querySelector('#chartGain').innerHTML = ` :  &rarr; : ${showP(
            chartGain
        )} -  &darr;&uarr; : ${showP(chartMaxGain)} -  &darr; : ${showP(
            chartNowH
        )} -  &uarr; : ${showP(chartNowL)}  ( ${showP(chartNowL / chartMaxGain)} )`;
    }

    function printChecks() {
        const html = highscores.checks.map((c, i) => [
            `<details id="bestScore${i}"><summary>${c}</summary><table class="bestTable"></table></details>`,
            `<li><span>${c}</span><input type="button" value="X" class="deleteCheck" id="hsc-${i}"> </li>`,
        ]);
        document.querySelector('#bestScores').innerHTML = html.map(h => h[0]).join('');
        document.querySelector('#checkBests').innerHTML = html.map(h => h[1]).join('');
        document
            .querySelectorAll('#checkBests .deleteCheck')
            .forEach(d => d.addEventListener('click', deleteCheck));
    }

    function deleteCheck(e) {
        const i = e.target.id.split('-')[1];
        highscores.checks.splice(i, 1);
        printChecks();
    }

    function addCheckBest() {
        const newCheck = document.querySelector('#newCheckBest').value;
        if (!newCheck) {
            return;
        }
        highscores.checks.push(newCheck);
        printChecks();
    }

    function printSets() {
        printSet(chartSet);
        printSet(checkSet);
    }

    function printSet(set) {
        Object.keys(set).forEach(key => {
            const elem = document.querySelector(`#${key}`);
            elem.value = set[key];
            elem.addEventListener('input', e => (set[key] = e.target.value));
        });
    }

    function addTas(e) {
        e.preventDefault();
        const selectedType = document.querySelector('#addtasselect').value;
        tas.add(selectedType);
        printTas();
        chart.setLines(tas);
    }

    function printTasElem(i) {
        const allTypes = tas.types.map(ta => ta.type);
        return `
        <li>
            <form class="load">
                <details>
                    <summary>
                        ${i + 1}/${tas.arr.length} ${tas.arr[i].type} 
                        <input type="checkbox" class="keepCh" id="keep${i}"> 
                        <input type="checkbox" class="keepCh" id="keepSet${i}">
                        <input type="checkbox" class="keepCh" id="tweak${i}">
                    </summary>
                    <section>
                        <input type="button" value="X" id="del${i}">
                        <label for="type${i}">Type</label>
                        <select id="type${i}" disabled>
                        ${allTypes
                            .map(
                                ta =>
                                    `<option value="${ta}" ${
                                        tas.arr[i].type == ta ? 'selected' : ''
                                    }>${ta}</option>`
                            )
                            .join('')}
                        </select>
                        <label for="min${i}">Sets Min</label>
                        <input type="text" id="min${i}" value="">
                        <label for="set${i}">Sets</label>
                        <input type="text" id="set${i}" value="">
                        <label for="max${i}">Sets Max</label>
                        <input type="text" id="max${i}" value="">
                        <label for="ids${i}">Ids</label>
                        <input type="text" id="ids${i}" >
                        <label for="check${i}">Check</label>
                        <textarea id="check${i}" >${JSON.stringify(tas.arr[i].check)}</textarea>
                        <label for="oc${i}">Open/Close</label>
                        <textarea id="oc${i}" >${JSON.stringify(tas.arr[i].oc || {})}</textarea>
                        </section>
                </details>
            </form>
        </li>`;
    }

    async function printTas() {
        const html = tas.arr.map((t, i) => printTasElem(i)).join('');
        document.querySelector('#buys').innerHTML = html;
        await new Promise(r => setTimeout(r, 10));
        tas.arr.forEach((t, i) => tasEvents(i));
    }

    function tasEvents(i) {
        const events1 = ['type'];
        const events2 = ['min', 'set', 'max', 'ids', 'check', 'oc'];
        const events3 = ['keep', 'keepSet', 'tweak'];
        events1.forEach(event => {
            document.querySelector(`#${event}${i}`).value = tas.arr[i][event];
            document
                .querySelector(`#${event}${i}`)
                .addEventListener('input', e => (tas.arr[i][event] = e.target.value));
        });
        events2.forEach(event => {
            document.querySelector(`#${event}${i}`).value = JSON.stringify(tas.arr[i][event]);
            document
                .querySelector(`#${event}${i}`)
                .addEventListener('change', e => (tas.arr[i][event] = JSON.parse(e.target.value)));
        });
        events3.forEach(event => {
            document.querySelector(`#${event}${i}`).checked = !!tas.arr[i][event];
            document
                .querySelector(`#${event}${i}`)
                .addEventListener('input', e => (tas.arr[i][event] = e.target.checked));
        });
        document.querySelector(`#del${i}`).addEventListener('click', deleteTa);
    }

    function deleteTa(e) {
        const id = Number(e.target.id.slice(3));
        const name = tas.arr[id].name;
        tas.arr[id].lines.forEach(line => {
            chart.setData(name + line, []);
        });
        tas.del(name);
        printTas(chart);
    }

    async function loadTas() {
        document.querySelector('#addtasselect').innerHTML = tas.types
            .map(t => `<option value="${t.type}">${t.type}</option>`)
            .join('');
    }

    function setLoading(isLoading) {
        if (isLoading) {
            document.querySelectorAll('.load').forEach(q => q.classList.add('loading'));
        } else {
            document.querySelectorAll('.loading').forEach(q => q.classList.remove('loading'));
        }
        return isLoading;
    }
}

initScan();
