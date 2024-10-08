import Peer from 'simple-peer';
import io from 'socket.io-client';

const socket = io('http://localhost:5001');

export function createPeer(stream, initiator) {
  return new Peer({
    initiator,
    stream,
    trickle: false,
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
      ]
    }
  });
}

export function handleSignaling(peer, userId, roomId) {
  peer.on('signal', (data) => {
    socket.emit('offer', data, roomId);
  });

  socket.on('offer', (offer, senderId) => {
    if (senderId !== userId) {
      peer.signal(offer);
    }
  });

  socket.on('answer', (answer, senderId) => {
    if (senderId !== userId) {
      peer.signal(answer);
    }
  });

  socket.on('ice-candidate', (candidate, senderId) => {
    if (senderId !== userId) {
      peer.signal(candidate);
    }
  });
}

export function joinRoom(roomId, userId) {
  socket.emit('join-room', roomId, userId);
}