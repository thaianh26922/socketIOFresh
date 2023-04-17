// build server, khai báo sử dụng socket io
var express = require("express");
var bodyParser = require("body-parser");
var app = express();
var path = require('path');
var fs = require('fs');
app.use(bodyParser.json({ limit: "50mb" }));
app.use(
  bodyParser.urlencoded({
    limit: "50mb",
    extended: true,
    parameterLimit: 50000,
  })
);
app.use(express.static("public"));
app.set("view engine", "ejs");
app.set("views", "./views");

var server = require("https").createServer(
  {
    pfx: fs.readFileSync(path.join(__dirname, 'cert', 'latest.pfx'))
  }, app);
var io = require("socket.io")(server, {
  cors: {
    origin: [
      "http://localhost:4200",
      "http://localhost",
      "ionic://localhost",
      "http://127.0.0.1:3000",
      "https://notepad.metalearn.vn",
    ],
    methods: ["GET", "POST"],
  },
  maxHttpBufferSize: 1e8,
});
var listRoom = {};
let i = 0;
var drawData = {};
var layer = {};
var layerStorage = {};
var currentCanvasColor = "#fff";
var quiz = {};

io.on("connection", (socket) => {
  socket.on("PUB_RELOAD_REF_META", (data) => {
    console.log("PUB_RELOAD_REF_META");
    socket.broadcast.emit("SUB_RELOAD_REF_META", data);
  });
  socket.on("PUB_RELOAD_WORKING_SCHEDULE", (data) => {
    console.log("PUB_RELOAD_WORKING_SCHEDULE");
    socket.broadcast.emit("SUB_RELOAD_WORKING_SCHEDULE", data);
  });
  socket.on("PUB_RELOAD_COM_SMART", (data) => {
    console.log("PUB_RELOAD_COM_SMART");
    socket.broadcast.emit("SUB_RELOAD_COM_SMART", data);
  });
  socket.on("PUB_RELOAD_GEN_SMART", (data) => {
    console.log("PUB_RELOAD_GEN_SMART");
    socket.broadcast.emit("SUB_RELOAD_GEN_SMART", data);
  });
  socket.on("PUB_RELOAD_QA_BOARDCARD", (data) => {
    console.log("PUB_RELOAD_QA_BOARDCARD");
    socket.broadcast.emit("SUB_RELOAD_QA_BOARDCARD", data);
  });
  socket.on("PUB_RELOAD_STUDENT_META", (data) => {
    console.log("PUB_RELOAD_STUDENT_META");
    socket.broadcast.emit("SUB_RELOAD_STUDENT_META", data);
  });

  console.log("~ User connection", socket.id);

  socket.on("listRoom", () => {
    try {
      console.log("🚀 ~ listRoom", listRoom);
      socket.emit("listRoom", Object.values(listRoom));
    } catch (error) {
      socket.emit("errorSocket", { msg: error.message, at: "list Room" });
      console.log(`  ~ error`, error);
    }
  });

  socket.on("createRoom", (data) => {
    try {
      console.log(`  ~ "createRoom", (data)`, data);
      const { roomName, userCreate } = data;
      listRoom[roomName] = {
        ...data,
        socketIDUserCreate: socket.id,
        member: [
          {
            username: userCreate,
            role: "master",
            socketID: socket.id,
            roomName,
          },
        ],
      };
      socket.broadcast.emit("listRoom", Object.values(listRoom));
      // console.log(`  ~ socket.id`, socket.id)
    } catch (error) {
      socket.emit("errorSocket", { msg: error.message, at: "create Room" });
      console.log(`  ~ error`, error);
    }
  });

  socket.on("initSmartworkRoom", function (data) {
    try {
      const roomName = `Smart Work ${data.id}`;
      console.log(`  ~ "initSmartworkRoom"`, listRoom);
      const isDrawing = data.role === "master" ? true : false;
      const haveDrawingPermission = data.role === "master" ? true : false;
      if (!Object.keys(listRoom).some((room) => room === roomName)) {
        listRoom[roomName] = {
          roomName,
          userCreate: data.userId,
          // ...data,
          socketIDUserCreate: socket.id,
          member: [
            {
              username: data.userId,
              displayName: data.displayName,
              role: data.role,
              socketID: socket.id,
              roomName,
              isDrawing: isDrawing,
              haveDrawingPermission: haveDrawingPermission,
              isHidden: false,
              isHibernate: false,
            },
            {
              username: "bot",
              displayName: `bot ${roomName}`,
              role: "user",
              socketID: null,
              roomName,
              isDrawing: false,
              haveDrawingPermission: false,
              isHidden: true,
              isHibernate: false,
            },
          ],
        };
        socket.broadcast.emit("listRoom", Object.values(listRoom));
        // console.log(`  ~ socket.id`, socket.id)
      }
      socket.join(roomName);
      const checkUser = listRoom[roomName]?.member
        .map((user) => user.username)
        .flat()
        .filter((item) => item === data.userId);
      const checkDrawingPermission = listRoom[roomName]?.member.filter(
        (x) => x.username === "bot" && x.haveDrawingPermission
      );

      if (checkUser.length === 0)
        listRoom[roomName].member.push({
          username: data.userId,
          displayName: data.displayName,
          role: data.role,
          socketID: socket.id,
          roomName: roomName,
          isDrawing: isDrawing,
          haveDrawingPermission:
            checkDrawingPermission !== null &&
            checkDrawingPermission.length > 0,
          isHidden: false,
          isHibernate: false,
        });
      else
        listRoom[roomName].member
          .filter((x) => x.username === data.userId)
          .forEach(
            (x) =>
              (x.haveDrawingPermission =
                checkDrawingPermission !== null &&
                checkDrawingPermission.length > 0)
          );
    } catch (error) {
      socket.emit("errorSocket", { msg: error.message, at: "create Room" });
      console.log(`  ~ error`, error);
    }
  });

  socket.on("hibernate", (room) => {
    console.log("hibernate", socket.id);
    const listUpdate = listRoom[room].member.filter(
      (x) => x.socketID === socket.id
    );
    listUpdate.forEach((element) => {
      element.isHibernate = true;
    });
    socket.removeAllListeners("drawing");
    socket.removeAllListeners("fetch-data-request");
    socket.removeAllListeners("disconnect");
    socket.removeAllListeners("mousemove");
    socket.removeAllListeners("deleteObject");
    socket.removeAllListeners("update");
    socket.removeAllListeners("updated");
    socket.removeAllListeners("color");
    socket.removeAllListeners("changeBgColor");
    socket.removeAllListeners("changeGrid");
    socket.removeAllListeners("changefont");
    socket.removeAllListeners("changesize");
    socket.removeAllListeners("selectObjMousedown");
    socket.removeAllListeners("connected");
    socket.removeAllListeners("connect-objects");
  });

  socket.on("wake", ({ room, userID }) => {
    console.log("wake", userID);
    const listUpdate = listRoom[room].member.filter(
      (x) => x.username === userID && x.isHibernate
    );
    listUpdate.forEach((element) => {
      element.isHibernate = false;
      element.socketID = socket.id;
    });
  });

  socket.on("validateLoginRoom", ({ room, userID }) => {
    try {
      console.log("🚀 ~ validateLoginRoom { room, userID }", { room, userID });
      let isCheckLoginJoinRoom = false;
      // console.log('room',room)
      const { userCreate, socketIDUserCreate } = listRoom[room];
      const socketIDUser = socket.id;
      // console.log(`  ~ socketIDUser`, socketIDUser)
      if (room === "Smart Work") {
        // socket.join(room);
        // socket.to(`${socketIDUser}`).emit("resultJoinRoom", data);
        return;
      } else if (userCreate !== userID) {
        socket
          .to(`${socketIDUserCreate}`)
          .emit("loginRoom", { room, userID, socketIDUser });
        console.log(`checkLoginRoom`);
      } else {
        isCheckLoginJoinRoom = true;
      }
    } catch (error) {
      socket.emit("errorSocket", {
        msg: error.message,
        at: "validate Login Room",
      });
      // console.log(`  ~ error2`, error)
    }
  });

  socket.on("resultJoinRoom", (data) => {
    try {
      // console.log(`  ~ resultJoinRoom`, data);
      const { joinRoom, socketIDUser, room, userID } = data;
      socket.to(`${socketIDUser}`).emit("resultJoinRoom", data);
      // socket.to(`${socketIDUser}`).emit("fetch-data-to-client", { drawData: drawData[room], layer: layer[room], layerStorage: layerStorage[room] });
      // socket.to(`${socketIDUser}`).emit("fetch-quiz", quiz[room]);
      if (joinRoom) {
        // console.log(`  ~ joinRoom`, joinRoom)
        // const indexRoom = listRoom.map((item) => item.roomName).indexOf(room);
        listRoom[room].member.push({
          username: userID,
          role: "user",
          socketID: socketIDUser,
          roomName: room,
        });
        socket.join(room);
      }
    } catch (error) {
      socket.emit("errorSocket", {
        msg: error.message,
        at: "result foin room",
      });
      console.log(`  ~ error`, error);
    }
  });

  socket.on("reloadMembers", (room) => {
    console.log(`reloadMembers ${room}`);
    if (listRoom[room]) {
      listRoom[room].member.forEach((element) => {
        console.log("member:", element);
      });
      io.in(room).emit("reloadMembers", listRoom[room].member);
    } else {
      io.in(room).emit("reloadMembers", []);
    }
  });

  socket.on("updateMember", ({ room, userID, memberChange }) => {
    console.log("updateMember", memberChange);
    const listUpdate = listRoom[room].member.filter(
      (x) => x.username === userID
    );
    listUpdate.forEach((element) => {
      element.isDrawing = memberChange.isDrawing;
      element.haveDrawingPermission = memberChange.haveDrawingPermission;
      element.role = memberChange.role;
    });
    socket.emit("updateMemberSuccess");
  });

  socket.on("togglePermissionAll", ({ room, value }) => {
    console.log("togglePermissionAll", value);
    const listUpdate = listRoom[room].member;
    listUpdate.forEach((element) => {
      element.haveDrawingPermission = value;
    });
    socket.emit("updateMemberSuccess");
  });

  socket.on("joinRoom", ({ room, userID, isWeb }) => {
    i++;
    console.log(i);

    if (!room) return;
    // not used
    // const checkUser = listRoom[room]?.member
    //    .map((user) => user.username)
    //    .flat()
    //    .filter((item) => item === userID);

    if (isWeb) socket.join(room);
    //end not used
    let role = "user";
    const checkMaster = listRoom[room]?.member.filter(
      (item) => item.username === userID && item.role === "master"
    );
    if (checkMaster && checkMaster.length > 0) role = "master";

    if (!drawData[room]) drawData[room] = [];

    if (!layer[room]) layer[room] = 1;
    if (!layerStorage[room])
      layerStorage[room] = [
        {
          id: 1,
          canvas: {
            backgroundColor: "#ffffff",
            gridObj: null,
          },
        },
      ];

    if (!quiz[room]) quiz[room] = {};

    socket.on("drawing", (canvasJson) => {
      console.log(`  ~ socket id drawing`, socket.id);
      // const roomItem = listRoom[room];
      // if (roomItem.userCreate != userID) return;
      // if (listRoom[room].userCreate != userID) return;
      console.log(`🚀 ~ drawing ${room}`);
      if (drawData[room]) drawData[room].push(canvasJson);
      // console.log('drawing',canvasData);
      socket.broadcast.to(room).emit("drawing", canvasJson);
    });

    socket.on("fetch-data-request", (room) => {
      // console.log("🚀 ~ room, drawData[room]", room,drawData[room])
      console.log("fetch-data-request", socket.id, drawData);
      socket.emit("fetch-data-to-client", {
        drawData: drawData[room],
        layer: layer[room],
        layerStorage: layerStorage[room],
        role: role,
      });
    });

    socket.on("addLayer", function (data) {
      // if (listRoom[room].userCreate != userID) return;
      layer[room]++;
      layerStorage[room].push({
        id: layer[room],
        canvas: {
          backgroundColor: "#ffffff",
          gridObj: null,
        },
      });
      socket.broadcast.to(room).emit("addLayer", data);
      // socket.to(room).emit("addLayer", data);
    });

    socket.on("deleteLayer", function (data) {
      // if (listRoom[room].userCreate != userID) return;
      layerStorage[room] = layerStorage[room].filter(
        (item) => item.id !== data.id
      );
      console.log("delete layer", layerStorage[room], data);
      drawData[room] = drawData[room].filter((item) => item.layer !== data.id);
      socket.broadcast.to(room).emit("deleteLayer", data);
    });

    socket.on("clearEvent", () => {
      console.log("clear all event");
      const checkMasterOther = listRoom[room]?.member.filter(
        (item) => item.username !== userID && item.role === "master"
      );
      if (checkMasterOther && checkMasterOther.length < 1) {
        delete listRoom[room];
        delete layer[room];
        delete layerStorage[room];
        delete drawData[room];
        delete quiz[room];
        io.in(room).emit("reloadMembers", []);

        console.log(`  ~ socket disconnect`, listRoom);
        socket.broadcast.to(room).emit("exitRoom", {
          room,
        });
      } else {
        io.in(room).emit(
          "reloadMembers",
          listRoom[room]?.member.filter((item) => item.socketID !== socket.id)
        );
      }
    });

    socket.on("disconnect", function (data) {
      console.log("clear all event");
      const checkHibernate = listRoom[room]?.member.filter(
        (item) => item.username === userID && item.isHibernate
      );
      if (checkHibernate && checkHibernate.length < 1) {
        const checkMasterOther = listRoom[room]?.member.filter(
          (item) => item.username !== userID && item.role === "master"
        );
        if (checkMasterOther && checkMasterOther.length < 1) {
          delete listRoom[room];
          delete layer[room];
          delete layerStorage[room];
          delete drawData[room];
          delete quiz[room];
          io.in(room).emit("reloadMembers", []);

          console.log(`  ~ socket disconnect`, listRoom);
          socket.broadcast.to(room).emit("exitRoom", {
            room,
          });
        } else {
          io.in(room).emit(
            "reloadMembers",
            listRoom[room]?.member.filter((item) => item.socketID !== socket.id)
          );
        }
      }
    });

    socket.on("suonacamp", function (data) {
      socket.broadcast.to(data.room).emit("suonacampser", data);
    });

    // Start listening for mouse move events
    socket.on("mousemove", function (data) {
      socket.broadcast.to(room).emit("moving", data);
    });

    socket.on("salvasulserver", function (data) {
      //	var object = { foo: data.dataserver };
      var datidalclient = data.dataserver.replace(
        /^data:image\/\w+;base64,/,
        ""
      );
      var buf = new Buffer(datidalclient, "base64");
      //var string = 'scrivo qualche cosa';
      var req = client.put(data.orario + ".png", {
        "Content-Length": buf.length,
        "Content-Type": "image/png",
      });
      req.on("response", function (res) {
        if (200 == res.statusCode) {
          // console.log('saved to %s', req.url);
        }
      });
      req.end(buf);
    });

    socket.on("doppioclick", function (data) {
      // This line sends the event (broadcasts it)
      // to everyone except the originating client.
      socket.broadcast.to(data.room).emit("doppioclickser", data);
    });

    socket.on("generate-signature", (obj) => {
      var signature = generateSignature(
        obj.apiKey,
        obj.apiSecret,
        obj.meetingNumber,
        obj.role
      );
      socket.emit("generate-signature-to-client", signature);
    });

    socket.on("init-zoom", (user) => {
      console.log("init-zoom");
      socket.broadcast.to(room).emit("init-zoom-to-client", user);
    });

    socket.on("join-zoom", (user) => {
      console.log("join-zoom");
      socket.broadcast.to(room).emit("join-zoom-to-client", user);
    });

    socket.on("zoom-full-screen", (user) => {
      console.log("zoom-full-screen");
      socket.broadcast.to(room).emit("full-screen-to-client", user);
    });

    socket.on("chat", function (data) {
      // This line sends the event (broadcasts it)
      // to everyone except the originating client.
      socket.broadcast.to(data.room).emit("chatser", data);
    });
    socket.on("fileperaltri", function (data) {
      // This line sends the event (broadcasts it)
      // to everyone except the originating client.
      socket.broadcast.to(data.room).emit("fileperaltriser", data);
    });

    //socket.on('rubber', async function (data) {
    //socket.broadcast.emit('rubberser', data);
    //const indexDelete = await drawData.findIndex((item) => item.data.objectID === data);
    //console.log(indexDelete);
    //await drawData.splice(indexDelete, 1);
    //socket.broadcast.emit('update', drawData);
    //});

    socket.on("deleteObject", function (data) {
      deleteObjInPool(data.objectID, drawData[room], data.layer);
      socket.broadcast.to(room).emit("deleteObject", data);
    });

    socket.on("pathMoving", function (data) {
      drawData[room].forEach((o) => {
        if (o.objectID === data.objectID) {
          o.data.isMoving = data.moving;
        }
      });
      socket.broadcast.to(room).emit("pathMoving", data);
    });

    socket.on("update", function (data) {
      console.log(`  ~ update`);
      drawData[room] = data;
      socket.broadcast.to(room).emit("update", data);
    });

    socket.on("updated", function (data) {
      console.log(`  ~ updated`);
      if (data.objectID) {
        updateObjectByID(drawData[room], data);
      }
      socket.broadcast.to(room).emit("updated", data);
    });

    socket.on("color", function (data) {
      currentCanvasColor = data;
      socket.broadcast.to(room).emit("canvasColor", data);
    });

    socket.on("changeBgColor", function (data) {
      layerStorage.forEach((item) => {
        if (item.id === data.id) {
          item.canvas.backgroundColor = data.backgroundColor;
        }
      });
      socket.broadcast.to(room).emit("changeBgColor", data);
    });

    socket.on("changeGrid", function (data) {
      layerStorage.forEach((item) => {
        if (item.id === data.id) {
          item.canvas.gridObj = data.gridObj;
        }
      });
      socket.broadcast.to(room).emit("changeGrid", data);
    });

    socket.on("loadData", function (data) {
      layer[room] = data.layerNum;
      layerStorage[room] = data.layerStorage;
      drawData[room] = data.pool_data;
      socket.broadcast.to(room).emit("loadData", data);
    });

    socket.on("video", function (data) {
      console.log("data video", data);
      socket.broadcast.to(room).emit("video", data);
    });

    socket.on("changefont", function (data) {
      console.log("data changefont", data);
      socket.broadcast.to(room).emit("changefont", data);
    });

    socket.on("changesize", function (data) {
      socket.broadcast.to(room).emit("changesize", data);
    });

    socket.on("camperaltri", function (data) {
      socket.broadcast.to(room).emit("camperaltriser", data);
      //.to(data.room)
    });

    // quiz
    socket.on("changeQuizType", function (data) {
      quiz[room].quizType = data.quizType;
      socket.broadcast.to(room).emit("changeQuizType", data);
    });

    socket.on("loadQuiz", function (data) {
      quiz[room].data = data;
      quiz[room].isCreateQuiz = true;
      socket.broadcast.to(room).emit("loadQuiz", data);
    });

    socket.on("createQuiz", function (data) {
      quiz[room].question = data;
      quiz[room].isCreateQuiz = true;
      socket.broadcast.to(room).emit("createQuiz", data);
    });

    socket.on("answerQuiz", function (data) {
      quiz[room] = {
        ...quiz[room],
        ...data,
      };
      socket.broadcast.to(room).emit("answerQuiz", data);
    });

    socket.on("viewAnswerQuiz", function (data) {
      quiz[room] = {
        ...quiz[room],
        ...data,
      };
      socket.broadcast.to(room).emit("viewAnswerQuiz", data);
    });

    socket.on("doQuiz", function (data) {
      quiz[room] = {
        ...quiz[room],
        ...data,
      };
      socket.broadcast.to(room).emit("doQuiz", data);
    });

    socket.on("checkQuiz", function (data) {
      quiz[room] = {
        ...quiz[room],
        ...data,
      };
      socket.broadcast.to(room).emit("checkQuiz", data);
    });

    socket.on("selectObjMousedown", function (data) {
      quiz[room].correctAnswers = data.correctAnswers;
      quiz[room].userAnswers = data.userAnswers;
      socket.broadcast.to(room).emit("selectObjMousedown", data);
    });

    socket.on("inputObjEdit", function (data) {
      quiz[room].correctAnswers = data.correctAnswers;
      quiz[room].userAnswers = data.userAnswers;
      socket.broadcast.to(room).emit("inputObjEdit", data);
    });

    socket.on("dndItem", function (data) {
      socket.broadcast.to(room).emit("dndItem", data);
    });

    socket.on("setBgImg", function (data) {
      socket.broadcast.to(room).emit("setBgImg", data);
    });

    socket.on("objVessel", function (data) {
      socket.broadcast.to(room).emit("objVessel", data);
    });

    socket.on("connected", function (data) {
      console.log("connected", data);
      drawData[room].push(data);
      socket.broadcast.emit("connecter", data);
    });

    socket.on("connect-objects", function (data) {
      //console.log(data)
      socket.broadcast.emit("connect-objects", data);
    });

    socket.on("change-coordinate-line-connect", function (data) {
      socket.broadcast.emit("change-coordinate-line-connect", data);
    });

    socket.on("onOffName", function (data) {
      turnOnOffUsernamePoolData(data.userID, drawData[room], data.name);
      socket.broadcast.emit("onOffName", data);
    });

    socket.on("ready888", function (data) {
      // console.log('ready888', data);
      socket.broadcast.emit("callback888", data);
      console.log("🚀 ~ ready888");
    });
    socket.on("initDataNotepad", function (data) {
      console.log("initDataNotepad", data);
      socket.broadcast.emit("callbackNotepad", data);
    });
  });

  socket.on("clearEvent", () => {
    console.log("clear all event");
    socket.removeAllListeners("drawing");
    socket.removeAllListeners("fetch-data-request");
    socket.removeAllListeners("disconnect");
    socket.removeAllListeners("mousemove");
    socket.removeAllListeners("deleteObject");
    socket.removeAllListeners("update");
    socket.removeAllListeners("updated");
    socket.removeAllListeners("color");
    socket.removeAllListeners("changeBgColor");
    socket.removeAllListeners("changeGrid");
    socket.removeAllListeners("changefont");
    socket.removeAllListeners("changesize");
    socket.removeAllListeners("selectObjMousedown");
    socket.removeAllListeners("connected");
    socket.removeAllListeners("connect-objects");
  });

  socket.on("disconnect", function (data) {
    console.log("~ user disconnect", data);
    socket.removeAllListeners("drawing");
    socket.removeAllListeners("fetch-data-request");
    socket.removeAllListeners("disconnect");
    socket.removeAllListeners("mousemove");
    socket.removeAllListeners("deleteObject");
    socket.removeAllListeners("update");
    socket.removeAllListeners("updated");
    socket.removeAllListeners("color");
    socket.removeAllListeners("changeBgColor");
    socket.removeAllListeners("changeGrid");
    socket.removeAllListeners("changefont");
    socket.removeAllListeners("changesize");
    socket.removeAllListeners("selectObjMousedown");
    socket.removeAllListeners("connected");
    socket.removeAllListeners("connect-objects");
  });
});

server.listen(16013);
console.log("Server - Waiting connection at port: 16013");

function updateObjectByID(pool_data, data) {
  var index = pool_data.findIndex((item) => item.objectID == data.objectID);
  if (index >= 0) {
    if (data.moving) {
      Object.keys(data.dataChange).forEach((key) => {
        pool_data[index].data[key] = data.dataChange[key];
      });
    } else {
      pool_data[index].data = data.dataChange;
    }
  }
}

function deleteObjInPool(data, pool_data) {
  const indexDelete = pool_data.findIndex((item) => item.objectID === data);
  console.log("indexDelete", indexDelete);
  pool_data.splice(indexDelete, 1);
}

function randomID() {
  return "_" + Math.random().toString(36).substr(2, 9);
}

function turnOnOffUsernamePoolData(userID, pool_data, name) {
  for (let i = 0; i < pool_data.length; i++) {
    if (pool_data[i].userID == userID) {
      if (pool_data[i].data.objects.length > 2) {
        pool_data[i].data.objects[2].text = name;
      } else {
        pool_data[i].data.objects[1].text = name;
      }
    }
  }
}
