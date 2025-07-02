require('total5');
const readline = require('readline');
const util = require('util');

function Console(opt) {
    let t = this;
    t.options = {};
    t.options.db = t.db = opt.db || DATA || Db();
    t.options.schema = opt.schema || 'public';
    t.options.database = opt.database || 'postgresql';
    t.options.debug = opt.debug || false;
    t.options.prefix = opt.ignoreprefix ? '' : 'tbl_';
    t.options.prompt = opt.prompt || 'echo >';
    t.options.multiline = opt.multiline || false;
    t.options.history = [];
    t.options.hindex = -1;  // The history index;
    t.mbuffer = ''; // Multiline buffer
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

    // Events (manual handlers example)
    t.context.ON_exit = ON('exit', (signal) => console.log('Exiting:', signal));
    t.context.ON_ready = ON('ready', () => console.log('System ready'));
    t.context.ON_service = ON('service', (counter) => console.log('Service count:', counter));
    t.context.ON_componentator = ON('componentator', (meta) => console.log('Componentator triggered:', meta));
    t.context.ON_watcher = ON('watcher', (proc) => console.log('Watcher:', proc));

    // DB helpers
    t.context.tables = async () => await t.gettables();
    t.context.describe = async (table) => await t.describe(table);
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



CP.start = function() {
    let t = this;

    t.rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: t.options.prompt, completer: (line) => t.completer(line) });

    t.log('Starting Console REPL...');
    t.log('Type "help()" for available commands or "exit()" to quit');

    console.log('');

    t.rl.prompt();

    t.rl.on('line', async function(input) {
        await t.process(input.trim());
    });


    t.rl.on('close', function () {
        t.exit();
    });

    t.rl.on('SIGINT', function() {
        if (t.options.multiline) {
            t.options.multiline = false;
            t.mbuffer = '';
            console.log('\Multiline input is cancelled');
            t.rl.setPrompt(t.options.prompt);
        } else {
            console.log('\Press Ctrl+C again to exit or type exit()');
        }

        t.rl.prompt();
    });
}; 

CP.process = async function(input) {
    let t = this;

    try {
        if (!input) {
            t.rl.prompt();
            return;
        }

        if (input.endsWith('{') || input.endsWith('(') || input.endsWith('[')) {
            t.options.multiline = true;
            t.mbuffer = input + '\n';
            t.rl.setPrompt('... ');
            t.rl.prompt();
            return;
        }

        if (t.options.multiline) {
            t.mbuffer += input + '\n';

            if (input.endsWith('}') || input.endsWith(')') || input.endsWith(']') || input == '') {
                input = t.mbuffer.trim();

                // disable multi line
                t.options.multiline = false;
                

                t.mbuffer = '';

                t.rl.setPrompt(t.options.prompt);
            } else {
                t.rl.prompt();
                return;
            }
        }


        // Adding the history
        if (input !== t.options.history[t.options.history.length - 1]) 
            t.options.history.push(input);
        

        t.options.hindex = -1;

        // handle special commands
        if (await t.special(input)) {
            t.rl.prompt();
            return;
        }


        // Execute javascript
        let result = await t.eval(input);

        if (result !== undefined)
            console.log(util.inspect(result, { depth: 3, colors: true, maxArrayLength: 50 }));
    } catch (e) {
        console.log('Error: ', e.message);
        t.options.debug && console.error(e.stack);
    }

    t.rl.prompt();
};

CP.special = async function(input) {
    let t = this;

    if (input.startsWith('.tables')) {
        let tables = await t.gettables();

        console.log('Tables: ', tables);
        return true;
    }

    if (input.startsWith('.describe ')) {
        let table = input.replace('.describe ', '').trim();
        let info = await t.describe(table);
        console.log(util.inspect(info, { depth: 3, colors: true }));
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


CP.eval = async function(code) {
    let t = this;

    // create a function to evaluate code with context
    let keys = Object.keys(t.context);
    let values = Object.values(t.context);

    try {
        if (code.includes('await') || code.includes('.promise()')) 
            code = `(async function () {return ${code};})()`;
        

        let func = new Function(...keys, `return ${code}`);
        let result = func(...values);

        if (result && typeof result.then == 'function') 
            result = await result;
        return result;
    } catch (evalErr) {
        // Try statement instead of expression
        try {
            let func = new Function(...keys, code);
            let result = func(...values);

            if (result && typeof result.then == 'function') {
                result = await result;
            }
            return result;
        } catch (e) {
            throw evalErr; // Trow original error
        }
    }
};


CP.gettables = async function() {
    let t = this;

    return new Promise(function(resolve, reject) {
        let query;

        if (t.options.database == 'postgresql') {
            query = `
                SELECT table_name FROM information_schema.tables
                WHERE table_schema = '${t.options.schema}'
                AND table_type = 'BASE TABLE'
                ORDER BY table_name;
            `;
        } else {
            query = 'SHOW TABLES';
        }

        t.db.query(query).callback(function(err, response) {
            if (err) {
                reject(new Error(err));
                return;
            }

            let tables = t.options.database == 'postgresql' ? response.map(row => row.table_name) : response.map(row => Object.values(row)[0]);
            console.log('Tables ===> ', response);
            resolve(tables);
        });
    });
};

CP.describe = async function(tablename) {
    let t = this;

    return new Promise(function(resolve, reject) {
        if (!tablename) {
            reject(new Error('Table name is required'));
            return;
        }


        let query;

        if (t.options.database == 'postgresql') {
            query = `
            SELECT column_name, data_type, is_nullable, column_default, character_maximum_length
            FROM information_schema.columns
            WHERE table_schema = '${t.options.schema}'
            AND table_name = '${tablename}'
            ORDER BY ordinal_position
            `;
        
        } else {
            query = `DESCRIBE ${tablename}`;
        }

        t.db.query(query).callback(async function(err, response) {
            if (err) {
                reject(new Error(err));
                return;
            }

            let output = await t.tab_format(response);
            resolve(output);
        })
    });
};

CP.tab_format = async function(columns) {


    if (!columns || !columns.length) {
        console.log(`No columns found for "${table}".`);
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

    // Include header at top
    rows.unshift(header);

    // Determine max width per column
    const colWidths = header.map((_, i) => Math.max(...rows.map(r => String(r[i]).length)));

    let output = '';
    // Render rows
    for (let row of rows) {
        let line = row.map((val, i) => String(val).padEnd(colWidths[i])).join('  ');
        output += line + '\n';
    }

    return output;
};


CP.query = async function(sql, params) {
    let t = this;
    return new Promise(function(resolve, reject) {
        let builder = params ? t.db.query(sql, params) : t.db.query(sql);
        builder.callback(function(err, response) {
            if (err) {
                reject(new Error(err));
                return;
            }
            resolve(response);
        });
    });
};


CP.completer = function(line) {
    let t = this;

    let completions = [
        '.tables', '.describe', '.clear', '.history', '.help', '.exit',
        'tables()', 'describe(', 'query(', 'find(', 'insert(', 'help()', 'exit()',
        'db.', 'await ', 'console.log(', 'JSON.stringify(', 'JSON.parse('
    ];

    // Context completions
    let keys = Object.keys(t.context);

    let merge = [...completions, ...keys];

    let hits = completions.filter(c => c.startsWith(c));

    return [hits.length ? hits : merge, line];
}

CP.show = function() {
    let t = this;

    console.log(`
    === Console Help ===
    Database Commands:
  .tables              - List all tables
  .describe <table>    - Describe table structure  
  .sql <query>         - Execute raw SQL query
  
Available Functions:
  tables()             - Get list of tables
  describe(table)      - Get table information
  query(sql, params)   - Execute SQL query
  find(table)          - Create find query builder
  insert(table, data)  - Insert data into table
  
REPL Commands:
  .clear               - Clear screen
  .history             - Show command history
  .help                - Show this help
  .exit / .quit        - Exit tinker
  
Variables Available:
  db, DB, DATA         - Database connection
  console, util, JSON  - Standard utilities
  NOW, UID()           - Helper functions

Examples:
  await find('users').promise()
  await query('SELECT * FROM users LIMIT 5')
  insert('users', {name: 'John', email: 'john@test.com'})
  .describe users
  .sql SELECT COUNT(*) FROM users

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


CP.exit = function() {
    let t = this;

    
    if (t.rl) {
        console.log('\nGOOD BYE!');
        t.rl.close();
    }
    

    process.exit(0);

};

exports.Console = Console;