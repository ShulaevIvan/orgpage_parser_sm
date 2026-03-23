const fs = require('fs');
const puppeteer = require('puppeteer');
const getUserParametrs = require('./parserCli/parserCli');
const saveParseData = require('./utils/saveParseData');


const parserSettings = {
  mainUrl: 'https://orgpage.ru/',
  outputFolder: `${__dirname}/output`,
  outputFileName: 'companiesData.json',
  outputPath: `${__dirname}/output/companiesData.json`,
  userSearchParams: {
    companyType: 'Эстетические Косметологии',
    companyRegion: 'Санкт-Петербург',
    skip: true,
  },
  pageSettings: {
    searchUrl: '',
    currentPage:0,
    maxPage: 0,
    nextPage: 0
  },
  companiesData: {
    companies: []
  }
};

const waitForNextLine = (time) => {
   return new Promise(function(resolve) { 
    setTimeout(resolve, time)
   });
};

const initFunc = async () => {
    if (!fs.existsSync(parserSettings.outputFolder)) {
        fs.mkdirSync(parserSettings.outputFolder, { recursive: true });
        fs.writeFileSync(`${parserSettings.outputFolder}/companies.json`, '');
    }
    let browser;
    if (!parserSettings.userSearchParams.skip) {
        const { companyType, region } = await getUserParametrs()
        parserSettings.userSearchParams.companyType = companyType;
        parserSettings.userSearchParams.region = region;
        
        browser = await puppeteer.launch({headless: false,});
        return browser;
    };
    browser = await puppeteer.launch({headless: false,});
    return browser;
};

const getPageParams = async (browser) => {
    const pages = await browser.pages();
    const page = pages[0];
    await page.goto(`${parserSettings.mainUrl}`, {waitUntil: 'domcontentloaded'});
    await page.waitForSelector('#query-text', { timeout: 10000 });
    await page.evaluate( () => document.querySelector('#query-text').value = '');
    await page.evaluate( () => document.querySelector('#query-location').value = '');
    await page.type('#query-text', `${parserSettings.userSearchParams.companyType}`, {delay: 100});
    await page.type('#query-location', `${parserSettings.userSearchParams.companyRegion}`, {delay: 100});
    await waitForNextLine(2000);
    await page.click('.btn.btn-submit.btn-yellow.btn-block');

    await page.waitForSelector('.footer-navigation.paging', { timeout: 10000 });
    const pageUrl = await page.url();

    return await page.evaluate(async (parserSettings, pageUrl) => {
      const footerNavArr = document.querySelector('.footer-navigation.paging').querySelectorAll('a.ng-binding')
      const currentPage = document.querySelector('.ng-scope.active').querySelector('a').textContent;
      let maxPage = 0;
      if (Array.from(footerNavArr).length > 1) maxPage = Number(Array.from(footerNavArr).slice(-1)[0].textContent);
      let nextPage = Number(currentPage) < maxPage ? Number(currentPage) + 1 : 1;

      parserSettings.pageSettings = {
        ...parserSettings.pageSettings,
        searchUrl: pageUrl,
        currentPage: Number(currentPage),
      //   maxPage: maxPage,
        maxPage: 10,
        nextPage: nextPage
      };
      return parserSettings.pageSettings
    }, parserSettings, pageUrl);
};

const pagrsePage = async (url, pageNum) => {
    let browser = await puppeteer.launch({headless: false,});
    let page = await browser.newPage();
    await page.goto(url, {waitUntil: 'domcontentloaded'});
    await page.waitForSelector('.footer-navigation.paging', { timeout: 10000 });

    await page.evaluate(async (pageNumber) => {
      const allPageNumbTags = document.querySelectorAll('.ng-binding')
      Array.from(allPageNumbTags).forEach((pageNumTag) => {
        window.scrollTo(0,10000)
        if (Number(pageNumTag.textContent) === pageNumber) {
          pageNumTag.click();
        }
      });
    }, pageNum)
   
    await page.waitForSelector('.object-item.similar-item', { timeout: 10000 });

    const companyData = await page.evaluate(() => {
        const cards = document.querySelectorAll('.object-item.similar-item');
        return Array.from(cards).map((cardItem) => {
            const companyData = {
                name: cardItem.querySelector('.similar-item__title').querySelector('a').textContent,
                url: cardItem.querySelector('.similar-item__title').querySelector('a').getAttribute('href'),
                phone: cardItem.querySelector('.similar-item__phone ').querySelector('.phone').textContent.trim(),
                address: cardItem.querySelector('.similar-item__adrss-item').textContent.trim()
            }
            return companyData;
        });
    });

    const companyCards = await updateInnerCards(companyData, browser);
    parserSettings.companiesData.companies.push(...companyCards);
    await saveParseData(parserSettings.companiesData.companies, parserSettings.outputPath);

    await page.evaluate(async () => {
        document.querySelector('.footer-navigation.paging').querySelectorAll("li:last-of-type")[0].querySelector('a').click()
    })


};

const updateInnerCards = async (companiesData, browser) => {
    const companyInfoTasks = companiesData.map(async (cardInfo) => {
        const additionalData = await getInnerCardInfo(cardInfo.url, browser);
        return {
          ...additionalData,
          name: cardInfo.name,
          url: cardInfo.url,
          phone: cardInfo.phone,
          address:cardInfo.address,
        };
    });
    return Promise.all(companyInfoTasks);
};

const getInnerCardInfo = async (cardUrl, browser) => {
    const page = await browser.newPage();
    await page.goto(cardUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.company-information__row', { visible: true, timeout: 10000});

    const data = await page.evaluate(() => {
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
          email: `${email}`.replace(/\s/g, '')
        });
      });
    });
    await page.close();
    return data;
};


const searchStr = `https://www.orgpage.ru/search.html?q=%D0%AD%D1%81%D1%82%D0%B5%D1%82%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%B8%D0%B5+%D0%BA%D0%BE%D1%81%D0%BC%D0%B5%D1%82%D0%BE%D0%BB%D0%BE%D0%B3%D0%B8%D0%B8&loc=%D0%A1%D0%B0%D0%BD%D0%BA%D1%82-%D0%9F%D0%B5%D1%82%D0%B5%D1%80%D0%B1%D1%83%D1%80%D0%B3`
initFunc();
pagrsePage(searchStr, 2)
pagrsePage(searchStr, 3);
// .then(async (browserObj) => {
//     const browser = browserObj;
//     await getPageParams(browser)
//     .then(async (data) => {
//         await browser.close();
//         let pageData = data;
//         await pagrsePage(pageData.searchUrl, 2);
//         await pagrsePage(pageData.searchUrl, 3);
//         // await pagrsePage(browser, pageData.searchUrl, 2);
//         // await pagrsePage(browser, pageData.searchUrl, 3);
//         // await pagrsePage(browser, pageData.searchUrl, 4);
//         // await pagrsePage(browser, pageData.searchUrl, 5);
//     });
// });
// console.log(browser)
// const getPages = getPageParams();






