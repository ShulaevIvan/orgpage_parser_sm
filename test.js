const prompts = require('prompts');


const pageData = [
  {
    name: 'Косметология',
    link: 'https://orgpage.ru/moskva/kosmetologicheskie-uslugi/',
    qnt: 77
  },
  {
    name: 'Косметология для ресниц и бровей',
    link: 'https://orgpage.ru/moskva/kosmetologiya-dlya-resnits-i/',
    qnt: 2166
  },
  {
    name: 'Центры косметологии',
    link: 'https://orgpage.ru/moskva/%D1%86%D0%B5%D0%BD%D1%82%D1%80%D1%8B_%D0%BA%D0%BE%D1%81%D0%BC%D0%B5%D1%82%D0%BE%D0%BB%D0%BE%D0%B3%D0%B8%D0%B8/',
    qnt: 232
  },
  {
    name: 'Аппаратная и лазерная косметология',
    link: 'https://orgpage.ru/moskva/apparatnaya-i-lazernaya/',
    qnt: 143
  },
  {
    name: 'Косметология и эстетическая медицина',
    link: 'https://orgpage.ru/moskva/kosmetologiya-i-esteticheskaya/',
    qnt: 89
  },
  {
    name: 'Инъекционная косметология',
    link: 'https://orgpage.ru/moskva/inektsionnaya-kosmetologiya/',
    qnt: 84
  },
  {
    name: 'Косметология лица',
    link: 'https://orgpage.ru/moskva/kosmetologiya-litsa/',
    qnt: 72
  },
  {
    name: 'Аппаратная косметология',
    link: 'https://orgpage.ru/moskva/apparatnaya-kosmetologiya/',
    qnt: 57
  },
  {
    name: 'Косметология тела',
    link: 'https://orgpage.ru/moskva/kosmetologiya-tela/',
    qnt: 26
  },
  {
    name: 'Лазерная косметология',
    link: 'https://orgpage.ru/moskva/lazernaya-kosmetologiya/',
    qnt: 19
  },
  {
    name: 'Услуги инъекционной косметологии',
    link: 'https://orgpage.ru/moskva/inektsionnaya-kosmetologiya-2/',
    qnt: 13
  },
  {
    name: 'Авторские методики в косметологии',
    link: 'https://orgpage.ru/moskva/avtorskie-metodiki-v/',
    qnt: 8
  },
  {
    name: 'Аппаратная инъекционная косметология',
    link: 'https://orgpage.ru/moskva/apparatnaya-inektsionnaya/',
    qnt: 4
  },
  {
    name: 'Косметология для беременных',
    link: 'https://orgpage.ru/moskva/kosmetologiya-dlya-beremennykh/',
    qnt: 1
  }
]


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




const parsingFunc = async () => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve(console.log('test'))
        }, 2000)
    })
};


const nextParse = async () => {
    const params = [
        { type: 'number', name: 'value', message: 'Продолжить поиск ? Нажмите (1) для продолжения, (2) для отмены' }
    ];
    const { value } = await prompts(params);

    return value;
};

const parse = async () => {
    return new Promise((resolve, reject) => {
        parsingFunc().then(async () => {
            await nextParse().then((data) => {
                if (data === 1) {
                    resolve(1);
                }
                reject(0)
            }); 
        });
    })
   
};

const createTasks  = async (count, parseFunc) => {
    const arr = [];
    const iters = Math.ceil(count / 30);
    for (let i = 0; i < iters; i += 1) {
        arr.push(parseFunc);
    }
    return arr
};

async function marchOneByOne(index, tasks) {
    if (index >= tasks.length) {
        return; // Все задачи выполнены.
    }
    await tasks[index]();
    await marchOneByOne(index + 1, tasks); // Следующая задача.
}

const tt = getPageStats(pageData)
.then(async (pageStats) => {
    const taskList = await createTasks(800, parse);
    const promiseFactories = taskList;

    marchOneByOne(0, promiseFactories).then(() => console.log("Марш окончен. Пора на заслуженный отдых!"));
})



