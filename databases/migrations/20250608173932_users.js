// Migration: create users table;
NEWMIGRATION({
    up: async function(migration) {
        await migration.createtable('users', function(table) {
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
        await migration.droptable('users');
    }
});
