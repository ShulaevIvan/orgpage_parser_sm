const fs = require('fs');
const puppeteer = require('puppeteer');
const getUserParametrs = require('./parserCli/parserCli');
const saveParseData = require('./utils/saveParseData');


const parserSettings = {
  outputFolder: `${__dirname}/output`,
  outputFileName: 'companiesData.json',
  outputPath: `${__dirname}/output/companiesData.json`,
  userSearchParams: {
    companyType: 'Эстетические Косметологии',
    companyRegion: 'Санкт-Петербург',
    skip: true,
  },
  pageSettings: {
    startPage: 0,
    currentPage: 0,
    nextPage: 0,
    maxPage: 0,
  },
  companiesData: {
    companies: []
  }
}

const getCardsInfo = async (page) => {
  return await page.evaluate(() => {
    return new Promise((resolve, reject) => {
      const cards = document.querySelectorAll('.object-item.similar-item');
      resolve(Array.from(cards).map((cardItem) => {
        const companyData = {
          name: cardItem.querySelector('.similar-item__title').querySelector('a').textContent,
          url: cardItem.querySelector('.similar-item__title').querySelector('a').getAttribute('href'),
          phone: cardItem.querySelector('.similar-item__phone ').querySelector('.phone').textContent.trim(),
          address: cardItem.querySelector('.similar-item__adrss-item').textContent.trim()
        }
        return companyData;
      }));
    });
  });
};

const getInnerCardInfo = async (page, cardUrl) => {
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

const getAdditionalCardInfo = async (browser, companiesData) => {
  return new Promise((resolve, reject) => {
    const data = Array.from(companiesData).map(async (cardInfo, i) => {
      if (cardInfo.url) {
        const page = await browser.newPage();
        const additionalData  = await getInnerCardInfo(page, cardInfo.url);
        return {
          ...additionalData,
          name: cardInfo.name,
          url: cardInfo.url,
          phone: cardInfo.phone,
          address:cardInfo.address,
        };
      }
    });
    Promise.all(data).then((values) => {
      resolve(values);
    });
  })
  
};

const getCurrentPage = async (page) => {
  return await page.evaluate((parserSettings) => {
    const footerNavArr = document.querySelector('.footer-navigation.paging').querySelectorAll('a.ng-binding')
    const currentPage = document.querySelector('.ng-scope.active').querySelector('a').textContent;
    let maxPage = 0;
    if (Array.from(footerNavArr).length > 1) maxPage = Number(Array.from(footerNavArr).slice(-1)[0].textContent);
    let nextPage = Number(currentPage) < maxPage ? Number(currentPage) + 1 : 1;

    parserSettings.pageSettings = {
      ...parserSettings.pageSettings,
      currentPage: Number(currentPage),
      maxPage: maxPage,
      nextPage: nextPage
    };
    return parserSettings.pageSettings
  }, parserSettings);
};

const moveToNextPage = async (page, pageNum) => {
  return await page.evaluate((pageNumber) => {
    const allPageNumbTags = document.querySelectorAll('.ng-binding')
    Array.from(allPageNumbTags).forEach((pageNumTag) => {
      if (Number(pageNumTag.textContent) === pageNumber) {
        pageNumTag.click();
      }
    });
  }, pageNum);
};

const waitForNextLine = (time) => {
   return new Promise(function(resolve) { 
       setTimeout(resolve, time)
   });
};


const parser = async () => {
    const { browser, userSearchParams } = await getUserParametrs()
    .then(async (data) => {
      if (parserSettings.userSearchParams.skip) {
        return {
          browser: await puppeteer.launch({headless: true,}),
          userSearchParams: {
            companyType:  parserSettings.userSearchParams.companyType,
            region:  parserSettings.userSearchParams.companyRegion,
          }
        }
      }
      return {
        browser: await puppeteer.launch({headless: false,}),
        userSearchParams: {
          companyType:  data.companyType,
          region:  data.region,
        }
      }
    });
      parserSettings.userSearchParams = {
        ...parserSettings.userSearchParams,
        companyType: userSearchParams.companyType,
        companyRegion: userSearchParams.region
      }
    const page = await browser.newPage();

    const initParser = async () => {
      if (!fs.existsSync(parserSettings.outputFolder)) {
        fs.mkdirSync(parserSettings.outputFolder, { recursive: true });
        fs.writeFileSync(`${parserSettings.outputFolder}/companies.json`, '');
      }

      await page.goto('https://orgpage.ru', {waitUntil: 'domcontentloaded'});
    };

    const searchCompanies = async () => {
      await page.waitForSelector("#query-text", { timeout: 10000 });
      await page.$eval('#query-text', (e) => e);
      await page.type('#query-text', `${parserSettings.userSearchParams.companyType}`, {delay: 100});
      await page.type('#query-location', `${parserSettings.userSearchParams.companyRegion}`, {delay: 100});
      await waitForNextLine(2000);
      await page.click('.btn.btn-submit.btn-yellow.btn-block');

      await page.waitForSelector('.object-item.similar-item', { visible: true, timeout: 10000});

      parserSettings.pageSettings = await getCurrentPage(page);

      const cardsInfo = await getCardsInfo(page)
      const companyCards = await getAdditionalCardInfo(browser, cardsInfo);
      parserSettings.companiesData.companies.push(...companyCards);

      await saveParseData(parserSettings.companiesData.companies, parserSettings.outputPath)

      // await waitForNextLine(2000);
      // await moveToNextPage(page, parserSettings.pageSettings.nextPage);


    };
    initParser();
    searchCompanies();
    
};

parser();







// initParser(browser, page);
// searchCompanies();

// async function init() {
//   const browser = await puppeteer.launch({
//     headless: false,
//   });
//   const page = await browser.newPage();
//   await page.goto('https://orgpage.ru');
//   await page.waitForSelector("#query-text", { timeout: 10000 });
  
// //   const searchInput = await page.$eval('#query-text', (e) => e);
//   await page.type('#query-text', 'Эстетические косметологии', {delay: 100});
//   await page.type('#query-location', 'Санкт-Петербург', {delay: 100});
//   await page.click('.btn.btn-submit.btn-yellow.btn-block');
// }

// init();