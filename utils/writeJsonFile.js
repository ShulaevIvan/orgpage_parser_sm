const fs = require("fs");

const writeFile = async (filePath, data) => {
    console.log(filePath)
    fs.writeFile(filePath, data, 'utf8', (err) => {
        // if (err) {
        //     console.error('Error writing to file', err);
        // } else {
        //     console.log('Data written to file');
        // }
    });
};



module.exports = writeFile;