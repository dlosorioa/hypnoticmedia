// Initialize modules
var GrovePi = require('node-grovepi').GrovePi;
var GPIO = require('onoff').Gpio;
var Engine = require('tingodb')();

// Set database
var database = new Engine.Db(__dirname + '/db',{});
var databaseName = 'Synco-Stair';
var databasePeople = 'Synco-Stair-People';

// GrovePi settings
var Commands = GrovePi.commands;
var Board = GrovePi.board;
var UltrasonicDigitalSensor = GrovePi.sensors.UltrasonicDigital;

var board;
var lastReading;
var stairsTimeThreshold;
var ultrasonicThreshold = 700;
var setupMode = true;

// Detect and register when a person has gone from one to the other sensor, and analize what direction the person is going
function onPersonPassBy(final, initial) {
  var syncoStairsCollection = database.collection(databasePeople);
  var data = {
    "datetime": final.datetime,
    "time": final.datetime.getTime() - initial.datetime.getTime()
  };
  if (final.position == 'top') {
    data.direction = 'up';
    // Going up
  } else {
    // Going down
    data.direction = 'down';
  }

  data.distance = final.distance ? final.distance : initial.distance;

  console.log('######## A person passed by ' + data.direction + ' in ' + (data.time / 1000) + ' seconds, at ' + data.distance + ' cm');
  syncoStairsCollection.insert(data);

  if (server) {
    server.update(data);
  }
}

// Record motion sensor activity
function onSensor(data) {
  var syncoStairsCollection = database.collection(databaseName);
  syncoStairsCollection.insert(data);

  if (lastReading) {
    if (data.datetime.getTime() - lastReading.datetime.getTime() < 2000) {
      // Same person
      onPersonPassBy(data, lastReading);

      lastReading = null;
    } else {
      lastReading = data;
    }
  } else {
    lastReading = data;
  }
}

// Record ultrasonic sensor activity
function UltrasonicSensor(position, digital_port) {
  var group_name = "Station_" + position;
  var sensor = new UltrasonicDigitalSensor(digital_port);
  var name = group_name + '-Ultrasonic';

  var collection = database.collection(name);
  var initialValues = {};
  var lastValue;

  sensor.on('change', function(res) {
    var now = new Date();
    if (res !== false) {
      if (setupMode) {
        //console.log('initialvalue', res);
        initialValues[res] = true;
      } else if (!initialValues[res]) {
        //console.log(name, res);
        console.log(name, now, res);
        lastValue = res;
        /*
        collection.insert({
          "distance" : res,
          "datetime" : new Date()
        });*/
      }
    }
  });
  sensor.watch();

  function getValue() {
    var value = sensor.read();
    if (value < lastValue) {
      lastValue = value;
    }

    return lastValue;
  }

  return {
    name: name,
    read: function() { return getValue(); },
    sensor: sensor
  };
}

// Motion sensor module
function MotionSensor(position, digital_port) {
  var group_name = "Station_" + position;
  var sensor = new GPIO(digital_port, 'in', 'both');
  var name = group_name + '-Motion';
  var sensor_state = false;

  // watch for changes on ultrasonic readings
  function onWatch(err, state) {
    var collection = database.collection(group_name);
    var now = new Date();
    var data;
    if (state) {

      data = {
        "datetime" : now,
        "distance" : distance
      };
      //console.log(group_name, now, data);
      //collection.insert(data);
      data.position = position;
      console.log(name, now, data);
      //onSensor(data);
    } 
  }

  function getValue() {
    return state;
  }

  // pass the callback function to the
  // as the first argument to watch() and define
  // it all in one step
  motion.sensor.watch(function(err, state) {
    if (!setupMode) {
      onWatch(err, state);
    }
    sensor_state = state;
  });

  return {
    name: name,
    read: function() { return getValue(); },
    sensor: sensor
  };
}

var sensors = [
  { name: 'North', pin: 18, type: MotionSensor },
  { name: 'South', pin: 8, type: UltrasonicSensor }
];
var server;

// Start communication with board, sensors and servers
function start(server_module) {
  console.log('starting Synco Stairs', new Date());
  server = server_module;

  board = new Board({
    debug: true,
    onError: function(err) {
      console.log('BOARD ERROR');
      console.log(err);
    },
    onInit: function(res) {
      if (res) {
        for(var i = 0; i < sensors.length; i++) {
          sensors[i].instance = sensors[i].type(sensors[i].name, sensors[i].pin);
        }

        setTimeout(function() {
          console.log('End setup');
          setupMode = false;
        }, 10000);

        console.log('Synco Stairs is ready', new Date());
      } else {
        console.log('SYNCO STAIRS CANNOT START');
      }
    }
  });

  board.init();
}

function onExit(err) {
  console.log('ending');
  board.close();
  process.removeAllListeners();
  process.exit();
  if (typeof err != 'undefined') {
    console.log(err);
  }
}

// starts the test
//start();
// catches ctrl+c event
process.on('SIGINT', onExit);

// Export module
module.exports = {
  start: start
};