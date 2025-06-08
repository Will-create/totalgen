require('total5');
let { Migration } = require('./migration')
require('./databases/migrations/status');

require('querybuilderpg').init('default', 'postgresql://louisbertson:123456@localhost:5432/migrationdb');

async function main() {
    let migration = new Migration({ debug: true, path: PATH.databases('migrations') });
    await migration.init();
    migration.rollback();

}

main();
