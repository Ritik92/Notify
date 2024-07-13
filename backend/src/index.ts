import * as WebSocket from 'ws';

const wss = new WebSocket.Server({ port: 8080 });

interface User {
  ws: WebSocket;
  id: number;
}

const users = new Map<number, WebSocket>();
let userIdCounter = 1;

function broadcastPing(content: string, senderId: number) {
  console.log(`Broadcasting ping from User ${senderId} to all users`);
  users.forEach((client, id) => {
    if (id !== senderId) {
      const message = JSON.stringify({ type: 'ping', content, senderId });
      try {
        client.send(message, (error) => {
          if (error) {
            console.error(`Error sending ping from User ${senderId} to User ${id}:`, error);
          } else {
            console.log(`Successfully sent ping from User ${senderId} to User ${id}: ${message}`);
          }
        });
      } catch (error) {
        console.error(`Exception sending ping from User ${senderId} to User ${id}:`, error);
      }
    }
  });
}

function sendPing(target: number, content: string, senderId: number) {
  const targetWs = users.get(target);
  if (targetWs && targetWs.readyState === WebSocket.OPEN) {
    const message = JSON.stringify({ type: 'ping', content, senderId });
    try {
      targetWs.send(message, (error) => {
        if (error) {
          console.error(`Error sending ping from User ${senderId} to User ${target}:`, error);
        } else {
          console.log(`Successfully sent ping from User ${senderId} to User ${target}: ${message}`);
        }
      });
    } catch (error) {
      console.error(`Exception sending ping from User ${senderId} to User ${target}:`, error);
    }
  } else {
    console.log(`Failed to send ping: User ${target} not found or connection not open`);
  }
}

wss.on('connection', (ws) => {
  const userId = userIdCounter++;
  users.set(userId, ws);
  console.log(`User ${userId} connected`);
  ws.send(JSON.stringify({ type: 'userId', userId }));

  const updateUserList = () => {
    const userList = Array.from(users.keys());
    users.forEach((client) => {
      client.send(JSON.stringify({ type: 'userList', users: userList }));
    });
  };

  updateUserList();

  ws.on('message', (message) => {
    const data = JSON.parse(message.toString());
    console.log('Received message:', data);

    if (data.type === 'ping') {
      if (data.target === 'all') {
        broadcastPing(data.content, data.senderId);
      } else {
        sendPing(data.target, data.content, data.senderId);
      }
    }
  });

  ws.on('close', () => {
    users.delete(userId);
    console.log(`User ${userId} disconnected`);
    updateUserList();
  });
});

console.log('WebSocket server is running on port 8080');
