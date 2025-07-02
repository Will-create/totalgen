function Db(opt) {
    var t = this;
    t.options = {};
    t.options.db = t.db = opt.db || DATA || DB();
    t.options.schema = opt.schema || 'public';
    t.options.database = opt.database || 'postgresql';
    t.options.debug = opt.debug || false;
    t.options.prefix = opt.ignoreprefix ? '' : 'tbl_';
}

let DBP = Db.prototype;

DBP.tables = async function() {
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
            // MySQL/MariaDB
            query = `
                SHOW TABLES
            `;
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

DBP.columns = async function(tableName) {
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
            query = `
                DESCRIBE ${tableName}
            `;
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

DBP.indexes = async function(tableName) {
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
            query = `
                SHOW INDEX FROM ${tableName}
            `;
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

DBP.constraints = async function(tableName) {
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

DBP.describe = async function(tableName) {
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

DBP.exists = async function(tableName) {
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

DBP.size = async function(tableName) {
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

DBP.truncate = async function(tableName) {
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

DBP.drop = async function(tableName) {
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

DBP.seed = async function(tableName, data) {
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
            // Insert data using the database connection
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

DBP.query = async function(sql, params) {
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

DBP.log = function(message) {
    let t = this;
    t.options.debug && console.log(`[DB] ${message}`);
};