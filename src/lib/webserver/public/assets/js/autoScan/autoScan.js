const counters = {
    timeframess: 5,
    coins: 97,
    tas: 15,
};
let coins;
let sessions = [];
let updateTimer;
const coinCheckboxes = document.querySelectorAll('#coins .checkboxes input');
const timeframesCheckboxes = document.querySelectorAll('#timeframes .checkboxes input');
const tasCheckboxes = document.querySelectorAll('#tas .checkboxes input');

document.addEventListener('DOMContentLoaded', init);

async function init() {
    await getData();
    countSelectedtimeframess();
    countSelectedCoins();
    countSelectedTas();
    eventListeners();
}

async function getData() {
    const res = await (await fetch('/autoScan/data')).json();
    const { sessions: sessionArray, coins: coinArray } = res;
    coins = coinArray;
    sessions = sessionArray;
    makeElements();
}

function eventListeners() {
    document.querySelector('#coins .selectAll').addEventListener('click', selectAllCoins);
    document.querySelector('#coins .unselectAll').addEventListener('click', unselectAllCoins);
    document.querySelector('#tas .selectAll').addEventListener('click', selectAllTas);
    document.querySelector('#noUSD').addEventListener('click', noUSDCoins);
    document.querySelector('#coins').addEventListener('click', countSelectedCoins);
    document.querySelector('#timeframes').addEventListener('click', countSelectedtimeframess);
    document.querySelector('#tas').addEventListener('click', countSelectedTas);
    document.querySelector('#addProcess').addEventListener('submit', addProcess);
}

async function addProcess(e) {
    e.preventDefault();
    if (!counters.coins || !counters.timeframess || !counters.tas) {
        return;
    }
    const data = Object.fromEntries(
        [...new FormData(e.target).entries()].filter(d => d[1] != 'on')
    );
    data['timeframes'] = [...timeframesCheckboxes].filter(c => c.checked).map(c => c.name);
    data['coins'] = [...coinCheckboxes].filter(c => c.checked).map(c => c.name);
    data['tas'] = [...tasCheckboxes].filter(c => c.checked).map(c => c.name);
    const res = await fetch('/autoScan', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });
    if (res.ok) {
        sessions = await res.json();
        makeElements();
    }
}

function updateTimers() {
    sessions.forEach(session => {
        document.querySelector(`#${session.name} .sessionTimer`).innerText = timePassed(
            session.startTime
        );
    });
}

function timePassed(time) {
    const passedTime = (Date.now() - time) / 1000;
    const d = Math.floor(passedTime / (60 * 60 * 24));
    const h = Math.floor((passedTime % (60 * 60 * 24)) / (60 * 60));
    const m = Math.floor((passedTime % (60 * 60)) / 60);
    const s = Math.floor(passedTime % 60);
    if (d) {
        return `${d}d ${h}h ${m}m ${s}s`;
    }
    if (h) {
        return `${h}h ${m}m ${s}s`;
    }
    if (m) {
        return `${m}m ${s}s`;
    }
    return `${s}s`;
}

function makeElements() {
    document.querySelector('#sessions').innerHTML =
        sessions.map(session => makeElement(session)).join('') || '<p>No processes running</p>';
    clearInterval(updateTimer);

    document
        .querySelectorAll('#sessions .closeSession')
        .forEach(d => d.addEventListener('click', closeSession));

    updateTimer = setInterval(updateTimers, 1000);
}

async function closeSession(e) {
    const name = e.target.closest('li').id;
    let res = await fetch('/autoScan', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
    });
    res = await res.json();
    sessions = res.sessions;
    makeElements();
}

function makeElement(session) {
    return `
        <li id="${session.name}">
            <p class="sessionTimer"></p>
            <input type="button" value="x" class="closeSession">
            <p>${session.name} - ${session.settings.base} - ${session.settings.delay}</p>
            ${makeDetailsElement('timeframes', session.settings.timeframes)}
            ${makeDetailsElement('Coins', session.settings.coins)}
            ${makeDetailsElement('Tas', session.settings.tas)}
        </li>
    `;
}

function makeDetailsElement(name, array) {
    return ` 
        <details>
            <summary>${name} ${array.length}</summary>
            <ul>
                ${array.map(element => `<li>${element}</li>`).join('')}                
            </ul>
        </details>
    `;
}

function countSelectedTas() {
    const selected = [...tasCheckboxes].reduce((a, b) => a + (b.checked ? 1 : 0), 0);
    counters.tas = selected;
    document.querySelector('#tasSelected').textContent = selected;
}

function countSelectedtimeframess() {
    const selected = [...timeframesCheckboxes].reduce((a, b) => a + (b.checked ? 1 : 0), 0);
    counters.timeframess = selected;
    document.querySelector('#timeframesSelected').textContent = selected;
}

function countSelectedCoins() {
    const selected = [...coinCheckboxes].reduce((a, b) => a + (b.checked ? 1 : 0), 0);
    counters.coins = selected;
    document.querySelector('#coinsSelected').textContent = selected;
}

function noUSDCoins() {
    coinCheckboxes.forEach(d => (d.checked = !d.id.includes('USD')));
}

function selectAllTas() {
    tasCheckboxes.forEach(d => (d.checked = true));
}

function selectAllCoins() {
    coinCheckboxes.forEach(d => (d.checked = true));
}

function unselectAllCoins(){
    coinCheckboxes.forEach(d => (d.checked = false));

}
