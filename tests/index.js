const fs = require('node:fs/promises');
const assert = require('node:assert');
const YAML = require('yaml');
const cooklang = require('../dist/index.js');

function replaceUndefinedWithString(item) {
    switch (item.type) {
        case 'ingredient':
            return {
                type: 'ingredient',
                name: item.name,
                quantity: item.quantity || '',
                units: item.units || '',
            }
        case 'cookware':
            return {
                type: 'cookware',
                name: item.name,
                quantity: item.quantity || '',
            }
        case 'timer':
            return {
                type: 'timer',
                name: item.name || '',
                quantity: item.quantity || '',
                units: item.units || '',
            }
        default:
            return item;
    }
}

async function runTests(yamlFile) {
    const testsFile = await fs.readFile('./tests/' + yamlFile, 'utf-8');

    const tests = Object.entries(YAML.parse(testsFile).tests);

    console.log(`Running tests: ${yamlFile}\n`);

    let passed = 0;

    for ([testName, test] of tests) {
        console.log(testName);

        const recipe = new cooklang.Recipe(test.source);

        const steps = recipe.steps.map(s => s.map(i => replaceUndefinedWithString(i)));

        const metadataPassed = deepEqual(recipe.metadata, Array.isArray(test.result.metadata) ? {} : test.result.metadata);
        const stepsPassed = deepEqual(steps, test.result.steps);

        if (metadataPassed) console.log(' - Metadata: PASS');
        else console.log(' - Metadata: FAIL');

        if (stepsPassed) console.log(' -    Steps: PASS');
        else { console.log(' -    Steps: FAIL'); console.log(JSON.stringify(steps, null, '\t')); console.log(JSON.stringify(test.result.steps, null, '\t')); }

        if (metadataPassed && stepsPassed) passed++;

        console.log('');
    }

    console.log(`Tests (${yamlFile}) finished:`);
    console.log(' - Passed: ' + passed);
    console.log(' - Failed: ' + (tests.length - passed));
    console.log(' -  Total: ' + tests.length)
    console.log('\n');

    return {
        passed,
        total: tests.length,
    }
}

(async () => {
    const canonical = await runTests('canonical.yaml');
    const custom = await runTests('custom.yaml');

    const failed = (canonical.total + custom.total - canonical.passed - custom.passed);

    if (failed > 0) assert.fail(`Failed ${failed} tests`);
})();

function deepEqual(a, b) {
    try {
        assert.deepEqual(a, b);
    } catch (error) {
        if (error.name == 'AssertionError') {
            return false;
        }

        throw error;
    }

    return true;
}