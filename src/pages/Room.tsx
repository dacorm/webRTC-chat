import React from 'react';
import {useParams} from "react-router-dom";
import {useWebRtc} from "../shared";
import {LOCAL_VIDEO} from "../shared/useWebRtc";

export const Room = () => {
    const { id: roomId } = useParams();
    const { clients, provideMediaRef } = useWebRtc(roomId as string);

    return (
        <div>
            {clients.map((clientId) => (<div key={clientId}>
                <video
                    ref={(instance) => {
                        provideMediaRef(clientId, instance);
                    }}
                    autoPlay
                    playsInline
                    muted={clientId === LOCAL_VIDEO}
                />
            </div>))}
        </div>
    );
};