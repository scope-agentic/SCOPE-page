# Local replay asset sources

All runtime assets are served locally. No CDN or Poly Haven request is made while viewing the replay.

## Three.js

- Version: **0.180.0**, official release tag **r180**.
- Source: <https://github.com/mrdoob/three.js/tree/r180>
- License: **MIT**; original license is retained at `../vendor/three/LICENSE`.
- Vendored files: `three.module.js`, `three.core.js`, `addons/loaders/GLTFLoader.js`, and `addons/utils/BufferGeometryUtils.js`.
- Import map: `three` → `assets/vendor/three/three.module.js`; `three/addons/` → `assets/vendor/three/addons/`.
- Core and addons are from the same pinned tag. GLTFLoader's BufferGeometryUtils dependency is included.

## Poly Haven furniture

Downloaded as original **1K glTF 2.0 + JPEG PBR textures**. Only the main glTF filename is changed to `scene.gltf`; mesh, material, texture, and buffer content is unmodified. Each folder preserves `source-files.json`, the original official API response. `asset-manifest.json` records exact source URLs and publisher MD5 checksums, which the preparation script verifies.

License: **CC0 1.0 Universal** for all three assets. Poly Haven license statement: <https://polyhaven.com/license>. Legal text: <https://creativecommons.org/publicdomain/zero/1.0/>.

| Asset | Official page | Runtime entry | Runtime bytes (glTF + buffer + textures) |
| --- | --- | --- | ---: |
| Sofa 02 | <https://polyhaven.com/a/sofa_02> | `models/sofa_02/scene.gltf` | 427,171 |
| Wooden Table 02 | <https://polyhaven.com/a/wooden_table_02> | `models/wooden_table_02/scene.gltf` | 485,316 |
| Drawer Cabinet | <https://polyhaven.com/a/drawer_cabinet> | `models/drawer_cabinet/scene.gltf` | 1,143,429 |

Publisher metadata: `https://api.polyhaven.com/files/<asset-id>`. Direct files are supplied by official `https://dl.polyhaven.org/file/ph-assets/` URLs. The manifest retains the complete file paths and hashes.

### Coordinate reference

glTF coordinates are Y-up and units are meters. Bounds below include node translations and all mesh POSITION accessor bounds. All source nodes have identity rotation and scale. Put a loaded asset on the floor by offsetting `-minY`; for centered positioning, subtract its X/Z bounding-box center. Faces should be checked visually when choosing room rotations.

| Model | Min X, Y, Z | Max X, Y, Z | Width × height × depth |
| --- | --- | --- | --- |
| sofa_02 | −0.903316, 0.000206, −0.477698 | 0.903851, 0.709695, 0.340053 | 1.8072 × 0.7095 × 0.8178 m |
| wooden_table_02 | −0.567208, −0.000125, −0.353012 | 0.567208, 0.799418, 0.353012 | 1.1344 × 0.7995 × 0.7060 m |
| drawer_cabinet | −0.570539, 0, −0.247653 | 0.570539, 1.881254, 0.240431 | 1.1411 × 1.8813 × 0.4881 m |

Cabinet nodes: `drawer_cabinet`, `drawer_cabinet_drawer_01`, `drawer_cabinet_drawer_02`, `drawer_cabinet_drawer_03`, `drawer_cabinet_drawer_04`. Sofa nodes: `sofa_02_Base` and `sofa_02_Seat`.

## Reproduction and checks

Run `python3 scripts/prepare_replay_assets.py` from the project root. It downloads from the pinned official sources, verifies publisher model hashes, and checks that every glTF image/buffer URI resolves locally. Existing verified downloads are reused. Python 3 standard library only.

Runtime total: **2,055,916 bytes** for the three models, plus **2,157,927 bytes** for vendored Three.js (including license), approximately **4.02 MiB** combined before HTTP compression.
