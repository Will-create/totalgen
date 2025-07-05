require("total5");
function AI(config) {
    this.config = config;
    this.provider = config.provider || 'openai';
    this.apikey = config.apiKey;
    this.baseurl = config.baseUrl || 'https://api.openai.com/v1';
    this.model = config.model || 'gpt-3.5-turbo';
    this.temp = config.temperature || 0.7;
    this.maxtokens = config.maxtokens;
};

let AIP = AI.prototype;

AIP.enhance = async function(template, prompt, type) {
    let t = this;
    let structure = await t.analyse(template, type);

    let enhanced =  await t.enhancecode(template, prompt, structure, type);

    let validated = await t.validate(enhanced, type);

    return validated;
};

AIP.analyse = async function(template, type) {
    let t = this;
    let sysprompt = t.getsysprompt('analyser', type);

    return await t.callLLM(sysprompt, type);
};

AIP.enhancecode = async function(template, prompt, structure, type) {
    let t = this;
    let sysprompt = t.getsysprompt('enhancer', type);
    let enhanced = `
Structure analysis: ${structure}

User request: ${prompt}

Original Template: 
${template}
Please enhance this tempplate based on the user request while maintaining the original structure;
    `;

    return t.callLLM(sysprompt, enhanced);
};

AIP.validate = async function(code, type) {
    let t = this;

    let sysprompt = t.getsysprompt('validator', type);

    let userprompt = `Validate and fix any issues in this Total.js ${type} code: \n\n${code}`;

    return await t.callLLM(sysprompt, userprompt);
};


AIP.getsysprompt = async function(agent, type) {
    let prompt = {};

    prompt.analyzer = {};
    prompt.analyzer.migration = 'You are a migration structure analyser. Superthink, really think hard and analyse total.js migrations templates and identify key components like table operations, column definitions and contraints. return a bried structural summary.'
    prompt.analyzer.controller = 'You are a controller structure analyser. Superthink, really think hard based and analyse Total.js controller template and identify routes, methods, linked Schemas, middleware. Return a brief structural summary';
    prompt.analyzer.schema = 'You are a schema structure analyser. Superthink, really thank hard to analyse Total.js Schema template and identify action definitions, validation rules in input, fields and expected data of query and params and database querybuilder calls and any other transformations. Return a brief structural summary';
    prompt.analyzer.plugin = 'You are a Total.js Plugin Analyser. Superthink, really think hard and analyze Total.js plugin templates and identify initialization, exports, methods. return a brief structural summary';


    prompt.enhancer = {};
    prompt.enhancer.migration = 'You a total.js migration code enhancer. Superthink, really think hard to order to enhance migration templates based on user requirements while maintaining Total.js migration syntax. Always preserve the NEWMIGRATION(opt): opt.up and/or opt.down structure and async/await patterns. Return only the javascript code';
    prompt.enhancer.controller = 'You are total.js controller code enhancer. Superthink, really think hard in order to enhance controller templates based on the user requirements while maintaining totla.js v5 Routing synstax. Return only the enhanced javascript code';
    prompt.enhancer.schema = 'You are a total.js schema code enhancer. Superthink, really think hard in order to enhance schema templates based on the user requirements while maintaining Total.js schema validation syntax. Return only the enhanced javascript code.';
    prompt.enhancer.plugin = 'You are a total.js plugin code enhancer. Superthink, really think hard in order to enhance total.js plugin code based on the user requirements while maintaining Total.js plugin structure. Return only the enhanced javascript code;';


    prompt.validator = {};
    prompt.validator.migration = 'You are a Total.js migration code validator. Superthink, really think hard in order to check for syntax errors, proper async/await and Total.js best practices. Fix issues and return on the clean and working javascript code'
    prompt.validator.controller = 'You are a total.js controller code validator. Superthink, really think hard in order to check for syntax errors, proper routing and Total.js controller and routing best practices. Fix any issues and return only the clean and working javascript code.'
    prompt.validator.schema = 'You are total.js Schema code validator. Superthink, really think hard in order to check for syntax errors, proper validation rules, and Total.js Schema / Total.js Querybuilder best practices. Fix any issues and return only the clean and working javascript code.'
    prompt.validator.plugin = 'You are a Total.js plugin code validator. Super think, really think hard in order to check for syntax exports, plugin best practices. Fix any issues and return only the working javascript code.';
};

AIP.callLLM = async function (sysprompt, userprompt) {
    let t = this;
   return new Promise(async function(resolve, reject) {
    let payload = {};
    payload.model = t.model;
    payload.messages = [{ role: 'system', content: sysprompt }, { role: 'user', content: userprompt }];
    
    payload.max_tokens = t.maxtokens;
    payload.temperature = t.temp;
    let response = await RESTBuilder.POST(t.baseurl + '/chat/completions', payload).header('Authorization', 'Bearer ' + t.apikey).timeout(t.timeout).keepalive().callback(console.log);
    if (!response || !response.choices) {
        reject(new Error('No content AI response'));
        return;
    }

    let content = response.choices[0].message.content;
    resolve(content);
   });
};

exports.AIEnhancer = AI;
