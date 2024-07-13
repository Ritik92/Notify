"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const WebSocket = __importStar(require("ws"));
const wss = new WebSocket.Server({ port: 8080 });
const users = new Map();
let userIdCounter = 1;
function broadcastPing(content, senderId) {
    console.log(`Broadcasting ping from User ${senderId} to all users`);
    users.forEach((client, id) => {
        if (id !== senderId) {
            const message = JSON.stringify({ type: 'ping', content, senderId });
            try {
                client.send(message, (error) => {
                    if (error) {
                        console.error(`Error sending ping from User ${senderId} to User ${id}:`, error);
                    }
                    else {
                        console.log(`Successfully sent ping from User ${senderId} to User ${id}: ${message}`);
                    }
                });
            }
            catch (error) {
                console.error(`Exception sending ping from User ${senderId} to User ${id}:`, error);
            }
        }
    });
}
function sendPing(target, content, senderId) {
    const targetWs = users.get(target);
    if (targetWs && targetWs.readyState === WebSocket.OPEN) {
        const message = JSON.stringify({ type: 'ping', content, senderId });
        try {
            targetWs.send(message, (error) => {
                if (error) {
                    console.error(`Error sending ping from User ${senderId} to User ${target}:`, error);
                }
                else {
                    console.log(`Successfully sent ping from User ${senderId} to User ${target}: ${message}`);
                }
            });
        }
        catch (error) {
            console.error(`Exception sending ping from User ${senderId} to User ${target}:`, error);
        }
    }
    else {
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
            }
            else {
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
