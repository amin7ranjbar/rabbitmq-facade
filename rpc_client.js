var amqp = require("amqplib");
var basename = require("path").basename;
var Promise = require("bluebird");
var uuid = require("node-uuid");

try {
  if (process.argv.length < 3) throw Error("Too few args");
  let n = parseInt(process.argv[2]);
  sendMessage(n);
} catch (e) {
  console.error(e);
  console.warn("Usage: %s number", basename(process.argv[1]));
  process.exit(1);
}

async function sendMessage(number, queue = "rpc_queue") {
  try {
    const connection = await amqp.connect("amqp://localhost");
    try {
      const channel = await connection.createChannel();
      const fibN = await new Promise(async (resolve, reject) => {
        try {
          const corrId = uuid();
          function maybeAnswer(msg) {
            if (msg.properties.correlationId === corrId) {
              resolve(msg.content.toString());
            }
          }

          const qok = await channel.assertQueue("", { exclusive: true });

          await channel.consume(qok.queue, maybeAnswer, { noAck: true });

          console.log(" [x] Requesting fib(%d)", number);
          channel.sendToQueue(queue, Buffer.from(number.toString()), {
            correlationId: corrId,
            replyTo: qok.queue,
          });
        } catch (error) {
          reject(error);
        }
      });
      console.log(" [.] Got %d", fibN);
      return fibN;
    } finally {
      connection.close();
    }
  } catch (error) {
    console.warn(error);
  }
}
