(() => {
    const socket = io();
    let lives = [];
    let sortOn = 'gain';
    const filters = new Map();
    const intervalList = new Map();

    document.addEventListener('DOMContentLoaded', init);

    async function init() {
        document.querySelector('#addLive').addEventListener('submit', addLive);
        await getLives();
        addTopicHandlers();
        document.querySelector('#sort').value = sortOn;
        sort(sortOn);
        document.querySelector('#sort').addEventListener('input', e => sort(e.target.value));
        document
            .querySelector('#searchPair')
            .addEventListener('input', e => filter('pair', e.target.value));
        document
            .querySelector('#searchTimef')
            .addEventListener('input', e => filter('timef', e.target.value));
    }

    function filter(type, value) {
        if (value == '') {
            if (type != '') {
                filters.delete(type);
            }
        } else {
            filters.set(type, value);
        }
        let filterdLives = lives;
        filterdLives = filterdLives.filter(f => {
            let ok = true;
            filters.forEach((value, type) => (ok = ok && f.set[type].includes(value)));
            return ok;
        });
        printAll(filterdLives);
    }

    function sort(type) {
        sortOn = type;
        switch (type) {
            case 'oldest':
                lives.sort((a, b) => a.startTime - b.startTime);
                break;
            case 'recent':
                lives.sort((a, b) => b.startTime - a.startTime);
                break;
            case 'pair':
                lives.sort((a, b) => b.set.pair.localeCompare(a.set.pair));
                break;
            case 'gain':
                lives.sort(
                    (a, b) => b.score.gain + b.tempScore.gain - (a.score.gain + a.tempScore.gain)
                );
                break;
            case 'loss':
                lives.sort(
                    (a, b) => a.score.gain + a.tempScore.gain - (b.score.gain + b.tempScore.gain)
                );
                break;
        }
        filter('', '');
    }

    async function getLives() {
        lives = await (await fetch('/live/all')).json();
        document.querySelectorAll('.liveGames').forEach(d => d.addEventListener('click', loadLive));
    }

    function addLive(e) {
        e.preventDefault();
        let formdata = new FormData(e.target);
        const tasList = formdata.get('tas');
        tasList.split('\n').forEach(t => {
            formdata.set('tas', t);
            fetch('/live/new', {
                method: 'post',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams(formdata),
            });
        });
    }

    function addTopicHandlers() {
        socket.on('update', msg => {
            console.log({ msg });
            const i = lives.findIndex(l => l.id == msg.id);
            if (i < 0) {
                lives.push(msg);
                printNew(msg);
                return;
            }
            lives[i] = msg;
            setUpdateInterval(msg);
            update(msg);
        });
    }

    function printAll(arr = lives) {
        const html = arr.map(live => printLive(live)).join('');
        document.querySelector('#nLives').innerHTML = arr.length;
        document.querySelector('#lives').innerHTML = html;
        document.querySelectorAll('.liveGames').forEach(d => d.addEventListener('click', loadLive));
    }

    function printLive(live) {
        const html = makeHtml(live);
        setUpdateInterval(live);
        return html;
    }

    function printTime(ms) {
        ms /= 1000;
        ms = Math.floor(ms);
        return `${ms >= 86400 ? Math.floor(ms / 86400) + 'd ' : ''} ${
            ms >= 3600 ? Math.floor((ms % 86400) / 3600) + 'h ' : ''
        } ${ms >= 60 ? Math.floor((ms % 3600) / 60) + 'm ' : ''} ${ms % 60}s`;
    }

    function setUpdateInterval(live) {
        if (intervalList.has(live.id)) {
            clearInterval(intervalList.get(live.id));
        }
        intervalList.set(
            live.id,
            setInterval(() => {
                let time = new Date(live.nextUpdate).getTime() - new Date().getTime();
                if (time >= 0) {
                    if (document.querySelectorAll(`#id-${live.id} .nextUpdate`).length <= 0) {
                        clearInterval(intervalList.get(live.id));
                        return;
                    }
                    document.querySelectorAll(`#id-${live.id} .nextUpdate`)[0].innerHTML =
                        printTime(time);
                } else {
                    console.log('stop tomer');
                    clearInterval(intervalList.get(live.id));
                }
            }, 1000)
        );
    }

    function makeHtml(live) {
        const printProcent = n => (n * 100).toFixed(2);
        const makeSpan = nr => `<span class=${nr > 0 ? 'win' : nr < 0 ? 'lose' : ''} >`;
        const openGame = `<p>${makeSpan(live.tempScore.gain)}${live.tempScore.gain.toFixed(
            2
        )}%</span> ${
            live.tempScore.time == 0
                ? 0
                : printTime(
                      new Date(live.lastTime).getTime() - new Date(live.tempScore.time).getTime()
                  )
        }</p>`;
        const html = `
        <li id="id-${live.id}" class="live${live.tempScore.time == 0 ? '' : ' open'} liveGames">
            <p class="nextUpdate">${printTime(
                new Date(live.nextUpdate).getTime() - new Date().getTime()
            )}</p>
            <p class="liveTitle">${live.set.pair} , ${live.set.timef} (${live.set.fee})</p>
            ${live.set.comment ? `<p class="comment">${live.set.comment}</p>` : ''}
            <div class="liveDiv"><p class="liveTasArr">${live.tas
                .map(ta => `${ta.type} ${JSON.stringify(ta.set)}`)
                .join(', ')}</p><p class="liveTasL">${live.tas.length}</p></div>
            <div class="grow">
            <p class="liveScore">${makeSpan(live.score.gain)}${live.score.gain.toFixed(
            2
        )}%</span> ( ${makeSpan(live.score.gainC - 1)}${printProcent(
            live.score.gainC - 1
        )}%</span> ) ${live.score.wins} / ${live.score.tot} ( ${printProcent(
            live.score.wins / (live.score.tot || 1)
        )}% )</p>
            ${live.tempScore.time == 0 ? '' : openGame}</div>
            <p class="liveTime">${live.running} | ${printTime(
            new Date().getTime() - new Date(live.startTime).getTime()
        )}</p>
        </li>
        `;
        return html;
    }

    function printNew(live) {
        const html = makeHtml(live);
        const elem = document.querySelector('#lives');
        elem.innerHTML = html + elem.innerHTML;
        document.querySelectorAll('.liveGames').forEach(d => d.addEventListener('click', loadLive));
    }

    function loadLive(e) {
        window.location = `/live/id/${e.target.closest('li').id.split('-')[1]}`;
    }

    function update(live) {
        if (document.querySelectorAll('#id-' + live.id).length > 0) {
            document.querySelector('#id-' + live.id).outerHTML = makeHtml(live);
            document
                .querySelectorAll('.liveGames')
                .forEach(d => d.addEventListener('click', loadLive));
        }
    }
})();
