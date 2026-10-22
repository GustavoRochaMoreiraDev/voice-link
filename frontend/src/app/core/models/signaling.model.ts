export interface SignalingMessage {
  callId: string;
  type: 'OFFER' | 'ANSWER' | 'ICE_CANDIDATE';
  sdp?: string;
  candidate?: string;
  sdpMid?: string;
  sdpMLineIndex?: number;
}
