import { movies, restaurants, tweets } from '../src/testValues';

describe(
    'IMDB should load correctly',
    () => {
        beforeAll(async () => {
            await Promise.race([
                (global as any).page.goto(movies[0].url),
                new Promise<void>((resolve, _) => { setTimeout(() => { void resolve() }, 20000) })
            ])
        }, 30000);

        it('should load the title correctly', async () => {
            await expect((global as any).page.title()).resolves.toContain(movies[0].title);
        }, 10000);

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

describe(
    'OpenTable should load correctly',
    () => {
        beforeAll(async () => {
            await Promise.race([
                (global as any).page.goto(restaurants[0].url),
                new Promise<void>((resolve, _) => { setTimeout(() => { void resolve() }, 20000) })
            ])
        }, 30000);

        it('should load the title correctly', async () => {
            await expect((global as any).page.title()).resolves.toContain(restaurants[0].title);
        }, 10000);

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
            console.log(pageObj);
            const title = pageObj?.name
            expect(title).toEqual(restaurants[0].title);
        });
    }
);

describe(
    'X (Twitter) should load correctly',
    () => {
        beforeAll(async () => {
            await Promise.race([
                (global as any).page.goto(tweets[0].url),
                new Promise<void>((resolve, _) => { setTimeout(() => { void resolve() }, 20000) })
            ])
        }, 30000);

        it('should be able to load the extractor', async () => {
            await (global as any).page.addScriptTag({ path: './dist/umd/index.js' });
            //await new Promise<void>((resolve, _) => { setTimeout(() => { void resolve() }, 20000000) })
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
            console.log(pageObj);
            expect(pageObj).toBeDefined();
        });
    }
);