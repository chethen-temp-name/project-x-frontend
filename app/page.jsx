"use client"
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');
  const router = useRouter();

  const joinRoom = (e) => {
    e.preventDefault();
    if (roomId && username) {
      router.push(`/room/${roomId}?username=${encodeURIComponent(username)}?roomId=${roomId}`);
    }
  };

  const createRoom = () => {
    const newRoomId = Math.random().toString(36).substring(2, 7);
    setRoomId(newRoomId);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold mb-6 text-center">Video Chat App</h1>
        
        <form onSubmit={joinRoom} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Your Name
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your name"
              className="mt-1 block w-full px-4 py-2 border rounded-md"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Room ID
            </label>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Enter room ID"
                className="block w-full px-4 py-2 border rounded-md"
                required
              />
              <button
                type="button"
                onClick={createRoom}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                Generate
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Join Room
          </button>
        </form>
      </div>
    </div>
  );
}
