// Known failure -> one-line fix. testGame attaches matching hints so a small model never has to diagnose from scratch.
export const HINTS = [
  [/(\w+) is not defined/, m => `"${m[1]}" is used but never declared/imported: add the import or const (check the top of the file and any block you edited)`],
  [/Cannot read properties of (undefined|null) \(reading '(\w+)'\)/, m => `something is ${m[1]} when ".${m[2]}" is read: initialise it before the first update(), or guard with ?.`],
  [/(\w+) is not a function/, m => `"${m[1]}" is not callable: wrong import name or API (see docs/QUALITY.md kit list)`],
  [/Failed to resolve module specifier|Failed to fetch dynamically imported|404/, () => 'a module/file path is wrong: games import from ../_vendor/*.js; check the relative path and that _vendor exists next to the game folder'],
  [/Identifier '(\w+)' has already been declared/, m => `"${m[1]}" is declared twice: rename one`],
  [/Unexpected token|Unexpected identifier|missing \)/, () => 'syntax error in the last edit: re-read the edited lines for an unbalanced bracket or stray character'],
  [/WebGL|GL_INVALID|context lost/i, () => 'WebGL problem: reduce instance counts/texture size, or run with CHROME set to a GPU-enabled Chrome'],
];
export const hintsFor = errors => [...new Set(errors.flatMap(e => HINTS.map(([re, f]) => { const m = re.exec(e); return m ? f(m) : null; }).filter(Boolean)))];
