class Highscores {
    bestScores = {};
    checks = [
        'score.gain + score.gain * (score.wins / (score.tot || 1)) + score.min * 2',
        'score.gain',
    ];
    numberOfTopScores = 10;
    newBest = () => {};
    newScore = () => {};

    constructor() {
        this.reset();
    }

    reset() {
        this.checks.forEach(check => {
            this.bestScores[check] = [];
        });
    }

    checkScore(score, tas) {
        const checkBestFunctions = this.checks.map(check =>
            Function('score', `return (${check});`)
        );
        const newBests = [];
        this.checks.forEach((check, i) => {
            const parsedScore = checkBestFunctions[i](score);
            if (!this.bestScores[check]) {
                this.bestScores[check] = [];
            }
            if (!this.#scoreIsUnique(check, tas)) {
                return;
            }
            this.#checkIfNewBest(parsedScore, check, score, tas, newBests, i);
        });
        if (newBests.length > 0) {
            this.newBest(newBests);
        }
        return newBests;
    }

    #scoreIsUnique(check, tas) {
        let unique = true;
        this.bestScores[check].forEach(bestScore => {
            if (
                bestScore[2].map(ta => `${ta.type} [${ta.set}]`).join(', ') ==
                tas.map(ta => `${ta.type} [${ta.set}]`).join(', ')
            ) {
                unique = false;
            }
        });
        return unique;
    }

    #checkIfNewBest(parsedScore, check, score, tas, newBests, i) {
        const best = this.bestScores[check]?.at(0)?.at(0);
        const least = this.bestScores[check]?.at(-1)?.at(0);
        if (parsedScore > least || this.bestScores[check].length < this.numberOfTopScores) {
            this.bestScores[check].push([
                parsedScore,
                score,
                [...tas.map(ta => ({ ...ta, set: [...ta.set] }))],
            ]);
            this.bestScores[check].sort((a, b) => b[0] - a[0]);
            this.bestScores[check] = this.bestScores[check].slice(0, this.numberOfTopScores);
            if (parsedScore > best || best == undefined) {
                newBests.push({ i, parsedScore, score });
            }
            this.newScore({ i, arr: this.bestScores[check] });
        }
    }

    getBestScores(i) {
        return this.bestScores[this.checks[i]];
    }

    getBestScore(i) {
        return this.bestScores[this.checks[i]][0];
    }

    getRBestScore() {
        const i = Math.floor(Math.random() * this.checks.length);
        if (!this.bestScores[this.checks[i]]) {
            return [];
        }
        const best = this.bestScores[this.checks[i]][0];
        if (!best) {
            return [];
        }
        return best[2];
    }
}

module.exports = Highscores;
