# Langton-Cox Doha Kitchen

Family recipes, favourites and food experiments from the Langton-Cox kitchen in Doha.

## How the site works

This is a lightweight static site designed for Netlify. Recipes live in `recipes.js`, while the layout and interaction are handled by `index.html`, `styles.css` and `app.js`.

## Adding a recipe

Add a new recipe object to the `window.RECIPES` array in `recipes.js`. Each recipe has a unique `id`, title, description, tags, timings, ingredients, method, kitchen note and optional photo.

## Adding the real photo afterwards

1. Add the finished dish image to `assets/photos/`.
2. Set the recipe's `photo` value to the image path, for example `assets/photos/smoky-chicken-chorizo-chickpeas.jpg`.
3. Set `made: true`.
4. Commit the update. Netlify will redeploy automatically when connected to this repository.

Until a photo is added, the site deliberately shows **Photo coming after dinner** rather than using stock photography.

## Netlify

No build command is required. The publish directory is the repository root (`.`), configured in `netlify.toml`.
