"use client"
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [roomId, setRoomId] = useState('');
  const router = useRouter();

  const createRoom = () => {
    const newRoomId = Math.random().toString(36).substring(7);
    router.push(`/room/${newRoomId}`);
  };

  const joinRoom = () => {
    if (roomId) {
      router.push(`/room/${roomId}`);
    }
  };

  return (
    <div>
      <h1>Google Meet Clone</h1>
      <button onClick={createRoom}>Create Room</button>
      <input 
        type="text" 
        value={roomId} 
        onChange={(e) => setRoomId(e.target.value)} 
        placeholder="Enter Room ID" 
      />
      <button onClick={joinRoom}>Join Room</button>
    </div>
  );
}