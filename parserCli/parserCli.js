const prompts = require('prompts');
const path = require('path')




const getUserParametrs = async (parserSettings) => {
    const { searchParams, mainUrl } = parserSettings;
    
    const response = prompts(searchParams).then((response) => {
        const { companyType, region } = response;
        const searchStrUrl = `${mainUrl}/search.html?q=${companyType}&loc=${region}`;

        return searchStrUrl;
    });
    return response;
};

const getPageStats = async (pageData) => {
    return new Promise((resolve, reject) => {
        let userQuest = '';
        let num = 0;
        pageData = pageData.map((pageObj, i) => {
            num = i + 1;
            userQuest = userQuest + `Цифра (${num}) ${pageObj.name} (${pageObj.qnt}) шт \n`
            return {
                ...pageObj,
                keyNum: num
            }
        });
        resolve({pageData: pageData, userMessage: userQuest})
    })
    .then(async (data) => {
        const params = [
            { 
                type: 'number', 
                name: 'value', 
                message: `Введите цифру категории для поиска: \n ${data.userMessage}` 
            }
        ];
        const { value } = await prompts(params);
        if (value < 1 || value > data.pageData.length) {
            return;
        }
        return data.pageData.find((item) => item.keyNum === value);
    })
};

const nextParse = async (auto=false) => {
    if (auto) return 1;
    const params = [
        { type: 'number', name: 'value', message: 'Продолжить поиск ? Нажмите (1) для продолжения, (2) для отмены' }
    ];
    const { value } = await prompts(params);

    return value;
};


module.exports = {
    getUserParametrs: getUserParametrs,
    getPageStats: getPageStats,
    nextParse: nextParse
}
