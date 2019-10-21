var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

//アクセスに対して反応を返す。 index.htmlファイルを返しています。
app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

var userHash = {};
var watchingNumber = 0;
var socketID = [];
var field = [];
var turn = [];

//初期化（オセロ盤と順番の初期化）
for (var v = 0; v < 3; ++v) {
    var arrayY = [];
    for (var y = 0; y < 8; ++y) {
        var arrayX = [];
        for (var x = 0; x < 8; ++x) {
            arrayX.push(-1);
        }
        arrayY.push(arrayX);
    }
    field.push(arrayY);
    turn.push(0);
}


//クライアントと接続。 
io.sockets.on("connection", function (socket) {

    var name = watchingNumber;
    userHash[socket.id] = name;
    socketID.push( socket.id );
    var getNameData = {
      'name': name,
      'field': field
    };
    io.sockets.emit("getName", {value: getNameData});
    ++watchingNumber;

    // 誰かがコマを置いた処理をクライアントから受け取り
    socket.on("put", function (data) {
        field[data.value.fieldNumber][data.value.y][data.value.x] = data.value.turn;
        data.value.turn += 1;
        var d = {
          'x':data.value.x,
          'y':data.value.y,
          'turn':data.value.turn,
          'field':field[data.value.fieldNumber],
          'fieldNumber':data.value.fieldNumber
        };

        // 全員にコマを置いた処理を送信
        io.sockets.emit("put", {value:d});
    });

    socket.on("disconnect", function () {
      if (userHash[socket.id]) {
        delete userHash[socket.id];
      }
    });



});

//アクセスを待ち受け。
http.listen(8080, function(){
  console.log('listening on *:8080');
});