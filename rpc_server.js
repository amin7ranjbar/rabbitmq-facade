var amqp = require("amqplib");

function fib(n) {
  var a = 0,
    b = 1;
  for (var i = 0; i < n; i++) {
    var c = a + b;
    a = b;
    b = c;
  }
  return a;
}

async function awaiting(queue = "rpc_queue") {
  try {
    const connection = await amqp.connect("amqp://localhost");
    process.once("SIGINT", function () {
        connection.close();
    });
    const channel = await connection.createChannel();
    await channel.assertQueue(queue, { durable: false });
    channel.prefetch(1);
    await channel.consume(queue, reply);

    console.log(" [x] Awaiting RPC requests");

    function reply(msg) {
      var n = parseInt(msg.content.toString());
      console.log(" [.] fib(%d)", n);
      var response = fib(n);
      channel.sendToQueue(msg.properties.replyTo, Buffer.from(response.toString()), {
        correlationId: msg.properties.correlationId,
      });
      channel.ack(msg);
    }
  } catch (error) {
    console.warn;
  }
}

awaiting();
