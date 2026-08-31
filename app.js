const recipes = window.RECIPES || [];

const grid = document.querySelector('#recipe-grid');
const count = document.querySelector('#recipe-count');
const searchInput = document.querySelector('#recipe-search');
const filters = document.querySelector('#filter-buttons');
const emptyState = document.querySelector('#empty-state');
const dialog = document.querySelector('#recipe-dialog');
const detail = document.querySelector('#recipe-detail');
const closeButton = document.querySelector('.dialog-close');
const planner = document.querySelector('#weekly-planner');
const shoppingList = document.querySelector('#shopping-list');
const shoppingSummary = document.querySelector('#shopping-summary');
const copyShoppingButton = document.querySelector('#copy-shopping');
const clearPlanButton = document.querySelector('#clear-plan');

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PLAN_STORAGE_KEY = 'langton-cox-doha-week-plan-v1';

let activeFilter = 'All';
let searchTerm = '';
let weekPlan = loadWeekPlan();

const escapeHTML = (value = '') => String(value).replace(/[&<>'"]/g, character => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  "'": '&#39;',
  '"': '&quot;'
}[character]));

const categories = ['All', ...new Set(recipes.flatMap(recipe => recipe.tags))];

function loadWeekPlan() {
  const emptyPlan = Object.fromEntries(DAYS.map(day => [day, '']));
  try {
    const saved = JSON.parse(localStorage.getItem(PLAN_STORAGE_KEY) || '{}');
    return { ...emptyPlan, ...saved };
  } catch (error) {
    return emptyPlan;
  }
}

function saveWeekPlan() {
  try {
    localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(weekPlan));
  } catch (error) {
    // The planner still works for the current page if storage is unavailable.
  }
}

function renderFilters() {
  filters.innerHTML = categories.map(category => `
    <button class="filter-button ${category === activeFilter ? 'active' : ''}" type="button" data-filter="${escapeHTML(category)}">
      ${escapeHTML(category)}
    </button>
  `).join('');

  filters.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', () => {
      activeFilter = button.dataset.filter;
      renderFilters();
      renderRecipes();
    });
  });
}

function recipePhoto(recipe, size = 'card') {
  if (recipe.photo) {
    return `<img class="${size === 'detail' ? 'detail-photo' : 'recipe-photo'}" src="${escapeHTML(recipe.photo)}" alt="${escapeHTML(recipe.photoAlt || recipe.title)}">`;
  }

  const className = size === 'detail' ? 'detail-photo-placeholder' : 'recipe-photo-placeholder';
  return `<div class="${className}" role="img" aria-label="${escapeHTML(recipe.photoStatus)}"><span>${escapeHTML(recipe.photoStatus)}</span></div>`;
}

function matches(recipe) {
  const searchable = [
    recipe.title,
    recipe.summary,
    recipe.category,
    ...recipe.tags,
    ...recipe.ingredients
  ].join(' ').toLowerCase();

  const matchesSearch = !searchTerm || searchable.includes(searchTerm);
  const matchesFilter = activeFilter === 'All' || recipe.tags.includes(activeFilter);
  return matchesSearch && matchesFilter;
}

function renderRecipes() {
  const filtered = recipes.filter(matches);
  count.textContent = `${filtered.length} ${filtered.length === 1 ? 'recipe' : 'recipes'}`;
  emptyState.hidden = filtered.length !== 0;

  grid.innerHTML = filtered.map(recipe => `
    <article class="recipe-card">
      ${recipePhoto(recipe)}
      <div class="recipe-card-body">
        <div class="recipe-meta">
          ${recipe.tags.slice(0, 3).map(tag => `<span class="tag">${escapeHTML(tag)}</span>`).join('')}
        </div>
        <h3>${escapeHTML(recipe.title)}</h3>
        <p>${escapeHTML(recipe.summary)}</p>
        <div class="recipe-card-actions">
          <button class="recipe-open" type="button" data-recipe="${escapeHTML(recipe.id)}">Open recipe →</button>
          ${recipe.archive ? '<span class="archive-label">Archive recipe</span>' : ''}
        </div>
      </div>
    </article>
  `).join('');

  grid.querySelectorAll('.recipe-open').forEach(button => {
    button.addEventListener('click', () => openRecipe(button.dataset.recipe));
  });
}

function plannerOptions(selectedId = '') {
  return [
    '<option value="">Choose dinner…</option>',
    ...recipes.map(recipe => `<option value="${escapeHTML(recipe.id)}" ${recipe.id === selectedId ? 'selected' : ''}>${escapeHTML(recipe.title)}</option>`)
  ].join('');
}

function renderPlanner() {
  planner.innerHTML = DAYS.map(day => {
    const selectedId = weekPlan[day] || '';
    const selectedRecipe = recipes.find(recipe => recipe.id === selectedId);

    return `
      <article class="day-card ${selectedRecipe ? 'has-meal' : ''}">
        <div class="day-card-top">
          <p class="day-name">${day}</p>
          ${selectedRecipe ? `<button class="day-view" type="button" data-view-recipe="${escapeHTML(selectedRecipe.id)}" aria-label="Open ${escapeHTML(selectedRecipe.title)}">View</button>` : ''}
        </div>
        <label>
          <span class="sr-only">Dinner for ${day}</span>
          <select class="day-select" data-day="${day}">
            ${plannerOptions(selectedId)}
          </select>
        </label>
        <p class="day-detail">${selectedRecipe ? `${escapeHTML(selectedRecipe.category)} · ${escapeHTML(selectedRecipe.cook)}` : 'Nothing planned yet'}</p>
      </article>
    `;
  }).join('');

  planner.querySelectorAll('.day-select').forEach(select => {
    select.addEventListener('change', event => {
      weekPlan[event.target.dataset.day] = event.target.value;
      saveWeekPlan();
      renderPlanner();
      renderShoppingList();
    });
  });

  planner.querySelectorAll('.day-view').forEach(button => {
    button.addEventListener('click', () => openRecipe(button.dataset.viewRecipe));
  });
}

function formatQuantity(value) {
  if (value === null || value === undefined || value === '') return '';
  if (!Number.isFinite(Number(value))) return String(value);

  const number = Number(value);
  const whole = Math.floor(number);
  const fraction = Math.round((number - whole) * 4) / 4;
  const fractionText = { 0.25: '¼', 0.5: '½', 0.75: '¾' }[fraction] || '';

  if (whole === 0 && fractionText) return fractionText;
  if (fractionText) return `${whole}${fractionText}`;
  return Number.isInteger(number) ? String(number) : String(Number(number.toFixed(2)));
}

function plannedRecipes() {
  return DAYS.map(day => recipes.find(recipe => recipe.id === weekPlan[day])).filter(Boolean);
}

function consolidatedShopping() {
  const combined = new Map();

  plannedRecipes().forEach(recipe => {
    (recipe.shopping || []).forEach(entry => {
      const key = `${entry.item.toLowerCase()}|${entry.unit || ''}|${entry.category || 'Other'}`;
      const existing = combined.get(key);

      if (!existing) {
        combined.set(key, {
          item: entry.item,
          qty: entry.qty,
          unit: entry.unit || '',
          category: entry.category || 'Other'
        });
        return;
      }

      if (Number.isFinite(Number(existing.qty)) && Number.isFinite(Number(entry.qty))) {
        existing.qty = Number(existing.qty) + Number(entry.qty);
      }
    });
  });

  return [...combined.values()];
}

function groupedShopping() {
  const categoryOrder = [
    'Fruit & veg',
    'Meat & fish',
    'Dairy & eggs',
    'Tins & jars',
    'Pasta, rice & grains',
    'Baking',
    'Pantry',
    'Herbs & spices',
    'Other'
  ];
  const groups = new Map();

  consolidatedShopping().forEach(item => {
    if (!groups.has(item.category)) groups.set(item.category, []);
    groups.get(item.category).push(item);
  });

  return [...groups.entries()]
    .sort(([a], [b]) => {
      const aIndex = categoryOrder.indexOf(a);
      const bIndex = categoryOrder.indexOf(b);
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    })
    .map(([category, items]) => [category, items.sort((a, b) => a.item.localeCompare(b.item))]);
}

function shoppingItemText(item) {
  const qty = formatQuantity(item.qty);
  return [qty, item.unit, item.item].filter(Boolean).join(' ');
}

function renderShoppingList() {
  const selectedRecipes = plannedRecipes();
  const groups = groupedShopping();

  if (!selectedRecipes.length) {
    shoppingSummary.textContent = 'Add dinners above and the list will build itself.';
    shoppingList.innerHTML = '<div class="shopping-empty">No dinners planned yet. Your trolley is enjoying the peace.</div>';
    copyShoppingButton.disabled = true;
    return;
  }

  const uniqueMeals = new Set(selectedRecipes.map(recipe => recipe.id)).size;
  shoppingSummary.textContent = `${selectedRecipes.length} planned dinners · ${uniqueMeals} ${uniqueMeals === 1 ? 'recipe' : 'recipes'} · ${consolidatedShopping().length} shopping items`;
  copyShoppingButton.disabled = false;

  shoppingList.innerHTML = groups.map(([category, items]) => `
    <section class="shopping-group">
      <h4>${escapeHTML(category)}</h4>
      <div class="shopping-items">
        ${items.map(item => `
          <label class="shopping-item">
            <input type="checkbox">
            <span>${escapeHTML(shoppingItemText(item))}</span>
          </label>
        `).join('')}
      </div>
    </section>
  `).join('');
}

function shoppingListText() {
  const groups = groupedShopping();
  const selected = plannedRecipes();
  if (!selected.length) return '';

  const planText = DAYS
    .filter(day => weekPlan[day])
    .map(day => {
      const recipe = recipes.find(item => item.id === weekPlan[day]);
      return `${day}: ${recipe ? recipe.title : ''}`;
    })
    .join('\n');

  const listText = groups.map(([category, items]) => {
    const lines = items.map(item => `• ${shoppingItemText(item)}`).join('\n');
    return `${category}\n${lines}`;
  }).join('\n\n');

  return `LANGTON-COX DINNER PLAN\n${planText}\n\nSHOPPING LIST\n${listText}`;
}

async function copyShoppingList() {
  const text = shoppingListText();
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
  }

  const original = copyShoppingButton.textContent;
  copyShoppingButton.textContent = 'Copied ✓';
  setTimeout(() => {
    copyShoppingButton.textContent = original;
  }, 1600);
}

function openRecipe(id, updateHash = true) {
  const recipe = recipes.find(item => item.id === id);
  if (!recipe) return;

  detail.innerHTML = `
    ${recipePhoto(recipe, 'detail')}
    <div class="detail-content">
      <p class="eyebrow">${recipe.made ? 'Made by us' : 'On the menu'}${recipe.archive ? ' · Archive recipe' : ''}</p>
      <h2>${escapeHTML(recipe.title)}</h2>
      <p class="detail-summary">${escapeHTML(recipe.summary)}</p>
      <div class="detail-stats">
        <span class="detail-stat"><strong>Serves:</strong> ${escapeHTML(recipe.serves)}</span>
        <span class="detail-stat"><strong>Prep:</strong> ${escapeHTML(recipe.prep)}</span>
        <span class="detail-stat"><strong>Cook:</strong> ${escapeHTML(recipe.cook)}</span>
      </div>
      <div class="add-to-plan">
        <div>
          <strong>Add to this week</strong>
          <span>Choose a day and the shopping list updates automatically.</span>
        </div>
        <div class="add-to-plan-controls">
          <select id="detail-plan-day" aria-label="Choose day for ${escapeHTML(recipe.title)}">
            ${DAYS.map(day => `<option value="${day}">${day}</option>`).join('')}
          </select>
          <button id="detail-plan-add" class="primary-button button-control" type="button">Add</button>
        </div>
      </div>
      <div class="detail-columns">
        <section>
          <h3>Ingredients</h3>
          <ul>${recipe.ingredients.map(item => `<li>${escapeHTML(item)}</li>`).join('')}</ul>
        </section>
        <section>
          <h3>Method</h3>
          <ol>${recipe.method.map(item => `<li>${escapeHTML(item)}</li>`).join('')}</ol>
          ${recipe.note ? `<div class="cook-note"><strong>Kitchen note:</strong> ${escapeHTML(recipe.note)}</div>` : ''}
        </section>
      </div>
    </div>
  `;

  const planDaySelect = detail.querySelector('#detail-plan-day');
  const addButton = detail.querySelector('#detail-plan-add');
  const firstEmptyDay = DAYS.find(day => !weekPlan[day]);
  if (firstEmptyDay) planDaySelect.value = firstEmptyDay;

  addButton.addEventListener('click', () => {
    const day = planDaySelect.value;
    weekPlan[day] = recipe.id;
    saveWeekPlan();
    renderPlanner();
    renderShoppingList();
    addButton.textContent = `Added to ${day} ✓`;
    setTimeout(() => {
      addButton.textContent = 'Add';
    }, 1700);
  });

  if (!dialog.open) dialog.showModal();
  if (updateHash) history.replaceState(null, '', `#recipe=${recipe.id}`);
}

function closeRecipe() {
  if (dialog.open) dialog.close();
  if (location.hash.startsWith('#recipe=')) history.replaceState(null, '', location.pathname);
}

searchInput.addEventListener('input', event => {
  searchTerm = event.target.value.trim().toLowerCase();
  renderRecipes();
});

closeButton.addEventListener('click', closeRecipe);
dialog.addEventListener('click', event => {
  if (event.target === dialog) closeRecipe();
});
dialog.addEventListener('cancel', event => {
  event.preventDefault();
  closeRecipe();
});

copyShoppingButton.addEventListener('click', copyShoppingList);
clearPlanButton.addEventListener('click', () => {
  const hasMeals = Object.values(weekPlan).some(Boolean);
  if (hasMeals && !window.confirm('Clear every dinner from this week?')) return;
  weekPlan = Object.fromEntries(DAYS.map(day => [day, '']));
  saveWeekPlan();
  renderPlanner();
  renderShoppingList();
});

renderFilters();
renderRecipes();
renderPlanner();
renderShoppingList();

if (location.hash.startsWith('#recipe=')) {
  openRecipe(location.hash.replace('#recipe=', ''), false);
}
