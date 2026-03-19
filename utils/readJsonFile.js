const fs = require("fs").promises;


const readJsonFile = async (filePath) => {
  try {
    const data = await fs.readFile(filePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filePath}: ${error}`);
    return [];
  }
};

module.exports = readJsonFile;