require('dotenv').config();
import Koa from 'koa';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import serve from 'koa-static';
import path from 'path';
import send from 'koa-send';

import https from 'https';

import Table from './models/table';
import Invoice from './models/invoice';

import api from './api';
import jwtMiddleware from './lib/jwtMiddleware';
import { create } from 'domain';

// 비구조화 할당을 통하여 process.env 내부 값에 대한 레퍼런스 만들기
const { PORT } = process.env;

mongoose
  .connect(
    'mongodb+srv://jos:' +
      encodeURIComponent('1234') +
      '@oksang.lxrnk.mongodb.net/oksang',
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
    },
  )
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((e) => {
    console.error(e);
  });

const app = new Koa();
const router = new Router();
const cors = require('@koa/cors');

// koa CORS 문제 해결
app.use(cors());

//const socketTable = new Router();

// Socket.io app 인스턴스 생성
//app.server = https.createServer(app.callback());

// app.io
//   .use((socket, next) => {
//     let error = null;

//     try {
//       let ctx = app.createContext(socket.request, new http.OutgoingMessage());
//       socket.cookies = ctx.cookies;
//       // if (!ctx.state.user) {
//       //   console.log(ctx);
//       //   ctx.status = 401; // Unauthorized
//       //   console.log('여기들옴');
//       //   return;
//       // }
//     } catch (err) {
//       error = err;
//       console.log(error);
//     }
//     return next(error);
//   })
//   .on('connection', function (socket) {
//     const token = socket.cookies.get('access_token');
//     if (!token) {
//       console.log('토크없음');
//       return;
//     } // 토큰이 없음

//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

//     // 가게 고유번호로 룸을 만들고 그안에서 해결
//     if (app.io.sockets.adapter.rooms.has(decoded.nowstore)) {
//       socket.join(decoded.nowstore);
//     } else {
//       const createRoomId = decoded.nowstore;
//       socket.join(createRoomId);
//     }

//     socket.on('getTables', async function (msg) {
//       try {
//         const tables = await Table.findByStoreId(decoded.nowstore);
//         // app.io.to().emit('getTables');

//         socket.emit('getTables', tables);
//       } catch (e) {
//         console.log('getTables err');
//         console.log(e);
//       }
//     });

//     socket.on('getOneTable', async function (tableSeq) {
//       tableSeq = tableSeq.seq;
//       const tables = await Table.findByStoreId(decoded.nowstore);

//       tables.table = tables.table[tableSeq];

//       socket.emit('getOneTable', tables);
//     });

//     socket.on('modifyTable', async function (msg) {
//       const tables = await Table.findByStoreId(decoded.nowstore);

//       const menuItem = msg.item;
//       // findIndex로도 로직설계가능 익스플로러 x
//       const nowMenu = tables.table[msg.seq].nowMenu;

//       if (msg.act === 'add') {
//         let isThere = false;
//         tables.table[msg.seq].nowMenu.filter((item) => {
//           if (item.name === menuItem.name) {
//             item.EA++;
//             item.priceSum = item.EA * item.price;
//             isThere = true;
//           }
//           return item;
//         });

//         if (!isThere) {
//           tables.table[msg.seq].nowMenu.push({
//             name: menuItem.name,
//             price: menuItem.price,
//             EA: 1,
//             priceSum: menuItem.price,
//           });
//         }
//       }

//       if (msg.act === 'subtract') {
//         tables.table[msg.seq].nowMenu = nowMenu.filter((e) => {
//           if (e.name === menuItem.name) {
//             e.EA = e.EA - 1;
//             e.priceSum = e.EA * e.price;
//           }
//           return e.EA > 0;
//         });
//       }
//       try {
//         await tables.save();
//         app.io.to(decoded.nowstore).emit('getTables', tables);
//         tables.table = tables.table[msg.seq];
//         socket.emit('getOneTable', tables);
//       } catch (error) {
//         console.log(error);
//       }
//     });

//     socket.on('paymentTable', async function (msg) {
//       if (msg.act === 'cashPay') {
//         msg.act = '현금';
//       }
//       if (msg.act === 'kakao') {
//         msg.act = '카카오페이';
//       }
//       const tables = await Table.findByStoreId(decoded.nowstore);
//       if (tables.table[msg.seq] === []) {
//         socket.emit('getPayResult', { err: 'empty' });
//         return;
//       }
//       let seq = 1;
//       const seqInvoice = await Invoice.findSeq(decoded.nowstore);
//       if (seqInvoice) {
//         seq = seqInvoice.seq + 1;
//       }
//       const invoice = new Invoice({
//         storeId: decoded.nowstore,
//         seq,
//         menu: tables.table[msg.seq].nowMenu,
//         paymentOption: msg.act,
//         payment: msg.getSum,
//         user: {
//           _id: decoded._id,
//           userid: decoded.userid,
//         },
//       });

//       try {
//         const result = await invoice.save();
//         tables.table[msg.seq].nowMenu = [];
//         await tables.save();
//         // socket.emit('getPayResult', result);
//         app.io.to(decoded.nowstore).emit('getTables', tables);
//         tables.table = tables.table[msg.seq];

//         socket.emit('getOneTable', tables);
//       } catch (error) {
//         console.log(error);
//         // socket.emit('getPayResult', error);
//       }
//     });

//     socket.on('loadingState', function (msg) {
//       socket.emit('loadingState');
//     });
//   });

// 라우터 설정
router.use('/api', api.routes()); // api 라우트 적용
//router.use('/', socketTable.routes());
// 라우터 적용 전에 bodyParser 적용
app.use(bodyParser());
app.use(jwtMiddleware);

// app 인스턴스에 라우터 적용
app.use(router.routes()).use(router.allowedMethods());

// 소켓 적용, app.listen 오버라이드

// app.listen = (...args) => {
//   app.server.listen.call(app.server, ...args);
//   return app.server;
// };

// const buildDirectory = path.resolve(__dirname, '../../blog-frontend/build');
// app.use(serve(buildDirectory));
// app.use(async ctx => {
//   // Not Found 이고, 주소가 /api 로 시작하지 않는 경우
//   if (ctx.status === 404 && ctx.path.indexOf('/api') !== 0) {
//     // index.html 내용을 반환
//     await send(ctx, 'index.html', { root: buildDirectory });
//   }
// });

// PORT 가 지정되어있지 않다면 4000 을 사용
const port = PORT || 4000;
// import Table from './models/table';
app.listen(port, () => {
  console.log('Listening to port %d', port);
});
