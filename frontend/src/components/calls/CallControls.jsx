import React from 'react';
import { Button } from '@nextui-org/react';
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';

const CallControls = ({
  micEnabled,
  camEnabled,
  onToggleMic,
  onToggleCam,
  onEndCall,
  callType
}) => (
  <div className="flex justify-center gap-4 py-4">
    <Button
      isIconOnly
      color={micEnabled ? 'primary' : 'default'}
      variant="flat"
      onPress={onToggleMic}
      className={micEnabled ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600'}
    >
      {micEnabled ? <Mic size={20} /> : <MicOff size={20} />}
    </Button>
    {callType === 'video' && (
      <Button
        isIconOnly
        color={camEnabled ? 'primary' : 'default'}
        variant="flat"
        onPress={onToggleCam}
        className={camEnabled ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600'}
      >
        {camEnabled ? <Video size={20} /> : <VideoOff size={20} />}
      </Button>
    )}
    <Button
      isIconOnly
      color="danger"
      variant="flat"
      onPress={onEndCall}
      className="bg-red-500 text-white hover:bg-red-600"
    >
      <PhoneOff size={20} />
    </Button>
  </div>
);

export default CallControls;
