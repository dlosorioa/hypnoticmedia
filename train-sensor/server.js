var Engine = require('tingodb')();
var database = new Engine.Db(__dirname + '/db',{});
var databaseName = 'Synco-Stair';
var databasePeople = 'Synco-Stair-People';
var databaseSensor = 'SyncoStairs_';
var sensorsOn = false;

var sideThreshold = 200;

// Sort dates available found in 5ynco stairs data base
function mapSyncoDates(results) {
  var syncoDatesArray = {};
  console.log('mapSyncoDates', results);
  return Array.prototype.reduce.call(results, function(collection, item) {
    var datetime =  new Date(item.datetime.getFullYear(), item.datetime.getMonth(), item.datetime.getDate());
    if (!syncoDatesArray[datetime]) {
      syncoDatesArray[datetime] = datetime;
      collection.push(datetime);
    }
    return collection;
  }, []);
}

// Query for dates available on 5ynco stairs database
function getSyncoDates(callback){
  var sampleCollection = database.collection(databaseName);

  sampleCollection
  .find({"_id": { $gte: 0 }}, {"_id":0, "datetime": true})
  .sort({"datetime":-1})
  .toArray(function(err, docList){
    callback(mapSyncoDates(docList));
  });
};


// Get results on specific collection for an specific day
function getDBQueriesByDateQuery(collection, datetime, callback){
  var nextDate = new Date(datetime.getTime() + 24*60*60*1000);

  collection
  .find({"datetime": {$gte: datetime, $lt: nextDate}}, {"_id": 0})
  .sort({"datetime":1})
  .toArray(function(err, docList){
    callback(docList);
  });
};


// Wrapper function to query  by date
function getDBQueriesByDate(collection, datetime) {
  getDBQueriesByDateQuery(collection, datetime, function(results) {
    // Send synco
    console.log(results);
  });
}

// Query data base for people going up or down and prepair the data for sending to server by hour
function getPeopleByDateByHour(datetime, callback) {
  var sampleCollection = database.collection(databasePeople);

  getDBQueriesByDateQuery(sampleCollection, datetime, function(results) {
    console.log('getPeopleByDateByHour', datetime);

    var resultsByHour = Array.prototype.reduce.call(results, function(collection, item) {
      var hour = item.datetime.getHours();
      var directionItem = collection[item.direction];
      var side = item.distance < sideThreshold;
      if (directionItem[hour]) {
        directionItem[hour].count++;
      } else {
        directionItem[hour] = {
          count: 1,
          left: 0,
          right: 0
        };
      }
      if (side) {
        directionItem[hour].right++
      } else {
        directionItem[hour].left++
      }
      return collection;
    }, {
      'up': {},
      'down': {}
    });

    // Send synco people
    callback(datetime, resultsByHour);
  });
}

// Query sensor information from data base by hour
function getSensorByDateByHour(position, datetime, callback) {
  var sampleCollection = database.collection(databaseSensor + position);

  getDBQueriesByDateQuery(sampleCollection, datetime, function(results) {
    console.log('getSensorByDateByHour', position, datetime);
    var resultsByHour = Array.prototype.reduce.call(results, function(collection, item) {
      var hour = item.datetime.getHours();
      var side = item.distance < sideThreshold;
      if (collection[hour]) {
        collection[hour].count++;
      } else {
        collection[hour] = {
          count: 1,
          left: 0,
          right: 0
        };
      }
      if (side) {
        collection[hour].right++
      } else {
        collection[hour].left++
      }
      return collection;
    }, {});

    // Send synco sensor by position
    callback(position, datetime, resultsByHour);
  });
}


// Initialize server modules
var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var fs = require('fs');
var ip = require("ip");

var db = new Engine.Db(__dirname + '/db',{});

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/public/index.html');
});
app.get('/styles', function (req, res) {
  res.sendfile(__dirname + '/public/css/styles.css');
});
app.get('/scripts', function (req, res) {
  res.sendfile(__dirname + '/public/js/scripts.js');
});
app.get('/images/*', function (req, res) {
  res.sendfile(__dirname + '/public/' + req.originalUrl);

});

// Start server messages and communication
function start(live) {
  sensorsOn = live !== undefined;

  console.log("Listening post 8000");
  console.log ( ip.address() + ":8000");
  server.listen(8000);

  io.on('connection', function (socket) {
    console.log("user connected to socket");

    function sendSensorData(position, datetime, results) {
      socket.emit('syncoSensorData', {
        "position": position,
        "datetime": datetime,
        "results": results
      });
    }

    function sendPeopleData(datetime, results) {
      socket.emit('syncoPeopleData', {
        "datetime": datetime,
        "results": results
      });
    }

    function getSensorData(datetime) {
      // getSensorByDateByHour('bottom', datetime, sendSensorData);
      // getSensorByDateByHour('top', datetime, sendSensorData);
      // getPeopleByDateByHour(datetime, sendPeopleData);
    }
    
    socket.on('requestSyncoByDate', function(data){
      getSensorData(new Date(data));
    });

    console.log('getSyncoDates');

    getSyncoDates(function(results) {
      console.log(results);
      // socket.emit('syncoDates', results);
    });
    
    socket.on('disconnect', function(){
      console.log("user disconnected from socket");
    });

    if (sensorsOn) {
      socket.emit('syncoSensorLive');

      module.exports.update = function (data) {
        console.log(':::::::: update');
        socket.emit('syncoUpdate', data);
      };
    }
  });
}

// Export modules
module.exports = {
  start: start,
  update: function() {}
};