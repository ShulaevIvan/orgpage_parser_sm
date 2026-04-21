const readJsonFile = require('./readJsonFile');

const checkDataInJson = async (filePath, url) => {
    const fileData = await readJsonFile(filePath);
    const targetUrl = fileData.find((item) => item.url === url && item.email);

    return targetUrl ? true : false;
};


module.exports = checkDataInJson;