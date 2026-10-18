// img2threejs integration: Gemini prompt templates per recipe + agent prompt.
// See docs/IMG2THREEJS-WORKFLOW.md for the full pipeline.
// img2threejs: https://github.com/img2threejs/img2threejs (Apache 2.0)
// Install: npx --yes img2threejs@latest install

const IMG_RULE = 'isolated on a solid pure white background, studio lighting, no ground, no shadow, no UI';

export const GEMINI_TEMPLATES = {
  'kart-racer': `A 16-bit arcade red hover-kart with chunky neon-blue exhaust thrusters, low-poly retro aesthetic, 3/4 isometric front-quarter view, isolated on a solid pure white background, studio lighting, no ground, no shadow, no UI, sharp edges.`,
  'arena-brawler': `A stylized chunky retro arcade brawler character wearing an orange bomber jacket, low-poly geometry, clean silhouette, T-pose or slight neutral A-pose, isolated on a solid pure white background, no floor, no background elements.`,
  'one-tap-reflex': `A chunky low-poly arcade hero character, bright primary colors, simple readable silhouette, neutral A-pose, 3/4 isometric view, isolated on a solid pure white background, studio lighting, no ground, no shadow, no UI.`,
  generic: subj => `A ${subj || '[describe hero asset]'} in low-poly retro arcade style, clean readable silhouette, neutral pose, 3/4 isometric view, ${IMG_RULE}.`,
};

export const AGENT_PROMPT = `Run img2threejs on this image with the following constraints:

1. Target: Low-poly Three.js procedural group (<1,200 polygons total).
2. Hierarchy:
   - Root: THREE.Group
   - Pivots: Isolate moving parts (wheels/thrusters or arms/legs) as separate child Groups.
   - Sockets: Add empty THREE.Group markers at socket_head, socket_weapon, and socket_exhaust.
3. Material: THREE.MeshStandardMaterial with vertex colors or low-roughness plastic specularity.
4. Export: Standalone ES module:
   export function createModelInstance() { ... return { mesh, pivots, tick(dt) }; }`;

export const CRITICAL_RULE = 'NEVER feed full-scene screenshots to img2threejs. Isolated orthographic hero assets on pure white #FFFFFF only — no shadows, no ground planes, no UI. Generate one asset per image, then assemble the level in code.';

/** Print the start-from-image workflow for a recipe. Returns the text (for --json) and prints it. */
export function printImageWorkflow(recipeName, { print = true } = {}) {
  const tpl = GEMINI_TEMPLATES[recipeName] || GEMINI_TEMPLATES.generic(recipeName);
  const lines = [
    'img2threejs — start from an image (see docs/IMG2THREEJS-WORKFLOW.md)',
    '',
    'CRITICAL: ' + CRITICAL_RULE,
    '',
    'STEP 1 — Generate the hero asset in Gemini (copy-paste):',
    '---',
    tpl,
    '---',
    '',
    'STEP 2 — Extract the mesh. Give the PNG to your agent (img2threejs skill) with:',
    '---',
    AGENT_PROMPT,
    '---',
    '',
    'STEP 3 — Save the output as g/<id>/hero.js, replace the recipe placeholder geometry',
    '         with createModelInstance().mesh, and wire position to gpfeel.js physics.',
    '',
    'STEP 4 — Film: gamepress drive examples/<id>/hook.drive.json (?auto=1 bot)',
  ];
  const text = lines.join('\n');
  if (print) console.log('\n' + text + '\n');
  return { recipe: recipeName, geminiPrompt: typeof tpl === 'string' ? tpl : tpl, agentPrompt: AGENT_PROMPT, criticalRule: CRITICAL_RULE, text };
}
