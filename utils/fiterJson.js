const fs = require("fs");
const path = require('path');
const saveParseData = require('./saveParseData');


const filterJsonData = async () => {
    return new Promise((resolve, reject) => {
        fs.readFile(`${path.resolve(`${__dirname}`, '..', 'output')}/companiesData.json`, function(err, data) { 
            if (err) throw err; 

            const companiesArr = JSON.parse(data);
            const filterData = companiesArr.filter((compItem, i, arr) => i === arr.findIndex((x) => x.name === compItem.name));
            // saveParseData(data, `${path.resolve(`${__dirname}`, '..', 'output')}/companiesDataClear.json`,);
            
            resolve(filterData);
        });
    });
};


module.exports = filterJsonData;