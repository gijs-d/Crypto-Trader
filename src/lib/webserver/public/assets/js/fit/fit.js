const chart = new Chart('chart', 500);
const tas = new Tas();
let changed = false;
let loading = false;
let data = [];
const chartSet = {
    pair: 'BTCUSDT',
    timef: '5m',
    size: 10,
};
let fee = 0.1;
let reloading = false;

document.addEventListener('DOMContentLoaded', init);

async function init() {
    await loadTas();
    chart.setLines(tas);
    await getData();
    document.querySelector('#score').innerHTML = '0% (0%) 0 / 0 (0%)';
    document.querySelector('.addtas input').addEventListener('click', addTas);
    document.querySelector('#load').addEventListener('click', load);
    document.querySelector('#reload').addEventListener('click', reload);
    document.querySelector('#fee').addEventListener('input', e => (fee = Number(e.target.value)));
    printTas();
}

async function getData() {
    data = await (
        await fetch(`/data/live/${chartSet.pair}/${chartSet.timef}/${chartSet.size}`)
    ).json();
    data = data.map(d => {
        d.time = Math.floor(d.time / 1000);
        return d;
    });
    chart.setData('candle', data);
}

async function reload() {
    if (reloading) {
        reloading = false;
        return;
    }
    document.querySelector('#reload').style['background-color'] = '#00ee00';
    reloading = true;
    while (reloading) {
        while (changed) {
            changed = false;
            await load();
            await new Promise(r => setTimeout(r, 100));
        }
        await new Promise(r => setTimeout(r, 1000));
    }
    document.querySelector('#reload').style['background-color'] = 'unset';
}

async function load() {
    return new Promise((res, rej) => {
        if (loading) return rej();
        loading = true;
        const tempData = [...data];
        const check = new Check();
        check.fee = fee;
        check.checkData(tempData, tas, {
            fee: fee,
        });
        tas.arr.forEach(a => {
            a.keepSet = true;
        });
        const { score } = check;
        chart.setLines(tas);
        tas.arr.forEach(t => {
            t.lines.forEach(line => {
                if (check.lines[t.ids[line]]) {
                    chart.setData(t.name + line, check.lines[t.ids[line]]);
                }
            });
        });
        chart.setMarkers('candle', check.markers);
        printScore(score);
        loading = false;
        res();
    });
}

function printScore(score) {
    document.querySelector('#score').innerHTML = `
    <span class="${score.gain >= 0 ? 'win' : 'lose'}">${score.gain.toFixed(2)}%</span> 
    (<span class="${score.gainC >= 1 ? 'win' : 'lose'}">${((score.gainC - 1) * 100).toFixed(
        2
    )}%</span>) 
    ${score.wins} / ${score.tot} (${((score.wins / (score.tot || 1)) * 100).toFixed(2)}%)
    `;
}

async function loadTas() {
    document.querySelector('#addtasselect').innerHTML = tas.types
        .map(t => `<option value="${t.type}">${t.type}</option>`)
        .join('');
}

function addTas() {
    const type = document.querySelector('#addtasselect').value;
    tas.add(type);
    changed = true;
    printTas();
}

function printTas() {
    let str = tas.arr
        .map(
            (ta, i) => `
        <li id="tas-${i}">
            <input type="button" value="X" class="close">
            <input type="number" class="max" value="500">
            <p>${ta.type}</p>
            ${ta.set
                .map(
                    (v, ii) => `
                <div class="setGroup">
                    <input type="range" min="1" value="${v}" max="500" class="slider" id="set-${i}-${ii}">
                    <p>${v}</p>
                </div>
                `
                )
                .join('')}
        </li>`
        )
        .join('');
    document.querySelector('#tas').innerHTML = str;
    document.querySelectorAll('#tas li .close').forEach(d => d.addEventListener('click', close));
    document.querySelectorAll('#tas li .max').forEach(d => d.addEventListener('input', changeMax));
    document
        .querySelectorAll('#tas li .slider')
        .forEach(d => d.addEventListener('input', changeSet));
}

function changeSet(e) {
    const value = e.target.value;
    const id = e.target.id.split('-')[1];
    const set = e.target.id.split('-')[2];
    tas.arr[id].set[set] = value;
    if (tas.arr[id].type == 'adx3' && set == 2) {
        tas.arr[id].plines = [value];
    }
    tas.arr[id].keepSet = false;
    changed = true;
    e.target.parentNode.querySelector('p').textContent = value;
}

function changeMax(e) {
    const sliders = e.target.closest('li').querySelectorAll('.slider');
    sliders.forEach(s => (s.max = e.target.value));
}

function close(e) {
    const id = e.target.closest('li').id.split('-')[1];
    tas.arr = tas.arr.filter((t, i) => i != id);
    changed = true;
    printTas();
}
