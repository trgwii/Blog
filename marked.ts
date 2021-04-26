import 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
import type * as marked from 'https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/master/types/marked/index.d.ts';
export default (window as any).marked as (
	src: string,
	options?: marked.MarkedOptions | undefined
) => string;
