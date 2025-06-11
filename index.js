require('total5');
const {Migration} = require('./migration');
const CONFIG_FILE = PATH.root('tgconfig.json');

const DEFAULT_CONFIG = {
	debug: false,
	location: '/',
	table: 'migrations'
};

function loadConfig() {
    return new Promise(async function(resolve) {
        
        Total.Fs.exists(CONFIG_FILE, function(exists) {
            if (!exists) {
                Total.Fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf8');
                resolve({ ...DEFAULT_CONFIG });
            } 


            try {
                const raw = Total.Fs.readFileSync(CONFIG_FILE, 'utf8');
                const userCfg = JSON.parse(raw);
                resolve({ ...DEFAULT_CONFIG, ...userCfg });
            } catch (err) {
                console.error('[tgconfig] Erreur de lecture JSON :', err.message);
                resolve({ ...DEFAULT_CONFIG });
            }
        
        });
    })
}


exports.init = async function () {
	const config = loadConfig();

	const migration = new Migration({
		debug: config.debug,
		path: config.migrationPath,
		table: config.tableName
	});

    await migration.init();

    return migration;
};
exports.createmigration = async function (name) {
    const migration = await exports.init();
    if (!name) {
        console.error('Plese provide a name for you migration.');
        return;
    }
    try {
        await migration.create(name);
    } catch (err) {
        console.error('Erreur lors de la création de la migration :', err.message);
    }
};
