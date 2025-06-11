require('total5');
let { Migration } = require('./migration')
require('./databases/migrations/status');

require('querybuilderpg').init('default', 'postgresql://louisbertson:123456@localhost:5432/migrationdb');

exports.init = async function() {
    let migration = new Migration({ debug: true, path: PATH.databases('migrations') });


    await migration.create('users');
    await migration.init();

    migration.migrate();

}

exports.init();
