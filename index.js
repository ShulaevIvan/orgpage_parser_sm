const fs = require('fs');
const puppeteer = require('puppeteer');
const getUserParametrs = require('./parserCli/parserCli');
const saveParseData = require('./utils/saveParseData');

const searchStr = `https://www.orgpage.ru/search.html?q=%D0%AD%D1%81%D1%82%D0%B5%D1%82%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%B8%D0%B5+%D0%BA%D0%BE%D1%81%D0%BC%D0%B5%D1%82%D0%BE%D0%BB%D0%BE%D0%B3%D0%B8%D0%B8&loc=%D0%A1%D0%B0%D0%BD%D0%BA%D1%82-%D0%9F%D0%B5%D1%82%D0%B5%D1%80%D0%B1%D1%83%D1%80%D0%B3`;
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




const initFunc = async () => {
    if (!fs.existsSync(parserSettings.outputFolder)) {
        fs.mkdirSync(parserSettings.outputFolder, { recursive: true });
        fs.writeFileSync(`${parserSettings.outputFolder}/companies.json`, '');
    }
    if (!parserSettings.userSearchParams.skip) {
        const { companyType, region } = await getUserParametrs()
        parserSettings.userSearchParams.companyType = companyType;
        parserSettings.userSearchParams.region = region;
    };

    return getUserParametrs();
};

const startParser = async () => {
    const browser = await puppeteer.launch({headless: false,});
    const page = await browser.newPage();
    const maxPages = 10;
    parsePageFunc(searchStr, maxPages, page, true);
};

const waitForNextLine = (time) => {
   return new Promise(function(resolve) { 
    setTimeout(resolve, time)
   });
};



const getInnerCardInfo = async (cardUrl) => {
    let browser = await puppeteer.launch({headless: false,});
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
    })
    await page.close();
    await browser.close();

    return data;
};

const moveToNextPage = async (pageObj) => {
    await waitForNextLine(2000)
    const page = pageObj;
    await page.evaluate(async () => window.scrollTo(0,10000))
    .then(async () => {
        await page.evaluate(async () => {
            document.querySelector('.footer-navigation.paging').querySelectorAll("li:last-of-type")[0].querySelector('a').click()
        });
    })
    
    return page;
};

const skipmove = async (pageObj) => {
    const page = pageObj;

    return page;
};

const parsePageFunc = async(url, maxPages, page, start=false) => {
    let maxIters = maxPages;
    if (start) await page.goto(url, {waitUntil: 'domcontentloaded'})
    await skipmove(page)
    .then(async (page) => {
        await waitForNextLine(2000)
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
        return {pageObj: page, companyData: companyData };
    })
    .then(async (nextData) => {
        const companyInfoTasks = nextData.companyData.map(async (cardInfo) => {
            const additionalData = await getInnerCardInfo(cardInfo.url)
            return {
            ...additionalData,
            name: cardInfo.name,
            url: cardInfo.url,
            phone: cardInfo.phone,
            address:cardInfo.address,
            };
        });
        return {companyData: await Promise.all(companyInfoTasks), pageObj: nextData.pageObj}
    })
    .then(async (nextData) => {
        parserSettings.companiesData.companies.push(...nextData.companyData);
        await saveParseData(parserSettings.companiesData.companies, parserSettings.outputPath);
        return {pageObj: nextData.pageObj }
    })
    .then(async (nextData) => {
        maxIters -= 1;
        if (maxIters > 0) {
            await waitForNextLine(3000)
            await moveToNextPage(nextData.pageObj)
            .then(async (pageObj) => {
                await parsePageFunc(url, maxIters, pageObj)
            })
        }
    })

};

const searchP = initFunc()
.then((data) => {
    console.log(data)
});
// startParser();