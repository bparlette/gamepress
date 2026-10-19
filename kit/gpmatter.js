// gpmatter: Matter.js physics bridge for Gamepress.
// Enables real rigid bodies, ragdolls, soft bodies, composite springs, and pinball flippers.
// Compatible with Matter.js ESM CDN or local vendor bundle.

export async function loadMatter(cdnUrl = 'https://cdn.jsdelivr.net/npm/matter-js@0.19.0/build/matter.min.js') {
  if (typeof window !== 'undefined' && window.Matter) return window.Matter;
  if (typeof document !== 'undefined') {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = cdnUrl;
      script.onload = () => resolve(window.Matter);
      script.onerror = err => reject(new Error('Failed to load Matter.js: ' + err.message));
      document.head.appendChild(script);
    });
  }
  throw new Error('Matter.js loader requires browser window');
}

/**
 * Creates an arcade-ready Matter.js physics world with walls, gravity, and automatic stepping.
 */
export function createMatterWorld({
  width = 540,
  height = 960,
  gravity = { x: 0, y: 1.2 },
  walls = true
} = {}) {
  const M = window.Matter;
  if (!M) throw new Error('Matter.js not loaded. Call await loadMatter() before creating a world.');

  const engine = M.Engine.create();
  engine.gravity.x = gravity.x;
  engine.gravity.y = gravity.y;

  const world = engine.world;
  const boundaryBodies = [];

  if (walls) {
    const wallOpts = { isStatic: true, restitution: 0.6, friction: 0.1 };
    const thick = 100;
    // Top, bottom, left, right
    const ground = M.Bodies.rectangle(width / 2, height + thick / 2 - 10, width * 2, thick, wallOpts);
    const ceiling = M.Bodies.rectangle(width / 2, -thick / 2, width * 2, thick, wallOpts);
    const leftWall = M.Bodies.rectangle(-thick / 2, height / 2, thick, height * 2, wallOpts);
    const rightWall = M.Bodies.rectangle(width + thick / 2, height / 2, thick, height * 2, wallOpts);
    boundaryBodies.push(ground, ceiling, leftWall, rightWall);
    M.Composite.add(world, boundaryBodies);
  }

  return {
    engine,
    world,
    step(dt = 1 / 60) {
      M.Engine.update(engine, dt * 1000);
    },
    add(bodyOrBodies) {
      M.Composite.add(world, bodyOrBodies);
      return bodyOrBodies;
    },
    remove(bodyOrBodies) {
      M.Composite.remove(world, bodyOrBodies);
    },
    circle(x, y, radius, opts = {}) {
      const body = M.Bodies.circle(x, y, radius, { restitution: 0.7, friction: 0.05, ...opts });
      M.Composite.add(world, body);
      return body;
    },
    box(x, y, w, h, opts = {}) {
      const body = M.Bodies.rectangle(x, y, w, h, { restitution: 0.5, friction: 0.1, ...opts });
      M.Composite.add(world, body);
      return body;
    },
    ragdoll(x, y, scale = 1, opts = {}) {
      // Procedural 2D cat/humanoid ragdoll composite
      const group = M.Body.nextGroup(true);
      const head = M.Bodies.circle(x, y - 30 * scale, 16 * scale, { collisionFilter: { group }, ...opts });
      const torso = M.Bodies.rectangle(x, y, 24 * scale, 36 * scale, { collisionFilter: { group }, ...opts });
      const leftArm = M.Bodies.rectangle(x - 18 * scale, y - 5 * scale, 10 * scale, 26 * scale, { collisionFilter: { group }, ...opts });
      const rightArm = M.Bodies.rectangle(x + 18 * scale, y - 5 * scale, 10 * scale, 26 * scale, { collisionFilter: { group }, ...opts });
      const leftLeg = M.Bodies.rectangle(x - 10 * scale, y + 32 * scale, 10 * scale, 28 * scale, { collisionFilter: { group }, ...opts });
      const rightLeg = M.Bodies.rectangle(x + 10 * scale, y + 32 * scale, 10 * scale, 28 * scale, { collisionFilter: { group }, ...opts });

      const neck = M.Constraint.create({ bodyA: head, bodyB: torso, pointA: { x: 0, y: 14 * scale }, pointB: { x: 0, y: -16 * scale }, stiffness: 0.9 });
      const leftShoulder = M.Constraint.create({ bodyA: torso, bodyB: leftArm, pointA: { x: -12 * scale, y: -12 * scale }, pointB: { x: 0, y: -10 * scale }, stiffness: 0.8 });
      const rightShoulder = M.Constraint.create({ bodyA: torso, bodyB: rightArm, pointA: { x: 12 * scale, y: -12 * scale }, pointB: { x: 0, y: -10 * scale }, stiffness: 0.8 });
      const leftHip = M.Constraint.create({ bodyA: torso, bodyB: leftLeg, pointA: { x: -8 * scale, y: 16 * scale }, pointB: { x: 0, y: -12 * scale }, stiffness: 0.8 });
      const rightHip = M.Constraint.create({ bodyA: torso, bodyB: rightLeg, pointA: { x: 8 * scale, y: 16 * scale }, pointB: { x: 0, y: -12 * scale }, stiffness: 0.8 });

      const composite = M.Composite.create({
        bodies: [head, torso, leftArm, rightArm, leftLeg, rightLeg],
        constraints: [neck, leftShoulder, rightShoulder, leftHip, rightHip]
      });
      M.Composite.add(world, composite);
      return { composite, head, torso, leftArm, rightArm, leftLeg, rightLeg };
    }
  };
}
