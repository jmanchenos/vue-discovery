module.exports = {
    plugins: ['cypress'],
    env: {
        mocha: true,
        'cypress/globals': true,
        es6: true,
    },
    rules: {
        strict: 'off',
    },
};
