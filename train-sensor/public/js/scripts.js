
window.onload = function(){
  //initLineCharts();
}

var socket = io();
var syncoCharts = {};

var chartLabels = Array(24).fill(0);
chartLabels = chartLabels.map(function(v,ndx) {
  var hour = ndx % 12;
  if (hour === 0) {
    hour = 12;
  }
  return hour + ((ndx < 12)?'am':'pm');
});

var colorUp = 'rgba(56,56,244,0.8)';
var colorDown = 'rgba(255,0,0,0.8)';
var colorBoth = 'rgba(0,0,0,0.8)';

var chartUp = 1;
var chartDown = 2;
var chartBoth = 0;

var chartData = {};
function createChartData() {
  return {
    labels: chartLabels,
    datasets: [
      {
        label: "Total",
        borderColor : colorBoth,
        pointBackgroundColor: colorBoth,
        data: Array(24).fill(0)
      },
      {
        label: "Up",
        borderColor: colorUp,
        pointBackgroundColor: colorUp,
        data: Array(24).fill(0)
      },
      {
        label: "Down",
        borderColor : colorDown,
        pointBackgroundColor: colorDown,
        data: Array(24).fill(0)
      }
    ]
  };
}

function createOnlineChartData(label) {
  return {
    labels: [label],
    datasets: [
      {
        label: "Up",
        backgroundColor: colorUp,
        pointBackgroundColor: colorUp,
        data: [0]
      },
      {
        label: "Down",
        backgroundColor : colorDown,
        pointBackgroundColor: colorDown,
        data: [0]
      }
    ]
  };
}

function addChart(id, xAxes) {
  var options = {
    animation : false,
    responsive : true,
    maintainAspectRatio: true,
    legend: {
      display: false,
    },
    tooltips: {
      mode: 'label'
    },
    scales: {
        xAxes: [{
            display: xAxes
        }]
    }
  };

  var canvas = document.getElementById(id);
  var ctx = canvas.getContext("2d");

  chartData[id] = createChartData();

  syncoCharts[id] = new Chart(ctx, {
    type: 'line',
    data: chartData[id],
    options: options
  });
}

function addOnlineChart(id, name) {
  var options = {
    animation : false,
    responsive : true,
    maintainAspectRatio: true,
    legend: {
      display: false,
    },
    tooltips: {
      mode: 'label',
    },
    scales: {
        xAxes: [{
            display: false
        }],
        yAxes: [{
            display: false
        }]
    }
  };

  var canvas = document.getElementById(id);
  var ctx = canvas.getContext("2d");

  chartData[id] = createOnlineChartData(name);

  syncoCharts[id] = new Chart(ctx, {
    type: 'bar',
    data: chartData[id],
    options: options
  });
}

var initLineCharts = function() {
  addChart('people-chart', true);
  addChart('left-chart');
  addChart('right-chart');
  addOnlineChart('stairs-online-chart', 'Stairs');
  addOnlineChart('sensors-online-chart', 'Sensors');
}

socket.on('syncoDates', function(dates) {
  var select = document.getElementById("selectDates"); 

  for(var i = 0; i < dates.length; i++) {
      var el = document.createElement("option");
      var date = new Date(dates[i]);
      el.textContent =  (date.getMonth() + 1) + '/' + date.getDate() + '/' + date.getFullYear();
      el.value = dates[i] + '';
      select.appendChild(el);
  }

  select.onchange = function(item) {
    socket.emit('requestSyncoByDate', this.value);
  }
  select.onchange();
});

socket.on('syncoSensorLive', function() {
  document.body.classList.add('synco-online');
});

function resetLiveUpdate() {
  var liveSection = document.querySelector('.online');
  liveSection.classList.remove('update-up');
  liveSection.classList.remove('update-down');
  liveSection.classList.remove('update-left');
  liveSection.classList.remove('update-right');

  if (resetLiveUpdateTimer) {
    clearTimeout(resetLiveUpdateTimer);
    resetLiveUpdateTimer = null;
  }
}

var resetLiveUpdateTimer;
/*
socket.on('syncoUpdate', function(incomingData) {
  var liveSection = document.querySelector('.online');

  resetLiveUpdate();

  if (incomingData.direction) {
    liveSection.classList.add('update-' + incomingData.direction);
  }

  if (incomingData.side) {
    liveSection.classList.add('update-' + incomingData.side);
  }

  resetLiveUpdateTimer = setTimeout(resetLiveUpdate);
});*/
socket.on('syncoUpdate', function(incomingData) {
  //var liveSection = document.querySelector('.online');

  //resetLiveUpdate();

  console.log('syncoUpdate', incomingData);
/*
  if (incomingData.direction) {
    liveSection.classList.add('update-' + incomingData.direction);
  }

  if (incomingData.side) {
    liveSection.classList.add('update-' + incomingData.side);
  }

  resetLiveUpdateTimer = setTimeout(resetLiveUpdate);
*/
});

function getDataArray(data, variable) {
  var dataArray = Array(24).fill(0);
  for (key in data) {
    dataArray[parseInt(key)] = data[key][variable];
  }
  return dataArray;
}

function getDataSum(data, variable) {
  var result = 0;
  for (key in data) {
    result += data[key][variable];
  }
  return result;
}

function getPeopleChartData(results, chart, variable) {
  var upArray = getDataArray(results['up'], variable);
  var downArray = getDataArray(results['down'], variable);
  var i;

  for (i = 0; i < 24; i++) {
    chartData[chart].datasets[chartUp].data[i] = upArray[i];
    chartData[chart].datasets[chartDown].data[i] = downArray[i];
    chartData[chart].datasets[chartBoth].data[i] = upArray[i] + downArray[i];
  }

  syncoCharts[chart].update();
}

function updateSideOnlineBar(direction, data) {
  var element = document.querySelector('section.online .stairs .online-' + direction + ' .bar .left-side');
  var nLeft = 50;
  if (data.count) {
    nLeft = Math.floor(data.left * 100 / data.count);
  }

  element.style.width = nLeft + '%';
}

function updatePeopleOnlineChartData(results) {
  var onlineValues = {
    up: {
      count: getDataSum(results['up'], 'count'),
      left: getDataSum(results['up'], 'left')
    },
    down: {
      count: getDataSum(results['down'], 'count'),
      left: getDataSum(results['down'], 'left')
    }
  }

  var chart = 'stairs-online-chart';
  chartData[chart].datasets[0].data[0] = onlineValues.up.count;
  chartData[chart].datasets[1].data[0] = onlineValues.down.count;

  syncoCharts[chart].update();

  updateSideOnlineBar('up', onlineValues.up);
  updateSideOnlineBar('down', onlineValues.down);
}

function updateSensorOnlineChartData(data) {
  var count = getDataSum(data.results, 'count');

  var chart = 'sensors-online-chart';
  chartData[chart].datasets[data.position === 'top'?0:1].data[0] = count;

  syncoCharts[chart].update();
}

var targetDate = new Date();
targetDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());

socket.on('syncoPeopleData', function(incomingData) {
  var select = document.getElementById("selectDates");
  if (select.value === incomingData.datetime) {
    getPeopleChartData(incomingData.results, 'people-chart', 'count');
    getPeopleChartData(incomingData.results, 'left-chart', 'left');
    getPeopleChartData(incomingData.results, 'right-chart', 'right');
  }


  if(Math.random() < 0.5) {
    incomingData.position = 'top';
  } else {
    incomingData.position = 'bottom';
  }
  //updateSensorOnlineChartData(incomingData);

  var selectedDate = new Date(incomingData.datetime);

  //test
  targetDate = selectedDate;
  if (document.body.classList.contains('synco-online') && selectedDate.getTime() === targetDate.getTime()) {
    updatePeopleOnlineChartData(incomingData.results);
  }
});

socket.on('syncoSensorData', function(incomingData) {
  updateSensorOnlineChartData(incomingData);
});

/*
socket.on('syncoPeopleData', function(incomingData) {
  var select = document.getElementById("selectDates");
  if (select.value === incomingData.datetime) {
    getPeopleChartData(incomingData.results, 'people-chart', 'count');
    getPeopleChartData(incomingData.results, 'left-chart', 'left');
    getPeopleChartData(incomingData.results, 'right-chart', 'right');
  }

  if (document.body.classList.contains('synco-online') && Date.parse(incomingData.datetime)) {
  }
});
*/