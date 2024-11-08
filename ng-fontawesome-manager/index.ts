import { program } from 'commander';
import { globSync } from 'glob';

program
  .option('-r, --root <path to folder>', 'Путь до папки')
  .option('-e, --extensions <extensions>', 'Расширения файлов', 'ts,html')
  .option('-f, --file <path to file angular service>', 'Путь до angular сервиса');
program.parse();

const options = program.opts<{
  root: string;
  extensions: string;
  file: string;
}>();

const path = `${options.root}/**/*.html`;
const files = globSync(path);

console.info(files);
