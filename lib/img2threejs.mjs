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

// --- Image intake: 4 canonical views img2threejs needs ---------------------
// Users may not know what images to provide. We standardize on 4 views;
// every view carries the isolation constraints (pure white, no shadows,
// no ground, no UI) so a text description is all the input we need.

export const VIEWS = [
  { id: 'front', label: 'Front',    camera: 'straight-on front view',       pose: 'T-pose / A-pose, arms slightly out to the sides' },
  { id: 'side',  label: 'Side',     camera: 'profile side view',            pose: 'same T-pose / A-pose, arms slightly out' },
  { id: 'back',  label: 'Back',     camera: 'rear view',                   pose: 'same T-pose / A-pose, arms slightly out' },
  { id: 'hero',  label: '3/4 Hero', camera: 'isometric front-quarter view', pose: 'slight dynamic action pose — this is the money shot for the game' },
];

/**
 * Build 4 Gemini-ready prompts (one per view) from a text description.
 * Only the camera angle varies — subject, style, and isolation constraints
 * stay constant so the 4 views match each other.
 * @param {string} description e.g. "chunky red hover-kart with neon-blue exhaust thrusters"
 * @param {string} recipe recipe name (for the hero-view context; unused in prompt text)
 * @returns {Array<{view,label,prompt}>}
 */
export function generateViewPrompts(description, recipe) {
  const desc = (description || '').trim() || '[describe hero asset]';
  return VIEWS.map(v => ({
    view: v.id,
    label: v.label,
    prompt: `A ${desc}, low-poly retro arcade style, clean readable silhouette, ${v.pose}, ${v.camera}, ${IMG_RULE}, sharp edges.`,
  }));
}

/** The 4 intake questions for "prompt me" mode. Short, one per view-detail. */
export function intakeQuestions() {
  return [
    { id: 'subject', question: 'What is it? (character, vehicle, creature, prop)' },
    { id: 'detail',  question: "What's the one visual detail that makes it recognizable?" },
    { id: 'colors',  question: 'What colors? (2-3 max — low-poly reads better with fewer)' },
    { id: 'recipe',  question: 'What game/recipe is it for?' },
  ];
}

/** Combine the 4 intake answers into one description string for generateViewPrompts. */
export function answersToDescription(a = {}) {
  const subj = [a.colors, a.subject].filter(Boolean).join(' ').trim();
  const detail = a.detail ? ` with ${a.detail}` : '';
  return `${subj}${detail}`.trim() || '[describe hero asset]';
}

/**
 * Run one branch of the "4 ways in" image intake. Returns printable text
 * (and JSON-safe payload) so agents and CLIs can drive it.
 * @param {string} mode 'upload' | 'describe' | 'game' | 'prompt-me'
 * @param {object} opts { description, answers, recipe }
 */
export function printImageIntake(mode, opts = {}, { print = true } = {}) {
  const { description = '', answers = {}, recipe = '' } = opts;
  const lines = ['img2threejs — image intake (see docs/IMG2THREEJS-WORKFLOW.md)', ''];
  let payload = { mode, recipe };

  if (mode === 'upload') {
    lines.push(
      'You have images. Validate each against the isolation checklist BEFORE extraction:',
      ...[
        '[ ] Pure white #FFFFFF background (no gradients, no studio backdrops)',
        '[ ] Zero floor shadows, ground planes, or contact shadows',
        '[ ] No UI elements, text overlays, or watermarks',
        '[ ] Single subject per image, cleanly separated from the background',
        '[ ] Ideally all 4 views: Front, Side, Back, 3/4 Hero (T-pose/A-pose for the first three)',
        '',
        'Any image failing a check: regenerate it in Gemini with the isolation constraints',
        '("isolated on a solid pure white background, no ground, no shadow, no UI").',
        'Passing images go straight to the img2threejs agent prompt below.',
      ].join('\n').split('\n')
    );
    payload.checklist = true;
  } else if (mode === 'describe' || mode === 'game') {
    const desc = mode === 'describe' ? description : (answersToDescription(answers) + ' (inspired by ' + (opts.game || description) + ')');
    const views = generateViewPrompts(desc, recipe);
    payload = { ...payload, description: desc, views };
    lines.push(
      (mode === 'game'
        ? `You named a game ("${opts.game || description}"). Find its sprites / concept art, then generate CLEAN isolated versions —`
        : 'You described the asset. Generate these 4 views in Gemini (copy-paste each):'),
      ...views.flatMap(v => ['', `--- VIEW ${v.label.toUpperCase()} ---`, v.prompt]),
      '',
      'TIP: the AI can generate these 4 views directly with its image capability —',
      'no manual Gemini trip needed when you just describe what you want.',
    );
  } else if (mode === 'prompt-me') {
    const qs = intakeQuestions();
    payload.questions = qs;
    lines.push(
      'Answer these 4 short questions and I will write the 4 view prompts for you:',
      ...qs.map((q, i) => `  ${i + 1}. ${q.question}`),
      '',
      'Or just describe the asset in one sentence — I will break it into the 4 prompts.',
    );
  } else {
    throw new Error('image intake mode must be one of: upload | describe | game | prompt-me');
  }

  const text = lines.join('\n');
  if (print) console.log('\n' + text + '\n');
  return { ...payload, text };
}

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
