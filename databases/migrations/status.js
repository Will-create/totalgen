NEWMIGRATION({
    up: async function(migration) {
        migration.createtable('statuses', function(table) {
            table.id();
            table.string('name', 100);
            table.text('description').setnull();
            table.softdeletes();
            table.timestamps();
        });
    },
    down: async function(migration) {
        migration.droptable('statuses');
    }
});