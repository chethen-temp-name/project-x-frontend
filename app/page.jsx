"use client"
import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Device } from 'mediasoup-client';
import VideoGrid from '../components/VideoGrid';

const SERVER_URL = "http://localhost:5000";

const Home = () => {
  const [roomId, setRoomId] = useState('');
  const [joined, setJoined] = useState(false);
  const [peers, setPeers] = useState([]);
  const socketRef = useRef();
  const deviceRef = useRef();
  const producerTransportRef = useRef();
  const consumerTransportsRef = useRef({});
  const producersRef = useRef({});
  const consumersRef = useRef({});
  const localStreamRef = useRef();

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const joinRoom = async () => {
    if (!roomId.trim()) {
      alert('Please enter a room ID');
      return;
    }

    // Initialize Socket.io
    socketRef.current = io(SERVER_URL);

    // Handle Socket.io events
    socketRef.current.on('connect', () => {
      console.log('Connected to server');
      socketRef.current.emit('joinRoom', { roomId });
    });

    // Receive router RTP capabilities
    socketRef.current.on('routerRtpCapabilities', async ({ routerRtpCapabilities }) => {
      console.log('Received router RTP capabilities:', routerRtpCapabilities);

      // Initialize mediasoup Device
      deviceRef.current = new Device();

      try {
        await deviceRef.current.load({ routerRtpCapabilities });
        console.log('Device loaded');
        createSendTransport();
      } catch (error) {
        console.error('Error loading device:', error);
      }
    });

    // Handle 'transportCreated' event (Not used in this flow)
    socketRef.current.on('transportCreated', ({ params }) => {
      console.log('Transport created:', params);
      // In this flow, transports are created after device is loaded
    });

    // Handle 'newProducer' event
    socketRef.current.on('newProducer', async ({ producerId, socketId }) => {
      console.log(`New producer from ${socketId}: ${producerId}`);
      await consume(producerId, socketId);
    });

    // Handle 'consumerCreated' event
    socketRef.current.on('consumerCreated', async ({ params }) => {
      const { id, producerId, kind, rtpParameters } = params;
      const consumerTransport = consumerTransportsRef.current[producerId];
      if (!consumerTransport) {
        console.error('Consumer transport not found for producer:', producerId);
        return;
      }

      const consumer = await consumerTransport.consume({
        id,
        producerId,
        kind,
        rtpParameters
      });

      consumersRef.current[id] = consumer;

      consumer.on('trackended', () => {
        console.log('Track ended');
        removePeer(producerId);
      });

      consumer.on('transportclose', () => {
        console.log('Transport closed');
      });

      // Create a MediaStream and add the track
      const stream = new MediaStream();
      stream.addTrack(consumer.track);
      setPeers(prev => [...prev, { id: producerId, stream, isLocal: false }]);

      // Resume the consumer
      await consumer.resume();
    });

    // Handle 'producerCreated' event
    socketRef.current.on('producerCreated', ({ id }) => {
      console.log('Producer created with ID:', id);
    });

    // Handle 'peerDisconnected' event
    socketRef.current.on('peerDisconnected', ({ socketId }) => {
      console.log(`Peer disconnected: ${socketId}`);
      removePeer(socketId);
    });

    setJoined(true);
  };

  const createSendTransport = async () => {
    producerTransportRef.current = deviceRef.current.createSendTransport();

    producerTransportRef.current.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        await new Promise((resolve, reject) => {
          socketRef.current.emit('transportConnect', { roomId, dtlsParameters }, (response) => {
            if (response && response.error) {
              reject(response.error);
            } else {
              resolve();
            }
          });
        });
        callback();
      } catch (error) {
        console.error('Error connecting transport:', error);
        errback(error);
      }
    });

    producerTransportRef.current.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
      try {
        const response = await new Promise((resolve, reject) => {
          socketRef.current.emit('produce', { roomId, kind, rtpParameters }, (response) => {
            if (response.error) {
              reject(response.error);
            } else {
              resolve(response);
            }
          });
        });
        callback({ id: response.id });
      } catch (error) {
        console.error('Error producing:', error);
        errback(error);
      }
    });

    // Get local media stream
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      // Add local video stream to peers
      setPeers(prev => [...prev, { id: socketRef.current.id, stream, isLocal: true }]);
      // Add tracks to transport
      stream.getTracks().forEach(track => {
        producerTransportRef.current.produce({ track });
      });
    } catch (error) {
      console.error('Error accessing media devices.', error);
    }
  };

  const consume = async (producerId, socketId) => {
    // Create a consumer transport
    const transportParams = await new Promise((resolve, reject) => {
      socketRef.current.emit('createConsumerTransport', { roomId, producerId }, (response) => {
        if (response.error) {
          reject(response.error);
        } else {
          resolve(response.params);
        }
      });
    });

    const consumerTransport = deviceRef.current.createRecvTransport(transportParams);

    consumerTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        await new Promise((resolve, reject) => {
          socketRef.current.emit('connectConsumerTransport', { roomId, producerId, dtlsParameters }, (response) => {
            if (response && response.error) {
              reject(response.error);
            } else {
              resolve();
            }
          });
        });
        callback();
      } catch (error) {
        console.error('Error connecting consumer transport:', error);
        errback(error);
      }
    });

    consumerTransport.on('consume', async ({ kind, rtpParameters }, callback, errback) => {
      try {
        const consumer = await consumerTransport.consume({ producerId, kind, rtpParameters });
        callback({ consumer });
      } catch (error) {
        console.error('Error consuming:', error);
        errback(error);
      }
    });

    consumerTransportsRef.current[socketId] = consumerTransport;

    // Consume the producer's stream
    socketRef.current.emit('consume', { roomId, producerId, rtpCapabilities: deviceRef.current.rtpCapabilities }, (response) => {
      if (response.error) {
        console.error('Error consuming:', response.error);
      } else {
        const { params } = response;
        socketRef.current.emit('consumerCreated', { params });
      }
    });
  };

  const removePeer = (socketId) => {
    setPeers(prev => prev.filter(peer => peer.id !== socketId));
  };

  const leaveRoom = () => {
    if (socketRef.current) socketRef.current.disconnect();
    setJoined(false);
    setPeers([]);
    // Close all transports and consumers
    if (producerTransportRef.current) producerTransportRef.current.close();
    Object.values(consumerTransportsRef.current).forEach(transport => transport.close());
    Object.values(consumersRef.current).forEach(consumer => consumer.close());
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  

  return (
    <div style={{ padding: '20px' }}>
      <h1>Delta Meet</h1>
      {!joined ? (
        <div>
          <input
            type="text"
            placeholder="Enter Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
          <button onClick={joinRoom} style={{ marginLeft: '10px' }}>Join Room</button>
        </div>
      ) : (
        <div>
          <button onClick={leaveRoom}>Leave Room</button>
          <VideoGrid peers={peers} />
        </div>
      )}
    </div>
  );
};

export default Home;
