// Entry point for direct.mjs: CUT=<chapter name> node tools/director/direct.mjs tools/director/scripts/viral/chapter.mjs
import { chapter } from './chapters.mjs';
export default chapter(process.env.CUT || (() => { throw new Error('set CUT=<chapter name> (see cuts.json)'); })());
