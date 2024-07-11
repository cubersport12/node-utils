import { execSync } from 'child_process';
import { join } from 'path';

describe('CLI tests', () => {
  it('get attributes', () => {
    const cliPath = join(process.cwd(), 'dist/data-test-id-extractor');

    const output = execSync(`node ${cliPath} --input ./e2e/src/cli/assets --output ./data-test-ids.ts`).toString();
    expect(output).toMatch(`export enum MirDataTestIds {
        Div1 = "div1",
        Div3 = "div3",
        Div2 = "div2",
        Div12 = "div12",
        Div22 = "div22"
    }
    `);
  });
});
