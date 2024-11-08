"use strict";
exports.__esModule = true;
var commander_1 = require("commander");
var glob_1 = require("glob");
commander_1.program
    .option('-r, --root <path to folder>', 'Путь до папки')
    .option('-e, --extensions <extensions>', 'Расширения файлов', ['ts', 'html'])
    .option('-f, --file <path to file angular service>', 'Путь до angular сервиса');
commander_1.program.parse();
var options = commander_1.program.opts();
var files = glob_1.globSync(options.root + "/**/*.{" + options.extensions.join(',') + "}");
