# SCOPE project homepage

Bilingual academic project page for **SCOPE: Selective Critical-Step On-Policy Self-Distillation for Agentic Reinforcement Learning**.

Anonymous project repository: https://github.com/scope-agentic/SCOPE-page

This anonymous edition presents the method, experimental tables for four backbones (including Qwen3-32B), training curves, component ablations, error-step localization, parameter sensitivity, and ALFWorld / WebShop trajectory replays. Each replay gallery contains four successful and two failed recorded episodes. ALFWorld scenes are text-based 3D reconstructions; WebShop illustrations are schematic.

## Preview locally

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open http://127.0.0.1:8000/. Use an HTTP server rather than opening index.html directly so JavaScript modules, scene assets, and JSON data load correctly. No build step, backend, external fonts, analytics, or live agent service is required.

## Maintain

- `config.js`: the anonymous code repository link.
- `content.js` and `index.html`: bilingual copy and default English content.
- `data.js`: complete main experimental results.
- `method/`: interactive method walkthrough.
- `replay/`: ALFWorld playback, scene configuration, and curated episode data.
- `webshop/`: WebShop playback and curated episode data.
- `assets/`: method and result figures, local 3D assets, textures, illustrations, and vendored Three.js.

Keep the directory structure intact. All runtime assets use relative URLs, supporting the `/SCOPE-page/` project path. Raw source trajectory HTML, authoring scripts, and local caches are excluded from this publication checkout. The figures are stored locally; no model or dataset page, experiment-log link, or manuscript is linked.

## Deployment

GitHub Pages publishes the `main` branch at the repository root. `.nojekyll` serves these files as a static site without Jekyll processing. Changes pushed to `main` trigger a new Pages build after Pages is enabled in repository settings.

## Asset credits

Furniture assets are CC0 from Poly Haven; source links are in `assets/replay/CREDITS.md` and `asset-manifest.json`. Three.js is distributed under MIT with its original license in `assets/vendor/three/LICENSE`. WebShop illustration details are in `assets/webshop/CREDITS.md`.

## Interactive visual refresh

The `experience/` directory adds the visual layer and the three mechanism demos:

- Ambient particles, a fading pointer trail, a reading-progress line, and a persistent effects toggle. Decorative motion respects reduced-motion settings; the trail runs only for precise pointers.
- A visibility-aware Analyzer walkthrough using three recorded training trajectories: a successful ALFWorld rollout with three returned skills, a failed WebShop rollout with two, and a successful WebShop rollout with none. Each returned skill connects to its recorded zero-based target steps and updates the auxiliary selection mask. The public data omits run and trajectory identifiers.
- An analytical bounded signed OPSD explorer: alpha 1 / 2.5 / 5, bound 0.1 / 1 / 10, signed gap, and selection mask. The released defaults are alpha 2.5 and bound 1. The coefficient uses stop-gradient; the displayed curve is not the derivative of tanh.
- A pairwise length explorer with default temperature 0.1, adjustable successful trajectory lengths, and common length rescaling. The fixed-horizon absolute bonus is an illustrative mathematical comparison. The component ablation table reports Qwen2.5-3B results at step 180.
- Animated benchmark bars using `data.js`, synchronized with the existing three-backbone results table. Methods can be toggled; keyboard focus or a tap exposes each value.
- A separate Qwen3-32B ALFWorld table compares SCOPE and GRPO on seen and unseen tasks. Results are also summarized in three large metric cards.
- The updated overview, Qwen3-32B and appendix training curves, error-step localization, unseen-task generalization, interaction efficiency, component ablations, and parameter sensitivity use local image assets.

Copy is bilingual. All additions are dependency-free, use relative asset paths, and work on GitHub Pages without a build step. `config.js` points only to the organization code repository. The supplied mascot is used in the navigation, hero wordmark, and favicon.

### Motivation, reading and automatic playback

- `experience/motivation.js` runs the two illustrative motivation diagrams on a shared 14-second loop. Both pause outside the viewport and in a hidden document. The measured percentages are shown separately from the synthetic six-step examples.
- Result bars reset when their plot leaves the viewport and rise on every re-entry. There is no replay-bars button.
- ALFWorld loads its scene and starts when it comes into view; WebShop does the same when its tab is visible. Leaving the viewport pauses playback. A manual pause or seek takes priority over automatic playback until another episode is chosen or playback is explicitly resumed. Reduced-motion settings keep automatic movement disabled.
- `experience/refinements.css` unifies reading sizes and separates the navigation's active dot from the reading-progress line.
- Every WebShop episode has a full `taskZh` translation. Original task strings, actions and observations remain intact.

### Anonymous publication

The page contains no author names, affiliations, email addresses, manuscript link or file, external model or dataset download link, or external experiment-log link. Training curves are displayed as local, self-contained figures. The only research repository link points to `scope-agentic/SCOPE-code`.

`experience/navigation.js` maintains the left contents list while scrolling; on narrow screens it becomes an expandable contents control. Clicking or keyboard-activating the SCOPE wordmark emits a short particle burst when effects are enabled.
