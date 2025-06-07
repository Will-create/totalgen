if (!Total) 
    require('total5');

function MigrationBuilder(db, schema) {
    var t = this;
    t.db = db;
    t.schema = schema;
}


var MBP = MigrationBuilder.prototype;

MBP.createtable = async function(name, callback) {
    var t = this;
    var builder = new TableBuilder(name, t.schema);
    callback && callback(builder);

    var sql = builder.tosql();
    await t.db.query(sql).promise();
    console.log('Table ' + name + ' created successfully');
};

MBP.altertable = async function(name, schema) {
    var t = this;
    const builder = new AlterTableBuilder(name, t.schama);
    callback && callback(builder);


    var operations = builder.getoperations();

    for (var operation of operations) {
        await t.db.query(operation).promise();
    }

    console.log('Table ' + name + ' altered successfully');
};

MBP.droptable = async function(name) {
    var t = this;
    const sql = `DROP TABLE IF EXISTS ${this.schema}.${name} CASCADE`;
    await t.db.query(sql);
    console.log(`Table '${name}' dropped successfully`);        
};

MBP.executeRaw = async function(sql, params = []) {
    var t = this;
    await t.db.query(sql, params);
    return; 
};

MBP.tableExists = async function(name) {
    var t = this;
    const sql = `
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = ${t.schema} AND table_name = ${name}
        )
    `;
    
    const response = await t.db.query(sql).promise();
    return response[0] ? true : false;
};

MBP.getTableColumns = async function(name) {
    var t = this;
    const sql = `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = ${t.schema} AND table_name = ${name}
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
    t.intexes = [];
    
}

var TBP = TableBuilder.prototype;


TBP.id = function(name) {
    var t = this;
    t.columns.push({ name: name || 'id', type: 'TEXT'});
    return t;
};

TBP.string = function(name, length) {
    var t = this;
    var column = new ColumnBuilder(name, `VARCHAR(${length || 255})`);
    t.columns.push(column);
    return column;
};


TBP.string = function(name) {
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

TBP.biginteger = async function(name) {
    var t = this;
    var column = new ColumnBuilder(name, 'BIGINT');
    t.columns.push(column);
    return column;
};

TBP.boolean = async function(name) {
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

    t.colums.push({ name: 'dtcreated', type: 'TIMESTAMP DEFAULT now()'});
    t.columns.push({ name: 'dtupdate', type: 'TIMESTAMP'});
    t.constraints.push('-- Triger for dtupdated will be create separately');

    return t;
};

TBP.softdeletes = function() {
    var t = this;
    var dtremoved = new Column('dtremoved', 'TIMESTAMP');
    var isremoved = new Column('isremoved', 'BOOLEAN DEFAULT FALSE');
    t.columns.push(dtremoved);
    t.columns.push(isremoved);
    return t;
};


TBP.foreign = function(column) {
    return new ForeignKeyBuilder(column, this);
};

TBP.index =  function(columns, name) {
    var t = this;

    const index = name || `${t.table}_${Array.isArray(columns) ? columns.join('_') : columns}_index`;
    const list = Array.isArray(columns) ? columns.join(', ') : columns;
    
    t.indexes.push({ name: index, columns: list, type: 'INDEX' });
    return t;
};


TBP.unique =  function(columns, name) {
    var t = this;

    const index = name || `${t.table}_${Array.isArray(columns) ? columns.join('_') : columns}_unique`;
    const list = Array.isArray(columns) ? columns.join(', ') : columns;
    
    t.indexes.push({ name: index, columns: list, type: 'UNIQUE INDEX' });
    return t;
};

TBP.tosql =  function() {
    var t = this;
    var definitions = t.columns.map(function(col) {
        if (typeof col === 'string') return col;
        if (col.tosql) return col.tosql();
        return `${col.name} ${col.type}`;
    });

    let constraints = t.constraints.filter(c=>!c.startsWith('--'));

    var sql = `CREATE TABLE ${t.schema}.${t.table} (\n`;
    sql += '    ' + definitions.join(',\n  ');

    if (constraints.length > 0)
        sql += ',\n    ' + constraints.join(',\n   ');
    
    sql += '\n)';

    for (const index of t.indexes) 
        sql += `;\nCREATE ${index.type} ${index.name} 0N ${t.schema}.${t.table} (${index.columns})`;

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

CBP.nullable = function() {
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

    return this;
};

CBP.unique = function() {
    this.modifiers.push('UNIQUE');
    return this;
};

CBP.references = function(columns) {
    return new ReferenceBuilder(this, columns);
};

CBP.tosql = function() {
    return `${this.name} ${this.type} ${this.midifiers.join(' ')}`.trim();
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

ATBP.getoperations =  function() {
    return this.operations;
};










