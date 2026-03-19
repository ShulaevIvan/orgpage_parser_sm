const prompts = require('prompts');

const searchParams = [
    {
        type: 'text',
        name: 'companyType',
        message: 'Введите тип компаний для поиска'
    },
    {
        type: 'text',
        name: 'region',
        message: 'Регион для поиска например: Москва'
    }
];

const getUserParametrs = async () => {
    const response = await prompts(searchParams);
    return response;
}



module.exports = getUserParametrs;