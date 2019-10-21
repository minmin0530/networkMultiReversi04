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
var fieldOwner = [];
var players = [];
var fieldNumberArray = [];
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
      'fieldNumberArray': fieldNumberArray,
      'field': field
    };
    io.sockets.connected[socket.id].emit("getName", {value: getNameData});
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
        io.sockets.to(data.value.fieldNumber).emit("put", {value:d});
    });

    // テーブルのオーナー作成者を決める
    socket.on("fieldOwner", function(data) {
      let i = 0;
      let existFlag = true;
      for (const fn of fieldNumberArray) {
        if (fn == 3) {
          fieldNumberArray[i] = 1;
          fieldOwner[i] = data.fieldOwner;
          existFlag = false;
          break;
        }
        ++i;
      }
      if (existFlag) {
        fieldNumberArray.push(1);
        fieldOwner[fieldNumberArray.length - 1] = data.fieldOwner;
      }
      players.push(data.fieldOwner);
      if (existFlag) {
        socket.join(fieldNumberArray.length - 1);
        io.sockets.connected[socketID[ fieldOwner[fieldNumberArray.length - 1] ]].emit("currentTable", fieldNumberArray.length - 1);      
      } else {
        socket.join(i);
        io.sockets.connected[socketID[ fieldOwner[i] ]].emit("currentTable", i);
      }
    });

    // 既にあるテーブルへ参加する
    socket.on("join", function(data) {
      let sameFlag = false;
      for (const player of players) {
        if (player == data.myName) {
          sameFlag = true;
        }
      }
      if (sameFlag == false) {
        players.push(data.myName);
      }

      const joinData = {
        number: players.length
      };
      socket.join(data.fieldNumber);
      io.sockets.connected[socketID[ fieldOwner[data.fieldNumber] ]].emit("join", joinData);
    });

    // ゲーム開始
    socket.on("startGame", function(data) {
      if (fieldNumberArray[data] == 1) {
        fieldNumberArray[data] = 2;
      }

      io.sockets.emit("startGame", data);
    });

    // 離脱
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