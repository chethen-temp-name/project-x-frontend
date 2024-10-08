import React, { useEffect, useRef } from 'react';

const VideoGrid = ({ peers }) => {
  const videoRefs = useRef({});

  useEffect(() => {
    peers.forEach(peer => {
      if (peer.stream && videoRefs.current[peer.id]) {
        // Update existing video element
        videoRefs.current[peer.id].srcObject = peer.stream;
      } else if (peer.stream) {
        // Create new video element
        const video = document.createElement('video');
        video.srcObject = peer.stream;
        video.autoplay = true;
        video.playsInline = true;
        video.muted = peer.isLocal;
        videoRefs.current[peer.id] = video;
      }
    });

    // Cleanup removed peers
    Object.keys(videoRefs.current).forEach(id => {
      if (!peers.find(peer => peer.id === id)) {
        if (videoRefs.current[id].parentNode) {
          videoRefs.current[id].parentNode.removeChild(videoRefs.current[id]);
        }
        delete videoRefs.current[id];
      }
    });
  }, [peers]);

  return (
    <div className="video-grid">
      {peers.map(peer => (
        <div key={peer.id} className="video-container">
          <video
            ref={el => {
              if (el) videoRefs.current[peer.id] = el;
            }}
            autoPlay
            playsInline
            muted={peer.isLocal}
          />
          <div className="peer-info">{peer.isLocal ? 'You' : `Peer ${peer.id}`}</div>
        </div>
      ))}
      <style jsx>{`
        .video-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 10px;
          padding: 10px;
        }
        .video-container {
          position: relative;
          aspect-ratio: 16 / 9;
          background-color: #000;
          border-radius: 8px;
          overflow: hidden;
        }
        video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .peer-info {
          position: absolute;
          bottom: 10px;
          left: 10px;
          background-color: rgba(0, 0, 0, 0.5);
          color: white;
          padding: 5px 10px;
          border-radius: 4px;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
};

export default VideoGrid;