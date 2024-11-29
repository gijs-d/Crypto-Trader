document.addEventListener('DOMContentLoaded', init);

async function init() {
    reloadTas();
}

async function reloadTas() {
    let tas = await (await fetch('/tas/list')).text();
    tas = JSON.parse(tas);
    const html = tas.map((t, i) => makeTasElement(t, i)).join('');
    tas = tas.map(t => {
        try {
            t.calc = eval(t.calc);
            return t;
        } catch (e) {
            console.error(t.type, e);
        }
    });
    document.querySelector('ul').innerHTML = makeNewTasElement() + html;
    document.querySelectorAll('#addTas').forEach(d => d.addEventListener('submit', addTas));
    document.querySelectorAll('.delete').forEach(d => d.addEventListener('click', deleteTas));
    document.querySelectorAll('.update').forEach(d => d.addEventListener('click', updateTas));
}

async function updateTas(e) {
    const form = e.target.parentNode;
    const res = Object.fromEntries(
        [...new FormData(form).entries()].map(f => {
            if (!f[0].includes('calc') && !f[0].includes('type')) {
                f[1] = JSON.parse(f[1]);
            }
            return f;
        })
    );
    const type = e.target.id.split('-').slice(1).join('-');
    if (!confirm('Update Tas ' + type)) {
        return;
    }
    await fetch(`/tas/${type}`, {
        method: 'put',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tas: res }),
    });
    reloadTas();
}

async function deleteTas(e) {
    const type = e.target.id.split('-').slice(1).join('-');
    if (!confirm('Delete Tas ' + type)) {
        return;
    }
    await fetch(`/tas/${type}`, { method: 'delete' });
    reloadTas();
}

async function addTas(e) {
    e.preventDefault();
    const res = Object.fromEntries(
        [...new FormData(e.target).entries()].map(f => {
            if (!f[0].includes('calc') && !f[0].includes('type')) {
                try {
                    f[1] = JSON.parse(f[1]);
                } catch {}
            }
            return f;
        })
    );
    await fetch(e.target.action, {
        method: e.target.method,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tas: res }),
    });
    reloadTas();
}

function makeNewTasElement() {
    return `
    <li>
        <details open>
            <summary>+ New +</summary>
            <form method="post" action="/tas" id="addTas">
                <label for="type">Type <span>&#x1F6C8
                <div class="info">Unique name</div></span></label>
                <input type="text" name="type" id="type" value="" required>
                <label for="set">Set <span>&#x1F6C8
                <div class="info">[ inputs, outputs ]</div></span></label>
                <textarea id="set" name="set" required>[1,1]</textarea>
                <label for="lines">Lines <span>&#x1F6C8
                <div class="info">Ids for chart lines</div></span></label>
                <textarea id="lines" name="lines" required>[0]</textarea>
                <label for="lcolor">Line Colors <span>&#x1F6C8
                <div class="info">Chart line colors</div></span></label>
                <textarea id="lcolor" name="lcolor" required>["white"]</textarea>
                <label for="plines">Price Lines  <span>&#x1F6C8
                <div class="info">Values of price lines</div></span></label>
                <textarea id="plines" name="plines" required>[]</textarea>
                <label for="fss">First Setting Smallest  <span>&#x1F6C8
                <div class="info">Make first input smaller then second</div></span></label>
                <input type="text" id="fss" value="false" name="fss" required>
                <label for="overlay">Overlay <span>&#x1F6C8
                <div class="info">Print lines over candles</div></span></label>
                <input type="text" id="overlay" value="false" name="overlay" required>
                <label for="check">Check <span>&#x1F6C8
                <div class="info">Buy and sell rules,
                check outputs against other outputs ("id") or values ("nr")</div></span></label>
                <textarea id="check" name="check" required>[[["id",0],">=",["nr",0]]]</textarea>
                <label for="oc">Open/Close <span>&#x1F6C8
                <div class="info">Make different rules for opening and closing positions; 
                leave empty to use the rules in Check. e.g. 
                { "open":<br> [[["id",0],">",["nr",1]]], "close":<br> [[["id",0],"<",["nr",0]]]} </div></span></label>
                <textarea id="oc" name="oc" required>""</textarea>
                <label for="calc">Calculate<span>&#x1F6C8
                <div class="info">Calculate ta for each candle with <br><br>
                ids: array with length of outputs to store data in temp array (this.temp) 
                or output array (this.res) e.g. this.res[ids[0]].push( { value:1, time: candle.time } ) <br><br>
                inputs: array with length of inputs e.g. rsi[ 25 ] -> inputs[0] ==  25 <br><br>
                candle:{ open, close, high, low, volume, time }
                </div></span></label>
                <textarea id="calc" name="calc" required spellcheck="false">(ids, inputs, candle) => {}</textarea>
                <input type="submit" value="Save">
            </form>
        </details>
    </li>`;
}

function makeTasElement(ta, i) {
    ta['oc'] = ta['oc'] || '';
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
    return `
    <li><details><summary>${ta.type}</summary>
        <form>
            ${Object.entries(ta)
                .map(taSet => {
                    if (['type', 'fss', 'overlay'].includes(taSet[0])) {
                        return `
                        <label for="${taSet[0]}${i}">${labels[taSet[0]]}</label>
                        <input type="text"  id="${taSet[0]}${i}" name="${taSet[0]}"  value="${
                            taSet[1]
                        }">`;
                    }
                    if (['calc', 'oc'].includes(taSet[0])) {
                        if (taSet[0] == 'oc') {
                            taSet[1] = JSON.stringify(taSet[1]);
                        }
                        return `
                    <label for="${taSet[0]}${i}">${labels[taSet[0]]}</label>
                    <textarea  id="${taSet[0]}${i}" name="${
                            taSet[0]
                        }" spellcheck="false">${taSet[1]?.replaceAll('\\n', '&#10;')}</textarea>`;
                    }
                    return `
                    <label for="${taSet[0]}${i}">${labels[taSet[0]]}</label>
                    <textarea  id="${taSet[0]}${i}" name="${taSet[0]}">${JSON.stringify(
                        taSet[1]
                    )}</textarea>`;
                })
                .join('')}
        <input type="button" id="delete-${ta.type}" class="delete" value="Delete">
        <input type="button" id="update-${ta.type}" class="update" value="Update">
        </form>
    </details></li>
    `;
}
