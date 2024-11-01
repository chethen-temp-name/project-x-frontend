"use client";
import { useRouter, useParams } from 'next/navigation';
import { useVideoChat } from '../../../hooks/useVideoChat';

export default function Room() {
  const router = useRouter();
  const params = useParams();

  const searchParams = new URLSearchParams(window.location.search);
  const username = searchParams.get('username');
  const roomId = params.roomId;

  
  const {
    localVideoRef,
    peers,
    isScreenSharing,
    isConnected,
    startScreenShare,
    stopScreenShare
  } = useVideoChat(roomId, username);
  
  const handleLeaveRoom = () => {
    router.push('/');
  };
  
  console.log(peers);
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Room header */}
        <div className="mb-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Room: {roomId}</h1>
          <div className="flex gap-2">
            <button
              onClick={isScreenSharing ? stopScreenShare : startScreenShare}
              className={`px-4 py-2 ${
                isScreenSharing ? 'bg-yellow-500' : 'bg-blue-500'
              } text-white rounded hover:opacity-90`}
            >
              {isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
            </button>
            <button
              onClick={handleLeaveRoom}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Leave Room
            </button>
          </div>
        </div>

        {/* Video grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Local video */}
          <div className="relative">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full rounded-lg bg-black"
            />
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
              You ({username})
            </div>
          </div>

          {/* Remote videos */}
          {Array.from(peers.entries()).map(([peerId,  {stream} ]) => (
            
            <div key={peerId} className="relative">
              <video
                autoPlay
                playsInline
                ref={(videoElement) => {
                  if (videoElement) {
                    videoElement.srcObject = stream;
                  }
                }}
                className="w-full rounded-lg bg-black"
              />
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
                Peer {peerId.slice(0, 5)}
              </div>
            </div>
          ))}
        </div>

        {/* Connection status */}
        {!isConnected && (
          <div className="fixed top-4 right-4 bg-yellow-100 text-yellow-800 px-4 py-2 rounded">
            Connecting...
          </div>
        )}
      </div>
    </div>
  );
}