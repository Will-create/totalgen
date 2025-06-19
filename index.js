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
};

// load migrations
function loadmigrations(config) {
    return new Promise(async function(resolve) {
        const migrationPath = PATH.root(config.location + 'migrations');
        const migrations = [];
        
        if (Total.Fs.existsSync(migrationPath)) {
            const files = Total.Fs.readdirSync(migrationPath);
            files.forEach(file => {
                if (file.endsWith('.js')) {
                    console.log('Loading migration:', file);
                    require(migrationPath + '/' + file);
                }
            });
        }
        
        resolve(migrations);
    });
}


exports.migration = async function () {
    const config = await loadConfig();
    const migrations = await loadmigrations(config);
    let databaselink;

    if (config.db && config.db.link) {
        databaselink = config.db.link;
    } else {
        databaselink = 'postgres://';

        if (config.db.user) {
            databaselink += config.db.user;
            if (config.db.password) {
                databaselink += ':' + config.db.password;
            }
            databaselink += '@';
        }
        if (config.db.host) {
            databaselink += config.db.host;
        }
        if (config.db.port) {
            databaselink += ':' + config.db.port;
        }
        if (config.db.database) {
            databaselink += '/' + config.db.database;
        }
    }

    require('querybuilderpg').init('', databaselink, ERROR('TG Migration'));
	const migration = new Migration({
		debug: config.debug,
		path: config.migrationPath,
		table: config.tableName
	});

    await migration.init();

    return migration;
};
exports.migrate = async function () {
    const migration = await exports.migration();
    try {
        await migration.migrate();
    } catch (err) {
        console.error('Error during migration:', err.message);
    }
};

exports.createmigration = async function (arg) {
    let name = arg[0]; 
    const migration = await exports.migration();
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

exports.tginit = function () {
    return new Promise(async function(resolve, reject) {
        if (Total.Fs.existsSync(CONFIG_FILE)) {
        resolve('[tginit] Config file already exists at', CONFIG_FILE);
    }

    const INIT_CONFIG = {
        debug: false,
        location: '/',
        table: 'migrations',
        db: {
            host: 'localhost',
            port: 5432,
            user: 'postgres',
            password: 'postgres',
            database: 'tgconfig',
            link: "postgresql://user:password@hostname:5432/database"
        }
    };

    try {
        Total.Fs.writeFileSync(CONFIG_FILE, JSON.stringify(INIT_CONFIG, null, 2), 'utf8');
        resolve('[tginit] Config file created successfully at', CONFIG_FILE);
    } catch (err) {
        reject('[tginit] Failed to create config file:', err.message);
    }
    });
};

exports.config = async function () {
    const config = await loadConfig();
    return config;
}