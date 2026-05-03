// ==UserScript==
// @name         Questionably Epic Average Upgrade Ranker
// @namespace    https://github.com/PeteHerniman/qe-upgrade-ranker
// @version      1.0
// @description  Calculates upgrade % per roll on Questionably Epic
// @match        https://www.questionablyepic.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=questionablyepic.com
// @grant        none
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/PeteHerniman/qe-upgrade-ranker/main/script.user.js
// @downloadURL  https://raw.githubusercontent.com/PeteHerniman/qe-upgrade-ranker/main/script.user.js
// ==/UserScript==

(function () {
    'use strict';

    const SELECTORS = {
        accordion: '.MuiAccordion-root',
        percent: '.MuiTypography-subtitle2',
        header: 'h6'
    };

    const STYLES = {
        avg: {
            marginLeft: '10px',
            color: '#00e5ff',
            fontWeight: 'bold'
        },
        box: {
            background: 'rgb(255 255 255 / 20%)',
            border: '1px solid #333',
            borderRadius: '6px',
            padding: '10px',
            margin: '10px 8px'
        },
        row: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '20px'
        },
        left: {
            fontWeight: '500',
            fontSize: '1.25rem',
            color: 'rgb(239, 183, 62)'
        },
        right: {
            fontWeight: '500',
            fontSize: '1.25rem',
            color: '#00e5ff'
        }
    };

    const avgCache = new WeakMap();
    let lastSignature = '';

    const parsePercent = text =>
        parseFloat(text.replace('%', '').replace('+', '').trim()) || 0;

    function computeAverage(acc) {
        if (avgCache.has(acc)) return avgCache.get(acc);

        const values = [...acc.querySelectorAll(SELECTORS.percent)]
            .map(el => el.textContent.trim())
            .filter(txt => txt.startsWith('+'))
            .map(parsePercent);

        const avg = values.length
            ? values.reduce((a, b) => a + b, 0) / values.length
            : null;

        avgCache.set(acc, avg);
        return avg;
    }

    function extractData() {
        return [...document.querySelectorAll(SELECTORS.accordion)]
            .map(acc => {
                const header = acc.querySelector(SELECTORS.header);
                if (!header) return null;
                const avg = computeAverage(acc);
                if (avg === null) return null;

                const name = header.textContent.split('-')[0].trim();
                return { acc, header, name, avg };
            })
            .filter(Boolean);
    }

    function getSignature(data) {
        return data
            .map(d => `${d.name}:${d.avg.toFixed(4)}`)
            .join('|');
    }

    function applyAverages(data) {
        data.forEach(({ header, avg }) => {
            if (header.querySelector('.qe-avg-upgrade')) return;

            const span = document.createElement('span');
            span.className = 'qe-avg-upgrade';
            Object.assign(span.style, STYLES.avg);
            span.textContent = `Avg: +${avg.toFixed(2)}%`;

            header.appendChild(span);
        });
    }

    function buildLeaderboard(data) {
        if (!data.length) return;
        const container = data[0].acc.closest('.MuiGrid-root');
        if (!container) return;

        document.querySelector('#qe-leaderboard')?.remove();

        const box = document.createElement('div');
        box.id = 'qe-leaderboard';
        Object.assign(box.style, STYLES.box);

        const title = document.createElement('div');
        title.textContent = 'Upgrade Ranking';
        Object.assign(title.style, {
            fontWeight: '500',
            fontSize: '1.25rem',
            marginBottom: '6px',
            color: '#fff'
        });

        box.appendChild(title);

        data
            .sort((a, b) => b.avg - a.avg)
            .forEach(({ name, avg }, i) => {
                const row = document.createElement('div');
                Object.assign(row.style, STYLES.row);

                const left = document.createElement('span');
                Object.assign(left.style, STYLES.left);
                left.textContent = `#${i + 1} ${name}`;

                const right = document.createElement('span');
                Object.assign(right.style, STYLES.right);
                right.textContent = `+${avg.toFixed(2)}%`;

                row.append(left, right);
                box.appendChild(row);
            });

        container.parentElement.insertBefore(box, container);
    }

    function build() {
        const data = extractData();
        if (!data.length) return;
        const sorted = [...data].sort((a, b) => b.avg - a.avg);
        const sig = getSignature(sorted);
        if (sig === lastSignature) return;

        lastSignature = sig;
        applyAverages(sorted);
        buildLeaderboard(sorted);
    }

    new MutationObserver((mutations) => {
        for (const m of mutations) {
            const acc = m.target.closest?.(SELECTORS.accordion);
            if (acc) {
                avgCache.delete(acc);
            }
        }
        build();
    }).observe(document.body, {
        childList: true,
        subtree: true
    });

    build();
})();
