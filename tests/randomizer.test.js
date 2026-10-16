const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');
const coreSource = fs.readFileSync(path.join(__dirname, '..', 'randomizer-core.js'), 'utf8');

function createElement() {
    return {
        hidden: false,
        value: '',
        checked: false,
        textContent: '',
        innerHTML: '',
        style: {},
        dataset: {},
        className: '',
        children: [],
        classList: {
            add() {},
            remove() {},
            toggle() {},
            contains() { return false; }
        },
        setAttribute() {},
        removeAttribute() {},
        addEventListener() {},
        appendChild(child) { this.children.push(child); },
        focus() {},
        click() {},
        play() { return Promise.resolve(); },
        pause() {}
    };
}

function createStorage() {
    const values = new Map();
    return {
        getItem(key) { return values.has(key) ? values.get(key) : null; },
        setItem(key, value) { values.set(key, String(value)); },
        removeItem(key) { values.delete(key); }
    };
}

function loadImplementation() {
    const elements = new Map();
    const storage = createStorage();
    const alerts = [];
    const document = {
        getElementById(id) {
            if (!elements.has(id)) elements.set(id, createElement());
            return elements.get(id);
        },
        createElement() { return createElement(); },
        querySelectorAll() { return []; },
        querySelector() { return createElement(); },
        addEventListener() {}
    };

    const math = Object.create(Math);
    const context = {
        console,
        document,
        Math: math,
        URLSearchParams,
        localStorage: storage,
        sessionStorage: createStorage(),
        window: {
            location: { search: '' },
            addEventListener() {},
            matchMedia() { return { matches: false }; },
            AudioContext: class {},
            webkitAudioContext: class {}
        },
        alert(message) { alerts.push(String(message)); },
        confirm() { return true; },
        prompt() { return null; },
        fetch: async () => { throw new Error('fetch is unavailable in characterization tests'); },
        navigator: { clipboard: { writeText: async () => {} } },
        Image: class {},
        FileReader: class {},
        Blob: class {},
        URL: { createObjectURL() { return ''; }, revokeObjectURL() {} },
        confetti() {},
        firebase: undefined,
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
        Date,
        JSON,
        Set,
        Map,
        Object,
        Array,
        Number,
        String,
        Boolean,
        Infinity
    };
    context.globalThis = context;

    // Prevent application startup from loading external members during tests.
    const testSource = coreSource + '\n' + source.replace(/\ninit\(\);\s*$/, '\n');
    const expose = `
        globalThis.__randomizer = {
            shuffle,
            splitRandom,
            generateCombinations,
            splitTierBalanced,
            assignPositions,
            assignChampions,
            draw,
            getFullPool,
            renderPlayers,
            showHistoryModal,
            setState(next) { state = next; },
            getState() { return state; },
            getCurrentResult() { return currentResult; }
        };
        globalThis.__security = { escapeHtml, safeImageSrc, avatarHtml, renderPlayers, showHistoryModal };
        globalThis.__validation = {
            validatePlayerRecord,
            validatePlayers,
            validateTierScore,
            validateTierScores,
            validateRankScores,
            validateSettings,
            validateChampionPool,
            validateStateData,
            parseStatePayload,
            loadState,
            maxAvatarDataLength: MAX_AVATAR_DATA_LENGTH
        };
        globalThis.__rank = { catalog: RANK_CATALOG, defaultScores: DEFAULT_RANK_SCORES, scoreIds: RANK_SCORE_IDS };
    `;
    vm.runInNewContext(testSource + expose, context, { filename: 'script.js' });
    return { api: context.__randomizer, core: context.CustomAOVRandomizer, security: context.__security, validation: context.__validation, rank: context.__rank, elements, math, storage, alerts };
}

const loaded = loadImplementation();
const { api, core, security, validation, rank, elements, math, storage, alerts } = loaded;

function useRandomValues(...values) {
    let index = 0;
    math.random = () => values[index++ % values.length];
}

function plain(value) {
    return JSON.parse(JSON.stringify(value));
}

function players(count, tier = 1) {
    return Array.from({ length: count }, (_, index) => ({
        id: `p${index + 1}`,
        name: `Player ${index + 1}`,
        tier
    }));
}

function setState(overrides = {}) {
    api.setState({
        players: [],
        tierScore: { 1: 8, 2: 4, 3: 2, 4: 1, 5: 0.5 },
        rankScores: { ...rank.defaultScores },
        championPool: { top: [], jungle: [], mid: [], adc: [], support: [] },
        settings: {
            teamMode: 'tier',
            roleMode: 'random',
            championMode: 'byRole',
            balanceLevel: '60-40',
            revealMode: 'secretBox',
            soundEnabled: true
        },
        history: [],
        ...overrides
    });
}

test('randomizer-core loads before the application and exposes the extracted implementation', () => {
    assert.equal(typeof core.rand, 'function');
    assert.equal(typeof core.shuffle, 'function');
    assert.equal(typeof core.generateCombinations, 'function');
    assert.equal(typeof core.splitRandom, 'function');
    assert.equal(typeof core.splitTierBalanced, 'function');
    assert.equal(typeof core.assignPositions, 'function');
    assert.equal(typeof core.assignChampions, 'function');

    const result = core.splitRandom(players(10), () => 0);
    assert.equal(result.teamA.length, 5);
    assert.equal(result.teamB.length, 5);
});

test('escapeHtml preserves text while neutralizing markup and attribute syntax', () => {
    const payload = `<script>alert('xss')</script> & "quote" 'apostrophe' Tiếng Việt`;
    const escaped = security.escapeHtml(payload);

    assert.equal(escaped, '&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt; &amp; &quot;quote&quot; &#39;apostrophe&#39; Tiếng Việt');
    assert.doesNotMatch(escaped, /<\s*script|onerror\s*=|javascript\s*:/i);
});

test('safeImageSrc accepts generated data images and rejects executable or external sources', () => {
    assert.equal(security.safeImageSrc('data:image/jpeg;base64,AAAA'), 'data:image/jpeg;base64,AAAA');
    assert.equal(security.safeImageSrc('data:text/html,<script>alert(1)</script>'), '');
    assert.equal(security.safeImageSrc('javascript:alert(1)'), '');
    assert.equal(security.safeImageSrc('https://example.test/avatar.png'), '');
});

test('avatarHtml cannot turn an imported avatar payload into an executable attribute', () => {
    const payload = '" onerror="alert(1)';
    const rendered = security.avatarHtml(payload);

    assert.doesNotMatch(rendered, /onerror\s*=|<script|javascript\s*:/i);
    assert.match(rendered, /avatar-emoji/);
});

test('player and history renderers escape imported or Firebase-like text values', () => {
    const payload = `<img src=x onerror="alert(1)">& "Tên người chơi"`;
    setState({
        players: [{ id: payload, name: payload, tier: 1, avatar: null, active: true }],
        history: [{
            teamAName: payload,
            teamBName: 'Đội & Việt ngữ',
            timestamp: '2026-01-01T00:00:00.000Z',
            teamA: [{ name: payload, role: 'top', champion: payload }],
            teamB: [],
            balancePercent: {}
        }]
    });

    security.renderPlayers();
    const playerMarkup = elements.get('playerList').children[0].innerHTML;
    assert.ok(playerMarkup.includes('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;'));
    assert.doesNotMatch(playerMarkup, /<img src=x onerror=/i);

    security.showHistoryModal(0);
    const historyMarkup = elements.get('modalBody').innerHTML;
    assert.ok(historyMarkup.includes('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;'));
    assert.doesNotMatch(historyMarkup, /<img src=x onerror=/i);
    assert.match(historyMarkup, /Đội &amp; Việt ngữ/);
});

test('shuffle preserves all elements and is reproducible with deterministic randomness', () => {
    useRandomValues(0, 0, 0);
    const first = api.shuffle([1, 2, 3, 4]);
    useRandomValues(0, 0, 0);
    const second = api.shuffle([1, 2, 3, 4]);

    assert.deepEqual(first, second);
    assert.deepEqual([...first].sort(), [1, 2, 3, 4]);
});

test('splitRandom creates two teams of five for ten players', () => {
    useRandomValues(0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9);
    const result = api.splitRandom(players(10));
    const ids = [...result.teamA, ...result.teamB].map((player) => player.id);

    assert.equal(result.teamA.length, 5);
    assert.equal(result.teamB.length, 5);
    assert.equal(new Set(ids).size, 10);
});

test('splitRandom preserves empty, short, and larger inputs without applying a ten-player limit', () => {
    useRandomValues(0);
    assert.deepEqual(plain(api.splitRandom([])), { teamA: [], teamB: [] });
    assert.equal(api.splitRandom(players(3)).teamA.length, 1);
    assert.equal(api.splitRandom(players(11)).teamA.length, 5);
    assert.equal(api.splitRandom(players(11)).teamB.length, 6);
});

test('generateCombinations returns every combination in source order', () => {
    assert.deepEqual(plain(api.generateCombinations([0, 1, 2, 3], 2)), [
        [0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]
    ]);
    assert.deepEqual(plain(api.generateCombinations([], 0)), [[]]);
    assert.deepEqual(plain(api.generateCombinations([1, 2], 3)), []);
});

test('splitTierBalanced produces five-player teams with equal scores', () => {
    setState();
    useRandomValues(0);
    const result = api.splitTierBalanced(players(10, 3));
    const ids = [...result.teamA, ...result.teamB].map((player) => player.id);

    assert.equal(result.teamA.length, 5);
    assert.equal(result.teamB.length, 5);
    assert.equal(new Set(ids).size, 10);
    assert.equal(result.warning, false);
});

test('splitTierBalanced respects 50-50, 60-40, and 70-30 configured ranges', () => {
    const input = players(10).map((player, index) => ({
        ...player,
        tier: [1, 1, 1, 2, 2, 2, 3, 3, 4, 5][index]
    }));
    const tierScore = { 1: 8, 2: 4, 3: 2, 4: 1, 5: 0.5 };

    for (const [balanceLevel, expected] of [
        ['50-50', [48, 52]],
        ['60-40', [40, 60]],
        ['70-30', [30, 70]]
    ]) {
        setState({ tierScore, settings: { balanceLevel } });
        useRandomValues(0);
        const result = api.splitTierBalanced(input);
        const powerA = result.teamA.reduce((sum, player) => sum + tierScore[player.tier], 0);
        const total = input.reduce((sum, player) => sum + tierScore[player.tier], 0);
        const percentA = (powerA / total) * 100;
        assert.ok(percentA >= expected[0] && percentA <= expected[1]);
    }
});

test('splitTierBalanced uses the nearest available split and warning when no widened range matches', () => {
    const input = players(10).map((player, index) => ({ ...player, tier: index === 0 ? 1 : 2 }));
    setState({
        tierScore: { 1: 100, 2: 0 },
        settings: { balanceLevel: '50-50' }
    });
    useRandomValues(0);
    const result = api.splitTierBalanced(input);

    assert.equal(result.warning, true);
    assert.equal(result.teamA.length, 5);
    assert.equal(result.teamB.length, 5);
});

test('splitTierBalanced documents current fallback behavior for missing, zero, and invalid scores', () => {
    const input = players(10, 9);

    setState({ tierScore: {} });
    useRandomValues(0);
    assert.doesNotThrow(() => api.splitTierBalanced(input));

    setState({ tierScore: { 9: 0 } });
    useRandomValues(0);
    const zeroScoreResult = api.splitTierBalanced(input);
    assert.equal(zeroScoreResult.warning, false);

    setState({ tierScore: { 9: 'invalid' } });
    useRandomValues(0);
    assert.doesNotThrow(() => api.splitTierBalanced(input));
});

test('splitTierBalanced handles empty input with an empty warning result', () => {
    setState();
    assert.deepEqual(plain(api.splitTierBalanced([])), { teamA: [], teamB: [], warning: true });
});

test('assignPositions assigns each of the five roles once to a five-player team', () => {
    useRandomValues(0);
    const result = api.assignPositions(players(5));
    const roles = result.map((player) => player.role);

    assert.equal(new Set(roles).size, 5);
    assert.deepEqual([...roles].sort(), ['adc', 'jungle', 'mid', 'support', 'top']);
});

test('assignPositions uses flex for players beyond the five standard roles', () => {
    useRandomValues(0);
    const result = api.assignPositions(players(7));
    assert.equal(result.filter((player) => player.role === 'flex').length, 2);
});

test('assignPositions handles empty and short teams', () => {
    useRandomValues(0);
    assert.deepEqual(api.assignPositions([]), []);
    assert.equal(api.assignPositions(players(3)).length, 3);
});

test('assignChampions assigns heroes from each role pool without duplicates when available', () => {
    const roles = ['top', 'jungle', 'mid', 'adc', 'support'];
    const championPool = Object.fromEntries(roles.map((role) => [role, [`${role}-1`, `${role}-2`]]));
    setState({ championPool, settings: { championMode: 'byRole' } });
    useRandomValues(0);

    const [teamA, teamB] = api.assignChampions(
        roles.map((role, index) => ({ id: `a${index}`, role })),
        roles.map((role, index) => ({ id: `b${index}`, role }))
    );
    const assigned = [...teamA, ...teamB].map((player) => player.champion);

    assigned.forEach((champion, index) => {
        const role = roles[index % roles.length];
        assert.ok(championPool[role].includes(champion));
    });
    assert.equal(new Set(assigned).size, 10);
});

test('assignChampions supports unrestricted full-pool randomization', () => {
    const championPool = {
        top: ['A', 'B'],
        jungle: ['C', 'D'],
        mid: ['E', 'F'],
        adc: ['G', 'H'],
        support: ['I', 'J']
    };
    setState({ championPool, settings: { championMode: 'full' } });
    useRandomValues(0);
    const [teamA, teamB] = api.assignChampions(players(5), players(5));
    const assigned = [...teamA, ...teamB].map((player) => player.champion);

    assert.equal(new Set(assigned).size, 10);
    assert.ok(assigned.every((champion) => 'ABCDEFGHIJ'.includes(champion)));
});

test('assignChampions falls back to team-unique heroes and marks warnings when the pool is insufficient', () => {
    setState({
        championPool: { top: ['A', 'B'], jungle: [], mid: [], adc: [], support: [] },
        settings: { championMode: 'full' }
    });
    useRandomValues(0);
    const [teamA, teamB] = api.assignChampions(
        [{ id: 'a1', role: 'top' }, { id: 'a2', role: 'top' }],
        [{ id: 'b1', role: 'top' }]
    );
    const assigned = [...teamA, ...teamB];

    assert.deepEqual(teamA.map((player) => player.champion), ['A', 'B']);
    assert.equal(assigned[2].champion, 'A');
    assert.equal(assigned[2].championWarn, true);
});

test('assignChampions respects championMode skip', () => {
    setState({
        championPool: { top: ['A'], jungle: [], mid: [], adc: [], support: [] },
        settings: { championMode: 'skip' }
    });
    const [teamA, teamB] = api.assignChampions([{ id: 'a1', role: 'top' }], []);

    assert.deepEqual(plain(teamA), [{ id: 'a1', role: 'top', champion: null, championWarn: false }]);
    assert.deepEqual(plain(teamB), []);
});

test('assignChampions handles empty teams', () => {
    setState();
    assert.deepEqual(plain(api.assignChampions([], [])), [[], []]);
});

test('validation accepts valid players, decimal scores, and omitted optional active field', () => {
    const player = { id: 'p1', name: 'Người chơi & 1', tier: 3 };
    const playerResult = validation.validatePlayerRecord(player, 0);
    const scoreResult = validation.validateTierScore(1.25, 3);

    assert.equal(playerResult.ok, true);
    assert.equal(playerResult.value.active, true);
    assert.equal(scoreResult.value, 1.25);
});

test('validation rejects duplicate IDs and malformed player fields', () => {
    const result = validation.validatePlayers([
        { id: 'p1', name: 'A', tier: 1, active: true },
        { id: 'p1', name: 'B', tier: 2, active: true }
    ]);
    assert.equal(result.ok, false);
    assert.match(result.error, /trùng/);
    assert.equal(validation.validatePlayerRecord({ id: 'bad id', name: 'A', tier: 1 }, 0).ok, false);
    assert.equal(validation.validatePlayerRecord({ id: 'p2', name: '', tier: 1 }, 0).ok, false);
    assert.equal(validation.validatePlayerRecord({ id: 'p3', name: 'A', tier: 16 }, 0).ok, false);
    assert.equal(validation.validatePlayerRecord({ id: 'p4', name: 'A', tier: 1, active: 'yes' }, 0).ok, false);
});

test('validation rejects negative, non-finite, and non-number tier scores', () => {
    assert.equal(validation.validateTierScore(-1, 1).ok, false);
    assert.equal(validation.validateTierScore(Infinity, 1).ok, false);
    assert.equal(validation.validateTierScore(NaN, 1).ok, false);
    assert.equal(validation.validateTierScore('2', 1).ok, false);
});

test('validation rejects unsupported settings and champion pool roles', () => {
    assert.equal(validation.validateSettings({ championMode: 'unsafe' }).ok, false);
    assert.equal(validation.validateSettings({ balanceLevel: '80-20' }).ok, false);
    assert.equal(validation.validateChampionPool({ coach: ['A'] }).ok, false);
    assert.equal(validation.validateChampionPool({ top: ['A', 2] }).ok, false);
});

test('validation rejects oversized avatar data', () => {
    const oversized = `data:image/jpeg;base64,${'A'.repeat(validation.maxAvatarDataLength)}`;
    const result = validation.validatePlayerRecord({ id: 'p1', name: 'A', tier: 1, avatar: oversized }, 0);
    assert.equal(result.ok, false);
    assert.match(result.error, /Avatar/);
});

test('state validation preserves backward-compatible partial saved data', () => {
    const payload = {
        players: [{ id: 'p1', name: 'Old save', tier: 2 }],
        tierScore: { 1: 7.5 },
        settings: { teamMode: 'random' }
    };
    const result = validation.validateStateData(payload);
    const imported = validation.parseStatePayload(JSON.stringify(payload));

    assert.equal(result.ok, true);
    assert.equal(imported.ok, true);
    assert.deepEqual(plain(result.value.players[0]), { id: 'p1', name: 'Old save', tier: 2, active: true, rankTier: null });
    assert.equal(result.value.tierScore[1], 7.5);
    assert.equal(result.value.tierScore[5], 0.5);
    assert.equal(result.value.settings.teamMode, 'random');
    assert.equal(result.value.settings.championMode, 'byRole');
});

test('malformed JSON and invalid state are rejected before state mutation', () => {
    const before = { players: [{ id: 'p1', name: 'Current', tier: 1 }] };
    api.setState(before);
    const malformed = validation.parseStatePayload('{"players":');
    const invalid = validation.parseStatePayload(JSON.stringify({ players: [{ id: 'p1', name: 'A', tier: 1 }, { id: 'p1', name: 'B', tier: 2 }] }));

    assert.equal(malformed.ok, false);
    assert.equal(invalid.ok, false);
    assert.deepEqual(api.getState(), before);
});

test('corrupted localStorage is ignored without replacing the current state', () => {
    const current = { players: [{ id: 'p1', name: 'Current', tier: 1 }] };
    api.setState(current);
    storage.setItem('lq_state', JSON.stringify({ players: [{ id: 'p1', name: 'A', tier: -1 }] }));

    assert.doesNotThrow(() => validation.loadState());
    assert.deepEqual(api.getState(), current);
});

test('rank catalog contains exactly 32 ordered unique entries with the specified defaults', () => {
    assert.equal(rank.catalog.length, 32);
    assert.equal(new Set(rank.catalog.map((item) => item.id)).size, 32);
    assert.deepEqual(plain(rank.catalog.slice(0, 3).map((item) => [item.label, item.score])), [['Đồng III', 1], ['Đồng II', 2], ['Đồng I', 3]]);
    assert.deepEqual(plain(rank.catalog.slice(-2).map((item) => [item.label, item.score])), [['Chiến Tướng', 40], ['Chiến Thần', 45]]);
    assert.equal(rank.defaultScores['bach-kim-iii'], 13);
});

test('rank score validation accepts decimals and rejects unknown or non-positive values', () => {
    assert.equal(validation.validateRankScores({ 'dong-iii': 1.5 }).ok, true);
    assert.equal(validation.validateRankScores({ unknown: 2 }).ok, false);
    assert.equal(validation.validateRankScores({ 'dong-iii': 0 }).ok, false);
    assert.equal(validation.validateRankScores({ 'dong-iii': Infinity }).ok, false);
});

test('Rank-Based split uses rank scores and produces two complete teams', () => {
    const input = players(10).map((player, index) => ({ ...player, rankTier: rank.catalog[index % 5].id }));
    setState({
        players: input,
        rankScores: Object.fromEntries(rank.catalog.map((item) => [item.id, 1])),
        settings: { teamMode: 'rank', balanceLevel: '50-50' }
    });
    useRandomValues(0);
    const result = api.splitTierBalanced(input);
    const ids = [...result.teamA, ...result.teamB].map((player) => player.id);

    assert.equal(result.teamA.length, 5);
    assert.equal(result.teamB.length, 5);
    assert.equal(new Set(ids).size, 10);
});

test('Skill-Based accepts exactly the original five Mâm and preserves their scores', () => {
    assert.equal(validation.validatePlayerRecord({ id: 'p5', name: 'Mâm 5', tier: 5 }, 0).ok, true);
    for (let tier = 6; tier <= 15; tier++) {
        assert.equal(validation.validatePlayerRecord({ id: `p${tier}`, name: `Mâm ${tier}`, tier }, 0).ok, false);
    }
    setState({ tierScore: { 1: 8, 2: 4, 3: 2, 4: 1, 5: 0.5 }, settings: { teamMode: 'tier', balanceLevel: '50-50' } });
    const input = players(10).map((player, index) => ({ ...player, tier: index === 0 ? 1 : 5 }));
    const result = api.splitTierBalanced(input);

    assert.equal(result.teamA.length, 5);
    assert.equal(result.teamB.length, 5);
});

test('legacy or imported state with Mâm 6-15 is rejected without remapping', () => {
    const invalid = validation.parseStatePayload(JSON.stringify({
        players: [{ id: 'p6', name: 'Invalid Mâm', tier: 6 }],
        tierScore: { 6: 1 }
    }));

    assert.equal(invalid.ok, false);
    assert.match(invalid.error, /Tier/);
});

test('player list exposes the active skill editor for tier and rank modes', () => {
    const baseState = api.getState();
    const player = { id: 'ux-player', name: 'UX Player', tier: 2, rankTier: rank.catalog[4].id, avatar: null, active: true };
    api.setState({ ...baseState, players: [player], settings: { ...baseState.settings, teamMode: 'tier' } });
    api.renderPlayers();
    assert.match(elements.get('playerList').children.at(-1).innerHTML, /data-tier-for="ux-player"/);

    api.setState({ ...baseState, players: [player], settings: { ...baseState.settings, teamMode: 'rank' } });
    api.renderPlayers();
    assert.match(elements.get('playerList').children.at(-1).innerHTML, /data-rank-for="ux-player"/);
});

test('Rank-Based split preserves configured decimal scores and fallback warning', () => {
    const input = players(10).map((player, index) => ({ ...player, rankTier: index === 0 ? 'chien-than' : 'dong-iii' }));
    setState({
        players: input,
        rankScores: { 'chien-than': 45.5, 'dong-iii': 1.25 },
        settings: { teamMode: 'rank', balanceLevel: '50-50' }
    });
    const result = api.splitTierBalanced(input);

    assert.equal(result.warning, true);
    assert.equal([...result.teamA, ...result.teamB].length, 10);
});

test('Rank-Based draw blocks exactly ten active players when any rank is missing', () => {
    setState({
        players: players(10).map((player, index) => ({ ...player, rankTier: index === 0 ? null : 'dong-iii', active: true })),
        settings: { teamMode: 'rank' }
    });
    alerts.length = 0;
    api.draw();

    assert.equal(alerts.length, 1);
    assert.match(alerts[0], /Player 1/);
    assert.equal(api.getCurrentResult(), null);
});

test('legacy state and rank-enabled JSON round trips remain compatible', () => {
    const legacy = validation.parseStatePayload(JSON.stringify({
        players: [{ id: 'p1', name: 'Legacy', tier: 5 }],
        settings: { teamMode: 'tier' }
    }));
    const rankedPayload = {
        players: [{ id: 'p1', name: 'Ranked', tier: 3, rankTier: 'vang-i' }],
        rankScores: { 'vang-i': 10.5 },
        settings: { teamMode: 'rank' }
    };
    const ranked = validation.parseStatePayload(JSON.stringify(rankedPayload));

    assert.equal(legacy.ok, true);
    assert.equal(legacy.value.players[0].rankTier, null);
    assert.equal(ranked.ok, true);
    assert.equal(ranked.value.players[0].rankTier, 'vang-i');
    assert.equal(ranked.value.rankScores['vang-i'], 10.5);
});

test('Live Share syncTeams payload shape remains rank-agnostic', () => {
    const syncStart = source.indexOf('function syncTeams');
    const syncEnd = source.indexOf('function syncReveal', syncStart);
    const syncSource = source.slice(syncStart, syncEnd);

    assert.doesNotMatch(syncSource, /rankTier/);
    assert.match(syncSource, /name: p\.name/);
    assert.match(syncSource, /championWarn: p\.championWarn/);
});
