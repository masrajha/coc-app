const app = require('../server');

const tags = process.argv.slice(2).map(value => value.replace(/^#/, '').toUpperCase());
if (!tags.length || tags.some(tag => !/^[0289PYLQGRJCUV]{3,15}$/.test(tag))) {
    console.error('Pemakaian: npm run icons:prepare -- TAG_PEMAIN [TAG_PEMAIN_LAIN]');
    process.exitCode = 1;
} else {
    const server = app.listen(0, '127.0.0.1', async () => {
        const base = `http://127.0.0.1:${server.address().port}`;
        try {
            const icons = new Map();
            for (const tag of tags) {
                const response = await fetch(`${base}/api/player/${tag}/profile`);
                const profile = await response.json();
                if (!response.ok) throw new Error(`${tag}: ${profile.error || `HTTP ${response.status}`}`);
                for (const [section, items] of Object.entries(profile.army)) {
                    for (const item of items) icons.set(`${section}:${item.name}`, { section, name: item.name });
                }
            }
            const pending = [...icons.values()];
            let done = 0;
            let saved = 0;
            const failures = [];
            await Promise.all(Array.from({ length: Math.min(3, pending.length) }, async () => {
                while (pending.length) {
                    const item = pending.shift();
                    const url = `${base}/api/player-icon?${new URLSearchParams(item)}`;
                    try {
                        const response = await fetch(url);
                        if (response.ok) saved += 1;
                        else failures.push(`${item.section}: ${item.name} (HTTP ${response.status})`);
                    } catch (error) {
                        failures.push(`${item.section}: ${item.name} (${error.message})`);
                    }
                    done += 1;
                    if (done % 10 === 0 || done === icons.size) console.log(`${done}/${icons.size} ikon diperiksa`);
                }
            }));
            console.log(`${saved} ikon tersimpan atau sudah tersedia di cache; ${failures.length} gagal.`);
            if (failures.length) {
                console.log(failures.join('\n'));
                process.exitCode = 1;
            }
        } catch (error) {
            console.error(error.message);
            process.exitCode = 1;
        } finally {
            server.close();
        }
    });
}
