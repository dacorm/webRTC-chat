import {useCallback, useEffect, useRef} from "react";
import {useStateWithCallback} from "./useStateWithCallback";
import {socket} from "../entities";
import {ACTIONS} from "./actions";
// @ts-ignore
import freeIce from 'freeice';

export const LOCAL_VIDEO = 'LOCAL_VIDEO';

export function useWebRtc(roomId: string) {
    const [clients, setClients] = useStateWithCallback<string[]>([]);

    const addNewClient = useCallback((newClient: string, cb: () => void) => {
        if (!clients.includes(newClient)) {
            setClients((list) => [...list, newClient], cb)
        }
    }, [clients, setClients])

    const peerConnections = useRef<{
        [key: string]: RTCPeerConnection
    }>({});
    const localMediaStream = useRef<MediaStream | null>(null);
    const peerMediaElements = useRef<{
        [key: string]: HTMLVideoElement | null;
    }>({
        [LOCAL_VIDEO]: null,
    });

    useEffect(() => {
        async function handleNewPeer({ peerId, createOffer }: { peerId: string, createOffer: boolean }) {
            if (peerId in peerConnections.current) {
                return console.warn('Already connected to peer')
            }

            peerConnections.current[peerId] = new RTCPeerConnection({
                iceServers: freeIce(),
            })

            peerConnections.current[peerId].onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit(ACTIONS.RELAY_ICE, {
                        peerID: peerId,
                        iceCandidate: event.candidate
                    })
                }
            }

            let tracksNumber = 0;
            peerConnections.current[peerId].ontrack = ({ streams: [remoteStream] }) => {
                tracksNumber += 1;

                if (tracksNumber === 2) {
                    addNewClient(peerId, () => {
                        peerMediaElements.current[peerId]!.srcObject = remoteStream;
                    })
                }
            }

            localMediaStream.current?.getTracks().forEach((track) => {
                if (localMediaStream.current) {
                    peerConnections.current[peerId].addTrack(track, localMediaStream.current)
                }
            })

            if (createOffer) {
                const offer = await peerConnections.current[peerId].createOffer();

                await peerConnections.current[peerId].setLocalDescription(offer);

                socket.emit(ACTIONS.RELAY_SDP, {
                    peerID: peerId,
                    sessionDescription: offer,
                })
            }
        }

        socket.on(ACTIONS.ADD_PEER, handleNewPeer)
    }, []);

    useEffect(() => {
        async function setRemoteMedia({ peerId, sessionDescription: remoteDescription }: { peerId: string, sessionDescription: RTCSessionDescriptionInit }) {
            await peerConnections.current[peerId].setRemoteDescription(
                new RTCSessionDescription(remoteDescription)
            );

            if (remoteDescription.type === 'offer') {
                const answer = await peerConnections.current[peerId].createAnswer();

                await peerConnections.current[peerId].setLocalDescription(answer);

                socket.emit(ACTIONS.RELAY_SDP, {
                    peerID: peerId,
                    socketDescription: answer,
                })
            }
        }

        socket.on(ACTIONS.SESSION_DESCRIPTION, setRemoteMedia);
    }, []);

    useEffect(() => {
        socket.on(ACTIONS.ICE_CANDIDATE, ({ peerID, iceCandidate }) => {
            peerConnections.current[peerID].addIceCandidate(
                new RTCIceCandidate(iceCandidate)
            );
        });
    }, []);

    useEffect(() => {
        socket.on(ACTIONS.REMOVE_PEER, ({ peerID }) => {
            if (peerConnections.current[peerID]) {
                peerConnections.current[peerID].close();
            }

            delete peerConnections.current[peerID];
            delete peerMediaElements.current[peerID];

            setClients((list) => list.filter((c) => c !== peerID), () => {})
        })
    }, []);

    useEffect(() => {
        async function startCapture() {
            localMediaStream.current = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: {
                    width: 1280,
                    height: 720,
                }
            });

            addNewClient(LOCAL_VIDEO, () => {
                const localVideoElement: HTMLVideoElement | null = peerMediaElements.current[LOCAL_VIDEO];

                if (localVideoElement) {
                    (localVideoElement as HTMLVideoElement).volume = 0;
                    (localVideoElement as HTMLVideoElement).srcObject = localMediaStream.current;

                }
            });
        }

        startCapture()
            .then(() => socket.emit(ACTIONS.JOIN, { room: roomId }))
            .catch((e) => console.warn('Error getting user media', e));

        return () => {
            localMediaStream.current?.getTracks().forEach((track) => track.stop());
            socket.emit(ACTIONS.LEAVE);
        }
    }, [roomId])

    const provideMediaRef = useCallback((id: string, node: HTMLVideoElement | null) => {
        peerMediaElements.current[id] = node;
    }, []);

    return {
        clients,
        provideMediaRef
    };
}