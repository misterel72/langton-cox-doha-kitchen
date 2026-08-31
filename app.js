const recipes = window.RECIPES || [];

const grid = document.querySelector('#recipe-grid');
const count = document.querySelector('#recipe-count');
const searchInput = document.querySelector('#recipe-search');
const filters = document.querySelector('#filter-buttons');
const emptyState = document.querySelector('#empty-state');
const dialog = document.querySelector('#recipe-dialog');
const detail = document.querySelector('#recipe-detail');
const closeButton = document.querySelector('.dialog-close');

let activeFilter = 'All';
let searchTerm = '';

const escapeHTML = (value = '') => value.replace(/[&<>'"]/g, character => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  "'": '&#39;',
  '"': '&quot;'
}[character]));

const categories = ['All', ...new Set(recipes.flatMap(recipe => recipe.tags))];

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
        <button class="recipe-open" type="button" data-recipe="${escapeHTML(recipe.id)}">Open recipe →</button>
      </div>
    </article>
  `).join('');

  grid.querySelectorAll('.recipe-open').forEach(button => {
    button.addEventListener('click', () => openRecipe(button.dataset.recipe));
  });
}

function openRecipe(id, updateHash = true) {
  const recipe = recipes.find(item => item.id === id);
  if (!recipe) return;

  detail.innerHTML = `
    ${recipePhoto(recipe, 'detail')}
    <div class="detail-content">
      <p class="eyebrow">${recipe.made ? 'Made in Doha' : 'On the menu'}</p>
      <h2>${escapeHTML(recipe.title)}</h2>
      <p class="detail-summary">${escapeHTML(recipe.summary)}</p>
      <div class="detail-stats">
        <span class="detail-stat"><strong>Serves:</strong> ${escapeHTML(recipe.serves)}</span>
        <span class="detail-stat"><strong>Prep:</strong> ${escapeHTML(recipe.prep)}</span>
        <span class="detail-stat"><strong>Cook:</strong> ${escapeHTML(recipe.cook)}</span>
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

renderFilters();
renderRecipes();

if (location.hash.startsWith('#recipe=')) {
  openRecipe(location.hash.replace('#recipe=', ''), false);
}
