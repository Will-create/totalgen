const { AIEnhancer } = require('./ai');
let { AlterTableBuilder, MigrationBuilder, ColumnBuilder, TableBuilder } = require('./migration-builder');

if (!Total.migrations) 
    Total.migrations = {};


global.NEWMIGRATION = function(obj) {
    // simulate error in order to catch the migration file name from the stack trace
    const locStack = (new Error()).stack.split('\n')[2];
    const locFile  = locStack.split('/').pop().split(':')[0].trim();

    loc = locFile;
    if (!obj || !obj.up || typeof obj.up !== 'function') {
        throw new Error('Migration object must have an "up" function');
    }
    if (!obj.down || typeof obj.down !== 'function') {
        throw new Error('Migration object must have a "down" function');
    }
    Total.migrations[loc] = obj;
};

function Migration(opt) {
    var t = this;
    t.options = {};
    t.options.path = opt.location ? PATH.root(opt.location + '/migrations') : PATH.root('migrations');
    t.options.schema = opt.schema || 'public';
    t.options.table = opt.table || 'migrations';
    t.options.db = t.db = DATA || DB();
    t.options.debug = opt.debug || false;
    t.options.database = opt.database || 'postgresql'; // Fixed typo: databse -> database
    t.schemas = {};
    t.aiconf = opt.ai || {};

    t.options.prefix = opt.ignoreprefix ? '' : 'tbl_';
    t.$migrationtable = t.options.table.indexOf(t.options.prefix) == -1 ? 
        t.options.prefix + t.options.table.toLowerCase() : 
        t.options.table.toLowerCase(); // Fixed typo: toLoweCase -> toLowerCase

    // check if t.options.path exists
    if (!Total.Fs.existsSync(t.options.path)) {
        Total.Fs.mkdirSync(t.options.path, { recursive: true });
    }
}

let MP = Migration.prototype;

MP.init = function() {
    let t = this;
    t.initAI();
    return new Promise(function(resolve, reject) {
        let table = t.options.database == 'postgresql' ? 
            t.options.schema.toLowerCase() + '.' + t.$migrationtable : 
            t.$migrationtable;
        
        let query = `
        CREATE TABLE IF NOT EXISTS ${table} (
            "id" TEXT NOT NULL,
            "name" TEXT NOT NULL UNIQUE,
            "batch" INT4 NOT NULL,
            "dtexecuted" TIMESTAMP DEFAULT now(),
            PRIMARY KEY("id")
        );`;
        
        t.db.query(query).callback(function(err, res) {
            if (err) {
                t.log('Error initializing migrations table: ' + err.message);
                reject(new Error(err));
                return;
            }
            t.options.debug && t.log('Migrations initialized');
            resolve(res);
        });
    });
};

MP.create = async function(name, type, prompt) {
    let t = this;

    return new Promise(async function(resolve, reject) {
        try {
            let ts = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
            let filename = `${ts}_${name.toLowerCase().replace(/\s+/g, '_')}.js`
            let path = t.options.path + '/' + filename;
            
            let template = await t.template(name, type);

            // AI enhancement if prompt is provided and ai enabled
            if (prompt && t.aiconf && t.aiconf.enabled) {
                t.options.debug && t.log('Enhancing template with AI');
                const enhancer = new AIEnhancer(t.aiconf);
                enhancer.init();
                template = await enhancer.enhance(template, prompt, 'migration');
                t.options.debug && t.log('Template is enhanced successfully');
            }

            Total.Fs.writeFileSync(path, template);
            t.options.debug && t.log('Created migration: ' + filename);
            resolve(filename);
        } catch (err) {
            reject(err);
        }
    });
};

MP.initAI = function() {
    let t = this;
    if (t.options.ai && t.options.ai.enabled && !t.options.ai.apikey) {
        console.warn('AI Enhancement is enabled but no API key is provided');
        t.aiconf.enabled = false;
    }
};

MP.template = function(name, type = 'table') {
    let t = this;
    
    return new Promise(function(resolve) {
        let template;

        switch(type) {
            case 'table': 
                template = t.tabletemplate(name);
                break;
            case 'alter': 
                template = t.altertemplate(name);
                break;
            case 'schema':
                template = t.schematemplate(name); // Fixed typo: templace -> template
                break;
            default:
                template = t.defaulttemplate(name);
        }

        resolve(template);
    });
};

MP.tabletemplate = function(name) {
    return `// Migration: create ${name} table;
NEWMIGRATION({
    up: async function(migration) {
        await migration.createtable('${name.replace(/create_|_table/g, '')}', function(table) {
            table.id();
            table.string('name', 100).notnull();
            table.string('email').unique();
            table.timestamps();

            // Define your own table structure here
            
            // Examples:
            // table.string('title', 255);
            // table.text('description');
            // table.integer('views');
            // table.string('userid').references('id').on('tbl_user');
            // table.boolean('ispublished').default(true);
            // table.decimal('price', 8, 2);
            // table.json('metadata');
        });
    },
    down: async function(migration) {
        await migration.droptable('${name.replace(/create_|_table/g, '')}');
    }
});`;
}

MP.defaulttemplate = function(name) {
    return `//create ${name} file;
// Your total.js script for ${name} migration here`;
}

MP.altertemplate = function(name) {
    return `// Migration: alter ${name} table;
NEWMIGRATION({
    up: async function(migration) {
        await migration.altertable('${name.replace(/alter_|_table/g, '')}', (table) => {
            // Add your alterations here
            // Examples:
            // table.addcolumn('new_field', 'string', 100);
            // table.dropcolumn('old_field');
            // table.renamecolumn('old_name', 'new_name');
            // table.changecolumn('field_name', 'text');
            // table.addindex(['field1', 'field2']);
            // table.dropindex('index_name');
        });
    },
    down: async function(migration) {
        await migration.altertable('${name.replace(/alter_|_table/g, '')}', function(table) {
            // Reverse the alterations here        
        });
    }
});`;
};

MP.schematemplate = function(name) {
    return `// Schema Migration: ${name} ;
NEWMIGRATION({
    up: async (migration) => {
        // Create schema-based operations
        await migration.executeRaw(\`
            -- Your custom SQL here
            -- This is useful for complex operations, functions, triggers, etc.
        \`);
    },

    down: async (migration) => {
        await migration.executeRaw(\`
            -- Reverse operations here
        \`);
    }
});`;
};

MP.log = function(a) {
    let t = this;
    t.options.debug && console.log(a);
}

MP.migrate = async function() {
    let t = this;
    
    try {
        const pending = await t.$getpending();

        if (pending.length == 0) {
            t.log('No pending migrations');
            return { success: true, message: 'No pending migrations' };
        }

        let batch = await t.$getnextbatch();
        t.log(`Starting migration batch ${batch} with ${pending.length} migrations`);

        // Process migrations sequentially with transaction support
        for (let i = 0; i < pending.length; i++) {
            const migration = pending[i];
            
            try {
                t.log(`Migrating: ${migration}`);
                
                // Check if migration file exists in Total.migrations
                if (!Total.migrations[migration]) {
                    throw new Error(`Migration ${migration} not found in loaded migrations`);
                }

                let instance = Total.migrations[migration];
                
                // Validate migration has required methods
                if (typeof instance.up !== 'function') {
                    throw new Error(`Migration ${migration} missing up() method`);
                }
                if (typeof instance.down !== 'function') {
                    throw new Error(`Migration ${migration} missing down() method`);
                }

                let builder = new MigrationBuilder(t.db, t.options);
                
                // Execute migration in transaction if database supports it
                if (t.options.database === 'postgresql') {
                    await t.db.query('BEGIN').promise();
                }

                try {
                    await instance.up(builder);
                    await t.save(migration, batch);
                    
                    if (t.options.database === 'postgresql') {
                        await t.db.query('COMMIT').promise();
                    }
                    
                    t.log(`Migrated: ${migration}`);
                } catch (migrationError) {
                    if (t.options.database === 'postgresql') {
                        await t.db.query('ROLLBACK').promise();
                    }
                    throw migrationError;
                }
                
            } catch (err) {
                t.log(`Error migrating ${migration}: ${err.message}`);
                throw new Error(`Migration ${migration} failed: ${err.message}`);
            }
        }

        t.log(`Migration batch ${batch} completed successfully`);
        return { success: true, message: `Migrated ${pending.length} files` };

    } catch (err) {
        t.log(`Migration failed: ${err.message}`);
        throw err;
    }
}

MP.rollback = async function(steps) {
    let t = this;
    
    try {
        if (!steps) steps = 1;

        t.log(`Starting rollback of ${steps} batch(es)`);

        let rolledBackCount = 0;

        // Process each batch step
        for (let step = 1; step <= steps; step++) {
            let batch = await t.$getlastbatch();
            
            if (!batch) {
                if (step === 1) {
                    t.log('No migrations to rollback');
                    return { success: true, message: 'No migrations to rollback' };
                } else {
                    t.log(`No more batches to rollback. Completed ${step - 1} batch(es)`);
                    break;
                }
            }

            t.log(`Rolling back batch ${batch}`);

            // Get all migrations in this batch (ordered by execution time desc)
            let batchMigrations = await t.$getmigrations(batch);
            
            if (!batchMigrations || batchMigrations.length === 0) {
                t.log(`No migrations found in batch ${batch}`);
                continue;
            }

            t.log(`Found ${batchMigrations.length} migration(s) in batch ${batch}`);

            // Process each migration in the batch (reverse chronological order)
            for (let i = 0; i < batchMigrations.length; i++) {
                const migration = batchMigrations[i];
                
                try {
                    t.log(`Rolling back: ${migration}`);
                    
                    // Check if migration file exists in Total.migrations
                    if (!Total.migrations[migration]) {
                        t.log(`Warning: Migration ${migration} not found in loaded migrations, removing from database`);
                        await t.remove(migration);
                        rolledBackCount++;
                        continue;
                    }

                    let instance = Total.migrations[migration];
                    
                    // Validate migration has required methods
                    if (typeof instance.down !== 'function') {
                        t.log(`Warning: Migration ${migration} missing down() method, removing from database`);
                        await t.remove(migration);
                        rolledBackCount++;
                        continue;
                    }

                    let builder = new MigrationBuilder(t.db, t.options);
                    
                    // Execute rollback in transaction if database supports it
                    if (t.options.database === 'postgresql') {
                        await t.db.query('BEGIN').promise();
                    }

                    try {
                        // Execute the down migration
                        await instance.down(builder);
                        
                        // Remove migration record from database
                        await t.remove(migration);
                        
                        if (t.options.database === 'postgresql') {
                            await t.db.query('COMMIT').promise();
                        }
                        
                        t.log(`Successfully rolled back: ${migration}`);
                        rolledBackCount++;
                        
                    } catch (rollbackError) {
                        if (t.options.database === 'postgresql') {
                            await t.db.query('ROLLBACK').promise();
                        }
                        throw new Error(`Failed to rollback ${migration}: ${rollbackError.message}`);
                    }
                    
                } catch (err) {
                    t.log(`Error rolling back ${migration}: ${err.message}`);
                    throw new Error(`Rollback failed at ${migration}: ${err.message}`);
                }
            }

            t.log(`Completed rollback of batch ${batch}`);
        }

        t.log(`Rollback completed successfully. Rolled back ${rolledBackCount} migration(s)`);
        return { 
            success: true, 
            message: `Successfully rolled back ${rolledBackCount} migration(s) across ${Math.min(steps, rolledBackCount)} batch(es)`,
            count: rolledBackCount
        };

    } catch (err) {
        t.log(`Rollback failed: ${err.message}`);
        throw err;
    }
};


MP.$getpending = async function() {
    let t = this;
    return new Promise(async function(resolve, reject) {
        try {
            let all = await t.list();
            let migrations = await t.db.find(t.$migrationtable).fields('name').promise();
            let names = migrations.map(migration => migration.name);
            resolve(all.filter(name => !names.includes(name)));
        } catch (err) {
            reject(err);
        }
    });
};

MP.$getnextbatch = async function() {
    let t = this;

    let query = `
        SELECT COALESCE(MAX(batch), 0) + 1 as nextbatch 
        FROM ${t.$migrationtable}
    `;

    let response = await t.db.query(query).promise();
    return response[0].nextbatch;
};

MP.$getlastbatch = async function() {
    let t = this;

    let query = `
        SELECT MAX(batch) as lastbatch 
        FROM ${t.$migrationtable}
    `;

    let response = await t.db.query(query).promise();
    return response[0].lastbatch;
};

MP.$getmigrations = async function(batch) {
    let t = this;
    return new Promise(async function(resolve, reject) {
        try {
            let builder = t.db.find(t.$migrationtable);
            if (batch) {
                builder.where('batch', batch);
            }
            builder.fields('name');
            // Sort by execution time descending for proper rollback order
            builder.sort('dtexecuted', true); // true = descending
            let response = await builder.promise();
            let output = response.map(item => item.name);
            resolve(output);
        } catch (err) {
            reject(err);
        }
    });
};

MP.save = async function(migration, batch) {
    let t = this;
    return new Promise(function(resolve, reject) {
        try {
            let model = {};

            model.id = UID();
            model.dtexecuted = NOW;
            model.name = migration;
            model.batch = batch;
            
            t.db.insert(t.$migrationtable, model).callback(function(err) {
                if (err) {
                    reject(new Error(`Failed to save migration ${migration}: ${err.message}`));
                } else {
                    resolve();
                }
            });
        } catch (err) {
            reject(err);
        }
    });
};

MP.list = async function() {
    let t = this;
    return new Promise(async function(resolve, reject) {
        try {
            let all = Total.Fs.readdirSync(t.options.path)
                .filter(file => file.endsWith('.js'))
                .sort();
            resolve(all);
        } catch (err) {
            reject(err);
        }
    });
};

MP.remove = async function(migration) {
    let t = this;
    return new Promise(function(resolve, reject) {
        t.db.remove(t.$migrationtable).where('name', migration).callback(function(err) {
            if (err) {
                reject(new Error(`Failed to remove migration ${migration}: ${err.message}`));
            } else {
                resolve();
            }
        });
    });
};

MP.status = async function() {
    let t = this;

    try {
        let all = await t.list();
        let response = await t.db.find(t.$migrationtable).fields('name,batch,dtexecuted').promise();

        let executed = {};
        for (var el of response) {
            executed[el.name] = el;
        }

        console.log('\n=== Migration Status ===');
        
        for (let migration of all) {
            const status = executed[migration] ? 'MIGRATED' : 'PENDING';
            const info = executed[migration];
            if (info) {
                console.log(`[${status}] ${migration} (batch: ${info.batch}, executed: ${info.dtexecuted})`);
            } else {
                console.log(`[${status}] ${migration}`);
            }
        }
        
        console.log('========================\n');
        
    } catch (err) {
        console.error('Error getting migration status:', err.message);
        throw err;
    }
};

// New method to validate migration integrity
MP.validate = async function() {
    let t = this;
    
    try {
        let all = await t.list();
        let errors = [];
        
        for (let migration of all) {
            // Check if migration is loaded
            if (!Total.migrations[migration]) {
                errors.push(`Migration ${migration} not loaded`);
                continue;
            }
            
            let instance = Total.migrations[migration];
            
            // Validate required methods
            if (typeof instance.up !== 'function') {
                errors.push(`Migration ${migration} missing up() method`);
            }
            if (typeof instance.down !== 'function') {
                errors.push(`Migration ${migration} missing down() method`);
            }
        }
        
        if (errors.length > 0) {
            console.error('Migration validation errors:');
            errors.forEach(error => console.error(`- ${error}`));
            return { valid: false, errors };
        }
        
        console.log('All migrations are valid');
        return { valid: true, errors: [] };
        
    } catch (err) {
        console.error('Error validating migrations:', err.message);
        throw err;
    }
};

exports.Migration = Migration;