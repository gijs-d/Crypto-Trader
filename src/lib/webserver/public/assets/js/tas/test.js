function test() {
    const tas = new Tas();
    const highscores = new Highscores();
    const scan = new Scan();
    let chart;
    let data;
    const loading = [false];
    let print = true;
    const chartSet = {
        pair: 'BTCFDUSD',
        timef: '5m',
        size: 10,
    };
    const checkSet = {
        fee: 0.1,
        scann: 200,
        minTas: 0,
        maxTas: 0,
        addOld: 0,
        tHs: 0,
    };

    document.addEventListener('DOMContentLoaded', init);

    async function init() {
        loading[0] = setLoading(true);
        chart = new Chart('chart');
        await loadTas();
        await getData();
        addTas();
        printSets();
        printChecks();
        addEventListeners();
        highscores.newBest = newBest;
        chart.setData('candle', data);
        calc();
        loading[0] = setLoading(false);
    }

    function addEventListeners() {
        document.querySelector('#reload').addEventListener('click', reload);
        document.querySelector('#check').addEventListener('click', checkSettings);
        document.querySelector('#scan').addEventListener('click', scanf);
        document.querySelector('#testTas').addEventListener('click', testTas);
        document.querySelector('#saveTas').addEventListener('click', saveTas);
        document.querySelector('#addtasselect').addEventListener('input', addTasSelect);
    }

    function newBest(newBests) {
        newBests.forEach(nb => {
            const str = `${nb.parsedScore.toFixed(2)} _ ${nb.score.gain.toFixed(2)}% ( ${(
                (nb.score.gainC - 1) *
                100
            ).toFixed(2)}% ) ${nb.score.wins} / ${nb.score.tot} ( ${(
                (nb.score.wins / nb.score.tot) *
                100
            ).toFixed(0)}% ) [ ${tas.arr.map(t => [t.type, t.set.join(',')]).join(',')} ]`;
            document.querySelector(`#bestScore${nb.i}`).textContent = str;
        });
    }

    function addTasSelect() {
        addTas();
        calc();
    }

    async function saveTas(e) {
        const res = prepareForm(e);
        const { type } = res;
        if (!confirm('Update Tas ' + type)) {
            return;
        }
        await fetch(`/tas/${type}`, {
            method: 'put',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tas: res }),
        });
        highscores.bestScores = {};
        await loadTas();
        addTas();
        chart.setLines(tas);
        checkSettings();
    }

    function testTas(e) {
        const res = prepareForm(e);
        highscores.bestScores = {};
        tas.testSet(res);
        chart.setLines(tas);
        checkSettings();
    }

    function prepareForm(e) {
        const res = Object.fromEntries(
            [...new FormData(e.target.parentNode).entries()].map(f => {
                if (!f[0].includes('calc') && !f[0].includes('type')) {
                    f[1] = JSON.parse(f[1]);
                }
                return f;
            })
        );
        res.type = document.querySelector('#addtasselect').value;
        return res;
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
        tas.arr = [{ ...startTas[0], set: tas.arr[0].set }];
        tas.arr = highscores.getBestScore(0)[2];
        calc();
        loading[0] = setLoading(false);
        document.querySelector('#scan').value = 'Scan';
    }

    async function scanLoopHandler(loop) {
        document.querySelector('#scanning').textContent = `${loop.i + 1} / ${
            loop.scann
        } [ ${loop.tas.map(tt => [tt.set.join(',')]).join(',')} ]`;
        await new Promise(r => setTimeout(r, 0));
    }

    function scanNewScoreHandler(score) {
        document.querySelector('#score').innerHTML = `
        <span class="${score.gain >= 0 ? 'green' : 'red'}">${score.gain.toFixed(2)}%</span> 
        ( <span class="${score.gainC >= 1 ? 'green' : 'red'}">${((score.gainC - 1) * 100).toFixed(
            2
        )}%</span> )
        `;
        document.querySelector('#wins').textContent = `
        ${score.wins} / ${score.tot} ( ${((score.wins / score.tot) * 100).toFixed(2)}% ) 
        `;
    }

    async function checkSettings() {
        if (loading[0]) {
            return;
        }
        if (tas.arr.length <= 0) {
            return;
        }
        loading[0] = setLoading(true);
        const score = calc();
        const newBestScore = highscores.checkScore(score, tas.arr);
        newBestScore.forEach(nb => {
            const str = `${nb.parsedScore.toFixed(2)} ${nb.score.gain.toFixed(2)}% ( ${(
                (nb.score.gainC - 1) *
                100
            ).toFixed(2)}% ) ${nb.score.wins} / ${nb.score.tot} ( ${(
                (nb.score.wins / nb.score.tot) *
                100
            ).toFixed(0)}% ) [ ${tas.arr.map(t => [t.type]).join(',')} ]`;
            document.querySelector('#bestScore' + nb.i).textContent = str;
        });
        loading[0] = setLoading(false);
    }

    function calc() {
        const tempData = [...data];
        const check = new Check();
        check.checkData(tempData, tas, checkSet);
        const { score } = check;
        if (print) {
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
        document.querySelector('#wins').textContent = `
            ${score.wins} / ${score.tot} ( ${((score.wins / score.tot) * 100).toFixed(2)}% ) 
            `;
        return score;
    }

    function printScore(score) {
        document.querySelector('#score').innerHTML = `
            <span class="${score.gain >= 0 ? 'green' : 'red'}">${score.gain.toFixed(2)}%</span> 
            ( <span class="${score.gainC >= 1 ? 'green' : 'red'}">${(
            (score.gainC - 1) *
            100
        ).toFixed(2)}%</span> )
            `;
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
        data = await (
            await fetch(`/data/${chartSet.pair}/${chartSet.timef}/${chartSet.size}`)
        ).json();
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
            `<p id="bestScore${i}"></p>`,
            `<li><span>${c}</span><input type="button" value="X" class="deleteCheck" id="hsc-${i}"> </li>`,
        ]);
        document.querySelector('#bestScores').innerHTML = html.map(h => h[0]).join('');
    }

    function deleteCheck(e) {
        if (loading[0]) {
            return;
        }
        const i = e.target.id.split('-')[1];
        highscores.checks.splice(i, 1);
        printChecks();
    }

    function addCheckBest() {
        if (loading[0]) {
            return;
        }
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

    function addTas() {
        const selectedType = document.querySelector('#addtasselect').value;
        tas.arr = [];
        tas.add(selectedType);
        highscores.bestScores = {};
        printTas();
        chart.setLines(tas);
    }

    async function printTas() {
        const selectedType = document.querySelector('#addtasselect').value;
        const type = tas.types.find(t => t.type == selectedType);
        if (!type) {
            return;
        }
        const i = 1;
        const labels = {
            type: 'Type',
            set: 'Set',
            lines: 'Lines',
            lcolor: 'Line Colors',
            plines: 'Price Lines',
            fss: 'First Setting Smallest',
            overlay: 'Overlay',
            check: 'Check',
            oc: 'Open/Close',
            calc: 'Calculate',
        };
        const html = Object.entries(type)
            .map(tt => {
                if (tt[0] == 'type') {
                    return '';
                }
                const label = `<label for="${tt[0]}${i}">${labels[tt[0]]}</label>`;
                if (['fss', 'overlay'].includes(tt[0])) {
                    return `${label}
                        <input type="text"  id="${tt[0]}${i}" name="${tt[0]}"  value="${tt[1]}">`;
                }
                if (['calc'].includes(tt[0])) {
                    return `${label}
                        <textarea  id="${tt[0]}${i}" name="${tt[0]}" spellcheck="false">${tt[1]
                        .toString()
                        .replaceAll('\\n', '&#10;')}</textarea>`;
                }
                return `${label}
                    <textarea  id="${tt[0]}${i}" class="low" rows=1 name="${
                    tt[0]
                }">${JSON.stringify(tt[1])}</textarea>`;
            })
            .join('');
        document.querySelector('#tasSetings').innerHTML = html;
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

test();
