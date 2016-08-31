var express = require("express");
var app = express();
var http = require('http').Server(app);
var https = require("https");
var io = require('socket.io')(http);
var path = require("path");

 var myGraphObject=    {
      theme: "theme2",
      title:{
        text: "STOCKS",
        fontColor: "#999",
      },
      zoomEnabled: true,
       toolTip:{
        enabled: true,
        shared: true 
     
      },
      backgroundColor: "#333",
      animationEnabled: true,
      axisX: {
        valueFormatString: "MMM'YY",
        interval:30,
        intervalType:"day"
        
      },
      axisY:{
        includeZero: false,
        valueFormatString:"# '%'",

      },
      data: []
    };

http.listen(process.env.PORT,process.env.IP, function(){
  console.log('listening on *:'+process.env.IP+":"+process.env.PORT);
});

app.use(express.static(path.resolve(__dirname, 'views')));
app.set('view engine', 'ejs');

app.get('/', function(req, res){
          res.render("index", {
              graphObj: myGraphObject
        });
});

io.on('connection', function(socket){
   console.log('a user connected');
   socket.on('disconnect', function(){
        console.log('user disconnected');
    });
    socket.on('submit', function(msg){
        var msgflag = false;
        for(var j = 0;j<myGraphObject.data.length;j++){
            if(myGraphObject.data[j].name == msg.trim().toUpperCase()){
                        msgflag=true;
                        break;
                     }
                 }
        if(msgflag){
            io.emit('submit',"existing");
        }else{
            retrieveStock(msg.trim().toUpperCase());
        }
     });
  socket.on("close",function(msg) {
      myGraphObject.data = myGraphObject.data.filter(function(element){
              return element.name !== msg;
      });
       io.emit('data',myGraphObject);
       io.emit("remove",msg);
  });
});


function retrieveStock(input){
    var url = "https://www.quandl.com/api/v3/datasets/WIKI/"+input+".json?api_key="+process.env.QAPIKEY;

    var myDate = new Date();
    var lastYear = myDate.getFullYear()-1+"-"+("0" + myDate.getMonth()).slice(-2)+"-"+("0" + myDate.getDate()).slice(-2);

    https.get(url, function(res) {
            console.log(`Got response: ${res.statusCode}`);
            var body =[];
            
            res.on('data', function(d) {
                body += d;
            });
            
            res.on('end', function() {
                var parsed = JSON.parse(body);
                if( "dataset" in parsed){
                    var i = 0;
                    var myDataArr =[];

                    do {
                         var temp  = new Date(parsed.dataset.data[i][0]);
                          myDataArr.push({"x": temp.valueOf(), "y":parsed.dataset.data[i][1]});
                          i++;
                    }while(parsed.dataset.data[i][0] >= lastYear);

                    myGraphObject.data.push({
                        type: "spline",
                        markerType: "none",
                        xValueType: "dateTime",
                        name:input,
                        myFullName:parsed.dataset.name,
                        dataPoints:myDataArr
                     });
                   io.emit('data',myGraphObject);
                   io.emit('submit', parsed.dataset.name);       
                 
                }else{
                    io.emit('submit',"not found");
                }

          });
                    
        res.resume();
        
    }).on('error', function (e) {
                console.log(`Got error: ${e.message}`);
          });
}
