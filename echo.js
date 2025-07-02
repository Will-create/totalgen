require('total5');
const readline = require('readline');
const util = require('util');


function Echo(opt) {
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

let EP = Echo.prototype;

EP.setup = function() {
    let t = this;

    // Adding database context
    t.context.db = t.db;
    t.context.DB = () => t.db;
    t.context.DATA = t.db;

    // Add utility functions
    t.context.tables = async () => await t.gettables();
    t.context.describe = async (table) => await t.describe(table);
    t.context.query = async (sql, params) => await t.query(sql, params);
    t.context.find = (table) => t.db.find(table);
    t.context.insert = (table, data) => t.db.insert(table, data);
    t.context.update = (table) => t.db.update(table, data);
    t.context.remove = (table) => t.db.remove(table);

    // Add Utilities
    t.context.console = console;
    t.context.util = util;
    t.context.U = t.context.Utils = Utils;
    t.context.JSON = JSON;
    t.context.NOW = NOW;
    t.context.UID = () => UID();
    t.context.GUID = (length) => GUID(length || 25);
    t.context.F = t.context.Total = Total;
    t.context.NEWSCHEMA = (name, fn) => NEWSCHEMA(name, fn);
    t.context.NEWACTION = (name, opt) => NEWACTION(name, opt);
    t.context.FUNC = FUNC;
    t.context.MAIN = MAIN;
    t.context.ROUTE = (a, b, c, d) => ROUTE(a, b, c, d);

    // Add helper functions
    t.context.help = () => t.help();
    t.context.clear = () => t.clear();
    t.context.exit = () => t.exit();
    t.context.history = () => t.history();
};


EP.start = function() {
    let t = this;

    t.rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: t.options.prompt, completer: (line) => t.completer(line) });

    t.log('Starting Echo REPL...');
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



EP.process = async function(input) {
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

EP.special = async function(input) {
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


EP.eval = async function(code) {
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


EP.gettables = async function() {
    let t = this;

    return new Promise(function(resolve, reject) {
        let query;

        if (t.options.database == 'postgresql') {
            query = `
                SELECT table_name FROM information_schema.tables
                WHERE table_name = '${t.options.schema}'
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

            resolve(tables);
        });
    });
};






