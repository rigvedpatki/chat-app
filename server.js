const mongo = require('mongodb').MongoClient;
const client = require('socket.io').listen(4000).sockets;
const mlab_config = require('./config/mlab');

// Connect to mlab
mongo.connect(
  `mongodb://${mlab_config.username}:${
    mlab_config.password
  }@ds239930.mlab.com:39930/chat-app`,
  { useNewUrlParser: true },
  (error, db) => {
    if (error) {
      console.log('Error occurred while connecting to mlabs: ' + error);
      throw error;
    }
    console.log('connected to mongodb on mlabs');

    // connect to socket.io

    client.on('connection', socket => {
      let chat = db.db('chat-app').collection('chats');

      // send status
      let sendStatus = status => {
        socket.emit('status', status);
      };

      // get chats from mongo
      chat
        .find()
        .limit(100)
        .sort({ _id: 1 })
        .toArray((error, result) => {
          if (error) {
            console.log('Error while findinf chat ' + error);
          }

          // emit messages
          socket.emit('output', result);
        });

      // handle input events
      socket.on('input', data => {
        let name = data.name;
        let message = data.message;

        // check for name and message
        if (name === '' || message === '') {
          sendStatus('Please enter a name and a message');
        } else {
          // insert message into database
          chat.insert({ name: name, message: message }, () => {
            client.emit('output', [data]);

            // send status
            sendStatus({ message: 'Message sent', clear: true });
          });
        }
      });

      // handle clear
      socket.on('clear', data => {
        // remove all chats from collection
        chat.remove({}, () => {
          // emmit clear
          socket.emit('cleared');
        });
      });
    });
  }
);
