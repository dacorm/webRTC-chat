import React, {LegacyRef, MutableRefObject, useEffect, useRef, useState} from 'react';
import {socket} from "../entities";
import {ACTIONS} from "../shared";
import {useNavigate} from "react-router-dom";
import {v4} from 'uuid';

export const Main = () => {
    const navigate = useNavigate();
    const [rooms, setRooms] = useState([]);
    const rootNode = useRef<LegacyRef<HTMLDivElement> | undefined>();

    useEffect(() => {
        socket.on(ACTIONS.SHARE_ROOMS, ({rooms: remoteRooms = []}) => {
            console.log(remoteRooms);
            if (rootNode.current) {
                setRooms(remoteRooms);
            }
        })
    })

    return (
        <div ref={rootNode as LegacyRef<HTMLDivElement> | undefined}>
            <h1>Доступные к подключению комнаты</h1>
            <div>
                {rooms?.map((roomId) => (
                    <div key={roomId}>
                        {roomId}
                        <button onClick={() => {
                            navigate(`/room/${roomId}`)
                        }}>Подключиться
                        </button>
                    </div>
                ))}
            </div>
            <button onClick={() => {
                navigate(`/room/${v4()}`)
            }}>Создать комнату
            </button>
        </div>
    );
};