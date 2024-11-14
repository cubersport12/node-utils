import { FileHandler, Options, updateIconsInTsFile } from './utils';
import { readFileSync } from 'node:fs';

export class ExtractCss implements FileHandler {
  handle(file: string, options: Options): void {
    // read file and extract all css classes
    const data = readFileSync(file, 'utf8');
    const classes = new Set<string>(data.match(/\.(fa-[a-zA-Z0-9-]+::before)/g)?.map(x => x.replace('::before', '').replace('.', '')) ?? []);
    updateIconsInTsFile(options.file, Array.from(classes));
  }
}
