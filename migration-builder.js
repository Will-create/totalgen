if (!Total) 
    require('total5');

function MigrationBuilder(db, opt) {

    var t = this;
    t.db = db;
    t.opt = opt;
    t.schema = opt.schema;
}


var MBP = MigrationBuilder.prototype;

MBP.createtable = async function(name, callback) {
    var t = this;
    name = name.indexOf(t.opt.prefix) == -1 ? t.opt.prefix + name : name;
    var builder = new TableBuilder(name, t.schema);
    callback && callback(builder);
    var sql = builder.tosql();
    await t.db.query(sql).promise();
    console.log('Table ' + name + ' created successfully');
};

MBP.altertable = async function(name, callback) {  // Fixed: added callback parameter
    var t = this;
    const builder = new AlterTableBuilder(name, t.schema);  // Fixed: t.schema instead of t.schama
    callback && callback(builder);

    var operations = builder.getoperations();

    for (var operation of operations) {
        await t.db.query(operation).promise();
    }

    console.log('Table ' + name + ' altered successfully');
};

MBP.droptable = async function(name) {
    var t = this;
     name = name.indexOf(t.opt.prefix) == -1 ? t.opt.prefix + name : name;
    const sql = `DROP TABLE IF EXISTS ${this.schema}.${name} CASCADE`;
    await t.db.query(sql);
    console.log(`Table '${name}' dropped successfully`);        
};
// 18. Transaction support
MBP.transaction = async function(callback) {
    var t = this;
    await t.db.query('BEGIN').promise();
    try {
        await callback(t);
        await t.db.query('COMMIT').promise();
    } catch (error) {
        await t.db.query('ROLLBACK').promise();
        throw error;
    }
};

// 19. Schema operations
MBP.createschema = async function(name) {
    var t = this;
    const sql = `CREATE SCHEMA IF NOT EXISTS ${name}`;
    await t.db.query(sql).promise();
    console.log(`Schema '${name}' created successfully`);
};

MBP.dropschema = async function(name, cascade = false) {
    var t = this;
    const sql = `DROP SCHEMA IF EXISTS ${name}${cascade ? ' CASCADE' : ''}`;
    await t.db.query(sql).promise();
    console.log(`Schema '${name}' dropped successfully`);
};


MBP.executeRaw = MBP.exec = MBP.raw = async function(sql, params = []) {
    var t = this;
    await t.db.query(sql, params).promise();
    return; 
};

MBP.exists = async function(table) {
    var t = this;
    const sql = `
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = ${t.schema} AND table_name = ${table}
        )
    `;
    
    const response = await t.db.query(sql).promise();
    return response[0] ? true : false;
};

MBP.getcolumns = async function(table) {
    var t = this;
    const sql = `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = ${t.schema} AND table_name = ${table}
        ORDER BY ordinal_position
    `;
    
    const result = await t.db.query(sql).promise();
    return result;
};

function TableBuilder(name, schema) {
    var t = this;
    t.name = name;
    t.schema = schema || 'public';
    t.columns = [];
    t.constraints = [];
    t.indexes = [];
    
}

var TBP = TableBuilder.prototype;


TBP.id = function(name) {
    var t = this;
    var col = new ColumnBuilder(name || 'id', 'SERIAL');
    col.modifiers.push('PRIMARY KEY');
    t.columns.push(col);
    return t;
};

TBP.enum = function(name, values) {
    var t = this;
    var enumValues = values.map(v => `'${v}'`).join(', ');
    var col = new ColumnBuilder(name, `VARCHAR(255) CHECK (${name} IN (${enumValues}))`);
    t.columns.push(col);
    return col;
};

TBP.string = function(name, length) {
    var t = this;
    var column = new ColumnBuilder(name, `VARCHAR(${length || 255})`);
    t.columns.push(column);
    return column;
};


TBP.text = function(name) {
    var t = this;
    var column = new ColumnBuilder(name, 'TEXT');
    t.columns.push(column);
    return column;
};

TBP.integer = function(name) {
    var t = this;
    var column = new ColumnBuilder(name, 'INTEGER');
    t.columns.push(column);
    return column;
};

TBP.biginteger = function(name) {
    var t = this;
    var column = new ColumnBuilder(name, 'BIGINT');
    t.columns.push(column);
    return column;
};

TBP.boolean = function(name) {
    var t = this;
    var col = new ColumnBuilder(name, 'BOOLEAN');
    t.columns.push(col);

    return col;
};

TBP.decimal = function(name, precision, scale) {
    var t = this;
    var col = new ColumnBuilder(name, `DECIMAL(${precision || 8}, ${scale || 2})`);
    t.columns.push(col);
    return col;
};

TBP.float = function(name) {
    var t = this;
    var col = new ColumnBuilder(name, 'REAL');
    t.columns.push(col);
    return col;
};

TBP.double = function(name) {
    var t = this;
    var col = new ColumnBuilder(name, 'DOUBLE PRECISION');
    t.columns.push(col);
    return col;
};

TBP.date = function(name) {
    var t = this;
    var col = new ColumnBuilder(name, 'DATE');
    return col;
};

TBP.datetime = TBP.timestamp =  function(name) {
    var t = this;
    var col = new ColumnBuilder(name, 'TIMESTAMP');
    t.columns.push(col);
    return col;
};


TBP.time = function(name) {
    var t = this;
    var col = new ColumnBuilder(name, 'TIME');
    t.columns.push(col);
    return col;
};

TBP.json = function(name) {
    var t = this;
    var col = new ColumnBuilder(name, 'JSON');
    t.columns.push(col);
    return col;
};

TBP.jsonb = function(name) {
    var t = this;
    var col = new ColumnBuilder(name, 'JSONB');
    t.columns.push(col);
    return col;
};

TBP.email = function(name) {
    var t = this;
    var col = new ColumnBuilder(name, 'VARCHAR(255)');
    t.columns.push(col);
    t.constraints.push(`CONSTRAINT ${t.name}_${name}_email_check CHECK (${name} ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')`);
    return col;
};

TBP.timestamps = function() {
    var t = this;
    t.columns.push({ name: 'dtcreated', type: 'TIMESTAMP DEFAULT now()'});
    t.columns.push({ name: 'dtupdated', type: 'TIMESTAMP'});
    t.constraints.push('-- Triger for dtupdated will be create separately');
    return t;
};

TBP.search = function() {
    var t = this;
    t.columns.push({ name: 'search', type: 'TEXT'});
    return t;
};

TBP.softdeletes = function() {
    var t = this;
    var dtremoved = new ColumnBuilder('dtremoved', 'TIMESTAMP');
    var isremoved = new ColumnBuilder('isremoved', 'BOOLEAN DEFAULT FALSE');
    t.columns.push(dtremoved);
    t.columns.push(isremoved);
    return t;
};


TBP.foreign = function(column) {
    return new ForeignKeyBuilder(column, this);
};

TBP.index =  function(columns, name) {
    var t = this;

    const index = name || `${t.name}_${Array.isArray(columns) ? columns.join('_') : columns}_index`;
    const list = Array.isArray(columns) ? columns.join(', ') : columns;
    
    t.indexes.push({ name: index, columns: list, type: 'INDEX' });
    return t;
};


TBP.unique =  function(columns, name) {
    var t = this;

    const index = name || `${t.name}_${Array.isArray(columns) ? columns.join('_') : columns}_unique`;
    const list = Array.isArray(columns) ? columns.join(', ') : columns;
    
    t.indexes.push({ name: index, columns: list, type: 'UNIQUE INDEX' });
    return t;
};

// UUID type and primary key support
TBP.uuid = function(name) {
    var t = this;
    var col = new ColumnBuilder(name || 'id', 'UUID');
    t.columns.push(col);
    return col;
};
// Primary key with UUID
TBP.puuid = function(name) {
    var t = this;
    var col = new ColumnBuilder(name || 'id', 'UUID DEFAULT gen_random_uuid()');
    col.modifiers.push('PRIMARY KEY');
    t.columns.push(col);
    return col;
};

// Auto-incrementing primary key
TBP.increments = function(name) {
    var t = this;
    var col = new ColumnBuilder(name || 'id', 'SERIAL PRIMARY KEY');
    t.columns.push(col);
    return col;
};

TBP.bigincrements = function(name) {
    var t = this;
    var col = new ColumnBuilder(name || 'id', 'BIGSERIAL PRIMARY KEY');
    t.columns.push(col);
    return col;
};

TBP.timestamptz = function(name) {
    var t = this;
    var col = new ColumnBuilder(name, 'TIMESTAMPTZ');
    t.columns.push(col);
    return col;
};

// More date/time types
TBP.interval = function(name) {
    var t = this;
    var col = new ColumnBuilder(name, 'INTERVAL');
    t.columns.push(col);
    return col;
};

// Binary/blob types
TBP.binary = function(name) {
    var t = this;
    var col = new ColumnBuilder(name, 'BYTEA');
    t.columns.push(col);
    return col;
};

// Array types
TBP.array = function(name, type) {
    var t = this;
    var col = new ColumnBuilder(name, `${type.toUpperCase()}[]`);
    t.columns.push(col);
    return col;
};

// IP address types
TBP.ip = function(name) {
    var t = this;
    var col = new ColumnBuilder(name, 'INET');
    t.columns.push(col);
    return col;
};
// MAC address type
TBP.mac = function(name) {
    var t = this;
    var col = new ColumnBuilder(name, 'MACADDR');
    t.columns.push(col);
    return col;
};

// Geometry types (PostGIS)
TBP.point = function(name) {
    var t = this;
    var col = new ColumnBuilder(name, 'POINT');
    t.columns.push(col);
    return col;
};

TBP.geometry = function(name, type) {
    var t = this;
    var col = new ColumnBuilder(name, type || 'GEOMETRY');
    t.columns.push(col);
    return col;
};

// Custom primary key method
TBP.primary = function(columns) {
    var t = this;
    var cols = Array.isArray(columns) ? columns.join(', ') : columns;
    t.constraints.push(`PRIMARY KEY (${cols})`);
    return t;
};

// Check constraints
TBP.check = function(name, expression) {
    var t = this;
    t.constraints.push(`CONSTRAINT ${name} CHECK (${expression})`);
    return t;
};

// Full-text search
TBP.tsvector = function(name) {
    var t = this;
    var col = new ColumnBuilder(name, 'TSVECTOR');
    t.columns.push(col);
    return col;
};

// Morphs (polymorphic relationships)
TBP.morphs = function(name) {
    var t = this;
    t.columns.push(new ColumnBuilder(name + '_type', 'VARCHAR(255)'));
    t.columns.push(new ColumnBuilder(name + '_id', 'BIGINT'));
    t.index([name + '_type', name + '_id']);
    return t;
};

// Remember token (for authentication)
TBP.remember = function() {
    var t = this;
    var col = new ColumnBuilder('remember_token', 'VARCHAR(100)');
    col.nullable();
    t.columns.push(col);
    return col;
};

// Nullable timestamps
TBP.nullabletimestamps = function() {
    var t = this;
    var created = new ColumnBuilder('dtcreated', 'TIMESTAMP');
    var updated = new ColumnBuilder('dtupdated', 'TIMESTAMP');
    created.nullable();
    updated.nullable();
    t.columns.push(created);
    t.columns.push(updated);
    return t;
};

// Fix typo in tosql method
TBP.tosql = function() {
    var t = this;
    var definitions = t.columns.map(function(col) {
        if (typeof col === 'string') return col;
        if (col.tosql) return col.tosql();
        return `${col.name} ${col.type}`;
    });

    let constraints = t.constraints.filter(c => !c.startsWith('--'));

    var sql = `CREATE TABLE ${t.schema}.${t.name} (\n`;
    sql += '    ' + definitions.join(',\n    ');


    if (constraints.length > 0)
        sql += ',\n    ' + constraints.join(',\n    ');
    
    sql += '\n)';

    for (const index of t.indexes) 
        sql += `;\nCREATE ${index.type} ${index.name} ON ${t.schema}.${t.name} (${index.columns})`; // Fixed: ON instead of 0N

    return sql;
};


function ColumnBuilder(name, type) {
    var t = this;
    t.name = name;
    t.type = type;
    t.modifiers = [];
};

var CBP = ColumnBuilder.prototype;

CBP.notnull = function() {
    var t = this;
    t.modifiers.push('NOT NULL');
    return t;
};

CBP.primary = function() {
    var t = this;
    t.modifiers.push('PRIMARY KEY');
    return t;
};
CBP.autoincrement = function() {
    var t = this;
    if (t.type.toUpperCase() === 'SERIAL' || t.type.toUpperCase() === 'BIGSERIAL') {
        t.modifiers.push('AUTOINCREMENT');
    } else {
        throw new Error('Auto-increment can only be used with SERIAL or BIGSERIAL types');
    }
    return t;
};


CBP.nullable = CBP.setnull = function() {
    var t = this;
    t.modifiers.push('NULL');
    return t;
};

CBP.default = function(value) {
    var t = this;
    if (typeof value == 'string' && !value.includes('CURRENT_TIMESTAMP')) 
        t.modifiers.push(`DEFAULT '${value}'`);
    else
        t.modifiers.push(`DEFAULT ${value}`);

    return t;
};

CBP.unique = function() {
    this.modifiers.push('UNIQUE');
    return this;
};

CBP.references = function(columns) {
    return new ReferenceBuilder(this, columns);
};
CBP.comment = function(text) {
    var t = this;
    t.comment_text = text;
    return t;
};
CBP.tosql = function() {
    var sql = `${this.name} ${this.type} ${this.modifiers.join(' ')}`.trim();
    // Note: Comments would need to be added as separate ALTER TABLE statements
    return sql;
};


function ReferenceBuilder(column, reference) {
    this.col = column;
    this.refcol = reference;
    this.reftable = null;
    this.ondeletefn = null;
    this.onupdatefn = null;
};


var RBP = ReferenceBuilder.prototype;

RBP.on = function(table) {
    var t = this;
    t.reftable = table;
    return this;
};

RBP.ondelete = function(action) {
    this.ondeletefn = action;
    return this;
};

RBP.onupdatefn = function(action) {
    this.onupdatefn = action;
    return this;
};

RBP.setnull = function() {
    this.ondeletefn = 'SET NULL';
    return this;
};

RBP.restrict = function() {
    this.ondeletefn = 'RESTRICT';
    return this;
};

RBP.tosql = function() {
    var sql = this.col.tosql();

    if (this.reftable)
        sql += ` REFERENCES ${this.reftable}(${this.refcol})`;
    

    if (this.ondeletefn) 
        sql += ` ON DELETE ${this.ondeletefn}`;

    if (this.onupdatefn) 
        sql += ` ON UPDATE ${this.onupdatefn}`;

    return sql;
};


function ForeignKeyBuilder(colname, tablebuilder) {
    this.colname = colname;
    this.tablebuilder = tablebuilder;
}

var FBP = ForeignKeyBuilder.prototype;


FBP.references = function(col) {
    return new ForeignConstraintBuilder(this.colname, col, this.tablebuilder);
};



function ForeignConstraintBuilder(localcol, foreigncol, tablebuilder) {
    this.localcol = localcol;
    this.foreigncol = foreigncol;
    this.tablebuilder = tablebuilder;
    this.foreigntable = null;
    this.ondeletefn = null;
    this.onupdatefn = null;
};

var FCBP = ForeignConstraintBuilder.prototype;

FCBP.on = function(table) {
    this.foreigntable = table;
    this.addconstraint();
    return this;
};

FCBP.ondelete = function(action) {
    this.ondeletefn = action;
    return this;
};

FCBP.cascade = function() {
    this.ondeletefn = 'CASCADE';
    return this;
};

FCBP.addconstraint = function() {
    var constraint = `CONST fk_${this.tablebuilder.name}_${this.localcol} `;
    constraint += `FOREIGN KEY (${this.localcol}) REFERENCES ${this.foreigntable}(${this.foreigncol})`;
    

    // handle on delete
    if (this.ondeletefn) 
        constraint += ` ON DELETE ${this.ondeletefn}`;

    this.tablebuilder.constraints.push(constraint);
};

// Create altertable builder
function AlterTableBuilder(tablename, schema) {
    this.tablename = tablename;
    this.schema = schema || 'public'; // public is the default schema in postgres
    this.operations = [];
}

var ATBP = AlterTableBuilder.prototype;

ATBP.addcolumn = function(name, type, length) {
    const coltype = length ? `${type.toUpperCase()}(${length})` : type.toUpperCase();
    this.operations.push(`ALTER TABLE ${this.schema}.${this.tablename} ADD COLUMN ${name} ${coltype}`);
    return this;
};

ATBP.dropcolumn = function(name) {
    this.operations.push(`ALTER TABLE ${this.schema}.${this.tablename} DROP COLUMN ${name}`);
    return this;
};

ATBP.renamecolumn = function(oldname, newname) {
    this.operations.push(`ALTER TABLE ${this.schema}.${this.tablename} RENAME COLUMN ${oldname} TO ${newname}`);
    return this;
};

ATBP.changecolumn = function(name, type, length) {
    const coltype = length ? `${type.toUpperCase()}(${length})` : type.toUpperCase();
    this.operations.push(`ALTER TABLE ${this.schema}.${this.tablename} ALTER COLUMN ${name} TYPE ${coltype}`);
    return this;
};

ATBP.addindex = function(columns, name) {
    const indexname = name || `${this.tablename}_${Array.isArray(columns) ? columns.join('_') : columns}_index`;
    const collist = Array.isArray(columns) ? columns.join(', ') : columns;
    this.operations.push(`CREATE INDEX ${indexname} ON ${this.schema}.${this.tablename} (${collist})`);
};

ATBP.dropindex = function(name) {
    this.operations.push(`DROP INDEX IF EXISTS ${name}`);
    return this;
};

ATBP.addforeignkey = function(column, reftable, refcol, constraintname) {
    var fkname = constraintname || `fk_${this.tablename}_${column}`;
    this.operations.push(`ALTER TABLE ${this.schema}.${this.tablename} ADD CONSTRAINT ${fkname} FOREIGN KEY (${column}) REFERENCES ${reftable}(${refcol})`);
    return this;
}

ATBP.dropforeignkey = function(constraintname) {
    this.operations.push(`ALTER TABLE ${this.schema}.${this.tablename} DROP CONSTRAINT ${constraintname}`);
    return this;
};


// Add more AlterTable methods
ATBP.addtimestamps = function() {
    var t = this;
    t.operations.push(`ALTER TABLE ${t.schema}.${t.tablename} ADD COLUMN dtcreated TIMESTAMP DEFAULT now()`);
    t.operations.push(`ALTER TABLE ${t.schema}.${t.tablename} ADD COLUMN dtupdated TIMESTAMP`);
    return t;
};

ATBP.droptimestamps = function() {
    var t = this;
    t.operations.push(`ALTER TABLE ${t.schema}.${t.tablename} DROP COLUMN IF EXISTS dtcreated`);
    t.operations.push(`ALTER TABLE ${t.schema}.${t.tablename} DROP COLUMN IF EXISTS dtupdated`);
    return t;
};

ATBP.addsoftdeletes = function() {
    var t = this;
    t.operations.push(`ALTER TABLE ${t.schema}.${t.tablename} ADD COLUMN dtremoved TIMESTAMP`);
    t.operations.push(`ALTER TABLE ${t.schema}.${t.tablename} ADD COLUMN isremoved BOOLEAN DEFAULT FALSE`);
    return t;
};

ATBP.getoperations =  function() {
    return this.operations;
};

exports.MigrationBuilder = MigrationBuilder;
exports.TableBuilder = TableBuilder;
exports.AlterTableBuilder = AlterTableBuilder;
exports.ColumnBuilder = ColumnBuilder;









