const fs = require('fs');
const readFile = require('./readJsonFile');
const writeFile = require('./writeJsonFile');

const saveParseData = async (parseData, outputFilePath) => {
    readFile(outputFilePath)
    .then((existingData) => {
        const resultData = [...existingData, ...parseData];
        writeFile(outputFilePath, JSON.stringify(resultData, null, 4))
    })
};

module.exports = saveParseData;