const fs = require('fs');

const createFile = async (filePath, fileName, ext) => {
    const fullPath = `${filePath}/${fileName}.${ext}`;
    fs.open(fullPath, 'wx', (err, fd) => {
        if (err) {
            if (err.code === 'EEXIST') console.error(`File '${fileName}' already exists.`);
            else console.error('Error:', err);
            return;
        }
        fs.close(fd, (err) => {
            if (err) {
                console.error('Error closing file:', err);
            }
        });
    });
};

createFile(__dirname, 'test', 'json');

module.exports = createFile;