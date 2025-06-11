let { AlterTableBuilder, MigrationBuilder, ColumnBuilder, TableBuilder } = require('./migration-builder');


function Migration(opt) {
    var t = this;
    t.options = {};
    t.options.path = opt.location ? PATH.root(opt.location) : PATH.databases('migrations');
    t.options.schema = opt.schema || 'public';
    t.options.table = opt.table || 'migrations';
    t.options.db = t.db = opt.db || DATA || DB();
    t.options.debug = opt.debug || false;
    t.options.database = opt.databse || 'postgresql';
    t.schemas = {};

    t.options.prefix = opt.ignoreprefix ? '' : 'tbl_';
    t.$migrationtable = t.options.table.indexOf(t.options.prefix) == -1 ? t.options.prefix + t.options.table.toLowerCase() : t.options.table.toLoweCase();

};


let MP = Migration.prototype;
// Initializing the migrations by creating a migrations table
MP.init = function() {
    let t = this;
    return new Promise(function(resolve) {
        let table = t.options.database == 'postgresql' ? t.options.schema.toLowerCase() + '.' + t.$migrationtable : t.$migrationtable;
        let query =  `
        CREATE TABLE IF NOT EXISTS  ${table} (
            "id" TEXT NOT NULL,
            "name" TEXT NOT NULL UNIQUE,
            "batch" INT4 NOT NULL,
            "dtexecuted" TIMESTAMP DEFAULT now(),
            PRIMARY KEY("id")
        );
    `;  
    t.db.query(query).callback(function(err, res) {
        if (err) throw new Error(err);

        !err && t.options.debug && t.log('Migrations initialized');
        !err && resolve(res);
    });
    });
};


MP.create = async function(name, type) {
    let t = this;
    if (!type)
        type = 'table';
    return new Promise(async function(resolve) {
        let ts = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
        let filename = `${ts}_${name.toLowerCase().replace(/\s+/g, '_')}.js`
        let path = t.options.path + '/' + filename;
        
        let template = await t.template(name, type);

        Total.Fs.writeFileSync(path, template);
        t.options.debug && t.log('Created migration: ' + filename);
        resolve(filename);
    });
};





MP.template = function(name, type) {
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
                templace = t.schematemplate(name);
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
});
`;
}

MP.altertemplate = function(name) {

    return `// Migration: alter ${name} table;
NEWMIGRATION({
    up: async function(migration) {
        await migration.altertable('${tableName.replace(/alter_|_table/g, '')}', (table) => {
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
        await migration.altertable('${name.replace(/create_|_table/g, '')}', function(table) {
            // Reverse the alterations here        
        });
    }
})
`;
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
})
`;
};


MP.schematemplate = function() {

    return `// Schema Migration ;
NEWMIGRATION({
   up: async (migration) => {
        // Your migration logic here
    },

    down: async (migration) => {
        // Reverse migration logic here
    }
})
`;
};
MP.log = function(a) {

    console.log(a);
}
MP.migrate = async function() {
    let t = this;
    const pending = await t.$getpending();

    if (pending.length == 0) {
        t.log('No pending migrations');
        return;
    }

    console.log(pending);

    let batch = await t.$getnextbatch();

    pending && pending.wait(async function(migration, next) {

        t.log('Migrating: ' + migration);

        let instance = Total.migrations[migration];
        let builder = new MigrationBuilder(t.db, t.options);
        
        await instance.up(builder);
        await t.save(migration, batch);

        t.log('Migrated: ' + migration);
        next();
    }, function() {
        t.log('Migration all completed');
    });
}

MP.rollback = async function(step) {
    let t = this;
    if (!step)
        step = 1;

    const batch = await t.$getlastbatch();

    if (!batch) {
        t.log('No migrations to rollback');
        return;
    }

    let migrations = await t.$getmigrations(batch) || [];

    let reversed = migrations.reverse();

    reversed && reversed.wait(async function(migration, next) {
        t.log('Rolling back: ' + migration);
        let instance = Total.migrations[migration];
        let builder = new MigrationBuilder(t.db, t.options);

        instance.down && await instance.down(builder);

        await t.remove(migration);
        t.log('Rolled back: ' + migration);
        next();
    }, function() {
        t.log('Rollback all completed');
    });
}

MP.$getpending = async function() {
    let t = this;
    return new Promise(async function(resolve) {
        let all = await t.list();

        let migrations = await t.db.find(t.$migrationtable).fields('name').promise();
        let names = migrations.map(migration => migration.name);
        resolve(all.filter(name => !names.includes(name)));
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
    return new Promise(async function(resolve) {

    let builder = t.db.find(t.$migrationtable);

    batch && builder.where('batch', batch);

    builder.fields('name');

    let response = await builder.promise();
    let output = response.map(item => item.name);
    resolve(output);
    });
};

MP.save = async function(migration, batch) {
    let t = this;
   return new Promise(function(resolve) {
    let model = {};

    model.id = UID();
    model.dtexecuted = NOW;
    model.name = migration;
    model.batch = batch;
    t.db.insert(t.$migrationtable, model).callback(NOOP);
    resolve()   
});
};

MP.list = async function() {
    let t = this;
    return new Promise(async function(resolve) {
        let all = Total.Fs.readdirSync(t.options.path).filter(file => file.endsWith('.js')).sort();
        resolve(all);
    });
};


MP.remove = async function(migration) {
    let t = this;
    return new Promise(function(resolve) {
        t.db.remove(t.$migrationtable).where('name', migration).callback(NOOP);
        resolve();
    });
};

MP.status = async function() {
    let t = this;

    let all = await t.list();

    let response = await t.db.find(t.$migrationtable).fields('name,batch,dtexecuted').promise();

    let executed = {};
    for (var el of response)
        executed[el.name] = el;

    all && all.wait(function(migration, next) {
        console.log('Migration Status:');
        console.log('================');
        const status = executed[migration] ? 'MIGRATED' : 'PENDING';
        const info = executed[migration];
        if (info) {
            console.log(`[${status}] ${migration} (batch: ${info.batch}, executed: ${info.executed_at})`);
        } else {
            console.log(`[${status}] ${migration}`);
        }
    });
};



exports.Migration = Migration;