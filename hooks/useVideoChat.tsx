import { useState, useEffect, useRef, useCallback } from 'react';
import Peer from 'peerjs';
import { PEER_CONFIG, ROOM_PREFIX, ROOM_SUFFIX } from '../utils/constants';

export const useVideoChat = (roomId, username) => {
  const [localStream, setLocalStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [peers, setPeers] = useState(new Map());
  const [isConnected, setIsConnected] = useState(false);
  
  const peerInstance = useRef(null);
  const peersRef = useRef(new Map());
  const localVideoRef = useRef(null);
  
  const formatRoomId = useCallback((id) => `${ROOM_PREFIX}${id}${ROOM_SUFFIX}`, []);

  const initializePeer = useCallback(async () => {
    const peer = new Peer({ config: PEER_CONFIG });
    
    return new Promise((resolve) => {
      peer.on('open', (id) => {
        peerInstance.current = peer;
        setIsConnected(true);
        resolve(id);
      });
    });
  }, []);

  const handleStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.error('Error accessing media devices:', err);
      throw err;
    }
  }, []);

  const handleIncomingCall = useCallback((call, stream) => {

    console.log('Incoming call:', call);
    console.log('Incoming call stream:', stream);
    
    call.answer(stream);
    
    call.on('stream', (remoteStream) => {
      setPeers(prev => {
        const newPeers = new Map(prev);
        newPeers.set(call.peer, {
          stream: remoteStream,
          call
        });
        return newPeers;
      });
    });

    call.on('close', () => {
      setPeers(prev => {
        const newPeers = new Map(prev);
        newPeers.delete(call.peer);
        return newPeers;
      });
    });

    peersRef.current.set(call.peer, call);
  }, []);

  const connectToPeer = useCallback((peerId, stream) => {
    if (peerId === peerInstance.current?.id) return;
    
    const call = peerInstance.current.call(peerId, stream);
    
    call.on('stream', (remoteStream) => {
      setPeers(prev => {
        const newPeers = new Map(prev);
        newPeers.set(peerId, {
          stream: remoteStream,
          call
        });
        return newPeers;
      });
    });

    call.on('close', () => {
      setPeers(prev => {
        const newPeers = new Map(prev);
        newPeers.delete(peerId);
        return newPeers;
      });
    });

    peersRef.current.set(peerId, call);
  }, []);

  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      setScreenStream(stream);
      
      const videoTrack = stream.getVideoTracks()[0];
      
      videoTrack.onended = () => {
        stopScreenShare();
      };

      peersRef.current.forEach(peer => {
        const sender = peer.peerConnection.getSenders()
          .find(s => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      });

      setIsScreenSharing(true);
    } catch (err) {
      console.error('Error sharing screen:', err);
    }
  }, []);

  const stopScreenShare = useCallback(() => {
    if (!isScreenSharing || !localStream) return;

    const videoTrack = localStream.getVideoTracks()[0];
    
    peersRef.current.forEach(peer => {
      const sender = peer.peerConnection.getSenders()
        .find(s => s.track?.kind === 'video');
      if (sender) {
        sender.replaceTrack(videoTrack);
      }
    });

    screenStream?.getTracks().forEach(track => track.stop());
    setScreenStream(null);
    setIsScreenSharing(false);
  }, [isScreenSharing, localStream, screenStream]);

  useEffect(() => {
    if (!roomId) return;

    const formattedRoomId = formatRoomId(roomId);
    let mounted = true;

    const initialize = async () => {
      try {
        const peerId = await initializePeer();
        const stream = await handleStream();

        if (!mounted) return;

        // Register with server
        await fetch(`http://localhost:5000/register-peer?roomId=${formattedRoomId}&peerId=${peerId}`, {
          method: 'POST'
        });

        // Get existing peers
        const response = await fetch(`http://localhost:5000/get-peers-in-room?roomId=${formattedRoomId}`);
        const peerIds = await response.json();

        // Connect to existing peers
        peerIds.forEach(id => connectToPeer(id, stream));

        // Handle incoming calls
        peerInstance.current.on('call', call => handleIncomingCall(call, stream));
      } catch (err) {
        console.error('Error initializing:', err);
      }
    };

    initialize();

    return () => {
      mounted = false;
      screenStream?.getTracks().forEach(track => track.stop());
      localStream?.getTracks().forEach(track => track.stop());
      peersRef.current.forEach(peer => peer.close());
      peerInstance.current?.destroy();
      
      if (roomId && peerInstance.current?.id) {
        fetch(`http://localhost:5000/remove-peer?roomId=${formattedRoomId}&peerId=${peerInstance.current.id}`, {
          method: 'POST'
        }).catch(console.error);
      }
    };
  }, [roomId, formatRoomId, initializePeer, handleStream, handleIncomingCall, connectToPeer]);

  return {
    localStream,
    localVideoRef,
    peers,
    isScreenSharing,
    isConnected,
    startScreenShare,
    stopScreenShare
  };
};
