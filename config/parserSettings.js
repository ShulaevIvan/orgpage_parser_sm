const path = require('path');
const cliProgress = require('cli-progress');
const colors = require('ansi-colors');


const parserSettings = {
    mainUrl: 'https://orgpage.ru',
    currentSearchStr: '',
    outputFolder: path.resolve(`${__dirname}`, '..', 'output'),
    outputFileName: 'companiesData.json',
    outputPath: `${path.resolve(`${__dirname}`, '..', 'output')}/companiesData.json`,
    outputAddPath: `${path.resolve(`${__dirname}`, '..', 'output')}/additionalData.json`,
    outputClearPath: `${path.resolve(`${__dirname}`, '..', 'output')}/clearData.json`,
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
    ],
    companySearchCount: {
        lastNumber: '0.',
        autoSearch: false
    },
    savedSearchParams: {
        empty: false,
        data: [{ name: 'Студии и салоны красоты', link: 'https://www.orgpage.ru/rossiya/salony-krasoty/', qnt: 7891 ,keyNum: 2}]
    }
};


module.exports = parserSettings;