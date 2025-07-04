require('total5');
const readline = require('readline');
const util = require('util');
const vm = require('vm');
let lastSigint = 0;

function isInputComplete(code) {
	try {
		new vm.Script(code);
		return true;
	} catch (err) {
		// Incomplete if script throws known parsing errors
		const msg = err.message;
		return !(
			err instanceof SyntaxError &&
			/(Unexpected end of input|missing\)|missing\}|Unexpected token|\bexpected\b)/i.test(msg)
		);
	}
}


function Console(opt) {
    let t = this;
    t.options = {};
    t.options.db = t.db = opt.db || DATA || DB();
    t.options.schema = opt.schema || 'public';
    t.options.database = opt.database || 'postgresql';
    t.options.debug = opt.debug || false;
    t.options.prefix = opt.ignoreprefix ? '' : 'tbl_';
    t.options.prompt = opt.prompt || 'Console >';
    t.options.multiline = opt.multiline || false;
    t.options.history = [];
    t.options.hindex = -1;
    t.mbuffer = '';
    t.rl = null;
    t.context = {};

    t.setup();
}

let CP = Console.prototype;

CP.setup = function () {
    let t = this;

    // Base context
    t.context.db = t.db;
    t.context.DB = () => t.db;
    t.context.DATA = t.db;

    // Core Total.js globals
    t.context.CONF = CONF;
    t.context.DATA = DATA;
    t.context.DEBUG = DEBUG;
    t.context.DEF = DEF;
    t.context.EMPTYARRAY = EMPTYARRAY;
    t.context.EMPTYOBJECT = EMPTYOBJECT;
    t.context.ErrorBuilder = ErrorBuilder;
    t.context.F = F;
    t.context.FUNC = FUNC;
    t.context.Image = Image;
    t.context.Mail = Mail;
    t.context.MAIN = MAIN;
    t.context.MODS = MODS;
    t.context.NEWMACRO = NEWMACRO;
    t.context.NOW = NOW;
    t.context.PATH = PATH;
    t.context.REPO = REPO;
    t.context.RESTBuilder = RESTBuilder;
    t.context.TEMP = TEMP;
    t.context.Thelpers = Thelpers;
    t.context.Total = Total;
    t.context.U = Utils;
    t.context.Utils = Utils;

    // DEF properties
    t.context.DEF_blacklist = DEF.blacklist;
    t.context.DEF_currencies = DEF.currencies;
    t.context.DEF_helpers = DEF.helpers;
    t.context.DEF_validators = DEF.validators;

    // DEF methods
    t.context.onAudit = DEF.onAudit;

    // Major core methods
    t.context.ACTION = ACTION;
    t.context.API = API;
    t.context.AUDIT = AUDIT;
    t.context.AUTH = AUTH;
    t.context.BACKUP = BACKUP;
    t.context.BLOCKED = BLOCKED;
    t.context.CLEANUP = CLEANUP;
    t.context.clearTimeout2 = clearTimeout2;
    t.context.CLONE = CLONE;
    t.context.COMPONENTATOR = COMPONENTATOR;
    t.context.COPY = COPY;
    t.context.CORS = CORS;
    t.context.CRON = CRON;
    t.context.DECRYPT = DECRYPT;
    t.context.DECRYPTREQ = DECRYPTREQ;
    t.context.DIFFARR = DIFFARR;
    t.context.DOWNLOAD = DOWNLOAD;
    t.context.EMIT = EMIT;
    t.context.ENCRYPT = ENCRYPT;
    t.context.ENCRYPTREQ = ENCRYPTREQ;
    t.context.ERROR = ERROR;
    t.context.FILESTORAGE = FILESTORAGE;
    t.context.GUID = GUID;
    t.context.HASH = HASH;
    t.context.HTMLMAIL = HTMLMAIL;
    t.context.IMPORT = IMPORT;
    t.context.LDAP = LDAP;
    t.context.LOAD = LOAD;
    t.context.LOADCONFIG = LOADCONFIG;
    t.context.LOADRESOURCE = LOADRESOURCE;
    t.context.LOCALIZE = LOCALIZE;
    t.context.LOGMAIL = LOGMAIL;
    t.context.MAIL = MAIL;
    t.context.MEMORIZE = MEMORIZE;
    t.context.MERGE = MERGE;
    t.context.MIDDLEWARE = MIDDLEWARE;
    t.context.NEWACTION = NEWACTION;
    t.context.NEWAPI = NEWAPI;
    t.context.NEWCALL = NEWCALL;
    t.context.NEWFORK = NEWFORK;
    t.context.NEWPUBLISH = NEWPUBLISH;
    t.context.NEWSCHEMA = NEWSCHEMA;
    t.context.NEWSUBSCRIBE = NEWSUBSCRIBE;
    t.context.NEWTHREAD = NEWTHREAD;
    t.context.NEWTHREADPOOL = NEWTHREADPOOL;
    t.context.NEWTRANSFORM = NEWTRANSFORM;
    t.context.NOOP = NOOP;
    t.context.NOSQL = NOSQL;
    t.context.NPMINSTALL = NPMINSTALL;
    t.context.OFF = OFF;
    t.context.ON = ON;
    t.context.ONCE = ONCE;
    t.context.OPENCLIENT = OPENCLIENT;
    t.context.PAUSESERVER = PAUSESERVER;
    t.context.print = print;
    t.context.PROMISIFY = PROMISIFY;
    t.context.PROXY = PROXY;
    t.context.PUBLISH = PUBLISH;
    t.context.QUERIFY = QUERIFY;
    t.context.REQUEST = REQUEST;
    t.context.REQUIRE = REQUIRE;
    t.context.RESTORE = RESTORE;
    t.context.ROUTE = ROUTE;
    t.context.setTimeout2 = setTimeout2;
    t.context.SHELL = SHELL;
    t.context.SUBSCRIBE = SUBSCRIBE;
    t.context.SUCCESS = SUCCESS;
    t.context.TEMPLATE = TEMPLATE;
    t.context.TMSCLIENT = TMSCLIENT;
    t.context.TotalAPI = TotalAPI;
    t.context.TOUCH = TOUCH;
    t.context.TRANSFORM = TRANSFORM;
    t.context.TRANSLATE = TRANSLATE;
    t.context.UID = UID;
    t.context.UNAUTHORIZED = UNAUTHORIZED;
    t.context.UNSUBSCRIBE = UNSUBSCRIBE;
    t.context.WEBSOCKETCLIENT = WEBSOCKETCLIENT;

    // Events
    t.context.ON_exit = ON('exit', (signal) => console.log('Exiting:', signal));
    t.context.ON_ready = ON('ready', () => console.log('System ready'));
    t.context.ON_service = ON('service', (counter) => console.log('Service count:', counter));
    t.context.ON_componentator = ON('componentator', (meta) => console.log('Componentator triggered:', meta));
    t.context.ON_watcher = ON('watcher', (proc) => console.log('Watcher:', proc));

    // DB helpers
    t.context.tables = async () => await t.tables();
    t.context.columns = async (table) => await t.columns(table);
    t.context.indexes = async (table) => await t.indexes(table);
    t.context.constraints = async (table) => await t.constraints(table);
    t.context.describe = async (table) => await t.describe(table);
    t.context.exists = async (table) => await t.exists(table);
    t.context.size = async (table) => await t.size(table);
    t.context.truncate = async (table) => await t.truncate(table);
    t.context.drop = async (table) => await t.drop(table);
    t.context.seed = async (table, data) => await t.seed(table, data);
    t.context.query = async (sql, params) => await t.query(sql, params);
    t.context.find = (table) => t.db.find(table);
    t.context.insert = (table, data) => t.db.insert(table, data);
    t.context.update = (table, data) => t.db.update(table, data);
    t.context.remove = (table) => t.db.remove(table);

    // Utilities
    t.context.console = console;
    t.context.util = util;
    t.context.JSON = JSON;

    // Helpers
    t.context.help = () => t.help();
    t.context.clear = () => t.clear();
    t.context.exit = () => t.exit();
    t.context.history = () => t.history();
};

CP.start = function () {
	let t = this;

	t.rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
		prompt: t.options.prompt,
		completer: (line) => t.completer(line),
	});

	t.log('Starting Console REPL...');
	t.log('Type "help()" for available commands or "exit()" to quit\n');

	t.rl.prompt();

	t.rl.on('line', async (input) => {
		await t.process(input.trim());
	});

	t.rl.on('close', () => {
		t.exit();
	});

	t.rl.on('SIGINT', () => {
		if (t.options.multiline) {
			t.options.multiline = false;
			t.mbuffer = '';
			console.log('\nMultiline input cancelled');
			t.rl.setPrompt(t.options.prompt);
		} else {
			console.log('\nPress Ctrl+C again to exit or type exit()');
		}

		t.rl.prompt();
	});
};


CP.process = async function (input) {
	let t = this;

	try {
		if (!input && !t.options.multiline) {
			t.rl.prompt();
			return;
		}

		// Multiline active: accumulate buffer
		if (t.options.multiline) {
			t.mbuffer += input + '\n';

			if (isInputComplete(t.mbuffer)) {
				input = t.mbuffer.trim();
				t.options.multiline = false;
				t.mbuffer = '';
				t.rl.setPrompt(t.options.prompt);
			} else {
				t.rl.setPrompt(`... (${t.mbuffer.split('\n').length}) `);
				t.rl.prompt();
				return;
			}
		} else if (!isInputComplete(input)) {
			// Start multiline
			t.options.multiline = true;
			t.mbuffer = input + '\n';
			t.rl.setPrompt('... (1) ');
			t.rl.prompt();
			return;
		}

		// Track history
		if (input && input !== t.options.history[t.options.history.length - 1])
			t.options.history.push(input);
		t.options.hindex = -1;

		// Execute .commands
		if (await t.special(input)) {
			t.rl.prompt();
			return;
		}

		// Evaluate user input
		let result = await t.eval(input);
		if (result !== undefined)
			console.log(util.inspect(result, { depth: 3, colors: true, maxArrayLength: 50 }));

	} catch (e) {
		console.log('Error:', e.message);
		t.options.debug && console.error(e.stack);
	}

	t.rl.setPrompt(t.options.prompt);
	t.rl.prompt();
};


CP.special = async function(input) {
    let t = this;

    if (input.startsWith('.tables')) {
        let tables = await t.tables();
        console.log('Tables: ', tables);
        return true;
    }

    if (input.startsWith('.describe ')) {
        let table = input.replace('.describe ', '').trim();
        let info = await t.describe(table);
        console.log(util.inspect(info, { depth: 3, colors: true }));
        return true;
    }

    if (input.startsWith('.columns ')) {
        let table = input.replace('.columns ', '').trim();
        let columns = await t.columns(table);
        console.log(util.inspect(columns, { depth: 3, colors: true }));
        return true;
    }

    if (input.startsWith('.indexes ')) {
        let table = input.replace('.indexes ', '').trim();
        let indexes = await t.indexes(table);
        console.log(util.inspect(indexes, { depth: 3, colors: true }));
        return true;
    }

    if (input.startsWith('.constraints ')) {
        let table = input.replace('.constraints ', '').trim();
        let constraints = await t.constraints(table);
        console.log(util.inspect(constraints, { depth: 3, colors: true }));
        return true;
    }

    if (input.startsWith('.exists ')) {
        let table = input.replace('.exists ', '').trim();
        let exists = await t.exists(table);
        console.log(`Table '${table}' exists: ${exists}`);
        return true;
    }

    if (input.startsWith('.size ')) {
        let table = input.replace('.size ', '').trim();
        let size = await t.size(table);
        console.log(util.inspect(size, { depth: 3, colors: true }));
        return true;
    }

    if (input.startsWith('.truncate ')) {
        let table = input.replace('.truncate ', '').trim();
        await t.truncate(table);
        console.log(`Table '${table}' truncated successfully`);
        return true;
    }

    if (input.startsWith('.drop ')) {
        let table = input.replace('.drop ', '').trim();
        await t.drop(table);
        console.log(`Table '${table}' dropped successfully`);
        return true;
    }

    if (input.startsWith('.sql ')) {
        let sql = input.replace('.sql ', '').trim();
        let result = await t.query(sql);
        console.log(util.inspect(result, { depth: 3, colors: true }));
        return true;
    }

    if (input.startsWith('.clear')) {
        console.clear();
        return true;
    }

    if (input.startsWith('.history')) {
        t.history();
        return true;
    }

    if (input.startsWith('.exit') || input.startsWith('.quit')) {
        t.exit();
        return true;
    }

    return false;
};
CP.eval = async function (code) {
	let t = this;

	try {
		const script = new vm.Script(code, { displayErrors: true });

		// Run in the shared context
		let result = script.runInContext(vm.createContext(t.context));

		if (result && typeof result.then === 'function')
			result = await result;

		return result;
	} catch (err) {
		// Attempt async wrapper fallback
		try {
			const wrapped = new vm.Script(`(async () => { return ${code} })()`, { displayErrors: true });
			let result = wrapped.runInContext(vm.createContext(t.context));
			if (result && typeof result.then === 'function')
				result = await result;
			return result;
		} catch (finalErr) {
			throw finalErr;
		}
	}
};
// Database methods from db.js integrated into Console
CP.tables = async function() {
    let t = this;
    return new Promise(function(resolve, reject) {
        let query;
        
        if (t.options.database === 'postgresql') {
            query = `
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = '${t.options.schema}' 
                AND table_type = 'BASE TABLE'
                ORDER BY table_name
            `;
        } else {
            query = `SHOW TABLES`;
        }

        t.db.query(query).callback(function(err, response) {
            if (err) {
                t.log('Error fetching tables: ' + err.message);
                reject(new Error(err));
                return;
            }
            
            let tables = [];
            if (t.options.database === 'postgresql') {
                tables = response.map(row => row.table_name);
            } else {
                tables = response.map(row => Object.values(row)[0]);
            }
            
            t.options.debug && t.log(`Found ${tables.length} tables`);
            resolve(tables);
        });
    });
};

CP.columns = async function(tableName) {
    let t = this;
    return new Promise(function(resolve, reject) {
        if (!tableName) {
            reject(new Error('Table name is required'));
            return;
        }

        let query;
        
        if (t.options.database === 'postgresql') {
            query = `
                SELECT 
                    column_name,
                    data_type,
                    is_nullable,
                    column_default,
                    character_maximum_length,
                    numeric_precision,
                    numeric_scale
                FROM information_schema.columns 
                WHERE table_schema = '${t.options.schema}' 
                AND table_name = '${tableName}'
                ORDER BY ordinal_position
            `;
        } else {
            query = `DESCRIBE ${tableName}`;
        }

        t.db.query(query).callback(function(err, response) {
            if (err) {
                t.log(`Error fetching columns for ${tableName}: ` + err.message);
                reject(new Error(err));
                return;
            }
            
            t.options.debug && t.log(`Found ${response.length} columns in ${tableName}`);
            resolve(response);
        });
    });
};

CP.indexes = async function(tableName) {
    let t = this;
    return new Promise(function(resolve, reject) {
        if (!tableName) {
            reject(new Error('Table name is required'));
            return;
        }

        let query;
        
        if (t.options.database === 'postgresql') {
            query = `
                SELECT 
                    i.relname as index_name,
                    a.attname as column_name,
                    ix.indisunique as is_unique,
                    ix.indisprimary as is_primary
                FROM pg_class t
                JOIN pg_index ix ON t.oid = ix.indrelid
                JOIN pg_class i ON i.oid = ix.indexrelid
                JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
                WHERE t.relname = '${tableName}'
                AND t.relkind = 'r'
                ORDER BY i.relname, a.attnum
            `;
        } else {
            query = `SHOW INDEX FROM ${tableName}`;
        }

        t.db.query(query).callback(function(err, response) {
            if (err) {
                t.log(`Error fetching indexes for ${tableName}: ` + err.message);
                reject(new Error(err));
                return;
            }
            
            t.options.debug && t.log(`Found ${response.length} indexes in ${tableName}`);
            resolve(response);
        });
    });
};

CP.constraints = async function(tableName) {
    let t = this;
    return new Promise(function(resolve, reject) {
        if (!tableName) {
            reject(new Error('Table name is required'));
            return;
        }

        let query;
        
        if (t.options.database === 'postgresql') {
            query = `
                SELECT 
                    tc.constraint_name,
                    tc.constraint_type,
                    kcu.column_name,
                    ccu.table_name AS foreign_table_name,
                    ccu.column_name AS foreign_column_name
                FROM information_schema.table_constraints AS tc
                JOIN information_schema.key_column_usage AS kcu
                    ON tc.constraint_name = kcu.constraint_name
                    AND tc.table_schema = kcu.table_schema
                LEFT JOIN information_schema.constraint_column_usage AS ccu
                    ON ccu.constraint_name = tc.constraint_name
                    AND ccu.table_schema = tc.table_schema
                WHERE tc.table_name = '${tableName}'
                AND tc.table_schema = '${t.options.schema}'
                ORDER BY tc.constraint_type, tc.constraint_name
            `;
        } else {
            query = `
                SELECT 
                    CONSTRAINT_NAME as constraint_name,
                    CONSTRAINT_TYPE as constraint_type,
                    COLUMN_NAME as column_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu 
                    ON tc.constraint_name = kcu.constraint_name
                WHERE tc.table_name = '${tableName}'
                ORDER BY tc.constraint_type, tc.constraint_name
            `;
        }

        t.db.query(query).callback(function(err, response) {
            if (err) {
                t.log(`Error fetching constraints for ${tableName}: ` + err.message);
                reject(new Error(err));
                return;
            }
            
            t.options.debug && t.log(`Found ${response.length} constraints in ${tableName}`);
            resolve(response);
        });
    });
};

CP.describe = async function(tableName) {
    let t = this;
    
    try {
        if (!tableName) {
            throw new Error('Table name is required');
        }

        t.options.debug && t.log(`Describing table: ${tableName}`);

        let [columns, indexes, constraints] = await Promise.all([
            t.columns(tableName),
            t.indexes(tableName),
            t.constraints(tableName)
        ]);

        let result = {
            table: tableName,
            columns: columns,
            indexes: indexes,
            constraints: constraints
        };

        t.options.debug && t.log(`Table ${tableName} described successfully`);
        return result;

    } catch (err) {
        t.log(`Error describing table ${tableName}: ${err.message}`);
        throw err;
    }
};

CP.exists = async function(tableName) {
    let t = this;
    return new Promise(function(resolve, reject) {
        if (!tableName) {
            reject(new Error('Table name is required'));
            return;
        }

        let query;
        
        if (t.options.database === 'postgresql') {
            query = `
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = '${t.options.schema}' 
                    AND table_name = '${tableName}'
                ) as exists
            `;
        } else {
            query = `
                SELECT COUNT(*) as count
                FROM information_schema.tables 
                WHERE table_name = '${tableName}'
            `;
        }

        t.db.query(query).callback(function(err, response) {
            if (err) {
                t.log(`Error checking if table ${tableName} exists: ` + err.message);
                reject(new Error(err));
                return;
            }
            
            let exists = t.options.database === 'postgresql' ? 
                response[0].exists : 
                response[0].count > 0;
                
            t.options.debug && t.log(`Table ${tableName} exists: ${exists}`);
            resolve(exists);
        });
    });
};

CP.size = async function(tableName) {
    let t = this;
    return new Promise(function(resolve, reject) {
        if (!tableName) {
            reject(new Error('Table name is required'));
            return;
        }

        let query;
        
        if (t.options.database === 'postgresql') {
            query = `
                SELECT 
                    pg_size_pretty(pg_total_relation_size('${t.options.schema}.${tableName}')) as total_size,
                    pg_size_pretty(pg_relation_size('${t.options.schema}.${tableName}')) as table_size,
                    (SELECT COUNT(*) FROM ${t.options.schema}.${tableName}) as row_count
            `;
        } else {
            query = `
                SELECT 
                    ROUND(((data_length + index_length) / 1024 / 1024), 2) as total_size_mb,
                    ROUND((data_length / 1024 / 1024), 2) as table_size_mb,
                    table_rows as row_count
                FROM information_schema.tables 
                WHERE table_name = '${tableName}'
            `;
        }

        t.db.query(query).callback(function(err, response) {
            if (err) {
                t.log(`Error getting size for ${tableName}: ` + err.message);
                reject(new Error(err));
                return;
            }
            
            t.options.debug && t.log(`Retrieved size information for ${tableName}`);
            resolve(response[0]);
        });
    });
};

CP.truncate = async function(tableName) {
    let t = this;
    return new Promise(function(resolve, reject) {
        if (!tableName) {
            reject(new Error('Table name is required'));
            return;
        }

        let query = `TRUNCATE TABLE ${tableName}`;
        
        if (t.options.database === 'postgresql') {
            query += ' RESTART IDENTITY CASCADE';
        }

        t.db.query(query).callback(function(err, response) {
            if (err) {
                t.log(`Error truncating table ${tableName}: ` + err.message);
                reject(new Error(err));
                return;
            }
            
            t.options.debug && t.log(`Table ${tableName} truncated successfully`);
            resolve(response);
        });
    });
};

CP.drop = async function(tableName) {
    let t = this;
    return new Promise(function(resolve, reject) {
        if (!tableName) {
            reject(new Error('Table name is required'));
            return;
        }

        let query = `DROP TABLE IF EXISTS ${tableName}`;
        
        if (t.options.database === 'postgresql') {
            query += ' CASCADE';
        }

        t.db.query(query).callback(function(err, response) {
            if (err) {
                t.log(`Error dropping table ${tableName}: ` + err.message);
                reject(new Error(err));
                return;
            }
            
            t.options.debug && t.log(`Table ${tableName} dropped successfully`);
            resolve(response);
        });
    });
};

CP.seed = async function(tableName, data) {
    let t = this;
    return new Promise(function(resolve, reject) {
        if (!tableName) {
            reject(new Error('Table name is required'));
            return;
        }
        
        if (!data || !Array.isArray(data) || data.length === 0) {
            reject(new Error('Data must be a non-empty array'));
            return;
        }

        try {
            let insertPromises = data.map(record => {
                return new Promise((res, rej) => {
                    t.db.insert(tableName, record).callback(function(err) {
                        if (err) {
                            rej(err);
                        } else {
                            res();
                        }
                    });
                });
            });

            Promise.all(insertPromises).then(() => {
                t.options.debug && t.log(`Seeded ${data.length} records into ${tableName}`);
                resolve({ inserted: data.length });
            }).catch(reject);

        } catch (err) {
            t.log(`Error seeding table ${tableName}: ` + err.message);
            reject(new Error(err));
        }
    });
};

CP.gettables = async function() {
    let t = this;
    return await t.tables();
};

CP.tab_format = async function(columns) {
    if (!columns || !columns.length) {
        console.log('No columns found.');
        return;
    }

    let header = ['Column', 'Type', 'Nullable', 'Default', 'Length'];
    let rows = columns.map(col => [
        col.column_name,
        col.data_type,
        col.is_nullable,
        col.column_default || '',
        col.character_maximum_length || ''
    ]);

    rows.unshift(header);

    const colWidths = header.map((_, i) => Math.max(...rows.map(r => String(r[i]).length)));

    let output = '';
    for (let row of rows) {
        let line = row.map((val, i) => String(val).padEnd(colWidths[i])).join('  ');
        output += line + '\n';
    }

    return output;
};

CP.query = async function(sql, params) {
    let t = this;
    return new Promise(function(resolve, reject) {
        if (!sql) {
            reject(new Error('SQL query is required'));
            return;
        }

        t.options.debug && t.log(`Executing query: ${sql}`);

        let query = params ? t.db.query(sql, params) : t.db.query(sql);
        
        query.callback(function(err, response) {
            if (err) {
                t.log(`Error executing query: ` + err.message);
                reject(new Error(err));
                return;
            }
            
            t.options.debug && t.log(`Query executed successfully`);
            resolve(response);
        });
    });
};
CP.completer = function (line) {
	let t = this;

	const commands = [
		// REPL commands
		'.tables', '.describe', '.columns', '.indexes', '.constraints',
		'.exists', '.size', '.truncate', '.drop',
		'.clear', '.history', '.help', '.show', '.exit', '.quit',
		'.sql',

		// DB methods
		'tables()', 'columns(', 'indexes(', 'constraints(',
		'describe(', 'exists(', 'size(', 'truncate(', 'drop(',
		'seed(', 'query(', 'find(', 'insert(', 'update(', 'remove(',

		// Utils
		'console.log(', 'JSON.stringify(', 'JSON.parse(', 'await ', 'UID()', 'NOW',

		// Total.js primitives
		'ACTION(', 'FUNC(', 'ROUTE(', 'AUTH(', 'NEWSCHEMA(', 'NEWACTION(', 'MEMORIZE(', 'CALL(', 'DATA', 'DEF.', 'CONF',
	];

	// Add all context keys (like db, DB, etc.)
	const dynamic = Object.keys(t.context);
	const merge = [...commands, ...dynamic];

	const hits = merge.filter(c => c.startsWith(line));
	return [hits.length ? hits : merge, line];
};


CP.show = function () {
	let t = this;

	console.log(`
=== Console Help ===

🔹 Database Commands:
  .tables               - List all tables
  .describe <table>     - Show full structure (columns, indexes, constraints)
  .columns <table>      - Show column definitions
  .indexes <table>      - Show table indexes
  .constraints <table>  - Show table constraints
  .exists <table>       - Check if table exists
  .size <table>         - Show table size and row count
  .truncate <table>     - Truncate (wipe) table contents
  .drop <table>         - Drop table entirely
  .sql <query>          - Execute raw SQL query

🔹 REPL Utilities:
  .clear                - Clear the screen
  .history              - View REPL command history
  .help / .show         - Show this help menu
  .exit / .quit         - Exit the console

🔹 Programmatic Functions:
  await tables()                - List tables
  await describe('users')       - Get full schema of a table
  await query('SELECT * FROM users') - Raw SQL
  await find('users').promise() - Fluent query builder
  insert('users', {...})        - Insert record
  update('users', {...})        - Update record
  remove('users')               - Remove table (not drop)
  seed('users', [...])          - Bulk insert test data
  exists('users')               - Boolean table check
  size('users')                 - Get table size info
  truncate('users')             - Wipe table contents
  drop('users')                 - Drop a table

🔹 Global Variables:
  db, DB(), DATA                - Database references
  console, util, JSON           - Native Node utilities
  UID(), NOW                   - Core helpers
  CONF, DEF, FUNC, ROUTE, etc. - Total.js globals

Example Commands:
  await find('users').promise()
  await query('SELECT * FROM users LIMIT 5')
  insert('users', {name: 'John'})
  .describe users
  .sql SELECT * FROM users WHERE isactive=true

==================
`);
};

CP.history = function() {
    let t = this;

    console.log('\n=== Command History ===');
    t.options.history.forEach(function(cmd, index) {
        console.log(`${index + 1}: ${cmd}`);
    });

    console.log('====================================\n');
};


CP.log = function(message) {
    let t = this;

    console.log(`[Console] ${message}`);
};

CP.exit = function () {
    let t = this;

    if (t.__exited)
        return;

    t.__exited = true;

    if (t.rl) {
        console.log('\nGOOD BYE!');
        t.rl.close(); // triggers 'close', but will now be ignored
    }

    process.exit(0);
};

exports.Console = Console;