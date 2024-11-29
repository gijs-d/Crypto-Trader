class Chart {
    lines = new Map();
    buyMark = {
        position: 'belowBar',
        color: '#00ff00',
        shape: 'arrowUp',
        size: 5,
        text: 'buy',
    };
    sellMark = {
        position: 'aboveBar',
        shape: 'arrowDown',
        size: 5,
        color: '#ff0000',
        text: 'sell',
    };
    colors = [
        0,
        [
            '#00ff00',
            '#ff0000',
            '#00ff00',
            '#ff0000',
            '#00ff00',
            '#ff0000',
            '#00ff00',
            '#ff0000',
            '#00ff00',
        ],
    ];
    oldPriceLines = {};

    constructor(id, height = 300) {
        this.chart = LightweightCharts.createChart(document.querySelector('#' + id), {
            width: 0,
            autoSize: true,
            height,
            layout: {
                textColor: 'white',
                background: { type: 'solid', color: 'black' },
            },
            grid: {
                vertLines: {
                    color: 'rgba(255, 255, 255, 0.4)',
                    style: LightweightCharts.LineStyle.Dotted,
                },
                horzLines: {
                    color: 'rgba(255, 255, 255, 0.4)',
                    style: LightweightCharts.LineStyle.Dotted,
                },
            },
            crosshair: {
                mode: LightweightCharts.CrosshairMode.Normal,
                horzLine: {
                    visible: true,
                    labelVisible: true,
                },
            },
            rightPriceScale: {
                borderColor: 'rgba(197, 203, 206, 0.8)',
            },
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
                rightOffset: 5,
                borderColor: 'rgba(197, 203, 206, 0.8)',
            },
        });
    }

    #addSeries(name, type, options = {}) {
        if (this.lines.has(name)) {
            return this.lines.get(name);
        }
        let line;
        if (options?.color?.toLowerCase() == 'green') {
            options.color = '#00ff00';
        }
        switch (type) {
            case 'line':
                line = this.#addLineSeries(options);
                break;
            case 'candle':
                line = this.#addCandleSeries(options);
                break;
        }
        this.lines.set(name, line);
        return line;
    }

    #addLineSeries(options) {
        return this.chart.addLineSeries({
            lineWidth: 2,
            crosshairMarkerVisible: false,
            color: this.colors[1][this.colors[0]++],
            ...options,
        });
    }

    #addCandleSeries(options) {
        return this.chart.addCandlestickSeries({
            upColor: 'rgba(0, 255, 0, 0.8)',
            downColor: 'rgba(255,0,0,0.8)',
            borderDownColor: 'rgba(255,0,0,0.8)',
            borderUpColor: 'rgba(0, 255, 0, 0.8)',
            wickDownColor: 'rgba(255,0,0, 0.8)',
            wickUpColor: 'rgba(0, 255, 0, 0.8)',
            ...options,
        });
    }

    setMarkers(name, markers) {
        if (!this.lines.has(name)) {
            return;
        }
        markers = markers.map(marker => {
            let res;
            if (marker.label == 'Start') {
                res = marker;
            } else if (marker.buy) {
                res = { ...this.buyMark };
            } else {
                res = { ...this.sellMark };
            }
            res['text'] = marker.label;
            res['time'] = marker.time;
            if (marker.color) {
                res['color'] = marker.color;
            }
            return res;
        });
        this.lines.get(name).setMarkers(markers);
    }

    setData(name, data) {
        if (!this.lines.has(name)) {
            return;
        }
        this.lines.get(name).setData(data);
    }

    #removePriceLines(name) {
        if (!this.lines.has(name)) {
            return;
        }
        if (!this.oldPriceLines[name]) {
            return;
        }
        const line = this.lines.get(name);
        this.oldPriceLines[name].forEach(l => line.removePriceLine(l));
    }

    #setPriceLine(name, price) {
        if (!this.lines.has(name)) {
            return;
        }
        if (!this.oldPriceLines[name]) {
            this.oldPriceLines[name] = [];
        }
        this.oldPriceLines[name].push(
            this.lines.get(name).createPriceLine({
                price: price,
                color: 'white',
                lineWidth: 1,
                lineStyle: LightweightCharts.LineStyle.Dotted,
                axisLabelVisible: true,
            })
        );
    }

    #setPriceScale(name, ps = {}) {
        if (!this.lines.has(name)) {
            return;
        }

        this.lines
            .get(name)
            .priceScale()
            .applyOptions({
                scaleMargins: {
                    top: 0.9,
                    bottom: 0,
                },
                ...ps,
            });
    }

    setLines(tas) {
        this.lines.forEach((v, name) => {
            if (name != 'candle') {
                this.setData(name, []);
            }
        });
        this.#addSeries('candle', 'candle');
        if (tas.arr.length > 3) {
            return;
        }
        let nOverlaysHeight = 0.4;
        const nOverlays = tas.arr.filter(t => !t.overlay).length;
        nOverlaysHeight = Math.max(nOverlaysHeight / (nOverlays || 1), 0.1);
        this.#setTasLines(tas, nOverlaysHeight);
    }
    #setTasLines(tas, nOverlaysHeight) {
        let nOverlaysStart = 0;
        tas.arr.forEach(ta => {
            let opts = {};
            if (!ta.overlay) {
                opts = { priceScaleId: ta.name };
            }
            ta.lines.forEach((line, i) => {
                if (ta.lcolor[i]) {
                    opts = { ...opts, color: ta.lcolor[i] };
                }
                this.#addSeries(`${ta.name}${line}`, 'line', opts);
            });
            if (!ta.overlay) {
                this.#setPriceScale(ta.name + ta.lines[0], {
                    scaleMargins: {
                        top: 1 - nOverlaysHeight * (nOverlaysStart + 1),
                        bottom: nOverlaysHeight * nOverlaysStart,
                    },
                });
                nOverlaysStart += 1;
                if (ta.plines.length > 0) {
                    this.#removePriceLines(ta.name + ta.lines[0]);
                    ta.plines.forEach(pl => {
                        this.#setPriceLine(ta.name + ta.lines[0], pl);
                    });
                }
            }
        });
    }
}
