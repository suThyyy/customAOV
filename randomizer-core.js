// CustomAOV randomizer core.
// Classic browser script: no bundler or module loader is required.
(function (root) {
    const DEFAULT_ROLES = ['top', 'jungle', 'mid', 'adc', 'support'];

    function rand(n, random = Math.random) {
        return Math.floor(random() * n);
    }

    // Fisher-Yates shuffle. The optional random function only provides a
    // deterministic test seam; the default behavior remains Math.random.
    function shuffle(arr, random = Math.random) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    // Generate combinations in the same recursive order as the original code.
    function generateCombinations(arr, k) {
        const results = [];
        function helper(start, combo) {
            if (combo.length === k) { results.push([...combo]); return; }
            for (let i = start; i <= arr.length - (k - combo.length); i++) {
                combo.push(arr[i]);
                helper(i + 1, combo);
                combo.pop();
            }
        }
        helper(0, []);
        return results;
    }

    // Random split: Fisher-Yates followed by the original floor split.
    function splitRandom(players, random = Math.random) {
        const shuffled = shuffle(players, random);
        const sizeA = Math.floor(players.length / 2);
        return { teamA: shuffled.slice(0, sizeA), teamB: shuffled.slice(sizeA) };
    }

    // Tier-balanced split. Thresholds, widening behavior, fallback selection,
    // and warning semantics intentionally match the original implementation.
    function splitTierBalanced(players, tierScore, balanceLevel, random = Math.random, scoreKey = (player) => player.tier) {
        const n = players.length;
        const sizeA = Math.floor(n / 2);
        const power = players.map((p) => Number(tierScore[scoreKey(p)]) || 1);
        const totalPower = power.reduce((s, x) => s + x, 0);
        const combos = generateCombinations(players.map((_, i) => i), sizeA);

        const ranges = { '50-50': [48, 52], '60-40': [40, 60], '70-30': [30, 70] };
        let [lo, hi] = ranges[balanceLevel] || [40, 60];

        let candidates = [];
        for (let attempt = 0; attempt <= 3; attempt++) {
            candidates = combos.filter((combo) => {
                const powerA = combo.reduce((s, i) => s + power[i], 0);
                const percentA = (powerA / totalPower) * 100;
                return percentA >= lo && percentA <= hi;
            });
            if (candidates.length) break;
            lo -= 5; hi += 5;
        }

        let comboA;
        let warning = false;
        if (candidates.length) {
            comboA = candidates[rand(candidates.length, random)];
        } else {
            warning = true;
            let best = null;
            let bestDiff = Infinity;
            for (const combo of combos) {
                const powerA = combo.reduce((s, i) => s + power[i], 0);
                const diff = Math.abs((powerA / totalPower) * 100 - 50);
                if (diff < bestDiff) { bestDiff = diff; best = combo; }
            }
            comboA = best;
        }

        const setA = new Set(comboA);
        const teamA = players.filter((_, i) => setA.has(i));
        const teamB = players.filter((_, i) => !setA.has(i));
        return { teamA, teamB, warning };
    }

    function assignPositions(team, roles = DEFAULT_ROLES, random = Math.random) {
        const positions = shuffle(roles, random);
        return team.map((p, i) => ({ ...p, role: i < positions.length ? positions[i] : 'flex' }));
    }

    function fullPoolFrom(championPool = {}, heroNames = []) {
        const merged = [...new Set(Object.values(championPool).flat())];
        return merged.length ? merged : [...heroNames];
    }

    function assignChampions(teamA, teamB, options = {}) {
        const mode = options.championMode;
        const championPool = options.championPool || {};
        const fullPool = fullPoolFrom(championPool, options.heroNames || []);
        const random = options.random || Math.random;
        const usedGlobal = new Set();

        function assignTeam(team) {
            const usedInTeam = new Set();
            return team.map((p) => {
                if (mode === 'skip') return { ...p, champion: null, championWarn: false };
                let pool;
                if (p.role === 'flex' || mode === 'full') pool = fullPool;
                else pool = (championPool[p.role] && championPool[p.role].length) ? championPool[p.role] : fullPool;
                if (!pool.length) pool = fullPool;
                if (!pool.length) return { ...p, champion: null, championWarn: true };

                let candidates = pool.filter((c) => !usedGlobal.has(c));
                let warn = false;
                if (!candidates.length) {
                    candidates = pool.filter((c) => !usedInTeam.has(c));
                    warn = true;
                    if (!candidates.length) candidates = pool;
                }
                const champ = candidates[rand(candidates.length, random)];
                usedGlobal.add(champ);
                usedInTeam.add(champ);
                return { ...p, champion: champ, championWarn: warn };
            });
        }

        return [assignTeam(teamA), assignTeam(teamB)];
    }

    root.CustomAOVRandomizer = Object.freeze({
        rand,
        shuffle,
        generateCombinations,
        splitRandom,
        splitTierBalanced,
        assignPositions,
        assignChampions
    });
}(globalThis));
