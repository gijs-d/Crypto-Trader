(() => {
    const socket = io();
    const chart = new Chart('chart');
    const tas = new Tas();
    let data;
    let countInterval;

    document.addEventListener('DOMContentLoaded', init);

    function init() {
        printBuysTable();
        printScores();
        document.querySelector('#delete').addEventListener('click', deleteGame);
        socket.on('update', updateGame);
        loadChart();
    }

    function printBuysTable() {
        let temps = 0;
        document.querySelector('#buys').innerHTML = game.data.buys
            .map((b, i) => {
                let change = ((b.close - b.open) / b.open) * 100;
                temps += change;
                return `<tr>
        <td class="${change >= 0 ? 'win' : 'lose'}" >${i + 1}</td>
        <td>${new Date(b.time).toLocaleString().slice(0, -3)}</td>
        <td>${new Date(b.closeTime).toLocaleString().slice(0, -3)}</td>
        <td class="${change >= 0 ? 'win' : 'lose'}" >${change.toFixed(2)} %</td>
        <td class="${temps >= 0 ? 'win' : 'lose'}" >${temps.toFixed(2)} %</td>
    </tr>`;
            })
            .join('');
    }

    async function deleteGame() {
        if (confirm('Shure u wonne delete') == true) {
            await fetch(`/live/id/${game.id}`, {
                method: 'DELETE',
            });
            window.location.reload();
        }
    }

    function getTime(time) {
        return Math.floor(time / 1000) + 3600 * 2;
    }

    async function loadChart() {
        tas.loadFromTasArray(game.tas);
        chart.setLines(tas);
        data = await (
            await fetch(
                `/data/live/${game.set.pair}/${game.set.timef}/${
                    Math.floor(game.running / 1000) + 2
                }`
            )
        ).json();
        data = data.map(d => ({
            ...d,
            time: getTime(d.time),
        }));
        chart.setData('candle', data);
        calc();
    }

    function calc() {
        const tempData = [...data];
        const check = new Check();
        check.checkData(tempData, tas, { fee: game.set.fee }, getTime(game.startTime));
        check.buys = game.data.buys;
        check.tempBuy = game.data.tempBuy;
        check.checkScore({ fee: game.set.fee });
        setMarkers(check);
        printLines(check);
        printScores();
        reloadInterval();
    }

    function setMarkers(check) {
        let markerBuys = [...game.data.buys];
        if (game.data.tempBuy.openCandle) {
            markerBuys.push(game.data.tempBuy);
        }
        check.makeMarkers(markerBuys, { fee: game.set.fee });
        check.markers = check.markers.map(m => ({ ...m, time: getTime(m.time) }));
        check.markers.unshift({
            time: getTime(game.startCandle),
            buy: false,
            position: 'aboveBar',
            color: '#ffffff',
            shape: 'arrowDown',
            label: 'Start',
            size: 5,
        });
    }

    function printLines(check) {
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

    function printScores() {
        const makeSpan = nr => `<span class=${nr > 0 ? 'win' : nr < 0 ? 'lose' : ''} >`;
        if (game.tempScore.time) {
            document.querySelector('#open').innerHTML = `Open:<br/> ${makeSpan(
                game.tempScore.gain
            )}${game.tempScore.gain.toFixed(2)}%</span>  ${new Date(
                game.tempScore.time
            ).toLocaleString()} ${timeToString((game.time - game.tempScore.time) / 1000)}`;
        } else {
            document.querySelector('#open').innerHTML = '';
        }
        document.querySelector('#score').innerHTML = `Total:<br/>${makeSpan(
            game.score.gain
        )}${game.score.gain.toFixed(2)}%</span> ${makeSpan(game.score.gainC - 1)}(${(
            (game.score.gainC - 1) *
            100
        ).toFixed(2)}%)</span>  ${game.score.wins} / ${game.score.tot} (${(
            (game.score.wins / (game.score.tot || 1)) *
            100
        ).toFixed(2)}%)`;
    }

    function timeToString(time) {
        return `${time > 86400 ? `${Math.floor(time / 86400)}d ` : ''}  ${
            time > 3600 ? `${Math.floor((time % 86400) / 3600)}h ` : ''
        } ${time > 60 ? `${Math.floor((time % 3600) / 60)}m ` : ''}${Math.floor(time % 60)}s`;
    }

    function reloadInterval() {
        if (countInterval) {
            clearInterval(countInterval);
        }
        const getRTime = () => timeToString((game.nextUpdate - new Date().getTime()) / 1000);
        const getSTime = () => timeToString((new Date().getTime() - game.startTime) / 1000);
        document.querySelector('#reload').innerHTML = getRTime();
        document.querySelector('#startTime').innerHTML = getSTime();
        countInterval = setInterval(() => {
            document.querySelector('#reload').innerHTML = getRTime();
            document.querySelector('#startTime').innerHTML = getSTime();
        }, 1000);
    }

    function updateGame(msg) {
        if (msg.id != game.id) return;
        socket.emit('getData', {
            id: msg.id,
        });
        msg.data.candles = msg.data.candles.map(d => {
            d.time = Math.floor(d.time / 1000) + 3600 * 2;
            return d;
        });
        let tempdata = msg.data.candles.filter(c => c.time >= data[data.length - 1].time);
        if (tempdata.length) {
            data.pop();
            data = [...data, ...tempdata];
        }
        delete msg.data.candles;
        game = msg;
        chart.setData('candle', data);
        calc();
    }
})();
