const prompts = require('prompts');
const path = require('path')




const getUserParametrs = async (parserSettings) => {
    const { searchParams, mainUrl } = parserSettings;
    
    const response = prompts(searchParams).then((response) => {
        const { companyType, region } = response;
        const searchStrUrl = `${mainUrl}search.html?q=${companyType}&loc=${region}`;

        return searchStrUrl;
    });
    return response;
};


module.exports = getUserParametrs;