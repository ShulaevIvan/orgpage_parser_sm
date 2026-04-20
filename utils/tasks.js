const createTasks  = async (count, parseFunc) => {
    const taskArr = [];
    const iters = Math.ceil(count / 30);
    for (let i = 0; i < iters; i += 1) {
        taskArr.push(parseFunc);
    }
    return taskArr;
};

const runTasks = async (index, tasksArr) => {
    if (index >= tasksArr.length) {
        return; 
    }
    await tasksArr[index]();
    await runTasks(index + 1, tasksArr);
};

const inlineTasks = async (tasks) => {
  const collectData = [];

  for (const task of tasks) {
    await task.func(task.url).then(async (data) => { collectData.push(data)});
  };

  return collectData;
};


module.exports = {
    createTaskFunc: createTasks,
    runTasksFunc: runTasks,
    inlineTasks: inlineTasks
};

