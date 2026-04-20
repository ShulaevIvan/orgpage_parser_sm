const fs = require('fs');
const puppeteer = require('puppeteer');

const { getUserParametrs, getPageStats, nextParse } = require('./parserCli/parserCli');
const { createTaskFunc, runTasksFunc } = require('./utils/tasks');
const saveParseData = require('./utils/saveParseData');

const parserSettings = require('./config/parserSettings');
const waitForNextLine = require('./utils/wait');
const filterJsonData = require('./utils/fiterJson');

const initParser = async () => {
    let pageData = parserSettings.savedSearchParams.data;
    if (!fs.existsSync(parserSettings.outputFolder)) {
        fs.mkdirSync(parserSettings.outputFolder, { recursive: true });
        fs.writeFileSync(`${parserSettings.outputFolder}/companiesData.json.json`, '');
    }
    if (parserSettings.savedSearchParams.empty) {
        pageData = await getPageParametrs(parserSettings);
        parserSettings.savedSearchParams.data = pageData;
        parserSettings.savedSearchParams.empty = false;
    }

    const { link, qnt } = await getPageStats(pageData);
    const browser = await puppeteer.launch({headless: false,});
    const page = await browser.newPage();
    
    parserSettings.companySearchCount.autoSearch = true;
    parserSettings.currentSearchStr = link;

    return { page: page, link: link,  qnt: qnt}
};

const getSearchCategories = async (searchUrl) => {
    let browser = await puppeteer.launch({headless: false,});
    const page = await browser.newPage();
    const mainUrl = parserSettings.mainUrl;
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.catalog-list.catalog-wrapper', { visible: true, timeout: 10000});
    return await page.evaluate(async (searchMainUrl) => {
        const linkListArr = []

        const allLinkLists = document.querySelector('.result-rubrics.catalog-header__rubrics').querySelector('.row').querySelectorAll('.link-list')
        .forEach((linkList) => linkList.querySelectorAll('li').forEach((linkItem) => {
            linkListArr.push({
                name: linkItem.querySelector('a').textContent,
                link: `${searchMainUrl}${linkItem.querySelector('a').getAttribute('href')}`,
                qnt: Number(linkItem.textContent.replace(/\W+/, ''))
            })
        }));
        return linkListArr
    }, mainUrl);
};

const parseCompaniesFunction = async (page, searchUrl) => {
    if (page && page.url().replace(/www./, '') !== searchUrl.replace(/www./, '')) {
        await page.goto(searchUrl, {waitUntil: 'domcontentloaded'});
        console.log('test')
    }

    await page.waitForSelector('.sub-categories', { visible: true, timeout: 10000});
    await waitForNextLine(3000)

    parserSettings.companySearchCount.lastNumber = await page.evaluate((companySearchCount) => {
        const cardsArr = Array.from(document.querySelectorAll('.object-item.similar-item'));
        const lastCard = cardsArr[cardsArr.length - 1];
                                
        let lastNumber = lastCard.querySelector('.similar-item__title').querySelector('a').textContent.replace(/\s\W+/gm, '');
        if (Number(lastNumber.replace(/\.[^.]*$/, '')) <= Number(companySearchCount.lastNumber.replace(/\.[^.]*$/, ''))) {
            const nextBtn = document.querySelector('.rubricator-next-button').click();
            return new Promise(resolve => {
                setTimeout(() => {
                    const cardsArr = Array.from(document.querySelectorAll('.object-item.similar-item'));
                    const lastCard = cardsArr[cardsArr.length - 1];
                    const lastNumber = lastCard.querySelector('.similar-item__title').querySelector('a').textContent.replace(/\s\W+/gm, '');
                    resolve(lastNumber);
                }, 2000);
            });
        }
        return lastNumber;

    }, parserSettings.companySearchCount);
    console.log(parserSettings.companySearchCount.lastNumber)
    await page.evaluate((parserSettings) => {
        const cards = document.querySelectorAll('.object-item.similar-item');
        const companies = Array.from(cards).map((cardItem) => {
            const companyData = {
                name: cardItem.querySelector('.similar-item__title').querySelector('a').textContent,
                url: cardItem.querySelector('.similar-item__title').querySelector('a').getAttribute('href'),
                phone: cardItem.querySelector('.similar-item__phone ').querySelector('.phone').textContent.trim(),
                address: cardItem.querySelector('.similar-item__adrss-item').textContent.trim()
            }
            return companyData;
        });
        const lastNumber = companies[companies.length - 1].name.replace(/\s\W+/gm, '');

        return { companies: companies, lastNumber: lastNumber};
    }, parserSettings)
    .then(async (data) => {
        const autoSearch = parserSettings.companySearchCount.autoSearch;
        await saveParseData(data.companies, parserSettings.outputPath)
        await nextParse(autoSearch).then((value) => {
            return new Promise((resolve, reject) => {
                if (value === 1) {
                    resolve(value);
                }
                reject(0);
            });
        }); 
    });
};


const getInnerCardInfo = async (cardUrl) => {
    let browser = await puppeteer.launch({headless: true,});
    const page = await browser.newPage();
    await page.goto(cardUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.company-information__row', { visible: true, timeout: 10000});

    const data = await page.evaluate((url) => {
      return new Promise((resolve, reject) => {
        let email, website, phone;
        const companyInfoWrap = document.querySelector('.company-information__site-text');
        if (companyInfoWrap) {
          const emailTag = companyInfoWrap.querySelector('.email');
          const websiteTag = companyInfoWrap.querySelector('link');
          const phoneTag = document.querySelector('.company-information__phone');
          if (phoneTag) phone = phoneTag.textContent;
          if (emailTag) email = emailTag.textContent;
          if (websiteTag) website = websiteTag.getAttribute('href');
        }
        resolve({
          phone: `${phone}`.replace(/\s/g, ''),
          site: `${website}`.replace(/\s/g, ''),
          email: `${email}`.replace(/\s/g, ''),
          url: url
        });
      });
    }, cardUrl)
    await page.close();
    await browser.close();

    return data;
};

const getPageParametrs = async (parserSettings) => {
    return await getUserParametrs(parserSettings)
    .then(async (url) => {
        return await getSearchCategories(url)
        .then((pageData) => {
            return pageData;
        })
    });
};



filterJsonData()
.then(async (filterData) => {
    const urls = filterData.map((companyItem) => companyItem.url).slice(0, 50);

    const promArr = urls.map((url) => {
        return new Promise((resolve, reject) => {
            const data = getInnerCardInfo(url).then((data) => console.log(data));
            resolve(data)
        });
    });
    await Promise.all(promArr);

})


// initParser()
// .then(async (data) => {
//     const { page, link, qnt } = data;
//     const taskList = await createTaskFunc(qnt, () => parseCompaniesFunction(page, link));
//     runTasksFunc(0, taskList).then(() => console.log("Марш окончен. Пора на заслуженный отдых!"));
// })