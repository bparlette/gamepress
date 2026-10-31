# Known defects in this generator (gen_cast.py)

Run: `python3 gen_cast.py OUTDIR` -> sheet.png, still.png, light.png. Same code twice = identical pixels (the script prints a hash for both runs).

1. **Soldier face is tiny.** The head is about 8 px, so the face is one dark eye dot and a skin blob. He reads as a soldier by the helmet and rifle, not by the face.
2. **Soldier arms are weak.** The rifle is the pose driver and the arms are IK to its grips, so there is no arm swing in the walk. The near hand is an orange blob and the shouldered arm is hidden behind the rifle.
3. **Zombie head is a green slab.** The mouth, teeth and jaw are readable on the contact sheet but not at 1x. Hair is a mohawk-like spike mass and not messy.
4. **Zombie lunge torso.** The shirt is a wide brown slab when the lean is high, and the stains are 1-3 px, so they barely read as damage.
5. **Down sequence is skeleton rotation, not animation.** It really ends flat, but there is no knee buckle or arm flail beyond a blend toward a relaxed pose. The dropped rifle sticks up oddly in the last two frames.
6. **Walk cycles are only moderately different** in a still, even after exaggerating stride, lift and bob. The zombie's dragging foot is a fixed offset, not a real drag.
7. **Palette is 28 colours (soldier) and 27 (zombie)** per ramp set, not the house 22. Ramps are 4 steps each and are not quantised to the cabinet palette, so they would need a mapping pass before use in a game.
8. **Light layer is thin.** Only the muzzle flash and the zombie eye are emissive, and the glow in the still is a stepped ellipse, not a lit-surface calculation.
9. **Not integrated.** There is no atlas export, no `RIG.def`, no sim link and no seedcheck wiring. Everything is drawn at render time and nothing is saved as a sprite file.
10. **PixelFX, Kenney and Forge were not read in detail.** The five lessons were taken from the brief, so the "style system" is ours, not derived from those repos. `docs/ASSET-SOURCES.md` on this branch has no PixelFX or Forge entry to check against.
