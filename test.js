require('total5');

const { Console } = require('./console.js'); // Update path
const assert = require('assert');

// ✅ Mock DB Adapter
const MockDB = () => ({
	query(sql, params) {
		let q = {};
		q.callback = (cb) => {
			if (sql.toLowerCase().includes('information_schema')) {
				// Fake PostgreSQL table response
				return cb(null, [{ table_name: 'users' }, { table_name: 'orders' }]);
			}
			if (sql.toLowerCase().startsWith('select')) {
				return cb(null, [{ id: 1, name: 'Test' }]);
			}
			if (sql.toLowerCase().startsWith('truncate')) {
				return cb(null, 'TRUNCATED');
			}
			if (sql.toLowerCase().startsWith('drop')) {
				return cb(null, 'DROPPED');
			}
			return cb(null, []);
		};
		return q;
	},
	insert(table, data) {
		let q = {};
		q.callback = (cb) => cb(null, { inserted: 1 });
		return q;
	}
});

// ✅ Boot test console
const consoleInstance = new Console({
	db: MockDB(),
	debug: true,
	prompt: 'TEST>',
	ignoreprefix: true
});

// Short alias
const T = consoleInstance;

(async () => {
	console.log('===== TEST: .tables =====');
	let tables = await T.tables();
	assert.deepStrictEqual(tables, ['users', 'orders']);

	console.log('===== TEST: .columns =====');
	let cols = await T.columns('users');
	assert.ok(Array.isArray(cols));

	console.log('===== TEST: .indexes =====');
	let idx = await T.indexes('users');
	assert.ok(Array.isArray(idx));

	console.log('===== TEST: .constraints =====');
	let constraints = await T.constraints('users');
	assert.ok(Array.isArray(constraints));

	console.log('===== TEST: .exists =====');
	let exists = await T.exists('users');
	assert.strictEqual(exists, true);

	console.log('===== TEST: .truncate =====');
	let truncate = await T.truncate('users');
	assert.ok(truncate);

	console.log('===== TEST: .drop =====');
	let drop = await T.drop('users');
	assert.ok(drop);

	console.log('===== TEST: .query =====');
	let result = await T.query('SELECT * FROM users');
	assert.ok(Array.isArray(result));
	assert.deepStrictEqual(result[0].name, 'Test');

	console.log('===== TEST: insert() =====');
	let ins = await T.context.insert('users', { name: 'Test' });
	assert.ok(ins == undefined); // callback-based

	console.log('===== TEST: multiline eval =====');
	let val = await T.eval(`(function() {
	let a = 2;
	let b = 3;
	return a + b;
})()`);
	assert.strictEqual(val, 5);

	console.log('===== TEST: eval with await =====');
	let evalWithAwait = await T.eval(`(async () => { return await Promise.resolve(42); })()`);
	assert.strictEqual(evalWithAwait, 42);

	console.log('===== TEST: special command .tables =====');
	let intercept = await T.special('.tables');
	assert.strictEqual(intercept, true);

	console.log('===== TEST: eval failure handling =====');
	try {
		await T.eval(`(() => { let a = ; })()`);
		console.error('Expected eval error not thrown');
		process.exit(1);
	} catch (e) {
		assert.ok(e instanceof SyntaxError);
	}

	console.log('===== TEST: help and history =====');
	T.context.help();
	T.options.history.push('tables()');
	T.history();

	console.log('\n🎯 ALL TESTS PASSED\n');

	process.exit(0);
})();


