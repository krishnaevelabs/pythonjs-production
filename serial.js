// bugs noticed 
// other serial prints might cause issues, filter out them before doing any actions.

/*
Function Tree
    --routetoDevice (identify type of device)
      --StateUpdateDevice (Identify states from message)
        --DeviceStates (populateStates)
*/

//<V1>B894857495549162611-V1-C/D/A/blue-B101-1-71

var dripos = [{
  "id": "D222949140",
  "name": "D1"
},
{
  "id": "D222949141",
  "name": "D2"
},
{
  "id": "D222949142",
  "name": "D3"
},
]

var callbutton = [{
  "id": "B222949143",
  "name": "B1",
  "location": "Bed"
},
{
  "id": "B222949146",
  "name": "B2",
  "location": "Bathroom"
},
{
  "id": "B222949148",
  "name": "B3",
  "location": "Bathroom"
},
{
  "id": "B89485749554916250",
  "name": "B3",
  "location": "Bathroom"
},{
  "id":"B89485749554916243",
  "name":"Bed 30",
  "location":"KSUM"
}
]



function populateDripos() {
  dripos.forEach(iterateDripo);
  function iterateDripo(item) {
    var html = $("#dripoStatusTemplate").html();
    html = $.parseHTML(html)
    $.each(html, function (i, el) {
      if (el.id == "dripoRoot")
        el.classList.add(item.id);
    });
    $("#dripoStatus").append(html);
    //baseStateDripo(item.id);
    $("." + item.id + " .rate").html(item.name);
    $("." + item.id + " .unit").html("Offline");
    $("." + item.id + " .bed").html("");
    $("." + item.id + " .time").html(item.id);
    $("." + item.id + " .volume").html("");
    $("." + item.id + " .volStatusBar").css('width', "0px");
    $("." + item.id + " .volCard").css('display', "none");
    $("." + item.id + " .volStatusBar").removeClass("blink_me");
    $("." + item.id + " .volStatusBar").css('display', "none");
    $("." + item.id + " .action").css("display", "none");
  }
}

function populateCallbutton() {
  callbutton.forEach(iterateCallbutton);

  function iterateCallbutton(item) {
    var html = $("#callButtonTemplate").html();
    html = $.parseHTML(html)
    $.each(html, function (i, el) {
      if (el.id == "callButtonRoot")
        el.classList.add(item.id);
    });
    $("#patientCall").append(html);

    $("." + item.id + "#callButtonRoot").css('display', 'none')
    //baseStateDripo(item.id);


  }
}

populateDripos();
populateCallbutton()

let ws
start("ws://0.0.0.0:5678/")
function start(websocketServerLocation){
ws = new WebSocket(websocketServerLocation)
ws.onmessage = function (event) {
  routeToDeviceFn(event.data);
  // console.log(event.data)



};
ws.onclose = function(){
  setTimeout(function(){
    start("ws://0.0.0.0:5678/")
    
},5000)
}
}
function getIndexDripo(dripodeviceid) {
  const index = dripos.findIndex(item => item.id === dripodeviceid);
  
  return index

}
function getDripoSoundAlert(deviceid){
  if(dripos[getIndexDripo(deviceid)].acked == true)
    music.pause()
    else
    music.play()

  
}
function routeToDeviceFn(value) {
  const dataArr = value.split("-");

  let countData= value.split("-").length-1
  // console.log(dataArr, "dataarr",countData)

  if (dataArr.length > 1 && (countData == 11 || countData == 5)) {
    var device = dataArr[0].split(">");
    if (device.length > 1) {
      var devType = device[1].substr(0, 1)
      var devID = device[1];
    } else {
      var devType = device[0].substr(0, 1)
      var devID = device[0];
    }
    if (devType == 'D') {
      // console.log("dripo")
      // dripo = dripos.find(dripo => dripo.id === devID);
      if (getIndexDripo(devID)>=0)
        stateUpdateDripo(dataArr);
    } else if (devType == 'B') {
      stateNurseCall(dataArr);
    }
  }
}

const music = new Audio('./drugmed.wav');
function stateUpdateDripo(message) {

  /* states
             -- baseStateDripo
             -- onStateDripo
             -- monitoringStateDripo
             -- medAlertStateDripo
             -- highAlertStateDripo
    Serial Msg types
    
            -- ACK - DID-ACK len=2
            -- ON/OFF - DID-V2-ON len=3
            -- STATUSMSH - DID------- Len=12
  */

  //get Device ID Split <>
  var deviceid = message[0].split(">");
  var deviceid = deviceid[1];
  wsDelaySend("* none *"+deviceid + "-ack");
  //discard ack msg ny using condition len>2
  if (message.length > 3) {
    //Assiging Values
    // console.log(message);
    baserRate = message[7];
    dpf = message[5];
    unit = unit_convert(message[4]);
    function unit_convert(num) {
      if (num == 1)
        return "dpm"
      else
        return "ml/hr"
    }
    if (unit == 'dpm')
      rate = message[6] / 60 * dpf;
    else
      rate = message[6];
    status = message[2];
    bed = message[3];
    infusedVol = message[8];
    totalVol = message[9];
    battery = message[10];
    volPercentage = Math.ceil(infusedVol / totalVol * 100);
    timeRemaining = totalVol / rate * 60;
    function time_convert(num) {
      var hours = Math.floor(num / 60);
      var minutes = Math.ceil(num % 60);
      return "<b>" + hours + "h " + minutes + "mts</b> remaining";
    }
    timeRemainingText = time_convert(timeRemaining)

    //routing to stateFunctions
    if (status == "I") {
      monitoringStateDripo(deviceid)
    } else if (status == "B") {
      getDripoSoundAlert(deviceid)
      $("." + deviceid + " .rate").html("Flow Error");
      highAlertStateDripo(deviceid);
    } else if (status == "P") {
      $("." + deviceid + " .rate").html("Infusion Paused");
      medAlertStateDripo(deviceid);
    } else if (status == "C") {
      getDripoSoundAlert(deviceid)
      $("." + deviceid + " .rate").html("Infusion Ending Soon");
      highAlertStateDripo(deviceid);
    } else if (status == "E") {
      music.play()
      $("." + deviceid + " .rate").html("Infusion Ended");
      highAlertStateDripo(deviceid);
    } else if (status == "X") {
      baseStateDripo(deviceid);
    }
  }
}

function monitoringStateDripo(deviceid) {
  resetAlertDripo(deviceid);
  if (baserRate == 0){
    $("." + deviceid + " .rate").html(rate);
    music.play();
  }
    
  else{
    dripos[getIndexDripo(deviceid)].acked = false

    $("." + deviceid + " #action").text('ACKNOWLEDGE').css('color', '#F31D1DAB')  
    $("." + deviceid + " .rate").html(rate + "/" + baserRate);
  $("." + deviceid + " .unit").html(unit);
  $("." + deviceid + " .bed").html(bed);
  $("." + deviceid + " .time").html(timeRemainingText);
  $("." + deviceid + " .volume").html("<b>" + infusedVol + "/" + totalVol + "ml</b> Infused");  
  $("." + deviceid + " .volStatusBar").css('width', volPercentage + "%");
  $("." + deviceid + " .volCard").css('display', "block");
  $("." + deviceid + " .volStatusBar").css('display', "block");
  $("." + deviceid + " .volStatusBar").removeClass("blink_me");
  $("." + deviceid + " .action").css("display", "none");
  $("." + deviceid + " .volCard").css('display', "block");
  if(battery <= 20){
    $("." + deviceid + " .battery").html("Battery: "+battery + "%").css('color','red');
  }else{
    $("." + deviceid + " .battery").html("Battery: "+battery + "%").css('color','black');

  }
}
}

function baseStateDripo(deviceid) {
  resetAlertDripo(deviceid);
  dripo = dripos.find(dripo => dripo.id === deviceid);
  //console.log(dripo);

  $("." + deviceid + " .rate").html(dripo.name);
  $("." + deviceid + " .unit").html("Offline");
  $("." + deviceid + " .bed").html("");
  $("." + deviceid + " .time").html(deviceid);
  $("." + deviceid + " .volume").html("");
  $("." + deviceid + " .volStatusBar").css('width', "0px");
  $("." + deviceid + " .volCard").css('display', "none");
  $("." + deviceid + " .volStatusBar").removeClass("blink_me");
  $("." + deviceid + " .volStatusBar").css('display', "none");
  $("." + deviceid + " .action").css("display", "none");
}

function highAlertStateDripo(deviceid) {
  $("." + deviceid + " .unit").html(unit);
  $("." + deviceid + " .bed").html(bed);
  $("." + deviceid + " .time").html(timeRemainingText);
  $("." + deviceid + " .volume").html("<b>" + infusedVol + "/" + totalVol + "ml</b> Infused");
  $("." + deviceid + " .rate").css("color", "#EB5757");
  $("." + deviceid + " .action").css("display", "block");
  $("." + deviceid + " .volStatusBar").css("background-color", "#EB5757");
  $("." + deviceid + " .volStatusBar").addClass("blink_me");
  $("." + deviceid + " .volCard").css('display', "block");
  if(battery <= 20){
    $("." + deviceid + " .battery").html("Battery: "+battery + "%").css('color','red');
  }else{
    $("." + deviceid + " .battery").html("Battery: "+battery + "%").css('color','black');

  }

  $(document).on('click', "." + deviceid + ' #action', function () {

    dripos[getIndexDripo(deviceid)].acked = true
    $("." + deviceid + " #action").text('ACKNOWLEDGED').css('color', '#F2C94C')



  });
}

function medAlertStateDripo(deviceid) {
  dripos[getIndexDripo(deviceid)].acked = false
  $("." + deviceid + " #action").text('ACKNOWLEDGE').css('color', '#F31D1DAB')
  $("." + deviceid + " .unit").html(unit);
  $("." + deviceid + " .bed").html(bed);
  $("." + deviceid + " .time").html(timeRemainingText);
  $("." + deviceid + " .volume").html("<b>" + infusedVol + "/" + totalVol + "ml</b> Infused");
  $("." + deviceid + " .action").css("display", "none");
  $("." + deviceid + " .rate").css("color", "#F2C94C");
  $("." + deviceid + " .volStatusBar").css("background-color", "#F2C94C");
  $("." + deviceid + " .volStatusBar").addClass("blink_me");
  $("." + deviceid + " .volCard").css('display', "block");
  if(battery <= 20){
    $("." + deviceid + " .battery").html("Battery: "+battery + "%").css('color','red');
  }else{
    $("." + deviceid + " .battery").html("Battery: "+battery + "%").css('color','black');

  }
}


// helper functions for states dripo

function resetAlertDripo(deviceid) {
  $("." + deviceid + " .rate").css("color", "#6D7587");
  $("." + deviceid + " .volStatusBar").css("background-color", "#6202EE");
}


function sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
}

async function wsDelaySend(msg) {
    await sleep(20);
    ws.send(msg)
    ws.send(msg)
  }

function stateNurseCall(message) {
  // console.log(message,"nursecall")
   function getIndex(calldeviceid) {
    const index = callbutton.findIndex(item => item.id === calldeviceid);
    
    return index

  }
  
  

  let calldeviceid = message[0].split(">");
  calldeviceid = calldeviceid[1];
  let callStatus = message[2];
  let newCallFlag = message[4];
  let callButtonBattery =message[5]
  

  
  

  
  if (callStatus == "C" && getIndex(calldeviceid)>=0) {
    // console.log(getIndex("B223344"))
  

    //console.log("Call");
    //console.log(newCallFlag);
   // alert("ok")

    //wsDelaySend("HAI");
    if(callButtonBattery <=10)
    $("." + calldeviceid + " .callButtonBattery").html("Battery: "+callButtonBattery + "%").css('color','red');
    else
    $("." + calldeviceid + " .callButtonBattery").html("Battery: "+callButtonBattery + "%").css('color','black');

    $("." + calldeviceid + "#callButtonRoot").css('display', 'inline');
    $("." + calldeviceid + " .bedname").html(callbutton[getIndex(calldeviceid)].name);
    $("." + calldeviceid + " .location").html(callbutton[getIndex(calldeviceid)].location);
    if (callbutton[getIndex(calldeviceid)].acked == true){
      if (newCallFlag == 1){
        wsDelaySend("*"+callbutton[getIndex(calldeviceid)].name +"*"+calldeviceid + "-ack");
        callbutton[getIndex(calldeviceid)].acked = false
      $("." + calldeviceid + " #callaction").text('ACKNOWLEDGE').css('color', 'red')
     }
      else{

        wsDelaySend("* none *"+calldeviceid + "-ackT");
      $("." + calldeviceid + " #callaction").text('ACKNOWLEDGED').css('color', '#F2C94C')
     }
      
    }else{
      if (newCallFlag == 1){
    
        wsDelaySend("*"+callbutton[getIndex(calldeviceid)].name +"*"+calldeviceid + "-ack");
        // console.log("data send")

      }


      $("." + calldeviceid + " #callaction").text('ACKNOWLEDGE').css('color', 'red')
    }

    $(document).on('click', "." + calldeviceid + ' #callaction', function () {

      callbutton[getIndex(calldeviceid)].acked = true
      $("." + calldeviceid + " #callaction").text('ACKNOWLEDGED').css('color', '#F2C94C')



    });

    
  } else if (callStatus == "D" && getIndex(calldeviceid)>=0) {
    wsDelaySend("* none *"+calldeviceid + "-ack");
   //ws.send(calldeviceid + "ack")
    callbutton[getIndex(calldeviceid)].acked = false
    $("." + calldeviceid + "#callButtonRoot").css('display', 'none')

    // console.log("Cancel");
  } else if (callStatus == "A" && getIndex(calldeviceid)>=0) {
    wsDelaySend("* none *"+calldeviceid + "-ack");
    //ws.send(calldeviceid + "ack")
    callbutton[getIndex(calldeviceid)].acked = false

    $("." + calldeviceid + "#callButtonRoot").css('display', 'none')
    // console.log("Acknowledge");
  }
}
