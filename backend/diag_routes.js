require('module-alias/register');
const appControllers = require('./src/controllers/appControllers');
const { routesList } = require('./src/models/utils');

console.log('--- Controllers ---');
Object.keys(appControllers).forEach(name => {
    console.log(`Controller: ${name}, has list: ${!!appControllers[name].list}`);
});

console.log('\n--- Routes List ---');
routesList.forEach(route => {
    if (route.entity === 'villa') {
        console.log('Villa Route config:', route);
    }
});
