"use client"
import React, { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createPeer, handleSignaling, joinRoom } from '../../../utils/webrtc';

export default function Room() {
  const router = useRouter();
  const { roomId } = useParams();
  const [peers, setPeers] = useState<{ [key: string]: { stream: MediaStream, peer: any } }>({});
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!roomId) return;

    const init = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const userId = Math.random().toString(36).substring(7);
      joinRoom(roomId, userId);

      const peer = createPeer(stream, true);
      handleSignaling(peer, userId, roomId);

      peer.on('stream', (remoteStream: MediaStream) => {
        setPeers((prevPeers) => ({
          ...prevPeers,
          [userId]: { stream: remoteStream, peer }
        }));
      });
    };

    init();

    return () => {
      localStream?.getTracks().forEach(track => track.stop());
    };
  }, [roomId]);

  
  return (
    <div>
      <h1>Room: {roomId}</h1>
      <div className='flex gap-4'>
        <video className='w-52' ref={localVideoRef} autoPlay muted playsInline />
        {Object.entries(peers).map(([peerId, { stream }]) => (
          <video className='bg-black w-52' key={peerId} autoPlay playsInline ref={(el) => {
            if (el) el.srcObject = stream;
          }} />
        ))}
      </div>
    </div>
  );
}