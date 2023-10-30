import { movies } from '../src/testValues';

describe(
    'IMDB should load correctly',
    () => {
        beforeAll(async () => {
            await (global as any).page.goto(movies[0].url);
        }, 30000);

        it('should load the title correctly', async () => {
            await expect((global as any).page.title()).resolves.toContain(movies[0].title);
        }, 30000);

        it('should be able to load the extractor', async () => {
            await (global as any).page.addScriptTag({ path: './dist/umd/index.js' });
            const umdGlobal = await (global as any).page.evaluate(() => {
                return (window as any).stackHarvester;
            });
            expect(umdGlobal).toBeDefined();
        });

        it('should be able to extract page object', async () => {
            await (global as any).page.addScriptTag({ path: './dist/umd/index.js' });
            const pageObj = await (global as any).page.evaluate(() => {
                return (window as any).stackHarvester.tryExtractPageObj();
            });
            const title = pageObj?.titleText?.text
            expect(title).toEqual(movies[0].title);
        });
    }
);