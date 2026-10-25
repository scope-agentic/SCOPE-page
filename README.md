# SCOPE project homepage

Bilingual academic project page for **SCOPE: Selective Critical-Step On-Policy Self-Distillation for Agentic Reinforcement Learning**.

Anonymous project repository: https://github.com/scope-agentic/SCOPE-page

This version preserves anonymous author information. The page includes full experiment tables for three backbones, an interactive method walkthrough, and ALFWorld / WebShop trajectory replays. Each replay gallery contains four successful and two failed recorded episodes. ALFWorld scenes are text-based 3D reconstructions; WebShop illustrations are schematic.

## Preview locally

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open http://127.0.0.1:8000/. Use an HTTP server rather than opening index.html directly so JavaScript modules, scene assets, and JSON data load correctly. No build step, backend, external fonts, analytics, or live agent service is required.

## Maintain

- `config.js`: anonymous author state and the public code repository link.
- `content.js` and `index.html`: bilingual copy and default English content.
- `data.js`: complete main experimental results.
- `method/`: interactive method walkthrough.
- `replay/`: ALFWorld playback, scene configuration, and curated episode data.
- `webshop/`: WebShop playback and curated episode data.
- `assets/`: research figures, local models, textures, illustrations, and vendored Three.js.

Keep the directory structure intact. All runtime assets use relative URLs, supporting the `/SCOPE-page/` project path. Raw source trajectory HTML, authoring scripts, and local caches are excluded from this publication checkout. Research figures come from the provided SCOPE materials. Manuscript files are kept outside the public website directory.

## Deployment

GitHub Pages publishes the `main` branch at the repository root. `.nojekyll` serves these files as a static site without Jekyll processing. Changes pushed to `main` trigger a new Pages build after Pages is enabled in repository settings.

## Asset credits

Furniture assets are CC0 from Poly Haven; source links are in `assets/replay/CREDITS.md` and `asset-manifest.json`. Three.js is distributed under MIT with its original license in `assets/vendor/three/LICENSE`. WebShop illustration details are in `assets/webshop/CREDITS.md`.

## Interactive visual refresh

The `experience/` directory adds the visual layer and the three mechanism demos:

- Ambient particles, a fading pointer trail, a reading-progress line, and a persistent effects toggle. Decorative motion respects reduced-motion settings; the trail runs only for precise pointers.
- A visibility-aware Analyzer walkthrough with success, failure, and empty-selection examples. Each generated skill connects to its target steps and updates the auxiliary selection mask. These are explicitly illustrative examples, separate from recorded replays.
- An analytical bounded signed OPSD explorer: alpha 1 / 2.5 / 5, bound 0.1 / 1 / 10, signed gap, and selection mask. The released defaults are alpha 2.5 and bound 1. The coefficient uses stop-gradient; the displayed curve is not the derivative of tanh.
- A pairwise length explorer with default temperature 0.1, adjustable successful trajectory lengths, and common length rescaling. The fixed-horizon absolute bonus is explicitly an illustrative mathematical comparison. Ablation figures follow the supplied results, Table 2: Qwen2.5-3B at step 180 (93.0 / 97.7 / 98.4 percent).
- Animated benchmark bars using `data.js`, synchronized with the existing three-backbone results table. Methods can be toggled; keyboard focus or a tap exposes each value.

Copy is bilingual. All additions are dependency-free, use relative asset paths, and work on GitHub Pages without a build step. `config.js` stores the anonymous release settings and organization code link. The supplied mascot is used in the navigation, hero wordmark, and favicon.

### Motivation, reading and automatic playback

- `experience/motivation.js` runs the two illustrative motivation diagrams on a shared 14-second loop. Both pause outside the viewport and in a hidden document. The measured percentages are shown separately from the synthetic six-step examples.
- Result bars reset when their plot leaves the viewport and rise on every re-entry. There is no replay-bars button.
- ALFWorld loads its scene and starts when it comes into view; WebShop does the same when its tab is visible. Leaving the viewport pauses playback. A manual pause or seek takes priority over automatic playback until another episode is chosen or playback is explicitly resumed. Reduced-motion settings keep automatic movement disabled.
- `experience/refinements.css` unifies reading sizes and separates the navigation's active dot from the reading-progress line.
- Every WebShop episode has a full `taskZh` translation. Original task strings, actions and observations remain intact.

### Presentation and manuscript access

The public page has no manuscript link, embedded manuscript, or manuscript file. Reference PDFs belong outside this website directory. Do not copy them into a Pages deployment. Explanatory animation notes remain in these maintenance instructions rather than in the visitor-facing presentation.

`experience/navigation.js` maintains the left contents list while scrolling; on narrow screens it becomes an expandable contents control. Clicking or keyboard-activating the SCOPE wordmark emits a short particle burst when effects are enabled.
