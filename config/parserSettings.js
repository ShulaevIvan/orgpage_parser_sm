const path = require('path')
const cliProgress = require('cli-progress');
const colors = require('ansi-colors');


const parserSettings = {
    mainUrl: 'https://orgpage.ru/',
    currentSearchStr: '',
    outputFolder: path.resolve(`${__dirname}`, '..', 'output'),
    outputFileName: 'companiesData.json',
    outputPath: `${path.resolve(`${__dirname}`, '..', 'output')}/companiesData.json`,
    progerssBar: new cliProgress.SingleBar({
        format: 'CLI Progress |' + colors.cyan('{bar}') + '| {percentage}% || {value}/{total} Pages',
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true
    }),
    userSearchParams: {
        companyType: 'Эстетические Косметологии',
        companyRegion: 'Санкт-Петербург',
        skip: false,
    },
    pageSettings: {
        searchUrl: '',
        currentPage:0,
        maxPage: 0,
        firstPage: 1,
        nextPage: 0
    },
    companiesData: {
        companies: []
    },
    searchParams: [
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
    ]
};


module.exports = parserSettings;