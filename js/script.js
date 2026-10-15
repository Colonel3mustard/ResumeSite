(function () {
  'use strict';

  // Each skill keeps its own bar color so colors never repeat or shift when
  // skills are added or removed. Unused tones that fit the palette:
  // #D08770 orange, #81A1C1 blue, #C2A3E0 lavender, #7FC4A8 mint, #D98C95 rose.
  var SKILLS = [
    { id: 'ts', name: 'TypeScript', years: 7, color: '#88C0D0' },
    { id: 'vue', name: 'Vue', years: 6, color: '#A3BE8C' },
    { id: 'pinia', name: 'Pinia', years: 6, color: '#EBCB8B' },
    { id: 'vite', name: 'Vite', years: 6, color: '#B48EAD' },
    { id: 'vitest', name: 'Vitest', years: 4, color: '#8FBCBB' },
    { id: 'webpack', name: 'Webpack', years: 4, color: '#BF616A' },
    { id: 'js', name: 'JavaScript', years: 7, color: '#D8A6C6' },
    { id: 'htmlcss', name: 'HTML & CSS', years: 7, color: '#E0A97A' },
    { id: 'jest', name: 'Jest', years: 4, color: '#9DB8E0' },
    { id: 'nuxt', name: 'Nuxt', years: 2, color: '#C9D88B' }
  ];

  var HANDLE_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>';

  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  var list = document.getElementById('skill-list');
  if (!list) return;

  var gridlines = document.getElementById('gridlines');
  var axisTicks = document.getElementById('axis-ticks');
  var status = document.getElementById('skill-status');
  var sortButtons = document.querySelectorAll('[data-sort]');

  var byId = {};
  SKILLS.forEach(function (s) { byId[s.id] = s; });

  var state = {
    order: SKILLS.map(function (s) { return s.id; }),
    sort: 'years'
  };

  var axisMax = Math.max.apply(null, SKILLS.map(function (s) { return s.years; })) + 1;
  var step = axisMax > 12 ? 2 : 1;

  function yearsLabel(n) { return n + (n === 1 ? ' yr' : ' yrs'); }

  // Axis ticks and gridlines
  for (var v = 0; v <= axisMax; v += step) {
    var pct = (v / axisMax) * 100 + '%';
    var line = document.createElement('div');
    line.className = 'gridline';
    line.style.left = pct;
    gridlines.appendChild(line);

    var label = document.createElement('span');
    label.className = 'tick-label';
    label.style.left = pct;
    label.textContent = String(v);
    axisTicks.appendChild(label);
  }

  // Build one row per skill; rows are reordered in place so focus is kept.
  var rows = {};
  SKILLS.forEach(function (s) {
    var li = document.createElement('li');
    li.className = 'skill-row';
    li.dataset.id = s.id;

    var handle = document.createElement('button');
    handle.type = 'button';
    handle.className = 'drag-handle';
    handle.setAttribute('aria-label', 'Reorder ' + s.name + ', ' + yearsLabel(s.years) + '. Use up and down arrow keys.');
    handle.innerHTML = HANDLE_SVG;

    var name = document.createElement('span');
    name.className = 'skill-name';
    name.textContent = s.name;

    var wrap = document.createElement('div');
    wrap.className = 'bar-wrap';
    var bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.width = (s.years / axisMax) * 100 + '%';
    bar.style.background = s.color;
    var yl = document.createElement('span');
    yl.className = 'bar-label';
    yl.textContent = yearsLabel(s.years);
    wrap.appendChild(bar);
    wrap.appendChild(yl);

    li.appendChild(handle);
    li.appendChild(name);
    li.appendChild(wrap);
    rows[s.id] = li;

    handle.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      e.preventDefault();
      var ids = displayedIds();
      var from = ids.indexOf(s.id);
      move(from, from + (e.key === 'ArrowUp' ? -1 : 1));
      handle.focus();
    });

    handle.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      e.preventDefault();
      startDrag(s.id, e.pointerId);
    });
  });

  function displayedIds() {
    var items = state.order.map(function (id) { return byId[id]; });
    if (state.sort === 'years') {
      items = items.slice().sort(function (a, b) { return b.years - a.years; });
    } else if (state.sort === 'az') {
      items = items.slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
    }
    return items.map(function (s) { return s.id; });
  }

  function render() {
    displayedIds().forEach(function (id) {
      list.appendChild(rows[id]);
    });
    sortButtons.forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(btn.dataset.sort === state.sort));
    });
  }

  function move(from, to) {
    var ids = displayedIds();
    if (from < 0 || to < 0 || to >= ids.length || from === to) return;
    var moved = ids.splice(from, 1)[0];
    ids.splice(to, 0, moved);
    state.order = ids;
    state.sort = 'custom';
    render();
    status.textContent = byId[moved].name + ' moved to position ' + (to + 1) + ' of ' + ids.length + '.';
  }

  // Pointer-based dragging works for mouse, pen and touch alike. Listeners sit
  // on window because reordering moves the row (and its handle) in the DOM.
  function startDrag(id, pointerId) {
    var row = rows[id];
    row.classList.add('is-dragging');
    document.body.classList.add('is-reordering');

    function onMove(e) {
      if (e.pointerId !== pointerId) return;
      var ids = displayedIds();
      var from = ids.indexOf(id);
      var to = 0;
      ids.forEach(function (otherId) {
        if (otherId === id) return;
        var r = rows[otherId].getBoundingClientRect();
        if (e.clientY > r.top + r.height / 2) to++;
      });
      if (to !== from) move(from, to);
    }

    function onEnd(e) {
      if (e.pointerId !== pointerId) return;
      row.classList.remove('is-dragging');
      document.body.classList.remove('is-reordering');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);
  }

  sortButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      state.sort = btn.dataset.sort;
      render();
    });
  });

  render();
})();
