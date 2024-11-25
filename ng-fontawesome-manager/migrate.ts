import { FileHandler, isHtml, isTs, Options } from './utils';
import { HtmlHandler } from './html-handler';
import { TsHandler } from './ts-handler';

export class MigrateCommand implements FileHandler {
  private readonly _htmlHandler = new HtmlHandler();
  private readonly _tsHandler = new TsHandler();
  handle(file: string, options: Options): void {
    if (isHtml(file)) {
      this._htmlHandler.handle(file, options);
    }

    if (isTs(file)) {
      this._tsHandler.handle(file, options);
    }
  }
}
