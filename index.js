const fs = require('fs');
const puppeteer = require('puppeteer');

const getUserParametrs = require('./parserCli/parserCli');
const saveParseData = require('./utils/saveParseData');

const parserSettings = require('./config/parserSettings');

const initFunc = async () => {
    if (!fs.existsSync(parserSettings.outputFolder)) {
        fs.mkdirSync(parserSettings.outputFolder, { recursive: true });
        fs.writeFileSync(`${parserSettings.outputFolder}/companiesData.json.json`, '');
    }
    const searchStr = await getUserParametrs(parserSettings);
    parserSettings.currentSearchStr = searchStr;
};

const startParser = async (searchStr) => {
    const browser = await puppeteer.launch({headless: true,});
    const page = await browser.newPage();
    const maxPages =  parserSettings.pageSettings.maxPage;
    parserSettings.progerssBar.start(maxPages, 0);
    parsePageFunc(searchStr, maxPages, page, true);
};

const getMaxPagesBySearchParam = async (searchUrl) => {
    const browser = await puppeteer.launch({headless: true,});
    const page = await browser.newPage();
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.footer-navigation.paging', { visible: true, timeout: 10000})
    const maxPages = await page.evaluate(async () => {
        const allNavTags = Array.from(document.querySelector('.footer-navigation.paging').querySelectorAll('.ng-binding'));
        const firstNavTag = allNavTags.shift().textContent;
        const lastNavTag = allNavTags.pop().textContent;
        return { 
            firstPage: Number(firstNavTag),
            lastPage: Number(lastNavTag)
        };
    });
    await browser.close();
    
    return maxPages;
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


const waitForNextLine = (time) => { 
   return new Promise(function(resolve) { 
    setTimeout(resolve, time)
   });
};

const getInnerCardInfo = async (cardUrl) => {
    let browser = await puppeteer.launch({headless: true,});
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
    await waitForNextLine(5000)
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
        await waitForNextLine(1000)
        await saveParseData(parserSettings.companiesData.companies, parserSettings.outputPath);
        return {pageObj: nextData.pageObj }
    })
    .then(async (nextData) => {
        maxIters -= 1;
        parserSettings.progerssBar.increment();
        if (maxIters > 0) {
            await moveToNextPage(nextData.pageObj)
            .then(async (pageObj) => {
                await parsePageFunc(url, maxIters, pageObj)
            })
        }
        parserSettings.progerssBar.stop();
        
    })
};

(async () => {
    const testStr = 'https://www.orgpage.ru/search.html?q=%D0%9A%D0%BE%D1%81%D0%BC%D0%B5%D1%82%D0%BE%D0%BB%D0%BE%D0%B3%D0%B8%D0%B8&loc=%D0%9C%D0%BE%D1%81%D0%BA%D0%B2%D0%B0&forReplies=false';
    const cat = await getSearchCategories(testStr)
    console.log(cat)
})();
// initFunc(parserSettings).then(async () => {
//     await getMaxPagesBySearchParam(parserSettings.currentSearchStr)
//     .then(async (pageData) => {
//         parserSettings.pageSettings.firstPage = pageData.firstPage;
//         parserSettings.pageSettings.maxPage = pageData.lastPage;
//     })
//     .then(async () => {
//         // await startParser(parserSettings.currentSearchStr);
//     })
   
// });
