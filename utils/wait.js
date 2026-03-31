const waitForNextLine = (time) => { 
   return new Promise(function(resolve) { 
    setTimeout(resolve, time)
   });
};

module.exports = waitForNextLine;